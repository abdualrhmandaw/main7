import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import * as UIDialog from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ContractPDFDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: any;
}

export default function ContractPDFDialog({ open, onOpenChange, contract }: ContractPDFDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [printMode, setPrintMode] = useState<'auto' | 'manual'>('auto');
  const [customerData, setCustomerData] = useState<{
    name: string;
    company: string | null;
    phone: string | null;
  } | null>(null);

  // Load customer data when dialog opens
  useEffect(() => {
    if (open && contract) {
      loadCustomerData();
    }
  }, [open, contract]);

  const loadCustomerData = async () => {
    try {
      const customerId = contract?.customer_id;
      const customerName = contract?.customer_name || contract?.['Customer Name'] || '';
      
      if (customerId) {
        // Try to get customer data by ID first
        const { data, error } = await supabase
          .from('customers')
          .select('name, company, phone')
          .eq('id', customerId)
          .single();
        
        if (!error && data) {
          setCustomerData({
            name: data.name || customerName,
            company: data.company,
            phone: data.phone
          });
          return;
        }
      }
      
      // Fallback: try to find customer by name
      if (customerName) {
        const { data, error } = await supabase
          .from('customers')
          .select('name, company, phone')
          .ilike('name', customerName)
          .limit(1)
          .single();
        
        if (!error && data) {
          setCustomerData({
            name: data.name || customerName,
            company: data.company,
            phone: data.phone
          });
          return;
        }
      }
      
      // Final fallback: use contract data only
      setCustomerData({
        name: customerName,
        company: null,
        phone: null
      });
      
    } catch (error) {
      console.error('Error loading customer data:', error);
      // Use contract data as fallback
      setCustomerData({
        name: contract?.customer_name || contract?.['Customer Name'] || '',
        company: null,
        phone: null
      });
    }
  };


  const calculateContractDetails = () => {
    const startDate = contract?.start_date || contract?.['Contract Date'];
    const endDate = contract?.end_date || contract?.['End Date'];
    const totalCost = contract?.rent_cost || contract?.['Total Rent'] || 0;
    
    let duration = '';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      duration = `${days}`;
    }

    return {
      price: `${totalCost.toLocaleString('ar-LY')}`,
      duration,
      startDate: startDate ? new Date(startDate).toLocaleDateString('ar-LY') : '',
      endDate: endDate ? new Date(endDate).toLocaleDateString('ar-LY') : ''
    };
  };

  // Enhanced print function with better error handling and browser compatibility
  const handlePrintContract = async () => {
    if (!contract || !customerData) {
      toast.error('لا توجد بيانات عقد أو عميل للطباعة');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Check if popup blocker might interfere
      const testWindow = window.open('', '_blank', 'width=1,height=1');
      if (!testWindow || testWindow.closed || typeof testWindow.closed === 'undefined') {
        toast.error('يرجى السماح بالنوافذ المنبثقة في المتصفح لتمكين الطباعة');
        setIsGenerating(false);
        return;
      }
      testWindow.close();

      const contractDetails = calculateContractDetails();
      const year = new Date().getFullYear();

      // Extract all contract data automatically
      const contractData = {
        contractNumber: contract?.id || contract?.Contract_Number || '',
        customerName: customerData.name,
        customerCompany: customerData.company || '',
        customerPhone: customerData.phone || '',
        adType: contract?.ad_type || contract?.['Ad Type'] || 'عقد إيجار لوحات إعلانية',
        startDate: contractDetails.startDate,
        endDate: contractDetails.endDate,
        price: contractDetails.price,
        duration: contractDetails.duration,
        year: year.toString(),
        companyName: 'شركة الفارس الذهبي للدعاية ��الإعلان',
        phoneNumber: '0912612255'
      };

      // Normalize billboards for page-2; fallback to saved JSON if DB rows missing
      const dbRows: any[] = Array.isArray(contract?.billboards) ? contract.billboards : [];
      let srcRows: any[] = dbRows;
      if (!srcRows.length) {
        try {
          const saved = (contract as any)?.saved_billboards_data ?? (contract as any)?.billboards_data ?? '[]';
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (Array.isArray(parsed)) srcRows = parsed;
        } catch (e) {
          console.warn('Failed to parse saved billboards data:', e);
        }
      }

      const norm = (b: any) => {
        const id = String(b.ID ?? b.id ?? b.code ?? '');
        const image = String(b.image ?? b.Image ?? b.billboard_image ?? b.Image_URL ?? b['@IMAGE'] ?? b.image_url ?? b.imageUrl ?? b.img ?? '');
        const municipality = String(b.Municipality ?? b.municipality ?? b.city ?? '');
        const district = String(b.District ?? b.district ?? '');
        const landmark = String(b.Nearest_Landmark ?? b.nearest_landmark ?? b.location ?? b.landmark ?? '');
        const size = String(b.Size ?? b.size ?? '');
        const faces = String(b.Faces ?? b.faces ?? b.Number_of_Faces ?? b.Faces_Count ?? b.faces_count ?? '1');
        const priceVal = b.Price ?? b.price ?? b.rent ?? b.Rent_Price ?? b.rent_cost ?? b['Total Rent'];
        
        let price = '';
        if (priceVal !== undefined && priceVal !== null && String(priceVal) !== '') {
          const num = typeof priceVal === 'number' ? priceVal : Number(priceVal);
          if (!isNaN(num)) price = `${num.toLocaleString('ar-LY')} د.ل`;
          else price = String(priceVal);
        }

        let rent_end_date = '';
        if (b.end_date || b['End Date']) {
          try {
            rent_end_date = new Date(b.end_date || b['End Date']).toLocaleDateString('ar-LY');
          } catch (e) {
            rent_end_date = contractDetails.endDate;
          }
        } else {
          rent_end_date = contractDetails.endDate;
        }

        // باقي الحقول
        let coords: string = String(b.GPS_Coordinates ?? b.coords ?? b.coordinates ?? b.GPS ?? '');
        if (!coords || coords === 'undefined' || coords === 'null') {
          const lat = b.Latitude ?? b.lat ?? b.latitude;
          const lng = b.Longitude ?? b.lng ?? b.longitude;
          if (lat != null && lng != null) coords = `${lat},${lng}`;
        }
        const mapLink = coords ? `https://www.google.com/maps?q=${encodeURIComponent(coords)}` : (b.GPS_Link || '');
        const name = String(b.Billboard_Name ?? b.name ?? b.code ?? id);

        return { id, name, image, municipality, district, landmark, size, faces, price, rent_end_date, mapLink };
      };

      const normalized = srcRows.map(norm);
      const START_X = 105; // mm
      const START_Y = 63.53; // mm
      const ROW_W = 184.247; // mm
      const ROW_H = 13.818; // mm
      const PAGE_H = 297; // A4 height in mm
      const ROWS_PER_PAGE = Math.max(1, Math.floor((PAGE_H - START_Y) / ROW_H));
      
      const tablePagesHtml = normalized.length
        ? normalized
            .reduce((acc: any[][], r, i) => {
              const p = Math.floor(i / ROWS_PER_PAGE);
              (acc[p] ||= []).push(r);
              return acc;
            }, [])
            .map((pageRows) => `
              <div class="template-container page">
                <img src="/bgc2.svg" alt="خلفية جدول اللوحات" class="template-image" onerror="console.warn('Failed to load bgc2.svg')" />
                <div class="table-area">
                  <table class="btable" dir="rtl">
                    <colgroup>
                  <col style="width:18.235mm" />
                  <col style="width:20.915mm" />
                  <col style="width:14.741mm" />
                  <col style="width:14.741mm" />
                  <col style="width:35.889mm" />
                  <col style="width:12.778mm" />
                  <col style="width:16.207mm" />
                  <col style="width:14.798mm" />
                  <col style="width:19.462mm" />
                  <col style="width:15.667mm" />
                    </colgroup>
                    <tbody>
                      ${pageRows
                        .map(
                          (r) => `
                          <tr>
                            <td class="c-name">${r.name || r.id}</td>
                            <td class="c-img">${r.image ? `<img src="${r.image}" alt="صورة اللوحة" onerror="this.style.display='none'" />` : ''}</td>
                            <td>${r.municipality}</td>
                            <td>${r.district}</td>
                            <td>${r.landmark}</td>
                            <td>${r.size}</td>
                            <td>${r.faces}</td>
                            <td>${r.price}</td>
                            <td>${r.rent_end_date}</td>
                            <td>${r.mapLink ? `<a href="${r.mapLink}" target="_blank" rel="noopener">اضغط هنا</a>` : ''}</td>
                          </tr>`
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `)
            .join('')
        : '';

      // Enhanced HTML content with better error handling and fallbacks
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>عقد إيجار لوحات إعلانية - ${contractData.contractNumber}</title>
          <style>
            /* Enhanced font loading with fallbacks */
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');

            @font-face { 
              font-family: 'Doran'; 
              src: url('/Doran-Regular.otf') format('opentype'); 
              font-weight: 400; 
              font-style: normal; 
              font-display: swap; 
            }
            @font-face { 
              font-family: 'Doran'; 
              src: url('/Doran-Bold.otf') format('opentype'); 
              font-weight: 700; 
              font-style: normal; 
              font-display: swap; 
            }

            /* Enhanced CSS with better browser compatibility */
            * { 
              margin: 0 !important; 
              padding: 0 !important; 
              box-sizing: border-box; 
            }
            
            html, body { 
              width: 100% !important; 
              height: 100% !important; 
              overflow: hidden; 
              font-family: 'Noto Sans Arabic', 'Doran', 'Arial Unicode MS', Arial, sans-serif; 
              direction: rtl; 
              text-align: right; 
              background: white; 
              color: #000; 
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            .template-container { 
              position: relative; 
              width: 100vw; 
              height: 100vh; 
              overflow: hidden; 
              display: block; 
            }
            
            .template-image { 
              position: absolute; 
              inset: 0; 
              width: 100% !important; 
              height: 100% !important; 
              object-fit: cover; 
              object-position: center; 
              z-index: 1; 
              display: block; 
            }
            
            .overlay-svg { 
              position: absolute; 
              inset: 0; 
              width: 100%; 
              height: 100%; 
              z-index: 10; 
              pointer-events: none; 
            }
            
            .page { 
              page-break-after: always; 
              page-break-inside: avoid;
            }

            /* Enhanced table styling */
            .table-area { 
              position: absolute; 
              top: 63.53mm; 
              left: calc(105mm - 92.1235mm); 
              width: 184.247mm; 
              z-index: 20; 
            }
            
            .btable { 
              width: 100%; 
              border-collapse: collapse; 
              border-spacing: 0; 
              font-size: 8px; 
              font-family: 'Doran', 'Noto Sans Arabic', 'Arial Unicode MS', Arial, sans-serif; 
              table-layout: fixed; 
              border: 0.2mm solid #000; 
            }
            
            .btable tr { 
              height: 13.818mm; 
            }
            
            .btable td { 
              border: 0.2mm solid #000; 
              padding: 0 1mm; 
              vertical-align: middle; 
              text-align: center; 
              background: transparent; 
              color: #000; 
              white-space: normal; 
              word-break: break-word; 
              overflow: hidden; 
              font-family: 'Doran', 'Noto Sans Arabic', 'Arial Unicode MS', Arial, sans-serif; 
            }
            
            .c-img img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
              border: none;
              border-radius: 0;
              display: block;
              background: none;
            }
.btable td.c-img {
  width: 15.5mm;
  height: 15.5mm;
  padding: 0;
  overflow: hidden;   /* يخفي أي جزء زائد */
}

.btable td.c-img img {
  width: 100%;        /* يملأ العرض بالكامل */
  height: 100%;       /* يملأ الارتفاع بالكامل */
  object-fit: contain;  /* يملأ المربع مع قص الزيادة */
  object-position: center; /* توسيط الصورة */
  display: block;
}


@media print {
      .btable tr:nth-of-type(11n) {
        page-break-after: always; /* صفحة جديدة بعد كل 9 صفوف */
      }
            
            .c-num { 
              text-align: center; 
              font-weight: 700; 
            }
            
            .btable a { 
              color: #004aad; 
              text-decoration: none; 
              font-family: 'Doran', 'Noto Sans Arabic', 'Arial Unicode MS', Arial, sans-serif; 
            }

            /* Enhanced print styles */
            @media print {
              html, body { 
                width: 210mm !important; 
                min-height: 297mm !important; 
                height: auto !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                overflow: visible !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .template-container { 
                width: 210mm !important; 
                height: 297mm !important; 
                position: relative !important; 
              }
              
              .template-image, .overlay-svg { 
                width: 210mm !important; 
                height: 297mm !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .page { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                color-adjust: exact;
                page-break-inside: avoid;
              }
              
              .controls { 
                display: none !important; 
              }
              
              @page { 
                size: A4; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
            }
            
            /* Enhanced controls styling */
            .controls { 
              position: fixed; 
              bottom: 20px; 
              left: 50%; 
              transform: translateX(-50%); 
              z-index: 100; 
              background: rgba(0,0,0,0.8); 
              padding: 10px 20px; 
              border-radius: 5px; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            
            .controls button { 
              padding: 10px 20px; 
              font-size: 16px; 
              background-color: #0066cc; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
              margin: 0 5px; 
              transition: background-color 0.2s;
            }
            
            .controls button:hover { 
              background-color: #0052a3; 
            }

            /* Loading and error handling */
            .loading-message {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0,0,0,0.8);
              color: white;
              padding: 20px;
              border-radius: 5px;
              z-index: 1000;
              font-family: 'Noto Sans Arabic', Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          <div id="loadingMessage" class="loading-message">جاري تحميل العقد...</div>
          
          <div class="template-container page">
            <img src="/contract-template.png" alt="عقد إيجار لوحات إعلانية" class="template-image" 
                 onerror="console.warn('Failed to load contract template image')" />
            <svg class="overlay-svg" viewBox="0 0 2480 3508" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <text x="1750" y="700" font-family="Doran, sans-serif" font-weight="bold" font-size="62" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">عقد إيجار مواقع إعلانية رقم: ${contractData.contractNumber} سنة ${contractData.year}</text>
              <text x="440" y="700" font-family="Doran, sans-serif" font-weight="bold" font-size="62" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">التاريخ: ${contractData.startDate}</text>
              <text x="1900" y="915" font-family="Doran, sans-serif" font-weight="bold" font-size="62" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">نوع الإعلان: ${contractData.adType}.</text>
              <text x="2220" y="1140" font-family="Doran, sans-serif" font-weight="bold" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">الطرف الأول:</text>
              <text x="1500" y="1140" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">شركة الفارس الذهبي للدعاية والإعلان، طرابلس – طريق المطار، حي الزهور.</text>
              <text x="1960" y="1200" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">يمثلها السيد جمال أحمد زحيل (المدير العام).</text>
              <text x="2210" y="1380" font-family="Doran, sans-serif" font-weight="bold" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">الطرف الثاني:</text>
              <text x="1980" y="1380" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">${contractData.customerCompany || contractData.customerName}.</text>
              <text x="1880" y="1440" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">يمثلها السيد ${contractData.customerName} .  رقم الهاتف :( ${contractData.customerPhone || 'غير محدد'})</text>

              <text x="2250" y="1630" font-family="Doran, sans-serif" font-weight="bold" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">المقدمة:</text>
              <text x="1290" y="1630" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">نظرًا لرغبة الطرف الثاني في استئجار مساحات إعلانية من الطرف الأول، تم الاتفاق على الشروط التالية:</text>
              <text x="2240" y="1715" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند الأول:</text>
              <text x="1190" y="1715" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">يلتزم الطرف الثاني بتجهيز التصميم في أسرع وقت وأي تأخير يعتبر مسؤوليته، وتبدي مدة العقد من التاريخ .</text>
              <text x="2095" y="1775" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">المذكور في المادة السادسة</text>
              <text x="2230" y="1890" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند الثاني:</text>
              <text x="1170" y="1890" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">يلتزم الطرف الأول بتعبئة وت��كيب التصاميم بدقة على المساحات المتفق عليها وفق الجدول المرفق، ويتحمل .</text>
              <text x="1850" y="1950" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">الأخير تكاليف التغيير الناتجة عن الأحوال الجوية أو الحوادث.</text>
              <text x="2225" y="2065" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند الثالث:</text>
              <text x="1240" y="2065" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">في حال وقوع ظروف قاهرة تؤثر على إحدى المساحات، يتم نقل الإعلان إلى موقع بديل، ويتولى الطرف الأول</text>
              <text x="1890" y="2125" font-family="Doran, sans-serif" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">الحصول على الموافقات اللازمة من الجهات ذات العلاقة.</text>
              <text x="2235" y="2240" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند الرابع:</text>
              <text x="1190" y="2240" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">لايجوز للطرف الثاني التنازل عن العقد أو التعامل مع جهات أخرى دون موافقة الطرف الأول، الذي يحتفظ بحق.</text>
              <text x="1530" y="2300" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">استغلال المساحات في المناسبات الوطنية و الانتخابات مع تعويض الطرف الثاني بفترة بديلة.</text>
              <text x="2225" y="2410" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند الخامس:</text>
              <text x="560" y="2410" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="end" dominant-baseline="middle" style="direction: rtl; text-align: center">قيمة العقد ${contractData.price} دينار ليبي بدون طباعة، دفع عند توقيع العقد والنصف الآخر بعد</text>
              <text x="1640" y="2470" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">التركيب، وإذا تأخر السداد عن 30 يومًا يحق للطرف الأول إعادة تأجير المساحات.</text>
              <text x="2210" y="2590" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند السادس:</text>
              <text x="1150" y="2590" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">مدة العقد ${contractData.duration} يومًا تبدأ من ${contractData.startDate} وتنتهي في ${contractData.endDate}، ويجوز تجديده برضى الطرفين قبل</text>
              <text x="1800" y="2650" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">انتهائه بمدة لا تقل عن 15 يومًا وفق شروط يتم الاتفاق عليها .</text>
              <text x="2220" y="2760" font-family="Doran, sans-serif" font-weight="bold" font-size="42" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">البند السابع:</text>
              <text x="1150" y="2760" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">في حال حدوث خلاف بين الطرفين يتم حلّه وديًا، وإذا تعذر ذلك يُعين طرفان محاميان لتسوية النزاع بقرار نهائي</text>
              <text x="2200" y="2820" font-family="Doran, sans-serif" font-size="46" fill="#000" text-anchor="middle" dominant-baseline="middle" style="direction: rtl; text-align: center">وملزم للطرفين.</text>
            </svg>
            <div class="controls">
              <button onclick="window.print()">طباعة</button>
              <button onclick="window.close()">إغلاق</button>
            </div>
          </div>

          ${tablePagesHtml}

          <script>
            // Enhanced JavaScript with better error handling
            let printAttempts = 0;
            const maxPrintAttempts = 3;
            
            function hideLoadingMessage() {
              const loading = document.getElementById('loadingMessage');
              if (loading) {
                loading.style.display = 'none';
              }
            }
            
            function attemptPrint() {
              try {
                if (printAttempts < maxPrintAttempts) {
                  printAttempts++;
                  window.focus();
                  window.print();
                } else {
                  console.warn('Max print attempts reached');
                }
              } catch (error) {
                console.error('Print error:', error);
                if (printAttempts < maxPrintAttempts) {
                  setTimeout(attemptPrint, 1000);
                }
              }
            }
            
            // Wait for all resources to load
            window.addEventListener('load', function() {
              hideLoadingMessage();
              setTimeout(attemptPrint, 1200);
            });
            
            // Fallback if load event doesn't fire
            setTimeout(function() {
              hideLoadingMessage();
              if (printAttempts === 0) {
                attemptPrint();
              }
            }, 3000);
            
            // Handle image load errors
            document.addEventListener('DOMContentLoaded', function() {
              const images = document.querySelectorAll('img');
              images.forEach(img => {
                img.addEventListener('error', function() {
                  console.warn('Image failed to load:', this.src);
                });
              });
            });
          </script>
        </body>
        </html>
      `;

      // Enhanced window opening with better error handling
      const windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';
      const printWindow = window.open('', '_blank', windowFeatures);

      if (!printWindow) {
        throw new Error('فشل في فتح نافذة الطباعة. يرجى التحقق من إعدادات المتصفح والسماح بالنوافذ المنبثقة.');
      }

      // Enhanced window handling
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Enhanced error handling for window operations
      const handlePrintWindowError = (error: any) => {
        console.error('Print window error:', error);
        toast.error('حد�� خطأ في نافذة الطباعة. يرجى المحاولة مرة أخرى.');
      };

      printWindow.addEventListener('error', handlePrintWindowError);
      
      // Check if window was closed unexpectedly
      const checkWindowClosed = () => {
        if (printWindow.closed) {
          console.log('Print window was closed');
        }
      };

      setTimeout(checkWindowClosed, 5000);

      toast.success('تم فتح العقد للطباعة بنجاح! إذا لم تظهر نافذة الطباعة، تحقق من إعدادات المتصفح.');
      
      // Only close dialog if in auto mode
      if (printMode === 'auto') {
        onOpenChange(false);
      }

    } catch (error) {
      console.error('Error in handlePrintContract:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error(`حدث خطأ أثناء تحضير العقد للطباعة: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const contractDetails = calculateContractDetails();

  return (
    <UIDialog.Dialog open={open} onOpenChange={onOpenChange}>
      <UIDialog.DialogContent className="max-w-lg">
        <UIDialog.DialogHeader>
          <UIDialog.DialogTitle>طباعة العقد المحسنة</UIDialog.DialogTitle>
        </UIDialog.DialogHeader>
        
        <div className="space-y-4">
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg font-semibold">جاري تحضير العقد للطباعة...</p>
              <p className="text-sm text-gray-600 mt-2">يتم تحميل بيانات العميل وتحضير التخطيط</p>
            </div>
          ) : (
            <>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">معاينة بيانات العقد:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>رقم العقد:</strong> {contract?.id || contract?.Contract_Number || 'غير محدد'}</p>
                  <p><strong>العميل:</strong> {customerData?.name || 'غير محدد'}</p>
                  {customerData?.company && (
                    <p><strong>الشركة:</strong> {customerData.company}</p>
                  )}
                  {customerData?.phone && (
                    <p><strong>الهاتف:</strong> {customerData.phone}</p>
                  )}
                  <p><strong>قيمة العقد:</strong> {contractDetails.price} د.ل</p>
                  <p><strong>مدة العقد:</strong> {contractDetails.duration} يوم</p>
                  <p><strong>تاريخ البداية:</strong> {contractDetails.startDate}</p>
                  <p><strong>تاريخ النهاية:</strong> {contractDetails.endDate}</p>
                  {contract?.billboards && (
                    <p><strong>عدد اللوحات:</strong> {contract.billboards.length}</p>
                  )}
                </div>
              </div>

              {/* Print mode selection */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">خيارات الطباعة:</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input 
                      type="radio" 
                      name="printMode" 
                      value="auto" 
                      checked={printMode === 'auto'} 
                      onChange={(e) => setPrintMode(e.target.value as 'auto')}
                    />
                    <span className="text-sm">طباعة تلقائية (يفتح نافذة الطباعة مباشرة)</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input 
                      type="radio" 
                      name="printMode" 
                      value="manual" 
                      checked={printMode === 'manual'} 
                      onChange={(e) => setPrintMode(e.target.value as 'manual')}
                    />
                    <span className="text-sm">طباعة يدوية (معاينة أولاً)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  إغلاق
                </Button>
                <Button 
                  onClick={handlePrintContract}
                  className="bg-primary text-primary-foreground"
                  disabled={isGenerating}
                >
                  {printMode === 'auto' ? 'طباعة تلقائية' : 'معاينة وطباعة'}
                </Button>
              </div>
            </>
          )}
        </div>
      </UIDialog.DialogContent>
    </UIDialog.Dialog>
  );
}
