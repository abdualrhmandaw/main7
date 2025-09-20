import type { Billboard, Contract } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface ContractData {
  customer_name: string;
  start_date: string;
  end_date: string;
  rent_cost: number;
  discount?: number;
  billboard_ids?: string[];
  ad_type?: string;
}

interface ContractCreate {
  customer_name: string;
  start_date: string;
  end_date: string;
  rent_cost: number;
  discount?: number;
  ad_type?: string;
  billboard_ids?: string[];
}

// إنشاء عقد جديد مع معالجة محسنة للأخطاء وحفظ بيانات اللوحات
export async function createContract(contractData: ContractData) {
  console.log('Creating contract with data:', contractData);
  
  // فصل معرفات اللوحات عن بيانات العقد
  const { billboard_ids, ...contractPayload } = contractData;

  // Determine customer_id: prefer explicit, else find by name, else create new customer
  let customer_id: string | null = (contractData as any).customer_id || null;

  if (!customer_id && contractPayload.customer_name) {
    try {
      const nameTrim = String(contractPayload.customer_name).trim();
      const { data: existing, error: exErr } = await supabase
        .from('customers')
        .select('id')
        .ilike('name', nameTrim)
        .limit(1)
        .maybeSingle();
      
      if (!exErr && existing && (existing as any).id) {
        customer_id = (existing as any).id;
      } else {
        // create new customer
        const { data: newC, error: newErr } = await supabase
          .from('customers')
          .insert({ name: nameTrim })
          .select()
          .single();
        if (!newErr && newC && (newC as any).id) customer_id = (newC as any).id;
      }
    } catch (e) {
      console.warn('Customer handling failed:', e);
      // ignore and proceed without customer_id
    }
  }

  // إعداد بيانات اللوحات للحفظ في العقد
  let billboardsData: any[] = [];
  if (billboard_ids && billboard_ids.length > 0) {
    try {
      const { data: billboardsInfo, error: billboardsError } = await supabase
        .from('billboards')
        .select('*')
        .in('ID', billboard_ids.map(id => Number(id)));

      if (!billboardsError && billboardsInfo) {
        billboardsData = billboardsInfo.map((b: any) => ({
          id: String(b.ID),
          name: b.name || b.Billboard_Name || '',
          location: b.location || b.Nearest_Landmark || '',
          city: b.city || b.City || '',
          size: b.size || b.Size || '',
          level: b.level || b.Level || '',
          price: Number(b.price) || 0,
          image: b.image || ''
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch billboard details:', e);
    }
  }

  // إعداد بيانات العقد للإدراج
  const insertPayload: any = {
    'Customer Name': contractPayload.customer_name,
    'Ad Type': contractPayload.ad_type || '',
    'Contract Date': contractPayload.start_date,
    'End Date': contractPayload.end_date,
    'Total Rent': contractPayload.rent_cost,
    'Discount': contractPayload.discount ?? null,
    // حفظ بيانات اللوحات
    'billboards_data': JSON.stringify(billboardsData),
    'billboards_count': billboardsData.length,
  } as any;
  
  // Optional legacy payments fields
  if ((contractData as any)['Payment 1'] !== undefined) insertPayload['Payment 1'] = (contractData as any)['Payment 1'];
  if ((contractData as any)['Payment 2'] !== undefined) insertPayload['Payment 2'] = (contractData as any)['Payment 2'];
  if ((contractData as any)['Payment 3'] !== undefined) insertPayload['Payment 3'] = (contractData as any)['Payment 3'];
  if ((contractData as any)['Total Paid'] !== undefined) insertPayload['Total Paid'] = (contractData as any)['Total Paid'];
  if ((contractData as any)['Remaining'] !== undefined) insertPayload['Remaining'] = (contractData as any)['Remaining'];
  if (customer_id) insertPayload.customer_id = customer_id;
  
  // إضافة فئة السعر إذا كانت متوفرة
  if ((contractData as any).customer_category) {
    insertPayload['customer_category'] = (contractData as any).customer_category;
    insertPayload.customer_category = (contractData as any).customer_category;
  }

  console.log('Insert payload:', insertPayload);

  let contract: any = null;
  let contractError: any = null;

  function formatSupabaseErr(err: any) {
    try {
      if (!err) return '';
      if (typeof err === 'string') return err;
      // Common Supabase error shape: { message, details, hint, code }
      const out: any = {};
      for (const k of ['message', 'details', 'hint', 'code', 'status']) {
        if (err[k]) out[k] = err[k];
      }
      // include any nested error
      if (err.error) out.nested = err.error;
      return JSON.stringify(out);
    } catch (e) {
      return String(err);
    }
  }

  // محاولة الإدراج في جدول Contract أولاً
  try {
    const { data, error } = await supabase
      .from('Contract')
      .insert(insertPayload)
      .select()
      .single();

    contract = data;
    contractError = error;

    if (error) {
      console.warn('Failed to insert into Contract table:', formatSupabaseErr(error));
    } else {
      console.log('Successfully inserted into Contract table:', contract);
    }
  } catch (e) {
    console.warn('Contract table insertion failed:', e);
    contractError = e;
  }

  // إذا فشل الإدراج في جدول Contract، جرب جدول contracts
  if (contractError || !contract) {
    console.log('Trying contracts table...');
    let contractsError: any = null;
    try {
      const contractsPayload: any = {
        customer_name: contractPayload.customer_name,
        ad_type: contractPayload.ad_type || '',
        start_date: contractPayload.start_date,
        end_date: contractPayload.end_date,
        rent_cost: contractPayload.rent_cost,
        discount: contractPayload.discount ?? null,
        // حفظ بيانات اللوحات في جدول contracts
        billboards_data: JSON.stringify(billboardsData),
        billboards_count: billboardsData.length,
      };
      // mirror payments fields when using alternative table if it supports them
      if ((contractData as any)['Total Paid'] !== undefined) contractsPayload.total_paid = (contractData as any)['Total Paid'];
      if ((contractData as any)['Remaining'] !== undefined) contractsPayload.remaining = (contractData as any)['Remaining'];
      if (customer_id) contractsPayload.customer_id = customer_id;
      
      // إضافة فئة السعر
      if ((contractData as any).customer_category) {
        contractsPayload.customer_category = (contractData as any).customer_category;
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert(contractsPayload)
        .select()
        .single();

      contractsError = error;

      if (error) {
        console.error('Failed to insert into contracts table:', formatSupabaseErr(error));
        throw error;
      }

      contract = data;
      console.log('Successfully inserted into contracts table:', contract);
    } catch (e) {
      console.error('Both Contract and contracts table insertion failed:', formatSupabaseErr(contractError) + ' | ' + formatSupabaseErr(contractsError ?? e));
      const details = formatSupabaseErr(contractError) + ' | ' + formatSupabaseErr(contractsError ?? e);
      throw new Error('فشل في حفظ العقد في قاع��ة البيانات. تفاصيل الخطأ: ' + details);
    }
  }

  if (!contract) {
    throw new Error('فشل في إنشاء العقد');
  }

  // تحديث اللوحات المرتبطة بالعقد
  if (billboard_ids && billboard_ids.length > 0) {
    console.log('Updating billboards with contract:', billboard_ids);
    
    const newContractNumber = contract?.Contract_Number ?? contract?.id ?? contract?.contract_number;
    
    if (!newContractNumber) {
      console.warn('No contract number found, skipping billboard updates');
    } else {
      for (const billboard_id of billboard_ids) {
        try {
          const { error: billboardError } = await supabase
            .from('billboards')
            .update({
              Contract_Number: newContractNumber,
              Rent_Start_Date: contractData.start_date,
              Rent_End_Date: contractData.end_date,
              Customer_Name: contractData.customer_name,
              Status: 'rented'
            })
            .eq('ID', Number(billboard_id));

          if (billboardError) {
            console.error(`Failed to update billboard ${billboard_id}:`, billboardError);
            // لا نوقف العملية بسبب فشل تحديث لوحة واحدة
          } else {
            console.log(`Successfully updated billboard ${billboard_id}`);
          }
        } catch (e) {
          console.error(`Error updating billboard ${billboard_id}:`, e);
        }
      }
    }
  }

  return contract;
}

// جلب جميع العقود مع معالجة محسنة
export async function getContracts() {
  let data: any[] = [];
  
  // محاولة جلب من جدول Contract أولاً
  try {
    const { data: contractData, error: contractError } = await supabase
      .from('Contract')
      .select('*')
      .order('Contract_Number', { ascending: false });

    if (!contractError && Array.isArray(contractData)) {
      data = contractData;
      console.log('Fetched contracts from Contract table:', data.length);
    } else {
      console.warn('Contract table query failed:', contractError);
    }
  } catch (e) {
    console.warn('Contract table access failed:', e);
  }

  // إذا لم نحصل على بيانات، جرب جدول contracts
  if (data.length === 0) {
    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!contractsError && Array.isArray(contractsData)) {
        // تحويل البيانات من تنسيق contracts إلى تنسيق Contract
        data = contractsData.map((c: any) => ({
          Contract_Number: c.id,
          'Contract Number': c.id,
          'Customer Name': c.customer_name,
          'Contract Date': c.start_date,
          'End Date': c.end_date,
          'Ad Type': c.ad_type,
          'Total Rent': c.rent_cost,
          Discount: c.discount,
          customer_id: c.customer_id,
          // إضافة بيانات اللوحات المحفوظة
          billboards_data: c.billboards_data,
          billboards_count: c.billboards_count,
          ...c
        }));
        console.log('Fetched contracts from contracts table:', data.length);
      } else {
        console.warn('contracts table query failed:', contractsError);
      }
    } catch (e) {
      console.warn('contracts table access failed:', e);
    }
  }

  return (data || []).map((c: any) => {
    const id = c.Contract_Number ?? c['Contract Number'] ?? c.id ?? c.ID;
    return {
      ...c,
      id,
      Contract_Number: c.Contract_Number ?? c['Contract Number'] ?? id,
      'Contract Number': c['Contract Number'] ?? c.Contract_Number ?? id,
      customer_id: c.customer_id ?? null,
      customer_name: c.customer_name ?? c['Customer Name'] ?? c.Customer_Name ?? '',
      ad_type: c.ad_type ?? c['Ad Type'] ?? c.Ad_Type ?? '',
      start_date: c.start_date ?? c['Contract Date'] ?? c.contract_date ?? '',
      end_date: c.end_date ?? c['End Date'] ?? c.end_date ?? '',
      rent_cost: typeof c.rent_cost === 'number' ? c.rent_cost : Number(c['Total Rent'] ?? 0),
      status: c.status ?? c['Print Status'] ?? '',
      // إضافة بيانات اللوحات المحفوظة
      billboards_data: c.billboards_data || c['billboards_data'],
      billboards_count: c.billboards_count || c['billboards_count'] || 0,
    } as any;
  });
}

// جلب عقد مع اللوحات المرتبطة به
export async function getContractWithBillboards(contractId: string): Promise<any> {
  try {
    let contractResult: any = null;
    let contractError: any = null;

    // محاولة جلب من جدول Contract أولاً
    try {
      const result = await supabase
        .from('Contract')
        .select('*')
        .eq('Contract_Number', contractId)
        .single();
      
      contractResult = result;
      contractError = result.error;
    } catch (e) {
      contractError = e;
    }

    // إذا فشل، جرب جدول contracts
    if (contractError || !contractResult?.data) {
      try {
        const result = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();
        
        if (!result.error && result.data) {
          // تحويل البيانات إلى التنسيق المتوقع
          const c = result.data;
          contractResult = {
            data: {
              Contract_Number: c.id,
              'Contract Number': c.id,
              'Customer Name': c.customer_name,
              'Contract Date': c.start_date,
              'End Date': c.end_date,
              'Ad Type': c.ad_type,
              'Total Rent': c.rent_cost,
              Discount: c.discount,
              customer_id: c.customer_id,
              // إضافة بيانات اللوحات المحفوظة
              billboards_data: c.billboards_data,
              billboards_count: c.billboards_count,
              customer_category: c.customer_category,
              ...c
            },
            error: null
          };
        } else {
          contractError = result.error;
        }
      } catch (e) {
        contractError = e;
      }
    }

    if (contractError || !contractResult?.data) {
      throw contractError || new Error('Contract not found');
    }

    // جلب اللوحات المرتبطة حالياً من جدول billboards
    const billboardResult = await supabase
      .from('billboards')
      .select('*')
      .eq('Contract_Number', contractId);

    const c = contractResult.data || {};
    const normalized = {
      ...c,
      id: c.Contract_Number ?? c['Contract Number'] ?? c.id ?? c.ID,
      Contract_Number: c.Contract_Number ?? c['Contract Number'],
      'Contract Number': c['Contract Number'] ?? c.Contract_Number,
      customer_id: c.customer_id ?? null,
      customer_name: c.customer_name ?? c['Customer Name'] ?? c.Customer_Name ?? '',
      ad_type: c.ad_type ?? c['Ad Type'] ?? c.Ad_Type ?? '',
      start_date: c.start_date ?? c['Contract Date'] ?? c.contract_date ?? '',
      end_date: c.end_date ?? c['End Date'] ?? c.end_date ?? '',
      rent_cost: typeof c.rent_cost === 'number' ? c.rent_cost : Number(c['Total Rent'] ?? 0),
      customer_category: c.customer_category ?? c['customer_category'] ?? 'عادي',
      // إضافة بيانات اللوحات المحفوظة
      saved_billboards_data: c.billboards_data || c['billboards_data'],
      saved_billboards_count: c.billboards_count || c['billboards_count'] || 0,
    } as any;

    return {
      ...normalized,
      billboards: (billboardResult.data || []) as any[],
    };
  } catch (error) {
    console.error('Error in getContractWithBillboards:', error);
    throw error;
  }
}

// جلب اللوحات المتاحة
export async function getAvailableBillboards() {
  const { data, error } = await supabase
    .from('billboards')
    .select('*')
    .eq('Status', 'available')
    .order('ID', { ascending: true });

  if (error) throw error;
  return data;
}

// تحديث عقد مع معالجة محسنة وحفظ بيانات اللوحات
export async function updateContract(contractId: string, updates: any) {
  if (!contractId) throw new Error('Contract_Number مفقود');

  console.log('Updating contract:', contractId, 'with:', updates);

  const payload: any = { ...updates };
  if (payload['Total Rent'] !== undefined) payload['Total Rent'] = Number(payload['Total Rent']) || 0;
  if (payload['Total'] !== undefined) payload['Total'] = Number(payload['Total']) || 0;
  if (payload['Total Paid'] !== undefined) payload['Total Paid'] = Number(payload['Total Paid']) || 0;

  // إضافة بيانات اللوحات إذا كانت متوفرة
  if (payload.billboards_data) {
    payload['billboards_data'] = payload.billboards_data;
  }
  if (payload.billboards_count !== undefined) {
    payload['billboards_count'] = payload.billboards_count;
  }

  let success = false;
  let data: any = null;
  let error: any = null;

  // محاولة التحديث في جدول Contract أولاً
  try {
    const result = await supabase
      .from('Contract')
      .update(payload)
      .eq('Contract_Number', contractId)
      .select()
      .limit(1);
    
    data = result.data;
    error = result.error;
    
    if (!error && data && data.length > 0) {
      success = true;
      console.log('Successfully updated Contract table');
    }
  } catch (e) {
    console.warn('Contract table update failed:', e);
    error = e;
  }

  // إذا فشل التحديث في Contract، جرب contracts
  if (!success) {
    try {
      const contractsPayload: any = {};
      
      // تحويل أسماء الحقول
      if (payload['Customer Name']) contractsPayload.customer_name = payload['Customer Name'];
      if (payload['Ad Type']) contractsPayload.ad_type = payload['Ad Type'];
      if (payload['Contract Date']) contractsPayload.start_date = payload['Contract Date'];
      if (payload['End Date']) contractsPayload.end_date = payload['End Date'];
      if (payload['Total Rent']) contractsPayload.rent_cost = payload['Total Rent'];
      if (payload['Discount']) contractsPayload.discount = payload['Discount'];
      if (payload.customer_id) contractsPayload.customer_id = payload.customer_id;
      if (payload['customer_category']) contractsPayload.customer_category = payload['customer_category'];
      if (payload.customer_category) contractsPayload.customer_category = payload.customer_category;
      
      // إضافة بيانات اللوحات
      if (payload.billboards_data) contractsPayload.billboards_data = payload.billboards_data;
      if (payload.billboards_count !== undefined) contractsPayload.billboards_count = payload.billboards_count;

      const result = await supabase
        .from('contracts')
        .update(contractsPayload)
        .eq('id', contractId)
        .select()
        .limit(1);
      
      data = result.data;
      error = result.error;
      
      if (!error && data && data.length > 0) {
        success = true;
        console.log('Successfully updated contracts table');
      }
    } catch (e) {
      console.warn('contracts table update failed:', e);
      error = e;
    }
  }

  // محاولة أخيرة بمعرف رقمي
  if (!success) {
    const numericId = /^\d+$/.test(String(contractId)) ? Number(contractId) : null;
    if (numericId !== null) {
      try {
        const result = await supabase
          .from('Contract')
          .update(payload)
          .eq('Contract_Number', numericId)
          .select()
          .limit(1);
        
        data = result.data;
        error = result.error;
        
        if (!error && data && data.length > 0) {
          success = true;
          console.log('Successfully updated with numeric ID');
        }
      } catch (e) {
        console.warn('Numeric ID update failed:', e);
      }
    }
  }

  if (!success) {
    console.error('All update attempts failed. Last error:', error);
    throw error || new Error('لم يتم حفظ أي تغييرات (RLS أو رقم العقد غير صحيح)');
  }

  return Array.isArray(data) ? data[0] : data;
}

// تحديث العقود المنتهية الصلاحية
export async function updateExpiredContracts() {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('Contract')
    .update({ 'Print Status': 'expired' })
    .lt('End Date', today)
    .neq('Print Status', 'expired');

  if (error) throw error;
}

// إحصائيات العقود
export async function getContractsStats() {
  const contracts = await getContracts();
  
  const today = new Date();
  const stats = {
    total: contracts?.length || 0,
    active: contracts?.filter(c => c['End Date'] && new Date(c['End Date']) > today).length || 0,
    expired: contracts?.filter(c => c['End Date'] && new Date(c['End Date']) <= today).length || 0,
  };
  
  return stats;
}

// تحرير اللوحات المنتهية الصلاحية تلقائياً
export async function autoReleaseExpiredBillboards() {
  const today = new Date().toISOString().split('T')[0];
  
  const contracts = await getContracts();
  const expiredContracts = contracts.filter(c => c['End Date'] && c['End Date'] < today);

  for (const contract of expiredContracts) {
    await supabase
      .from('billboards')
      .update({
        Status: 'available',
        Contract_Number: null,
        Customer_Name: null,
        Rent_Start_Date: null,
        Rent_End_Date: null
      })
      .eq('Contract_Number', contract.Contract_Number);
  }
}

// حذف عقد
export async function deleteContract(contractNumber: string) {
  await supabase
    .from('billboards')
    .update({
      Status: 'available',
      Contract_Number: null,
      Customer_Name: null,
      Rent_Start_Date: null,
      Rent_End_Date: null
    })
    .eq('Contract_Number', contractNumber);

  // محاولة حذف من جدول Contract أولاً
  let result = await supabase
    .from('Contract')
    .delete()
    .eq('Contract_Number', contractNumber);

  // إذا فشل، جرب جدول contracts
  if (result.error) {
    result = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractNumber);
  }

  if (result.error) throw result.error;
}

// إضافة/إزالة لوحات من عقد مع تحديث بيانات اللوحات المحفوظة
export async function addBillboardsToContract(
  contractNumber: string,
  billboardIds: (string | number)[],
  meta: { start_date: string; end_date: string; customer_name: string }
) {
  for (const id of billboardIds) {
    const { error } = await supabase
      .from('billboards')
      .update({
        Status: 'rented',
        Contract_Number: contractNumber,
        Customer_Name: meta.customer_name,
        Rent_Start_Date: meta.start_date,
        Rent_End_Date: meta.end_date,
      })
      .eq('ID', Number(id));
    if (error) throw error;
  }

  // تحديث بيانات اللوحات المحفوظة في العقد
  await updateContractBillboardsData(contractNumber);
}

export async function removeBillboardFromContract(
  contractNumber: string,
  billboardId: string | number
) {
  const { error } = await supabase
    .from('billboards')
    .update({
      Status: 'available',
      Contract_Number: null,
      Customer_Name: null,
      Rent_Start_Date: null,
      Rent_End_Date: null,
    })
    .eq('ID', Number(billboardId))
    .eq('Contract_Number', contractNumber);
  if (error) throw error;

  // تحديث بيانات اللوحات المحفوظة في العقد
  await updateContractBillboardsData(contractNumber);
}

// دالة مساعدة لتحديث بيانات اللوحات المحفوظة في العقد
async function updateContractBillboardsData(contractNumber: string) {
  try {
    // جلب اللوحات الحالية المرتبطة بالعقد
    const { data: billboards, error: billboardsError } = await supabase
      .from('billboards')
      .select('*')
      .eq('Contract_Number', contractNumber);

    if (billboardsError) {
      console.error('Failed to fetch billboards for contract:', billboardsError);
      return;
    }

    // إعداد بيانات اللوحات للحفظ
    const billboardsData = (billboards || []).map((b: any) => ({
      id: String(b.ID),
      name: b.name || b.Billboard_Name || '',
      location: b.location || b.Nearest_Landmark || '',
      city: b.city || b.City || '',
      size: b.size || b.Size || '',
      level: b.level || b.Level || '',
      price: Number(b.price) || 0,
      image: b.image || ''
    }));

    // تحديث العقد بالبيانات الجديدة
    await updateContract(contractNumber, {
      billboards_data: JSON.stringify(billboardsData),
      billboards_count: billboardsData.length
    });

    console.log(`Updated billboard data for contract ${contractNumber}`);
  } catch (error) {
    console.error('Failed to update contract billboard data:', error);
  }
}

// إنشاء نسخة جديدة من عقد موجود (تجديد) بنفس اللوحات ورقم عقد جديد
export async function renewContract(originalContractId: string, options?: { start_date?: string; end_date?: string; keep_cost?: boolean }) {
  if (!originalContractId) throw new Error('originalContractId مطلوب');

  // احضر العقد مع اللوحات
  const original = await getContractWithBillboards(String(originalContractId));

  // احسب التواريخ الجديدة
  const origStart = original.start_date || original['Contract Date'] || '';
  const origEnd = original.end_date || original['End Date'] || '';

  let newStart = options?.start_date;
  let newEnd = options?.end_date;

  if (!newStart || !newEnd) {
    const today = new Date();
    // المدة بالأشهر من العقد الأصلي
    let months = 1;
    try {
      if (origStart && origEnd) {
        const sd = new Date(origStart);
        const ed = new Date(origEnd);
        const diffDays = Math.max(1, Math.ceil(Math.abs(ed.getTime() - sd.getTime()) / 86400000));
        months = Math.max(1, Math.round(diffDays / 30));
      }
    } catch {}
    const s = today;
    const e = new Date(s);
    e.setMonth(e.getMonth() + months);
    newStart = newStart || s.toISOString().slice(0,10);
    newEnd = newEnd || e.toISOString().slice(0,10);
  }

  // جمع معرفات اللوحات المرتبطة حالياً
  const billboardIds: string[] = Array.isArray(original.billboards)
    ? original.billboards.map((b: any) => String(b.ID ?? b.id)).filter(Boolean)
    : [];

  // جهز بيانات العقد الجديد
  const payload: ContractCreate = {
    customer_name: original.customer_name || original['Customer Name'] || '',
    ad_type: original.ad_type || original['Ad Type'] || '',
    start_date: String(newStart),
    end_date: String(newEnd),
    rent_cost: options?.keep_cost === false ? 0 : (Number(original.rent_cost ?? original['Total Rent'] ?? 0) || 0),
    billboard_ids: billboardIds,
  };

  // حافظ على فئة التسعير إن وجدت
  if ((original as any).customer_category) (payload as any).customer_category = (original as any).customer_category;
  if ((original as any).customer_id) (payload as any).customer_id = (original as any).customer_id;

  // أنشئ العقد الجديد وسيتم تحديث اللوحات تلقائياً داخل createContract
  const created = await createContract(payload);
  return created;
}

// Export types
export type { ContractData, ContractCreate };
export type { Contract } from '@/types';
