import { supabase } from '@/integrations/supabase/client';
import { Billboard, Contract, Pricing } from '@/types';
import { loadBillboards as loadBillboardsNormalized } from '@/services/billboardService';
import { fetchBillboardsWithContracts } from '@/services/billboardContractService';

// جلب جميع اللوحات مع بيانات العقود
export const fetchAllBillboards = async (): Promise<Billboard[]> => {
  try {
    // محاولة جلب اللوحات مع العقود من Supabase أولاً
    const billboardsWithContracts = await fetchBillboardsWithContracts();
    if (billboardsWithContracts && billboardsWithContracts.length > 0) {
      console.log('Fetched billboards with contracts from Supabase:', billboardsWithContracts.length);
      return billboardsWithContracts as any;
    }
  } catch (error) {
    console.warn('Failed to fetch billboards with contracts, trying legacy method:', error);
  }

  // الطريقة القديمة كـ fallback
  try {
    const { data, error } = await supabase
      .from('billboards')
      .select('*');

    if (!error && Array.isArray(data) && data.length > 0) {
      // إزالة التكرار وتحديد الحالة
      const uniqueBillboards = new Map<number, any>();
      (data || []).forEach((billboard: any) => {
        if (!uniqueBillboards.has(billboard.ID)) {
          uniqueBillboards.set(billboard.ID, {
            ...billboard,
            Status: billboard.Contract_Number ? 'مؤجر' : 'متاح'
          });
        }
      });
      const processedData = Array.from(uniqueBillboards.values());
      console.log('Fetched unique billboards (legacy):', processedData.length);
      return processedData as any;
    }

    console.warn('Supabase billboards unavailable, falling back. Details:', (error as any)?.message || 'no data');
  } catch (error) {
    console.warn('Supabase fetchAllBillboards failed, will fallback:', (error as any)?.message || JSON.stringify(error));
  }

  // Fallback: use normalized loader (Google Sheets/local defaults), then map to legacy shape used by pages
  try {
    const normalized = await loadBillboardsNormalized();
    const mapped: any[] = normalized.map((b, i) => ({
      ID: Number(b.id) || i + 1,
      Billboard_Name: b.name,
      City: b.city || '',
      District: (b as any).district || b.district || '',
      Municipality: (b as any).municipality || b.municipality || '',
      Size: (b as any).size || b.size || '',
      Status: b.status === 'available' ? 'متاح' : b.status === 'rented' ? 'مؤجر' : 'صيانة',
      Price: String((b as any).price ?? ''),
      Level: (b as any).level ?? '',
      Image_URL: (b as any).image ?? '',
      GPS_Coordinates: typeof (b as any).coordinates === 'string' ? (b as any).coordinates : '',
      GPS_Link: (b as any).coordinates ? (typeof (b as any).coordinates === 'string' ? `https://www.google.com/maps?q=${(b as any).coordinates}` : '') : '',
      Nearest_Landmark: (b as any).location ?? '',
      Faces_Count: (b as any).faces ?? '',
      Contract_Number: (b as any).contractNumber ?? '',
      Customer_Name: (b as any).clientName ?? '',
      Rent_Start_Date: '',
      Rent_End_Date: (b as any).expiryDate ?? '',
      Days_Count: (b as any).remainingDays ?? '',
      Review: '',
      Category_Level: '',
      Ad_Type: (b as any).adType ?? '',
      Order_Size: undefined,
      '@IMAGE': undefined,
      GPS_Link_Click: undefined,
      'المقاس مع الدغاية': undefined,
    }));
    console.log('Fallback mapped billboards:', mapped.length);
    return mapped as any;
  } catch (e) {
    console.error('Fallback loaders failed, returning empty list:', (e as any)?.message || e);
    return [];
  }
};

// جلب العقود مع دعم جدولين محتملين واستخراج أخطاء أوضح
export const fetchContracts = async (): Promise<Contract[]> => {
  try {
    let data: any[] | null = null; 
    let error: any = null;
    
    // محاولة جلب من جدول Contract أولاً
    try {
      const q1 = await supabase.from('Contract').select('*').order('Contract_Number', { ascending: false });
      data = q1.data as any[] | null; 
      error = q1.error;
      
      if (!error && Array.isArray(data) && data.length > 0) {
        console.log('Fetched contracts (Contract):', data.length);
        const normalized = (data as any[]).map((c: any) => ({
          ...c,
          Contract_Number: c.Contract_Number ?? c.id ?? c.ID,
        })) as Contract[];
        return normalized as any;
      }
    } catch (e) { 
      error = e; 
    }

    console.warn('Contract table not available or empty, trying contracts table. Details:', (error as any)?.message || JSON.stringify(error));

    // المحاولة 2: جدول contracts (حديث بحقول snake_case)
    const { data: v2, error: err2 } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (err2) {
      console.warn('Failed fetching contracts from both tables:', (err2 as any)?.message || JSON.stringify(err2));
      return [];
    }

    const mapped: Contract[] = (v2 || []).map((c: any) => ({
      Contract_Number: String(c.id),
      'Contract Number': String(c.id),
      'Customer Name': c.customer_name ?? '',
      'Contract Date': c.start_date ?? c.created_at ?? '',
      Duration: undefined,
      'End Date': c.end_date ?? '',
      'Ad Type': c.ad_type ?? '',
      'Total Rent': typeof c.rent_cost === 'number' ? c.rent_cost : Number(c.rent_cost) || 0,
      'Installation Cost': 0,
      Total: (typeof c.rent_cost === 'number' ? c.rent_cost : Number(c.rent_cost) || 0).toString(),
      'Payment 1': undefined,
      'Payment 2': undefined,
      'Payment 3': undefined,
      'Total Paid': undefined,
      Remaining: undefined,
      Level: undefined,
      Phone: undefined,
      Company: undefined,
      'Print Status': undefined,
      Discount: c.discount,
      'Renewal Status': undefined,
      'Actual 3% Fee': undefined,
      '3% Fee': undefined,
      customer_id: c.customer_id,
      id: c.id,
    }));

    console.log('Fetched contracts (contracts -> mapped):', mapped.length);
    return mapped;
  } catch (error: any) {
    console.warn('Error in fetchContracts, returning empty list:', error?.message || JSON.stringify(error));
    return [];
  }
};

// جلب أسعار اللوحات
export const fetchPricing = async (): Promise<Pricing[]> => {
  try {
    const { data, error } = await supabase
      .from('pricing')
      .select('*');

    if (error) {
      console.error('Error fetching pricing:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchPricing:', error);
    throw error;
  }
};

// إنشاء عقد جديد مع معالجة محسنة
export async function createContract(contractData: any) {
  console.log('Creating contract via supabaseService:', contractData);
  
  let contract: any = null;
  let error: any = null;

  // محاولة الإدراج في جدول Contract أولاً
  try {
    const { data, error: contractError } = await supabase
      .from('Contract')
      .insert({
        'Customer Name': contractData.customer_name,
        'Contract Date': contractData.start_date,
        'End Date': contractData.end_date,
        'Total Rent': contractData.rent_cost || 0,
        'Ad Type': contractData.ad_type || '',
        'Discount': contractData.discount || null,
      })
      .select()
      .single();

    if (!contractError) {
      contract = data;
      console.log('Successfully created contract in Contract table');
    } else {
      error = contractError;
      console.warn('Failed to create in Contract table:', contractError);
    }
  } catch (e) {
    error = e;
    console.warn('Contract table insertion failed:', e);
  }

  // إذا فشل، جرب جدول contracts
  if (!contract) {
    try {
      const { data, error: contractsError } = await supabase
        .from('contracts')
        .insert({
          customer_name: contractData.customer_name,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          rent_cost: contractData.rent_cost || 0,
          ad_type: contractData.ad_type || '',
          discount: contractData.discount || null,
          customer_id: contractData.customer_id || null,
        })
        .select()
        .single();

      if (!contractsError) {
        contract = data;
        console.log('Successfully created contract in contracts table');
      } else {
        error = contractsError;
        console.error('Failed to create in contracts table:', contractsError);
      }
    } catch (e) {
      error = e;
      console.error('contracts table insertion failed:', e);
    }
  }

  if (!contract) {
    console.error('All contract creation attempts failed:', error);
    throw error || new Error('فشل في إنشاء العقد');
  }

  return contract;
}

// تحديث حالة اللوحة
export const updateBillboardStatus = async (
  billboardId: number, 
  updates: Partial<Billboard>
): Promise<Billboard> => {
  try {
    const { data, error } = await supabase
      .from('billboards')
      .update(updates)
      .eq('ID', billboardId)
      .select()
      .single();

    if (error) {
      console.error('Error updating billboard:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateBillboardStatus:', error);
    throw error;
  }
};

// جلب الإحصائيات مع استخدام البيانات المحسنة
export const fetchDashboardStats = async () => {
  try {
    const [billboards, contracts] = await Promise.all([
      fetchAllBillboards(),
      fetchContracts()
    ]);

    const availableBillboards = billboards.filter(b =>
      b.Status === 'متاح' || b.Status === 'available' || !b.Contract_Number
    );

    const rentedBillboards = billboards.filter(b =>
      b.Status === 'مؤجر' || b.Status === 'rented' || b.Contract_Number
    );

    const nearExpiry = rentedBillboards.filter(billboard => {
      if (!billboard.Rent_End_Date) return false;
      try {
        const endDate = new Date(billboard.Rent_End_Date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 20 && diffDays > 0;
      } catch {
        return false;
      }
    });

    const totalRevenue = contracts.reduce((sum, contract) => {
      const total = parseFloat(contract['Total Rent']?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    return {
      totalBillboards: billboards.length,
      availableBillboards: availableBillboards.length,
      rentedBillboards: rentedBillboards.length,
      nearExpiryBillboards: nearExpiry.length,
      totalContracts: contracts.length,
      totalRevenue,
      availableBillboardsList: availableBillboards,
      nearExpiryBillboardsList: nearExpiry
    };
  } catch (error: any) {
    console.warn('Error fetching dashboard stats, returning defaults:', error?.message || JSON.stringify(error));
    return {
      totalBillboards: 0,
      availableBillboards: 0,
      rentedBillboards: 0,
      nearExpiryBillboards: 0,
      totalContracts: 0,
      totalRevenue: 0,
      availableBillboardsList: [],
      nearExpiryBillboardsList: []
    };
  }
};