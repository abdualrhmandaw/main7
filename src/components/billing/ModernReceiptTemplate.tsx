import { PaymentRow } from './BillingTypes';

export interface ModernReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  amount: number;
  amountInWords: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  contractNumber?: string;
  remainingBalance?: number;
}

export const generateModernReceiptHTML = (data: ModernReceiptData): string => {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إيصال قبض - ${data.receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      padding: 20px;
      color: #f1f5f9;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: #1e293b;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      border: 2px solid #334155;
      overflow: hidden;
      position: relative;
    }
    
    .receipt-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706);
    }
    
    .header {
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #fbbf24;
      position: relative;
    }
    
    .company-logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 15px;
      background: #fbbf24;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      color: #0f172a;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 8px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .company-subtitle {
      font-size: 16px;
      color: #cbd5e1;
      margin-bottom: 20px;
    }
    
    .receipt-title {
      font-size: 24px;
      font-weight: 700;
      color: #f1f5f9;
      background: #475569;
      padding: 12px 30px;
      border-radius: 25px;
      display: inline-block;
      border: 2px solid #fbbf24;
    }
    
    .content {
      padding: 40px;
    }
    
    .receipt-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .info-section {
      background: #334155;
      padding: 25px;
      border-radius: 15px;
      border: 1px solid #475569;
    }
    
    .info-section h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fbbf24;
      margin-bottom: 15px;
      border-bottom: 2px solid #fbbf24;
      padding-bottom: 8px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #475569;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-weight: 600;
      color: #cbd5e1;
      font-size: 14px;
    }
    
    .info-value {
      font-weight: 700;
      color: #f1f5f9;
      font-size: 16px;
    }
    
    .amount-section {
      background: linear-gradient(135deg, #422006 0%, #713f12 100%);
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      margin: 30px 0;
      border: 3px solid #fbbf24;
      position: relative;
    }
    
    .amount-section::before {
      content: '💰';
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: #fbbf24;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .amount-label {
      font-size: 18px;
      color: #fbbf24;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .amount-value {
      font-size: 36px;
      font-weight: 800;
      color: #fbbf24;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .amount-words {
      font-size: 16px;
      color: #fed7aa;
      font-weight: 500;
      font-style: italic;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #475569;
    }
    
    .signature-box {
      text-align: center;
      padding: 25px;
      background: #334155;
      border-radius: 15px;
      border: 2px dashed #fbbf24;
    }
    
    .signature-label {
      font-size: 16px;
      font-weight: 600;
      color: #fbbf24;
      margin-bottom: 40px;
    }
    
    .signature-line {
      border-top: 2px solid #fbbf24;
      margin-top: 40px;
      padding-top: 10px;
      font-size: 14px;
      color: #cbd5e1;
    }
    
    .footer {
      background: #334155;
      padding: 25px;
      text-align: center;
      border-top: 3px solid #fbbf24;
    }
    
    .footer-text {
      font-size: 14px;
      color: #cbd5e1;
      margin-bottom: 10px;
    }
    
    .print-date {
      font-size: 12px;
      color: #94a3b8;
    }
    
    .decorative-border {
      height: 4px;
      background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706, #f59e0b, #fbbf24);
      margin: 20px 0;
    }
    
    @media print {
      body {
        background: white;
        color: black;
        padding: 0;
      }
      
      .receipt-container {
        background: white;
        border: 2px solid #333;
        box-shadow: none;
      }
      
      .header {
        background: #f5f5f5;
        color: black;
      }
      
      .company-name {
        color: #333;
      }
      
      .receipt-title {
        color: black;
        background: #f0f0f0;
        border: 2px solid #333;
      }
      
      .info-section {
        background: #f9f9f9;
        border: 1px solid #ddd;
      }
      
      .info-section h3 {
        color: #333;
        border-bottom: 2px solid #333;
      }
      
      .amount-section {
        background: #fff7ed;
        border: 3px solid #333;
      }
      
      .amount-label, .amount-value {
        color: #333;
      }
      
      .signature-box {
        background: #f9f9f9;
        border: 2px dashed #333;
      }
      
      .footer {
        background: #f5f5f5;
        border-top: 3px solid #333;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="company-logo">ف</div>
      <div class="company-name">شركة الفارس الذهبي</div>
      <div class="company-subtitle">للدعاية والإعلان</div>
      <div class="receipt-title">إيصال قبض</div>
    </div>
    
    <div class="content">
      <div class="receipt-info">
        <div class="info-section">
          <h3>بيانات الإيصال</h3>
          <div class="info-row">
            <span class="info-label">رقم الإيصال:</span>
            <span class="info-value">${data.receiptNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${data.date}</span>
          </div>
          ${data.paymentMethod ? `
          <div class="info-row">
            <span class="info-label">طريقة الدفع:</span>
            <span class="info-value">${data.paymentMethod}</span>
          </div>
          ` : ''}
          ${data.reference ? `
          <div class="info-row">
            <span class="info-label">المرجع:</span>
            <span class="info-value">${data.reference}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="info-section">
          <h3>بيانات العميل</h3>
          <div class="info-row">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${data.customerName}</span>
          </div>
          ${data.contractNumber ? `
          <div class="info-row">
            <span class="info-label">رقم العقد:</span>
            <span class="info-value">${data.contractNumber}</span>
          </div>
          ` : ''}
          ${data.remainingBalance !== undefined ? `
          <div class="info-row">
            <span class="info-label">الرصيد المتبقي:</span>
            <span class="info-value">${data.remainingBalance.toLocaleString('ar-LY')} د.ل</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="decorative-border"></div>
      
      <div class="amount-section">
        <div class="amount-label">المبلغ المستلم</div>
        <div class="amount-value">${data.amount.toLocaleString('ar-LY')} د.ل</div>
        <div class="amount-words">${data.amountInWords}</div>
      </div>
      
      ${data.notes ? `
      <div class="info-section">
        <h3>ملاحظات</h3>
        <div style="color: #f1f5f9; font-size: 16px; line-height: 1.6;">
          ${data.notes}
        </div>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-label">توقيع المستلم</div>
          <div class="signature-line">التوقيع</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">ختم الشركة</div>
          <div class="signature-line">الختم</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-text">شكراً لتعاملكم معنا</div>
      <div class="print-date">تاريخ الطباعة: ${new Date().toLocaleString('ar-LY')}</div>
    </div>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
};

// Helper function to convert number to Arabic words
export const numberToArabicWords = (num: number): string => {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' و' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return ones[hundred] + ' مائة' + (remainder > 0 ? ' و' + numberToArabicWords(remainder) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;
    return numberToArabicWords(thousand) + ' ألف' + (remainder > 0 ? ' و' + numberToArabicWords(remainder) : '');
  }
  
  return num.toString(); // Fallback for very large numbers
};