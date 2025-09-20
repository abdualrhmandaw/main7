export interface ModernInvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  totalInWords: string;
  notes?: string;
}

export const generateModernInvoiceHTML = (data: ModernInvoiceData): string => {
  const itemRows = data.items.map(item => `
    <tr class="item-row">
      <td class="item-desc">${item.description}</td>
      <td class="item-qty">${item.quantity}</td>
      <td class="item-price">${item.unitPrice.toLocaleString('ar-LY')} د.ل</td>
      <td class="item-total">${item.total.toLocaleString('ar-LY')} د.ل</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة مبيعات - ${data.invoiceNumber}</title>
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
      color: #181616;
      line-height: 1.6;
    }
    
    .invoice-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      border: 2px solid #d4ab3f;
      overflow: hidden;
      position: relative;
    }
    
    .invoice-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #d4ab3f, #dcb345, #d4ab3f);
    }
    
    .header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 40px;
      text-align: center;
      border-bottom: 4px solid #d4ab3f;
      position: relative;
    }
    
    .company-logo {
      width: 100px;
      height: 100px;
      margin: 0 auto 20px;
      background: #d4ab3f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      font-weight: bold;
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(212, 171, 63, 0.3);
    }
    
    .company-name {
      font-size: 32px;
      font-weight: 700;
      color: #181616;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .company-subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 25px;
    }
    
    .invoice-title {
      font-size: 28px;
      font-weight: 700;
      color: #d4ab3f;
      background: #ffffff;
      padding: 15px 40px;
      border-radius: 30px;
      display: inline-block;
      border: 3px solid #d4ab3f;
      box-shadow: 0 4px 15px rgba(212, 171, 63, 0.2);
    }
    
    .content {
      padding: 40px;
    }
    
    .invoice-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .info-section {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 15px;
      border: 2px solid #e9ecef;
    }
    
    .info-section h3 {
      font-size: 20px;
      font-weight: 600;
      color: #d4ab3f;
      margin-bottom: 15px;
      border-bottom: 2px solid #d4ab3f;
      padding-bottom: 8px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e9ecef;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-weight: 600;
      color: #495057;
      font-size: 16px;
    }
    
    .info-value {
      font-weight: 700;
      color: #181616;
      font-size: 16px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      background: #ffffff;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    
    .table-header {
      background: #d4ab3f;
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
    }
    
    .table-header th {
      padding: 20px 15px;
      text-align: center;
      border-right: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .table-header th:last-child {
      border-right: none;
    }
    
    .item-row {
      border-bottom: 1px solid #e9ecef;
      transition: background-color 0.2s;
    }
    
    .item-row:hover {
      background: #f8f9fa;
    }
    
    .item-row td {
      padding: 18px 15px;
      text-align: center;
      font-size: 15px;
      color: #181616;
    }
    
    .item-desc {
      text-align: right !important;
      font-weight: 500;
    }
    
    .item-qty, .item-price, .item-total {
      font-weight: 600;
    }
    
    .total-section {
      background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      margin: 30px 0;
      border: 3px solid #d4ab3f;
      position: relative;
    }
    
    .total-section::before {
      content: '💰';
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: #d4ab3f;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .total-label {
      font-size: 20px;
      color: #d4ab3f;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .total-value {
      font-size: 42px;
      font-weight: 800;
      color: #d4ab3f;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .total-words {
      font-size: 18px;
      color: #8b5cf6;
      font-weight: 500;
      font-style: italic;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 3px solid #d4ab3f;
    }
    
    .signature-box {
      text-align: center;
      padding: 30px;
      background: #f8f9fa;
      border-radius: 15px;
      border: 2px dashed #d4ab3f;
    }
    
    .signature-label {
      font-size: 18px;
      font-weight: 600;
      color: #d4ab3f;
      margin-bottom: 50px;
    }
    
    .signature-line {
      border-top: 2px solid #d4ab3f;
      margin-top: 50px;
      padding-top: 15px;
      font-size: 16px;
      color: #495057;
    }
    
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 4px solid #d4ab3f;
    }
    
    .footer-text {
      font-size: 16px;
      color: #495057;
      margin-bottom: 10px;
    }
    
    .print-date {
      font-size: 14px;
      color: #6c757d;
    }
    
    .decorative-border {
      height: 4px;
      background: linear-gradient(90deg, #d4ab3f, #dcb345, #d4ab3f);
      margin: 20px 0;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .invoice-container {
        box-shadow: none;
        border: 2px solid #333;
      }
      
      .header {
        background: #f5f5f5;
      }
      
      .company-name {
        color: #333;
      }
      
      .invoice-title {
        color: #333;
        border: 3px solid #333;
      }
      
      .info-section {
        background: #f9f9f9;
        border: 2px solid #ddd;
      }
      
      .info-section h3 {
        color: #333;
        border-bottom: 2px solid #333;
      }
      
      .table-header {
        background: #333 !important;
        color: white !important;
      }
      
      .total-section {
        background: #fff7ed;
        border: 3px solid #333;
      }
      
      .total-label, .total-value {
        color: #333;
      }
      
      .signature-box {
        background: #f9f9f9;
        border: 2px dashed #333;
      }
      
      .footer {
        background: #f5f5f5;
        border-top: 4px solid #333;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-logo">ف</div>
      <div class="company-name">شركة الفارس الذهبي</div>
      <div class="company-subtitle">للدعاية والإعلان</div>
      <div class="invoice-title">فاتورة مبيعات</div>
    </div>
    
    <div class="content">
      <div class="invoice-info">
        <div class="info-section">
          <h3>بيانات الفاتورة</h3>
          <div class="info-row">
            <span class="info-label">رقم الفاتورة:</span>
            <span class="info-value">${data.invoiceNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${data.date}</span>
          </div>
        </div>
        
        <div class="info-section">
          <h3>المطلوب من السادة</h3>
          <div class="info-row">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${data.customerName}</span>
          </div>
        </div>
      </div>
      
      <div class="decorative-border"></div>
      
      <table class="items-table">
        <thead class="table-header">
          <tr>
            <th>البيان</th>
            <th>الكمية</th>
            <th>سعر الوحدة باليورو</th>
            <th>الإجمالي باليورو</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      
      <div class="total-section">
        <div class="total-label">الإجمالي باليورو</div>
        <div class="total-value">${data.totalAmount.toLocaleString('ar-LY')} د.ل</div>
        <div class="total-words">${data.totalInWords}</div>
      </div>
      
      ${data.notes ? `
      <div class="info-section">
        <h3>ملاحظات</h3>
        <div style="color: #181616; font-size: 16px; line-height: 1.6;">
          ${data.notes}
        </div>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-label">توقيع العميل</div>
          <div class="signature-line">التوقيع</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">الختم</div>
          <div class="signature-line">ختم الشركة</div>
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