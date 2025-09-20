import { PaymentRow, ContractRow, InstallationPrintPricing } from './BillingTypes';

export interface ContractDetails {
  total: number;
  paid: number;
  remaining: number;
}

export const calculateRemainingBalanceAfterPayment = (
  paymentId: string,
  payments: PaymentRow[],
  totalDebits: number
): number => {
  // Sort payments chronologically
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Find the index of the current payment
  const paymentIndex = sortedPayments.findIndex(p => p.id === paymentId);
  if (paymentIndex === -1) return totalDebits;
  
  // Calculate total credits up to and including this payment
  let totalCredits = 0;
  for (let i = 0; i <= paymentIndex; i++) {
    const payment = sortedPayments[i];
    if (payment.entry_type === 'receipt' || payment.entry_type === 'account_payment') {
      totalCredits += Number(payment.amount) || 0;
    }
  }
  
  return Math.max(0, totalDebits - totalCredits);
};

export const getContractDetails = (
  contractNumber: string,
  contracts: ContractRow[],
  payments: PaymentRow[]
): ContractDetails | null => {
  const contract = contracts.find(c => String(c.Contract_Number) === contractNumber);
  if (!contract) return null;
  
  const total = Number(contract['Total Rent']) || 0;
  const paid = payments
    .filter(p => p.contract_number === contractNumber)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  return {
    total,
    paid,
    remaining: Math.max(0, total - paid)
  };
};

export interface BillboardSize {
  size: string;
  level: string;
  quantity: number;
  print_price?: number;
  install_price?: number;
}

export const parseBillboardSizes = (
  contractNumber: string,
  billboardsData: string | Record<string, unknown> | null,
  billboardsCount: number,
  customerCategory: string,
  pricingData: InstallationPrintPricing[],
  contractBillboards: any[]
): BillboardSize[] => {
  console.log('Parsing billboard sizes:', { 
    contractNumber,
    billboardsData, 
    billboardsCount, 
    customerCategory, 
    pricingDataLength: pricingData.length,
    contractBillboardsLength: contractBillboards.length
  });
  
  const sizes: BillboardSize[] = [];
  
  try {
    let billboards: any[] = [];
    
    // First, try to use the billboards from the database query
    if (contractBillboards && contractBillboards.length > 0) {
      billboards = contractBillboards;
      console.log('Using billboards from database query:', billboards.length);
    }
    // Fallback: try to parse billboards_data
    else if (billboardsData && typeof billboardsData === 'string' && billboardsData.trim()) {
      try {
        const parsed = JSON.parse(billboardsData);
        if (Array.isArray(parsed)) {
          billboards = parsed;
        } else if (parsed && typeof parsed === 'object') {
          billboards = [parsed];
        }
        console.log('Using billboards from billboards_data:', billboards.length);
      } catch (e) {
        console.warn('Failed to parse billboards_data:', e);
      }
    }
    // Last resort: use billboards_count to create default entries
    else if (billboardsCount > 0) {
      console.log('Creating default billboards based on count:', billboardsCount);
      for (let i = 0; i < billboardsCount; i++) {
        billboards.push({
          size: '3x4',
          level: 'أرضي'
        });
      }
    }
    
    // Process each billboard
    if (billboards.length > 0) {
      billboards.forEach((billboard: any, index: number) => {
        let size = '3x4'; // default
        let level = 'أرضي'; // default
        
        // Extract size from various possible field names
        if (billboard.Size) {
          size = String(billboard.Size);
        } else if (billboard.size) {
          size = String(billboard.size);
        }
        
        // Extract level from various possible field names
        if (billboard.Level) {
          level = String(billboard.Level);
        } else if (billboard.level) {
          level = String(billboard.level);
        } else if (billboard.billboard_level) {
          level = String(billboard.billboard_level);
        }
        
        // Normalize size format (replace × or * with x)
        size = size.replace(/×|\*/g, 'x');
        
        // Find pricing for this size, level, and category
        const pricing = pricingData.find(p => 
          p.size === size && 
          p.level === level && 
          p.category === customerCategory
        );
        
        console.log(`Billboard ${index + 1}: size=${size}, level=${level}, category=${customerCategory}`, pricing ? 'Found pricing' : 'No pricing found');
        
        sizes.push({
          size,
          level,
          quantity: 1,
          print_price: pricing?.print_price || 50, // Default fallback
          install_price: pricing?.installation_price || 30 // Default fallback
        });
      });
    }
    
    // If still no sizes, create at least one default
    if (sizes.length === 0) {
      console.log('Creating single default size entry');
      
      const defaultPricing = pricingData.find(p => 
        p.size === '3x4' && 
        p.level === 'أرضي' && 
        p.category === customerCategory
      ) || pricingData.find(p => p.category === customerCategory) || pricingData[0];
      
      sizes.push({
        size: '3x4',
        level: 'أرضي',
        quantity: 1,
        print_price: defaultPricing?.print_price || 50,
        install_price: defaultPricing?.installation_price || 30
      });
    }
    
  } catch (error) {
    console.error('Error parsing billboard sizes:', error);
    
    // Emergency fallback: create default sizes
    const count = Math.max(1, billboardsCount || 1);
    for (let i = 0; i < count; i++) {
      const defaultPricing = pricingData.find(p => p.category === customerCategory);
      
      sizes.push({
        size: '3x4',
        level: 'أرضي',
        quantity: 1,
        print_price: defaultPricing?.print_price || 50,
        install_price: defaultPricing?.installation_price || 30
      });
    }
  }
  
  console.log('Final parsed sizes:', sizes);
  return sizes;
};