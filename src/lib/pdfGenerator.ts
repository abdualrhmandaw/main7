import { Template } from '@pdfme/common';
import { text, image } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';

// Function to convert image to base64
async function getBase64FromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading background image:', error);
    return '';
  }
}

// Enhanced PDF template with 2 pages and full opacity backgrounds
const createPDFTemplate = async (): Promise<Template> => {
  // Load background images - use fallback if not available
  const contractBg1 = await getBase64FromUrl('/contract-template.png').catch(() => '');
  const contractBg2 = await getBase64FromUrl('/contract-template.png').catch(() => '');

  return {
    "schemas": [
      // PAGE 1 - Contract Details
      [
        // Page 1 background (100% opacity)
        {
          "name": "page1Background",
          "type": "image",
          "content": contractBg1,
          "position": { "x": 0, "y": 0 },
          "width": 210,
          "height": 297,
          "rotate": 0,
          "opacity": 1,
          "readOnly": true
        },
        // Contract number
        {
          "name": "conter number",
          "type": "text",
          "content": "1108 year 2025",
          "position": { "x": 92.54, "y": 65.77 },
          "width": 44.98,
          "height": 6.61,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 13,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        },
        // Date
        {
          "name": "date",
          "type": "text",
          "content": "01 november 2025",
          "position": { "x": 11.59, "y": 64.18 },
          "width": 45,
          "height": 10,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 13,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        },
        // Company name
        {
          "name": "name compny",
          "type": "text",
          "content": "Al-Fares Al-Dhahabi Company",
          "position": { "x": 126.15, "y": 118.38 },
          "width": 39.42,
          "height": 5.82,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 9,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        },
        // Client name
        {
          "name": "name clinet",
          "type": "text",
          "content": "Client Name",
          "position": { "x": 144.93, "y": 124.25 },
          "width": 20.9,
          "height": 5.29,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 9,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        },
        // Phone number
        {
          "name": "number",
          "type": "text",
          "content": "Phone Number",
          "position": { "x": 104.19, "y": 124.27 },
          "width": 27.78,
          "height": 4.23,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 13,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        },
        // Price
        {
          "name": "price",
          "type": "text",
          "content": "Price",
          "position": { "x": 137.8, "y": 193.61 },
          "width": 11.64,
          "height": 4.76,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 10,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        },
        // Duration
        {
          "name": "dete days",
          "type": "text",
          "content": "Duration",
          "position": { "x": 145.47, "y": 207.15 },
          "width": 7.67,
          "height": 3.7,
          "rotate": 0,
          "alignment": "left",
          "verticalAlignment": "top",
          "fontSize": 8,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        }
      ],
      // PAGE 2 - Billboard Images and Details
      [
        // Page 2 background (100% opacity)
        {
          "name": "page2Background",
          "type": "image",
          "content": contractBg2,
          "position": { "x": 0, "y": 0 },
          "width": 210,
          "height": 297,
          "rotate": 0,
          "opacity": 1,
          "readOnly": true
        },
        // Billboard image (user uploaded)
        {
          "name": "Image",
          "type": "image",
          "content": "",
          "position": { "x": 11.59, "y": 83.44 },
          "width": 189.97,
          "height": 120,
          "rotate": 0,
          "opacity": 1,
          "readOnly": false
        },
        // Ad type on page 2
        {
          "name": "ads type",
          "type": "text",
          "content": "Advertisement Type",
          "position": { "x": 114.51, "y": 83.44 },
          "width": 44.98,
          "height": 7.94,
          "rotate": 0,
          "alignment": "right",
          "verticalAlignment": "top",
          "fontSize": 10,
          "lineHeight": 1,
          "characterSpacing": 0,
          "fontColor": "#000000",
          "fontName": "Roboto",
          "backgroundColor": "",
          "opacity": 1,
          "strikethrough": false,
          "underline": false,
          "required": false,
          "readOnly": false
        }
      ]
    ],
    "basePdf": {
      "width": 210,
      "height": 297,
      "padding": [0, 0, 0, 0]
    },
    "pdfmeVersion": "5.4.1"
  };
};

export interface InvoiceData {
  adsType?: string;
  date?: string;
  contractNumber?: string;
  companyName?: string;
  clientName?: string;
  phoneNumber?: string;
  price?: string;
  duration?: string;
  image?: string;
}

export interface ContractData {
  id?: string;
  Contract_Number?: string;
  customer_name?: string;
  'Customer Name'?: string;
  ad_type?: string;
  'Ad Type'?: string;
  start_date?: string;
  'Contract Date'?: string;
  end_date?: string;
  'End Date'?: string;
  rent_cost?: number;
  'Total Rent'?: number;
  billboards?: any[];
  phoneNumber?: string;
  duration_months?: number;
}

// Function to extract billboard image from contract
export function getBillboardImageFromContract(contract: ContractData): string {
  if (!contract?.billboards || contract.billboards.length === 0) {
    return '';
  }

  // Get the first billboard with an image (support multiple possible fields)
  for (const billboard of contract.billboards) {
    const candidates = [
      billboard.image,
      billboard.Image,
      billboard.billboard_image,
      (billboard as any).Image_URL,
      (billboard as any)['@IMAGE'],
      (billboard as any).image_url,
      (billboard as any).imageUrl,
      (billboard as any).thumbnail,
      (billboard as any).photo,
    ];
    for (const img of candidates) {
      if (img && typeof img === 'string' && img.trim() !== '') {
        return img;
      }
    }
  }

  return '';
}

// Enhanced function to extract contract data and format it properly
export function extractContractData(contract: ContractData): InvoiceData {
  // Extract basic contract info
  const contractNumber = contract.Contract_Number || contract.id || '';
  const customerName = contract.customer_name || contract['Customer Name'] || '';
  const adType = contract.ad_type || contract['Ad Type'] || 'Billboard Rental Contract';
  const startDate = contract.start_date || contract['Contract Date'] || '';
  const endDate = contract.end_date || contract['End Date'] || '';
  const totalCost = contract.rent_cost || contract['Total Rent'] || 0;
  
  // Calculate duration in months
  let duration = '';
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    duration = `${durationMonths} month${durationMonths !== 1 ? 's' : ''}`;
  }
  
  // Format price
  const formattedPrice = `${totalCost.toLocaleString('en-US')} LYD`;
  
  // Format date
  const formattedDate = startDate ? new Date(startDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
  
  // Get billboard image
  const billboardImage = getBillboardImageFromContract(contract);
  
  // Get billboard count
  const billboardCount = contract.billboards ? contract.billboards.length : 0;
  const billboardInfo = billboardCount > 0 ? ` (${billboardCount} billboard${billboardCount !== 1 ? 's' : ''})` : '';
  
  return {
    adsType: adType + billboardInfo,
    date: formattedDate,
    contractNumber: contractNumber.toString(),
    companyName: 'Al-Fares Al-Dhahabi Advertising Company',
    clientName: customerName || 'Client Name',
    phoneNumber: contract.phoneNumber || 'Phone Number',
    price: formattedPrice,
    duration: duration,
    image: billboardImage
  };
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  try {
    console.log('Starting PDF generation with data:', data);
    
    // Create template with 2-page layout and full opacity backgrounds
    const template = await createPDFTemplate();
    console.log('Template created successfully');

    // Ensure the image is embedded as base64 (pdfme requires data URL)
    let embeddedImage = '';
    if (data.image) {
      try {
        embeddedImage = data.image.startsWith('data:') ? data.image : await getBase64FromUrl(data.image);
        console.log('Image processed successfully');
      } catch (imageError) {
        console.warn('Failed to process image, continuing without it:', imageError);
        embeddedImage = '';
      }
    }

    // Prepare the input data for both pages
    const inputs = [
      // Page 1 data
      {
        "page1Background": "",
        "date": data.date || new Date().toLocaleDateString('en-US'),
        "conter number": data.contractNumber || `${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        "name compny": data.companyName || "Al-Fares Al-Dhahabi Advertising Company",
        "name clinet": data.clientName || "Client Name",
        "number": data.phoneNumber || "Phone Number",
        "price": data.price || "Price",
        "dete days": data.duration || "Duration"
      },
      // Page 2 data
      {
        "page2Background": "",
        "Image": embeddedImage,
        "ads type": data.adsType || "Advertisement Type"
      }
    ];

    console.log('Input data prepared:', inputs);

    // Generate the PDF with plugins properly registered
    const pdf = await generate({
      template,
      inputs: inputs,
      plugins: { text, image }
    });

    console.log('PDF generated successfully, size:', pdf.length);
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('فشل في تحميل خلفية العقد. تأكد من وجود الملفات المطلوبة.');
      } else if (error.message.includes('template')) {
        throw new Error('خطأ في قالب العقد. يرجى المحاولة مرة أخرى.');
      } else if (error.message.includes('image')) {
        throw new Error('خطأ في معالجة الصورة. تأكد من صحة الصورة المرفوعة.');
      }
    }
    
    throw new Error('فشل في إنشاء ملف PDF: ' + (error as Error).message);
  }
}

export async function generateContractPDF(contractData: ContractData, additionalData?: Partial<InvoiceData>): Promise<Uint8Array> {
  try {
    console.log('Generating contract PDF for:', contractData);
    
    // Extract and format contract data
    const extractedData = extractContractData(contractData);
    
    // Merge with any additional data provided
    const finalData = { ...extractedData, ...additionalData };
    
    console.log('Contract data extracted for 2-page PDF:', finalData);
    
    // Use the existing generateInvoicePDF function
    return await generateInvoicePDF(finalData);
  } catch (error) {
    console.error('Error generating contract PDF:', error);
    throw new Error('فشل في إنشاء عقد PDF: ' + (error as Error).message);
  }
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'contract.pdf') {
  try {
    console.log('Downloading PDF with size:', pdfBytes.length);
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('PDF download initiated successfully');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('فشل في تحميل ملف PDF');
  }
}