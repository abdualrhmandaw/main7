import { supabase } from '@/integrations/supabase/client';
import { Billboard, Contract } from '@/types';

export interface BillboardWithContract extends Billboard {
  contract?: {
    id: string;
    customer_name: string;
    ad_type: string;
    start_date: string;
    end_date: string;
    rent_cost: number;
  };
}

// جلب اللوحات مع بيانات العقود المرتبطة بها (بدون الاعتماد على علاقات FK في Postgres)
export const fetchBillboardsWithContracts = async (): Promise<BillboardWithContract[]> => {
  try {
    // 1) جلب كل اللوحات
    const { data: billboards, error: billboardsError } = await supabase
      .from('billboards')
      .select('*')
      .order('ID', { ascending: true });

    if (billboardsError) {
      console.warn('Error fetching billboards with contracts:', billboardsError?.message || JSON.stringify(billboardsError));
      return [];
    }

    const rows = billboards || [];

    // 2) جمع أرقام العقود الموجودة
    const contractIds = Array.from(
      new Set(
        rows
          .map((b: any) => b.contract_id ?? b.Contract_Number ?? b.contractNumber)
          .filter((v: any) => v !== null && v !== undefined && `${v}`.toString().trim() !== '')
          .map((v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : String(v);
          })
      )
    );

    // 3) جلب العقود ذات الصلة دفعة واحدة (يدعم جدولي contracts و Contract)
    let contractMap: Record<string, any> = {};
    if (contractIds.length > 0) {
      try {
        const numericIds = contractIds
          .map((v: any) => Number(v))
          .filter((n: number) => Number.isFinite(n));
        const stringIds = contractIds.map((v: any) => String(v));

        // أ) جدول contracts الحديث (حسب id)
        if (numericIds.length > 0) {
          const { data: v2, error: e2 } = await supabase
            .from('contracts')
            .select('id, customer_name, ad_type, start_date, end_date, rent_cost')
            .in('id', numericIds as any);
          if (e2) {
            console.warn('Failed loading contracts (contracts):', e2?.message || JSON.stringify(e2));
          } else if (v2) {
            for (const c of v2) {
              contractMap[String(c.id)] = {
                id: c.id,
                customer_name: c.customer_name,
                ad_type: c.ad_type,
                start_date: c.start_date,
                end_date: c.end_date,
                rent_cost: c.rent_cost,
              };
            }
          }
        }

        // ب) جدول Contract القديم (حسب Contract_Number أو "Contract Number")
        if (stringIds.length > 0) {
          let legacyRows: any[] | null = null;

          // محاولة باستخدام Contract_Number
          try {
            const q1 = await supabase
              .from('Contract')
              .select('id, Contract_Number, "Customer Name", "Ad Type", "Contract Date", "End Date", "Total Rent"')
              .in('Contract_Number', stringIds as any);
            if (!q1.error && q1.data) legacyRows = q1.data as any[];
          } catch {}

          // إذا لم تنجح، جرب باستخدام "Contract Number"
          if (!legacyRows) {
            try {
              const q2 = await supabase
                .from('Contract')
                .select('id, "Contract Number", "Customer Name", "Ad Type", "Contract Date", "End Date", "Total Rent"')
                .in('Contract Number', stringIds as any);
              if (!q2.error && q2.data) legacyRows = q2.data as any[];
            } catch {}
          }

          if (legacyRows && legacyRows.length > 0) {
            for (const c of legacyRows) {
              const key = String(c.Contract_Number ?? c['Contract Number'] ?? c.id);
              contractMap[key] = {
                id: c.id ?? key,
                customer_name: c['Customer Name'] ?? '',
                ad_type: c['Ad Type'] ?? '',
                start_date: c['Contract Date'] ?? '',
                end_date: c['End Date'] ?? '',
                rent_cost: typeof c['Total Rent'] === 'number' ? c['Total Rent'] : Number(c['Total Rent']) || 0,
              };
            }
          }
        }
      } catch (e: any) {
        console.warn('Contracts fetch failed (network):', e?.message || JSON.stringify(e));
      }
    }

    // 4) تحويل البيانات إلى الشكل المطلوب
    const processedBillboards: BillboardWithContract[] = rows.map((billboard: any) => {
      const contractKey = billboard.contract_id ?? billboard.Contract_Number ?? billboard.contractNumber;
      const relatedContract = contractKey ? contractMap[String(contractKey)] : undefined;

      const hasContractNumber = Boolean(contractKey);

      const endDateRaw = relatedContract?.end_date || billboard.end_date || billboard.Rent_End_Date;
      const startDateRaw = relatedContract?.start_date || billboard.start_date || billboard.Rent_Start_Date;
      let remainingDays: number | undefined = undefined;
      let nearExpiry = false;
      if (endDateRaw) {
        const endDate = new Date(endDateRaw);
        if (!isNaN(endDate.getTime())) {
          const today = new Date();
          const diffMs = endDate.getTime() - today.getTime();
          remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (remainingDays > 0 && remainingDays <= 20) nearExpiry = true;
        }
      }

      let status: 'available' | 'rented' | 'maintenance';
      if (hasContractNumber) {
        if (typeof remainingDays === 'number' && remainingDays <= 0) {
          status = 'available';
        } else {
          status = 'rented';
        }
      } else {
        status = (billboard.Status || billboard.status || 'available');
      }

      return {
        ID: billboard.ID || billboard.id,
        Billboard_Name: billboard.Billboard_Name || billboard.name || `لوحة رقم ${billboard.ID || billboard.id}`,
        City: billboard.City || billboard.city || '',
        District: billboard.District || billboard.district || '',
        Municipality: billboard.Municipality || billboard.municipality || '',
        Size: billboard.Size || billboard.size || '',
        Status: status,
        Price: billboard.Price || billboard.price || '',
        Level: billboard.Level || billboard.level || '',
        Image_URL: billboard.Image_URL || billboard.image_url || '',
        GPS_Coordinates: billboard.GPS_Coordinates || billboard.coordinates || '',
        GPS_Link: billboard.GPS_Link || (billboard.coordinates ? `https://www.google.com/maps?q=${billboard.coordinates}` : ''),
        Nearest_Landmark: billboard.Nearest_Landmark || billboard.location || '',
        Faces_Count: billboard.Faces_Count || billboard.faces_count || '1',

        Contract_Number: billboard.contract_id || billboard.Contract_Number || '',
        Customer_Name: relatedContract?.customer_name || billboard.customer_name || billboard['Customer Name'] || '',
        Rent_Start_Date: startDateRaw || '',
        Rent_End_Date: endDateRaw || '',
        Days_Count: typeof remainingDays === 'number' ? String(remainingDays) : undefined,
        Ad_Type: relatedContract?.ad_type || billboard.ad_type || billboard['Ad Type'] || '',

        contract: relatedContract
          ? {
              id: relatedContract.id,
              customer_name: relatedContract.customer_name,
              ad_type: relatedContract.ad_type,
              start_date: relatedContract.start_date,
              end_date: relatedContract.end_date,
              rent_cost: relatedContract.rent_cost,
            }
          : undefined,

        id: String(billboard.ID || billboard.id),
        name: billboard.Billboard_Name || billboard.name,
        location: billboard.Nearest_Landmark || billboard.location,
        size: billboard.Size || billboard.size,
        price: Number(billboard.Price || billboard.price || 0),
        status: status as 'available' | 'rented' | 'maintenance',
        city: billboard.City || billboard.city,
        district: billboard.District || billboard.district,
        municipality: billboard.Municipality || billboard.municipality,
        coordinates: billboard.GPS_Coordinates || billboard.coordinates,
        image: billboard.Image_URL || billboard.image_url,
        contractNumber: billboard.contract_id || billboard.Contract_Number || '',
        clientName: relatedContract?.customer_name || billboard.customer_name || billboard['Customer Name'] || '',
        expiryDate: endDateRaw || '',
        adType: relatedContract?.ad_type || billboard.ad_type || billboard['Ad Type'] || '',
        level: billboard.Level || billboard.level || '',
        remainingDays,
        nearExpiry,
      };
    });

    console.log('Fetched billboards with contracts:', processedBillboards.length);
    return processedBillboards;
  } catch (error) {
    console.warn('Error in fetchBillboardsWithContracts:', (error as any)?.message || JSON.stringify(error));
    return [];
  }
};

// تحديث بيانات اللوحة مع العقد
export const updateBillboardContract = async (
  billboardId: number,
  contractData: {
    customer_name: string;
    ad_type: string;
    start_date: string;
    end_date: string;
    rent_cost: number;
  }
): Promise<void> => {
  try {
    // إنشاء عقد جديد
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert(contractData)
      .select()
      .single();

    if (contractError) {
      throw contractError;
    }

    // ربط اللوحة بالعقد
    const { error: billboardError } = await supabase
      .from('billboards')
      .update({
        contract_id: contract.id,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        customer_name: contractData.customer_name,
        Status: 'rented'
      })
      .eq('ID', billboardId);

    if (billboardError) {
      throw billboardError;
    }

    console.log('Billboard contract updated successfully');
  } catch (error) {
    console.error('Error updating billboard contract:', (error as any)?.message || JSON.stringify(error));
    throw error;
  }
};

// تحرير اللوحة من العقد
export const releaseBillboardContract = async (billboardId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('billboards')
      .update({
        contract_id: null,
        start_date: null,
        end_date: null,
        customer_name: null,
        Status: 'available'
      })
      .eq('ID', billboardId);

    if (error) {
      throw error;
    }

    console.log('Billboard released from contract successfully');
  } catch (error) {
    console.error('Error releasing billboard contract:', (error as any)?.message || JSON.stringify(error));
    throw error;
  }
};
