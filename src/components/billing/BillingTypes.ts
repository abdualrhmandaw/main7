export interface ContractRow {
  Contract_Number: number;
  'Customer Name'?: string;
  customer_name?: string;
  'Ad Type'?: string;
  ad_type?: string;
  customer_category?: string;
  billboards_data?: any;
  billboards_count?: number;
  customer_id?: string;
}

export interface BillboardSize {
  size: string;
  level: string;
  quantity: number;
  faces: number; // عدد الأوجه
  print_price: number;
  install_price: number;
  adType?: string; // نوع الإعلان (وجه، تيبول)
}

export interface PrintInvoiceItem {
  contractNumber: string;
  adType: string;
  customerCategory: string;
  selected: boolean;
  sizes: BillboardSize[];
  total: number;
}

export interface InstallationPrintPricing {
  id: number;
  size: string;
  level: string;
  category: string;
  print_price: number;
  installation_price: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  items: InvoiceItem[];
  totalAmount: number;
  totalInWords: string;
  notes: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}