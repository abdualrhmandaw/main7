import { PaymentRow } from './BillingTypes';
import { generateModernReceiptHTML, numberToArabicWords, ModernReceiptData } from './ModernReceiptTemplate';

export const generateReceiptHTML = (
  customerName: string, 
  payment: PaymentRow, 
  remainingBalance: number
): string => {
  const receiptData: ModernReceiptData = {
    receiptNumber: payment.reference || payment.id || 'غير محدد',
    date: payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('ar-LY') : new Date().toLocaleDateString('ar-LY'),
    customerName: customerName,
    amount: Number(payment.amount) || 0,
    amountInWords: numberToArabicWords(Number(payment.amount) || 0) + ' دينار ليبي',
    paymentMethod: payment.method || undefined,
    reference: payment.reference || undefined,
    notes: payment.notes || undefined,
    contractNumber: payment.contract_number ? String(payment.contract_number) : undefined,
    remainingBalance: remainingBalance
  };

  return generateModernReceiptHTML(receiptData);
};

// Legacy function for backward compatibility
export const generateSimpleReceiptHTML = (
  customerName: string,
  amount: number,
  receiptNumber: string,
  date: string,
  notes?: string
): string => {
  const receiptData: ModernReceiptData = {
    receiptNumber,
    date,
    customerName,
    amount,
    amountInWords: numberToArabicWords(amount) + ' دينار ليبي',
    notes
  };

  return generateModernReceiptHTML(receiptData);
};