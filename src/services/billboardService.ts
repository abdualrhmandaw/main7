import * as XLSX from 'xlsx';
import { Billboard } from '@/types';
import billboardHighway from '@/assets/billboard-highway.jpg';
import billboardCity from '@/assets/billboard-city.jpg';
import billboardCoastal from '@/assets/billboard-coastal.jpg';
import { supabase } from '@/integrations/supabase/client';

// تطبيع أحجام اللوحات لتكون متوافقة مع مفاتيح التسعير
const normalizeBillboardSize = (size: string): string => {
  if (!size) return '4x12';

  // تحويل النص إلى صغير وإ  الة المسافات
  let normalized = size.toString().trim().toLowerCase();

  // استبدال X بـ x
  normalized = normalized.replace(/[×xX]/g, 'x');

  // إزالة أي مسافات أو رموز إضافية
  normalized = normalized.replace(/[^\dx]/g, '');

  // معالجة الأحجام الشائعة
  const sizeMap: Record<string, string> = {
    '12x4': '4x12',
    '13x5': '5x13',
    '10x4': '4x10',
    '8x3': '3x8',
    '6x3': '3x6',
    '4x3': '3x4',
    '18x6': '6x18',
    '15x5': '5x15'
  };

  // تطبيق الخريطة إذا وجدت
  if (sizeMap[normalized]) {
    return sizeMap[normalized];
  }

  // إذا لم توجد في الخر  طة، التأكد من التنسيق الصحيح
  const parts = normalized.split('x');
  if (parts.length === 2) {
    const [width, height] = parts.map(p => parseInt(p)).filter(n => !isNaN(n));
    if (width && height) {
      // ترتيب الأبعاد: العرض × الارتفاع (الأصغر أولاً عادة)
      if (width <= height) {
        return `${width}x${height}`;
      } else {
        return `${height}x${width}`;
      }
    }
  }

  // افتراضي
  return '4x12';
};

const ONLINE_URL = "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&gid=0&usp=sharing";
const CSV_URL = "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/gviz/tq?tqx=out:csv&gid=0&usp=sharing";

async function testUrlAccess(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    console.log(`[Service] اختبار الوصول للرابط: ${response.status} ${response.statusText}`);
    return response.ok;
  } catch (error: any) {
    console.log(`[Service] فشل اختبار الوصول للرابط: ${error.message}`);
    return false;
  }
}

function parseDateFlexible(input: string): Date | null {
  if (!input) return null;
  const s = input.trim();
  // ISO like 2025-01-31
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  // DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    if (!Number.isNaN(d) && !Number.isNaN(mo) && !Number.isNaN(y)) {
      return new Date(y, mo, d);
    }
  }
  return null;
}

async function readCsvFromUrl(url: string, timeoutMs = 10000) {
  try {
    console.log(`[Service] محاولة تحميل ملف CSV من الرابط: ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const cacheBuster = Date.now();
    const urlWithCacheBuster = `${url}&cachebuster=${cacheBuster}`;

    const response = await fetch(urlWithCacheBuster, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/csv,application/csv,text/plain',
        'Cache-Control': 'no-cache'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`[Service] تم تحميل ${csvText.length} حرف من البيانات`);

    // تحويل CSV إلى JSON باستخدام منطق أفضل
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('ملف CSV فارغ');
    }

    // تحليل العناوين
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    // تحليل البيانات مع مراعاة الفواصل داخل النصوص
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // تحليل أفضل للـ CSV مع مراعاة النصوص المقتب  ة
      const values = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // آخر قيمة
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  } catch (error: any) {
    console.error(`[Service] خطأ في تحميل CSV: ${error.message}`);
    throw error;
  }
}

function normalizeStatus(input: string | null | undefined): Billboard['status'] {
  if (!input) return 'available';
  const s = String(input).trim().toLowerCase();
  if (['available', 'متاح'].includes(s)) return 'available';
  if (['rented', 'مؤجر', 'مؤجرة'].includes(s)) return 'rented';
  if (['maintenance', 'صيانة'].includes(s)) return 'maintenance';
  return 'available';
}

// معالجة بيانات اللوحة من Supabase
function processBillboardFromSupabase(row: any, index: number): Billboard {
  const id = row['ID'] ?? row['id'] ?? row['Id'] ?? `billboard-${index + 1}`;
  const name = row['Billboard_Name'] ?? row['name'] ?? row['لوحة'] ?? `لوحة ${index + 1}`;
  const location = row['Nearest_Landmark'] ?? row['District'] ?? row['Municipality'] ?? row['City'] ?? '';
  const municipality = row['Municipality'] ?? row['municipality'] ?? '';
  const district = row['District'] ?? row['district'] ?? '';
  const city = row['City'] ?? row['city'] ?? 'طرابلس';
  const rawSize = row['Size'] ?? row['المقاس مع الدغاية'] ?? row['Order_Size'] ?? '12X4';
  const size = normalizeBillboardSize(rawSize);
  const coordinates = row['GPS_Coordinates'] ?? row['GPS'] ?? '';
  const level = row['Level'] ?? row['Category_Level'] ?? 'A';
  const status = normalizeStatus(row['Status']);
  const contractNumber = row['Contract_Number'] ?? '';
  const clientName = row['Customer_Name'] ?? '';
  const expiryDate = row['Rent_End_Date'] ?? '';
  const adType = row['Ad_Type'] ?? '';
  const daysCount = row['Days_Count'];

  let nearExpiry = false;
  let remainingDays: number | undefined = undefined;

  if (expiryDate) {
    const today = new Date();
    const expiry = parseDateFlexible(expiryDate) || new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    remainingDays = Number.isFinite(diffDays) ? diffDays : undefined;
    if (typeof remainingDays === 'number' && remainingDays <= 20 && remainingDays > 0) {
      nearExpiry = true;
    } else if (typeof remainingDays === 'number' && remainingDays <= 0) {
      // انتهى العقد
      if (status === 'rented') {
        // إذا كانت الحالة مؤجر لكن انتهى العقد، اعتب  ها متاحة الآن
        (row as any).Status = 'available';
      }
      remainingDays = 0;
    }
  } else if (typeof daysCount === 'number') {
    remainingDays = daysCount;
    if (remainingDays <= 20 && remainingDays > 0) nearExpiry = true;
  }

  let imageUrl = row['Image_URL'] ?? row['@IMAGE'] ?? '';
  if (!imageUrl) {
    const images = [billboardHighway, billboardCity, billboardCoastal];
    imageUrl = images[index % images.length];
  }

  const gpsLink = row['GPS_Link'] ?? row['GPS_Link_Click'] ?? (coordinates ? `https://www.google.com/maps?q=${coordinates}` : undefined);

  const priceRaw = row['Price'] ?? row['price'];
  const price = typeof priceRaw === 'number' ? priceRaw : parseInt(String(priceRaw || '').replace(/[^\d]/g, ''), 10) || 3000;
  const installationPrice = Math.round(price * 0.2);

  return {
    // Legacy fields required by Billboard interface
    ID: Number(id),
    Billboard_Name: String(name),
    City: String(city),
    District: String(district || ''),
    Size: size,
    Status: normalizeStatus(row['Status']) || 'available',
    Price: String(price),
    Level: String(row['Level'] || 'standard'),
    Image_URL: String(row['Image_URL'] || row['@IMAGE'] || ''),
    GPS_Coordinates: String(coordinates || ''),
    GPS_Link: gpsLink || '',
    Nearest_Landmark: String(location),
    Faces_Count: String(row['Faces_Count'] || '1'),
    Municipality: String(municipality || ''),
    
    // App-level normalized fields
    id: String(id),
    name: String(name),
    location: String(location),
    size,
    price,
    installationPrice,
    status: normalizeStatus(row['Status']),
    city: String(city),
    district: String(district || ''),
    municipality: String(municipality || ''),
    coordinates: String(coordinates || ''),
    description: `لوحة إعلانية ${size} في ${municipality || location}`,
    image: imageUrl,
    contractNumber: contractNumber || undefined,
    clientName: clientName || undefined,
    expiryDate: expiryDate || undefined,
    nearExpiry,
    remainingDays,
    adType: adType || undefined,
    level: String(level),
  };
}

// معالجة بيانات اللوحة من CSV
function processBillboardFromCSV(row: any, index: number): Billboard {
  const id = row['ر.م'] || `billboard-${index + 1}`;
  const name = row['اسم لوحة'] || `لوحة ${index + 1}`;
  const location = row['اقرب نقطة دالة'] || '';
  const municipality = row['البلدية'] || '';
  const city = row['مدينة'] || 'طرابلس';
  const area = row['منطقة'] || row['الحي'] || row['District'] || municipality;
  const rawSize = row['حجم'] || '12X4';
  const size = normalizeBillboardSize(rawSize);
  const coordinates = row['احداثي - GPS'] || '32.8872,13.1913';
  const level = row['المستوى'] || row['تصنيف'] || row['level'] || 'A';
  
  // حالة اللوحة
  let status: Billboard['status'] = 'available';
  const contractNumber = row['رقم العقد'] || '';
  const clientName = row['اسم الزبون'] || '';
  const expiryDate = row['تاريخ انتهاء الايجار'] || '';
  const adType = row['نوع الاعلان'] || row['نوع الإعلان'] || row['ad_type'] || '';
  let nearExpiry = false;
  let remainingDays: number | undefined = undefined;

  // تحديد ا  حالة والمنتهية والقريبة من الانتهاء
  if (contractNumber && contractNumber.trim() !== '') {
    status = 'rented';
    if (expiryDate) {
      const today = new Date();
      const expiry = parseDateFlexible(expiryDate) || new Date(expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      remainingDays = Number.isFinite(diffDays) ? diffDays : undefined;
      if (typeof remainingDays === 'number' && remainingDays <= 20 && remainingDays > 0) {
        nearExpiry = true;
      } else if (typeof remainingDays === 'number' && remainingDays <= 0) {
        status = 'available';
        remainingDays = 0;
      }
    }
  }
  
  // معالجة الصورة
  let imageUrl = row['image_url'] || row['@IMAGE'] || '';
  if (imageUrl && imageUrl.includes('googleusercontent.com')) {
    // الص  رة جاهزة من Google Drive
  } else {
    // استخدام صور افتراضية
    const images = [billboardHighway, billboardCity, billboardCoastal];
    imageUrl = images[index % images.length];
  }
  
  // إحداثيات GPS
  const coords = coordinates.split(',').map(c => c.trim());
  const gpsLink = coords.length >= 2 
    ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
    : 'https://www.google.com/maps?q=32.8872,13.1913';
    
  // تحديد السعر بناءً على الحجم والموقع
  const priceMap: Record<string, number> = {
    '3x4': 1500,
    '3x6': 2000,
    '3x8': 2500,
    '4x10': 3200,
    '4x12': 3500,
    '5x13': 4200,
    '5x15': 5000,
    '6x18': 6500
  };
  
  const price = priceMap[size] || 3000;
  const installationPrice = Math.round(price * 0.2); // 20% من سعر الإيجار

  return {
    // Legacy fields required by Billboard interface
    ID: Number(id),
    Billboard_Name: name.toString(),
    City: city.toString(),
    District: location.toString(), // Use location as district fallback
    Size: size,
    Status: status,
    Price: String(price),
    Level: (level || 'standard').toString(),
    Image_URL: '', // No image available for sample data
    GPS_Coordinates: (coordinates || '').toString(),
    GPS_Link: coordinates ? `https://www.google.com/maps?q=${coordinates}` : '',
    Nearest_Landmark: location.toString(),
    Faces_Count: '1',
    Municipality: (municipality || '').toString(),
    
    // App-level normalized fields
    id: id.toString(),
    name: name.toString(),
    location: location.toString(),
    size: size,
    price,
    installationPrice,
    status,
    city,
    district: area,
    municipality,
    coordinates,
    description: `لوحة إعلانية ${size} في ${location}`,
    image: imageUrl,
    contractNumber: contractNumber || undefined,
    clientName: clientName || undefined,
    expiryDate: expiryDate || undefined,
    nearExpiry,
    remainingDays,
    adType: adType || undefined,
    level,
  };
}

export async function loadBillboards(): Promise<Billboard[]> {
  try {
    // أولاً: جلب من Supabase إذا توفر جدول billboards
    console.log('[Service] محاولة تحميل اللوحات من Supabase...');
    const { data: rows, error: dbError } = await supabase
      .from('billboards')
      .select('*');

    if (!dbError && Array.isArray(rows) && rows.length > 0) {
      console.log(`[Service] تم استلام ${rows.length} صف من Supabase`);
      const billboards = rows.map((row: any, index: number) => processBillboardFromSupabase(row, index));
      console.log(`[Service] إرجاع ${billboards.length} لوحة من Supabase`);
      return billboards;
    }

    if (dbError) {
      console.warn('[Service] تعذر جلب Supabase، سيتم استخدام Google Sheets. الخطأ:', dbError.message);
    } else {
      console.log('[Service] جدول billboards فارغ أو غير متاح، سيتم استخدام Google Sheets');
    }

    // ثانياً: محاولة تحميل البيانات من Google Sheets كاحتياطي
    console.log('[Service] بدء تحميل البيانات من Google Sheets...');
    const data = await readCsvFromUrl(CSV_URL);

    console.log(`[Service] تم استلام ${data.length} صف من البيانات`);
    if (data.length > 0) {
      console.log('[Service] أعمدة الملف:', Object.keys(data[0]));
    }

    const billboards: Billboard[] = data.map((row: any, index: number) =>
      processBillboardFromCSV(row, index)
    );

    console.log(`[Service] تم معالجة ${billboards.length} لوحة إعلانية`);

    console.log(`[Service] إرجاع ${billboards.length} لوحة بعد المعالجة (بدون فلترة إضافية)`);
    return billboards;

  } catch (error) {
    console.error('[Service] خطأ في تحميل البيانات من Supabase/Google Sheets:', error);

    // البيانات الافتراضية في حالة فشل التحميل
    const images = [billboardHighway, billboardCity, billboardCoastal];

    return [
      {
        id: '1',
        name: 'لوحة طريق المطار',
        location: 'شار   الزهراء، طرابلس',
        size: '4x10',
        price: 3500,
        installationPrice: 800,
        status: 'available',
        city: 'طرابلس',
        description: 'موقع مميز على طريق المطار الدولي',
        image: images[0],
        level: 'A'
      },
      {
        id: '2',
        name: 'لوحة شار   الجمهورية',
        location: 'شارع الجمهورية، طرابلس',
        size: '5x13',
        price: 2500,
        installationPrice: 600,
        status: 'available',
        city: 'طرابلس',
        description: 'في قلب العاصمة التجاري',
        image: images[1],
        level: 'A'
      },
      {
        id: '3',
        name: 'لوحة الكورنيش',
        location: 'كورنيش طرابلس',
        size: '3x8',
        price: 4500,
        installationPrice: 700,
        status: 'available',
        city: 'طرابلس',
        description: 'إطلالة رائعة على البحر المتوسط',
        image: images[2],
        level: 'B'
      },
      {
        id: '4',
        name: 'لوحة شارع الفتح',
        location: 'شارع الفتح، طرابلس',
        size: '4x12',
        price: 2800,
        installationPrice: 650,
        status: 'available',
        city: 'طرابلس',
        description: 'شارع تجاري حيوي ومزدحم',
        image: images[0],
        level: 'A'
      },
      {
        id: '5',
        name: 'لوحة طريق السواني',
        location: 'طريق السواني، طرابلس',
        size: '6x18',
        price: 6000,
        installationPrice: 1200,
        status: 'available',
        city: 'طرابلس',
        description: 'أكبر لوحة متاحة، مرئية من مسافات بعيدة',
        image: images[1],
        level: 'A'
      }
  ] as any[];
  }
}

export function getAvailableBillboards(billboards: Billboard[]): Billboard[] {
  return billboards.filter(b => b.status === 'available');
}

export function getBillboardsByCity(billboards: Billboard[], city: string): Billboard[] {
  return billboards.filter(b => b.city === city);
}

import { normalizeArabic, queryTokens } from '@/lib/utils';

export function searchBillboards(billboards: Billboard[], query: string): Billboard[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return billboards;
  return billboards.filter((b) => {
    const parts = [
      (b as any).Billboard_Name,
      b.name,
      (b as any).Nearest_Landmark,
      b.location,
      (b as any).Municipality,
      b.municipality,
      (b as any).District,
      b.district,
      (b as any).City,
      b.city,
      b.size,
      b.level,
      b.id,
      b.contractNumber,
      b.clientName,
      b.adType,
    ].filter(Boolean) as Array<string | number>;
    const haystack = normalizeArabic(parts.join(' '));
    return tokens.every((t) => haystack.includes(t));
  });
}
