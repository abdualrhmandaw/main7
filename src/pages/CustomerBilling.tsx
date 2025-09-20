import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { Edit, Trash2, Printer, Plus, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Import types and utilities
import {
  PaymentRow,
  ContractRow,
  InvoiceItem
} from '@/components/billing/BillingTypes';

import {
  calculateRemainingBalanceAfterPayment,
  getContractDetails
} from '@/components/billing/BillingUtils';

import {
  generateReceiptHTML
} from '@/components/billing/PrintTemplates';

export default function CustomerBilling() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const paramId = params.get('id') || '';
  const paramName = params.get('name') || '';

  const [customerId, setCustomerId] = useState<string>(paramId);
  const [customerName, setCustomerName] = useState<string>(paramName);

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // Dialog states
  const [editReceiptOpen, setEditReceiptOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<PaymentRow | null>(null);
  const [editReceiptAmount, setEditReceiptAmount] = useState('');
  const [editReceiptMethod, setEditReceiptMethod] = useState('');
  const [editReceiptReference, setEditReceiptReference] = useState('');
  const [editReceiptNotes, setEditReceiptNotes] = useState('');
  const [editReceiptDate, setEditReceiptDate] = useState('');

  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtNotes, setDebtNotes] = useState('');
  const [debtDate, setDebtDate] = useState<string>(()=> new Date().toISOString().slice(0,10));

  // Print invoice states
  const [printInvoiceOpen, setPrintInvoiceOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [includeAccountBalance, setIncludeAccountBalance] = useState(false);

  // Account payment dialog states
  const [accountPaymentOpen, setAccountPaymentOpen] = useState(false);
  const [accountPaymentAmount, setAccountPaymentAmount] = useState('');
  const [accountPaymentMethod, setAccountPaymentMethod] = useState('');
  const [accountPaymentReference, setAccountPaymentReference] = useState('');
  const [accountPaymentNotes, setAccountPaymentNotes] = useState('');
  const [accountPaymentDate, setAccountPaymentDate] = useState<string>(()=> new Date().toISOString().slice(0,10));
  const [accountPaymentContract, setAccountPaymentContract] = useState('');
  const [accountPaymentToGeneral, setAccountPaymentToGeneral] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Resolve name if only id is provided or vice versa
        if (customerId && !customerName) {
          const { data } = await supabase.from('customers').select('name').eq('id', customerId).single();
          setCustomerName(data?.name || '');
        }
        if (!customerId && customerName) {
          const { data } = await supabase.from('customers').select('id').ilike('name', customerName).limit(1).maybeSingle();
          if (data?.id) setCustomerId(data.id);
        }
      } catch {}
    })();
  }, [customerId, customerName]);

  const loadData = async () => {
    try {
      let paymentsData: PaymentRow[] = [];
      if (customerId) {
        const p = await supabase.from('customer_payments').select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
        if (!p.error) paymentsData = p.data || [];
      }
      if ((!paymentsData || paymentsData.length === 0) && customerName) {
        const p = await supabase.from('customer_payments').select('*').ilike('customer_name', `%${customerName}%`).order('created_at', { ascending: true });
        if (!p.error) paymentsData = p.data || [];
      }
      setPayments(paymentsData);

      let contractsData: ContractRow[] = [];
      if (customerId) {
        const c = await supabase.from('Contract').select('*').eq('customer_id', customerId);
        if (!c.error) contractsData = c.data || [];
      }
      if ((!contractsData || contractsData.length === 0) && customerName) {
        const c = await supabase.from('Contract').select('*').ilike('Customer Name', `%${customerName}%`);
        if (!c.error) contractsData = c.data || [];
      }
      setContracts(contractsData);
    } catch (e) {
      console.error(e);
      toast.error('فشل تحميل البيانات');
    }
  };

  useEffect(() => { loadData(); }, [customerId, customerName]);

  const totalRent = useMemo(() => contracts.reduce((s, c) => s + (Number(c['Total Rent']) || 0), 0), [contracts]);
  
  // Calculate balance correctly: invoices and debts INCREASE balance, payments DECREASE balance
  const totalDebits = useMemo(() => {
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let totalDebit = totalRent; // Start with contract amounts
    
    // Add debits (invoices and debts increase the balance)
    sortedPayments.forEach(p => {
      const amount = Number(p.amount) || 0;
      if (p.entry_type === 'invoice' || p.entry_type === 'debt') {
        totalDebit += amount;
      }
    });
    
    return totalDebit;
  }, [payments, totalRent]);
  
  const totalCredits = useMemo(() => {
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Credits (payments reduce the balance)
    return sortedPayments.reduce((s, p) => {
      const amount = Number(p.amount) || 0;
      if (p.entry_type === 'receipt' || p.entry_type === 'account_payment') {
        return s + amount;
      }
      return s;
    }, 0);
  }, [payments]);
  
  const balance = Math.max(0, totalDebits - totalCredits);

  // Calculate account payments (payments not tied to specific contracts)
  const accountPayments = useMemo(() => 
    payments.filter(p => !p.contract_number || p.entry_type === 'account_payment')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0), [payments]);

  // Get active contracts (current date is between start and end date)
  const activeContracts = useMemo(() => {
    const today = new Date();
    return contracts.filter(contract => {
      const startDate = contract['Contract Date'] ? new Date(contract['Contract Date']) : null;
      const endDate = contract['End Date'] ? new Date(contract['End Date']) : null;
      
      if (!startDate || !endDate) return true; // Include if dates are missing
      
      return today >= startDate && today <= endDate;
    });
  }, [contracts]);

  const openEditReceipt = (payment: PaymentRow) => {
    setEditingReceipt(payment);
    setEditReceiptAmount(String(payment.amount || ''));
    setEditReceiptMethod(payment.method || '');
    setEditReceiptReference(payment.reference || '');
    setEditReceiptNotes(payment.notes || '');
    setEditReceiptDate(payment.paid_at ? payment.paid_at.split('T')[0] : '');
    setEditReceiptOpen(true);
  };

  const saveReceiptEdit = async () => {
    if (!editingReceipt) return;
    try {
      const { error } = await supabase.from('customer_payments').update({
        amount: Number(editReceiptAmount) || 0,
        method: editReceiptMethod || null,
        reference: editReceiptReference || null,
        notes: editReceiptNotes || null,
        paid_at: editReceiptDate ? new Date(editReceiptDate).toISOString() : null,
      }).eq('id', editingReceipt.id).select();
      if (error) { 
        console.error('Update error:', error);
        toast.error('فشل في تحديث الإيصال: ' + error.message); 
        return; 
      }
      toast.success('تم تحديث الإيصال');
      setEditReceiptOpen(false); setEditingReceipt(null);
      await loadData();
    } catch (e) {
      console.error(e); toast.error('خطأ في حفظ الإيصال');
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!window.confirm('تأكيد حذف الإيصال؟')) return;
    try {
      const { error } = await supabase.from('customer_payments').delete().eq('id', id);
      if (error) { toast.error('فشل الحذف'); return; }
      toast.success('تم الحذف');
      await loadData();
    } catch (e) { console.error(e); toast.error('خطأ في الحذف'); }
  };

  const printStatement = () => {
    type Entry = { date: Date; desc: string; debit: number; credit: number };
    const entries: Entry[] = [];
    // Add contracts as debit entries
    for (const c of contracts) {
      const d = c['Contract Date'] ? new Date(c['Contract Date'] as any) : (c['End Date'] ? new Date(c['End Date'] as any) : new Date());
      entries.push({
        date: d,
        desc: `قيمة العقد رقم ${String(c.Contract_Number||'')} - ${(c['Ad Type']||'')}`,
        debit: Number(c['Total Rent']) || 0,
        credit: 0,
      });
    }
    // Add payments in chronological order
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    for (const p of sortedPayments) {
      const dt = p.paid_at ? new Date(p.paid_at) : new Date(p.created_at);
      const typeLabel = p.entry_type === 'account_payment' ? 'دفعة على الحساب'
        : p.entry_type === 'receipt' ? 'إيصال'
        : p.entry_type === 'debt' ? 'دين سابق'
        : p.entry_type === 'invoice' ? 'فاتورة'
        : (p.entry_type || 'حركة');
      const contractLabel = p.contract_number ? ` - عقد ${p.contract_number}` : ' - الحساب العام';
      const isDebit = p.entry_type === 'debt' || p.entry_type === 'invoice';
      const amt = Number(p.amount) || 0;
      entries.push({
        date: dt,
        desc: `${typeLabel}${contractLabel}${p.reference ? ` - مرجع: ${p.reference}` : ''}${p.notes ? ` - ملاحظات: ${p.notes}` : ''}`,
        debit: isDebit ? amt : 0,
        credit: !isDebit ? amt : 0,
      });
    }
    // Sort by date
    entries.sort((a,b)=> a.date.getTime() - b.date.getTime());

    // Build rows with running balance
    let running = 0;
    const rowsHtml = entries.map(e => {
      running += e.debit - e.credit;
      return `<tr>
        <td>${e.date.toLocaleDateString('ar-LY')}</td>
        <td class="right">${e.desc}</td>
        <td>${e.debit ? e.debit.toLocaleString('ar-LY') : ''}</td>
        <td>${e.credit ? e.credit.toLocaleString('ar-LY') : ''}</td>
        <td>${running.toLocaleString('ar-LY')}</td>
      </tr>`;
    }).join('');

    const totalDebit = entries.reduce((s,e)=> s+e.debit, 0);
    const totalCredit = entries.reduce((s,e)=> s+e.credit, 0);

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8" />
      <title>كشف حساب - ${customerName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body{font-family:'Cairo',Arial,sans-serif;padding:20px;max-width:1000px;margin:auto;color:#f1f5f9;background:#0f172a}
        h1{font-size:24px;margin:0 0 8px;text-align:center;color:#fbbf24}
        .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0 14px}
        .card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:10px;box-shadow:0 2px 4px rgba(0,0,0,0.3)}
        table{width:100%;border-collapse:collapse;margin-top:8px;background:#1e293b;box-shadow:0 2px 4px rgba(0,0,0,0.3)}
        th,td{border:1px solid #475569;padding:8px;text-align:center;color:#f1f5f9}
        thead th{background:#334155;font-weight:700;color:#fbbf24}
        .right{text-align:right}
        tfoot td{font-weight:700;background:#422006;color:#fbbf24}
        .final{background:#164e63;color:#67e8f9}
        @media print{body{padding:0;background:white;color:black} .card{background:white;border:1px solid #ccc} table{background:white} th,td{color:black;border:1px solid #ccc} thead th{background:#f5f5f5;color:black} tfoot td{background:#fff7ed;color:black} .final{background:#ecfeff;color:black}}
      </style></head><body>
      <h1>كشف حساب</h1>
      <div class="summary">
        <div class="card">العميل: ${customerName}</div>
        <div class="card">إجمالي العقود: ${totalRent.toLocaleString('ar-LY')} د.ل</div>
        <div class="card">إجمالي المدفوع: ${totalCredits.toLocaleString('ar-LY')} د.ل</div>
        <div class="card">الرصيد الحالي: ${(totalDebit - totalCredit).toLocaleString('ar-LY')} د.ل</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th class="right">البيان</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>الرصيد</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr><td colspan="2">الإجماليات</td><td>${totalDebit.toLocaleString('ar-LY')}</td><td>${totalCredit.toLocaleString('ar-LY')}</td><td>${(totalDebit-totalCredit).toLocaleString('ar-LY')}</td></tr>
          <tr class="final"><td colspan="4">الرصيد النهائي</td><td>${(totalDebit-totalCredit).toLocaleString('ar-LY')} د.ل</td></tr>
        </tfoot>
      </table>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };

  const initializeInvoiceItems = () => {
    const items = contracts.map(contract => ({
      contractNumber: String(contract.Contract_Number || ''),
      adType: contract['Ad Type'] || '',
      quantity: 1,
      unitPrice: Number(contract['Total Rent']) || 0,
      total: Number(contract['Total Rent']) || 0
    }));
    setInvoiceItems(items);
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setInvoiceItems(newItems);
  };

  const printCustomInvoice = () => {
    const selectedItems = invoiceItems.filter(item => item.quantity > 0);
    
    if (selectedItems.length === 0) {
      toast.error('يرجى اختيار عنصر واحد على الأقل');
      return;
    }

    const totalAmount = selectedItems.reduce((sum, item) => sum + item.total, 0);
    const accountBalanceAmount = includeAccountBalance ? accountPayments : 0;
    const finalTotal = totalAmount + accountBalanceAmount;

    const itemRows = selectedItems.map(item => `
      <tr>
        <td>${item.contractNumber}</td>
        <td>${item.adType}</td>
        <td>${item.quantity}</td>
        <td>${item.unitPrice.toLocaleString('ar-LY')} د.ل</td>
        <td>${item.total.toLocaleString('ar-LY')} د.ل</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <title>فاتورة - ${customerName}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:900px;margin:auto;background:#0f172a;color:#f1f5f9}
        h1{font-size:24px;text-align:center;margin-bottom:20px;color:#fbbf24}
        .customer-info{margin-bottom:20px;background:#1e293b;padding:15px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:1px solid #334155}
        table{width:100%;border-collapse:collapse;margin:10px 0;background:#1e293b;box-shadow:0 2px 4px rgba(0,0,0,0.3)}
        th,td{border:1px solid #475569;padding:8px;text-align:center;color:#f1f5f9}
        th{background:#334155;font-weight:bold;color:#fbbf24}
        .total-row{background:#422006;font-weight:bold;color:#fbbf24}
        .footer{margin-top:30px;text-align:center;color:#94a3b8}
      </style></head><body>
      <h1>فاتورة مخصصة</h1>
      <div class="customer-info">
        <strong>العميل:</strong> ${customerName}<br>
        <strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-LY')}<br>
        <strong>عدد العناصر:</strong> ${selectedItems.length}
      </div>
      
      <h3>تفاصيل الفاتورة:</h3>
      <table>
        <thead>
          <tr>
            <th>رقم العقد</th>
            <th>نوع الإعلان</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr class="total-row">
            <td colspan="4">إجمالي الفاتورة</td>
            <td>${totalAmount.toLocaleString('ar-LY')} د.ل</td>
          </tr>
          ${includeAccountBalance ? `
          <tr>
            <td colspan="4">رصيد الحساب العام</td>
            <td>${accountBalanceAmount.toLocaleString('ar-LY')} د.ل</td>
          </tr>
          <tr class="total-row">
            <td colspan="4">الإجمالي النهائي</td>
            <td>${finalTotal.toLocaleString('ar-LY')} د.ل</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      
      <div class="footer">
        <p>شكراً لتعاملكم معنا</p>
      </div>
      
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    const w = window.open('', '_blank'); 
    if (w) { 
      w.document.open(); 
      w.document.write(html); 
      w.document.close(); 
    }
  };

  const printReceiptWithBackground = (payment: PaymentRow) => {
    const remainingAfterPayment = calculateRemainingBalanceAfterPayment(payment.id, payments, totalDebits);
    const html = generateReceiptHTML(customerName, payment, remainingAfterPayment);
    
    const w = window.open('', '_blank'); 
    if (w) { 
      w.document.open(); 
      w.document.write(html); 
      w.document.close(); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">فواتير وإيصالات العميل</h1>
            <p className="text-slate-300 mt-1">{customerName || '—'}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/customers')} 
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-yellow-400"
            >
              رجوع للزبائن
            </Button>
            <Button 
              onClick={() => navigate(`/admin/print-installation-invoice?customerId=${customerId}&customerName=${encodeURIComponent(customerName)}`)} 
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold"
            >
              <Printer className="h-4 w-4 ml-2" />
              فاتورة طباعة وتركيب
            </Button>
            <Button 
              onClick={() => {
                initializeInvoiceItems();
                setPrintInvoiceOpen(true);
              }} 
              className="bg-slate-700 hover:bg-slate-600 text-yellow-400 border border-slate-600"
            >
              <Printer className="h-4 w-4 ml-2" />
              إضافة فاتورة طباعة
            </Button>
            <Button 
              onClick={printStatement} 
              className="bg-slate-600 hover:bg-slate-500 text-slate-200"
            >
              طباعة كشف حساب
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-2">إجمالي العقود</div>
              <div className="text-2xl font-bold text-slate-200">{totalRent.toLocaleString('ar-LY')} د.ل</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-2">إجمالي المدفوع</div>
              <div className="text-2xl font-bold text-green-400">{totalCredits.toLocaleString('ar-LY')} د.ل</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-2">المتبقي</div>
              <div className="text-2xl font-bold text-red-400">{balance.toLocaleString('ar-LY')} د.ل</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-2">رصيد الحساب العام</div>
              <div className="text-2xl font-bold text-yellow-400">{accountPayments.toLocaleString('ar-LY')} د.ل</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-750 border-b border-slate-600">
            <CardTitle className="text-yellow-400">عقود العميل ({contracts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {contracts.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-750 border-b border-slate-600">
                      <TableHead className="text-slate-300 font-semibold">رقم العقد</TableHead>
                      <TableHead className="text-slate-300 font-semibold">نوع الإعلان</TableHead>
                      <TableHead className="text-slate-300 font-semibold">عدد اللوحات</TableHead>
                      <TableHead className="text-slate-300 font-semibold">تاريخ البداية</TableHead>
                      <TableHead className="text-slate-300 font-semibold">تاريخ النهاية</TableHead>
                      <TableHead className="text-slate-300 font-semibold">الحالة</TableHead>
                      <TableHead className="text-slate-300 font-semibold">القيمة الإجمالية</TableHead>
                      <TableHead className="text-slate-300 font-semibold">المدفوع للعقد</TableHead>
                      <TableHead className="text-slate-300 font-semibold">المتبقي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map(ct => {
                      const contractPayments = payments.filter(p => p.contract_number === String(ct.Contract_Number)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
                      const contractTotal = Number(ct['Total Rent']) || 0;
                      const contractRemaining = Math.max(0, contractTotal - contractPayments);
                      
                      // Check if contract is active - FIXED LOGIC
                      const today = new Date();
                      const startDate = ct['Contract Date'] ? new Date(ct['Contract Date']) : null;
                      const endDate = ct['End Date'] ? new Date(ct['End Date']) : null;
                      
                      // Contract is active if current date is between start and end dates
                      const isActive = startDate && endDate && today >= startDate && today <= endDate;
                      
                      return (
                        <TableRow key={String(ct.Contract_Number)} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">{String(ct.Contract_Number||'')}</TableCell>
                          <TableCell className="text-slate-300">{ct['Ad Type'] || '—'}</TableCell>
                          <TableCell className="font-semibold text-yellow-400">{ct.billboards_count || 0}</TableCell>
                          <TableCell className="text-slate-300">{ct['Contract Date'] ? new Date(ct['Contract Date']).toLocaleDateString('ar-LY') : '—'}</TableCell>
                          <TableCell className="text-slate-300">{ct['End Date'] ? new Date(ct['End Date']).toLocaleDateString('ar-LY') : '—'}</TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-900 text-green-300' : 'bg-slate-600 text-slate-300'}`}>
                              {isActive ? 'فعال' : 'منتهي'}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-200">{contractTotal.toLocaleString('ar-LY')} د.ل</TableCell>
                          <TableCell className="text-green-400 font-medium">{contractPayments.toLocaleString('ar-LY')} د.ل</TableCell>
                          <TableCell className={contractRemaining > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-medium'}>{contractRemaining.toLocaleString('ar-LY')} د.ل</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-center text-slate-400 py-8">لا توجد عقود</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-750 border-b border-slate-600">
            <CardTitle className="flex items-center justify-between">
              <span className="text-yellow-400">الدفعات والإيصالات ({payments.length})</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => { setAddDebtOpen(true); setDebtAmount(''); setDebtNotes(''); setDebtDate(new Date().toISOString().slice(0,10)); }} 
                  className="bg-red-900 hover:bg-red-800 text-red-200"
                >
                  إضافة دين سابق
                </Button>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold" 
                  onClick={() => { setAccountPaymentOpen(true); setAccountPaymentAmount(''); setAccountPaymentMethod(''); setAccountPaymentReference(''); setAccountPaymentNotes(''); setAccountPaymentDate(new Date().toISOString().slice(0,10)); setAccountPaymentContract(''); setAccountPaymentToGeneral(true); }}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  دفعة على الحساب
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-750 border-b border-slate-600">
                      <TableHead className="text-slate-300 font-semibold">رقم العقد</TableHead>
                      <TableHead className="text-slate-300 font-semibold">النوع</TableHead>
                      <TableHead className="text-slate-300 font-semibold">المبلغ</TableHead>
                      <TableHead className="text-slate-300 font-semibold">طريقة الدفع</TableHead>
                      <TableHead className="text-slate-300 font-semibold">المرجع</TableHead>
                      <TableHead className="text-slate-300 font-semibold">التاريخ</TableHead>
                      <TableHead className="text-slate-300 font-semibold">ملاحظات</TableHead>
                      <TableHead className="text-slate-300 font-semibold">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => {
                      return (
                        <TableRow key={p.id} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">
                            {p.contract_number || (p.entry_type === 'account_payment' ? 'حساب عام' : '—')}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              p.entry_type === 'account_payment' ? 'bg-green-900 text-green-300' :
                              p.entry_type === 'receipt' ? 'bg-blue-900 text-blue-300' :
                              p.entry_type === 'debt' ? 'bg-red-900 text-red-300' :
                              p.entry_type === 'invoice' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-slate-600 text-slate-300'
                            }`}>
                              {p.entry_type === 'account_payment' ? 'دفعة حساب' :
                               p.entry_type === 'receipt' ? 'إيصال' :
                               p.entry_type === 'debt' ? 'دين سابق' :
                               p.entry_type === 'invoice' ? 'فاتورة' :
                               p.entry_type || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-green-400 font-semibold">{(Number(p.amount)||0).toLocaleString('ar-LY')} د.ل</TableCell>
                          <TableCell className="text-slate-300">{p.method || '—'}</TableCell>
                          <TableCell className="text-slate-300">{p.reference || '—'}</TableCell>
                          <TableCell className="text-slate-300">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-LY') : '—'}</TableCell>
                          <TableCell className="text-slate-300">{p.notes || '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => printReceiptWithBackground(p)} 
                                className="bg-slate-700 hover:bg-slate-600 text-yellow-400"
                              >
                                طباعة إيصال
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openEditReceipt(p)} 
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => deleteReceipt(p.id)} 
                                className="bg-red-900 hover:bg-red-800 text-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-center text-slate-400 py-8">لا توجد دفعات</div>}
          </CardContent>
        </Card>

        {/* Account Payment Dialog */}
        <Dialog open={accountPaymentOpen} onOpenChange={setAccountPaymentOpen}>
          <DialogContent className="max-w-md bg-slate-800 border-slate-600" dir="rtl">
            <DialogHeader className="border-b border-slate-600 pb-4">
              <DialogTitle className="text-lg font-bold text-yellow-400 text-right">دفعة على الحساب</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                <div className="text-sm text-slate-300 mb-1 font-medium">العميل:</div>
                <div className="font-semibold text-yellow-400">{customerName}</div>
              </div>
              
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                <div className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  اختر وجهة الدفعة:
                </div>
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                    accountPaymentToGeneral 
                      ? 'border-yellow-500 bg-yellow-900/20 text-yellow-300' 
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}>
                    <input
                      type="radio"
                      name="payment-destination"
                      checked={accountPaymentToGeneral}
                      onChange={() => setAccountPaymentToGeneral(true)}
                      className="w-4 h-4 text-yellow-600"
                    />
                    <span className="text-sm font-medium">إضافة إلى الحساب العام</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                    !accountPaymentToGeneral 
                      ? 'border-yellow-500 bg-yellow-900/20 text-yellow-300' 
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}>
                    <input
                      type="radio"
                      name="payment-destination"
                      checked={!accountPaymentToGeneral}
                      onChange={() => setAccountPaymentToGeneral(false)}
                      className="w-4 h-4 text-yellow-600"
                    />
                    <span className="text-sm font-medium">إضافة إلى عقد محدد</span>
                  </label>
                </div>
              </div>

              {!accountPaymentToGeneral && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 block">العقد</label>
                  <Select value={accountPaymentContract} onValueChange={setAccountPaymentContract}>
                    <SelectTrigger className="text-right bg-slate-700 border-slate-600 text-slate-200">
                      <SelectValue placeholder="اختر عقدًا" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-slate-700 border-slate-600">
                      {contracts.map((ct)=> (
                        <SelectItem key={String(ct.Contract_Number)} value={String(ct.Contract_Number)} className="text-slate-200">
                          عقد رقم {String(ct.Contract_Number)} - {ct['Ad Type']}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Contract Details for Account Payment */}
              {!accountPaymentToGeneral && accountPaymentContract && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-green-400" />
                    <span className="font-semibold text-sm text-green-300">تفاصيل العقد</span>
                  </div>
                  {(() => {
                    const contractDetails = getContractDetails(accountPaymentContract, contracts, payments);
                    if (!contractDetails) return null;
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">إجمالي العقد:</span>
                          <span className="font-semibold text-slate-200">{contractDetails.total.toLocaleString('ar-LY')} د.ل</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">المدفوع:</span>
                          <span className="font-semibold text-green-400">{contractDetails.paid.toLocaleString('ar-LY')} د.ل</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-600 pt-1">
                          <span className="text-slate-400">المتبقي:</span>
                          <span className={`font-bold ${contractDetails.remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {contractDetails.remaining.toLocaleString('ar-LY')} د.ل
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">المبلغ</label>
                <Input 
                  type="number" 
                  value={accountPaymentAmount} 
                  onChange={(e)=> setAccountPaymentAmount(e.target.value)}
                  className="text-right bg-slate-700 border-slate-600 text-slate-200"
                  placeholder="أدخل المبلغ"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">طريقة الدفع</label>
                <Select value={accountPaymentMethod} onValueChange={setAccountPaymentMethod}>
                  <SelectTrigger className="text-right bg-slate-700 border-slate-600 text-slate-200">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="نقدي" className="text-slate-200">نقدي</SelectItem>
                    <SelectItem value="تحويل بنكي" className="text-slate-200">تحويل بنكي</SelectItem>
                    <SelectItem value="شيك" className="text-slate-200">شيك</SelectItem>
                    <SelectItem value="بطاقة ائتمان" className="text-slate-200">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">المرجع</label>
                <Input 
                  value={accountPaymentReference} 
                  onChange={(e)=> setAccountPaymentReference(e.target.value)}
                  className="text-right bg-slate-700 border-slate-600 text-slate-200"
                  placeholder="رقم المرجع (اختياري)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">التاريخ</label>
                <Input 
                  type="date" 
                  value={accountPaymentDate} 
                  onChange={(e)=> setAccountPaymentDate(e.target.value)}
                  className="text-right bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">ملاحظات</label>
                <Input 
                  value={accountPaymentNotes} 
                  onChange={(e)=> setAccountPaymentNotes(e.target.value)}
                  className="text-right bg-slate-700 border-slate-600 text-slate-200"
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
                <Button 
                  variant="outline" 
                  onClick={()=> setAccountPaymentOpen(false)} 
                  className="px-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  إلغاء
                </Button>
                <Button onClick={async () => {
                  try {
                    if (!accountPaymentAmount) { toast.error('أدخل المبلغ'); return; }
                    const amt = Number(accountPaymentAmount);
                    if (!amt || amt <= 0) { toast.error('المبلغ يجب أن يكون أكبر من صفر'); return; }
                    
                    if (!accountPaymentToGeneral && !accountPaymentContract) {
                      toast.error('يرجى اختيار عقد');
                      return;
                    }
                    
                    const contractNumber = accountPaymentToGeneral ? null : 
                      (accountPaymentContract ? (isNaN(Number(accountPaymentContract)) ? null : Number(accountPaymentContract)) : null);
                    
                    const payload = {
                      customer_id: customerId || null,
                      customer_name: customerName,
                      contract_number: contractNumber,
                      amount: amt,
                      method: accountPaymentMethod || null,
                      reference: accountPaymentReference || null,
                      notes: accountPaymentNotes || null,
                      paid_at: accountPaymentDate ? new Date(accountPaymentDate).toISOString() : new Date().toISOString(),
                      entry_type: accountPaymentToGeneral ? 'account_payment' : 'receipt',
                    };
                    
                    console.log('Saving account payment with payload:', payload);
                    
                    const { error, data } = await supabase.from('customer_payments').insert(payload).select();
                    if (error) { 
                      console.error('Insert error:', error);
                      toast.error('فشل الحفظ: ' + error.message); 
                      return; 
                    }
                    
                    console.log('Account payment saved successfully:', data);
                    toast.success('تم الحفظ بنجاح');
                    setAccountPaymentOpen(false);
                    
                    // Reset form
                    setAccountPaymentAmount('');
                    setAccountPaymentMethod('');
                    setAccountPaymentReference('');
                    setAccountPaymentNotes('');
                    setAccountPaymentContract('');
                    setAccountPaymentToGeneral(true);
                    
                    await loadData();
                  } catch (e) { 
                    console.error('Unexpected error:', e); 
                    toast.error('خطأ غير متوقع: ' + (e as Error).message); 
                  }
                }} className="px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold">
                  حفظ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Print Custom Invoice Dialog */}
        <Dialog open={printInvoiceOpen} onOpenChange={setPrintInvoiceOpen}>
          <DialogContent className="max-w-4xl bg-slate-800 border-slate-600">
            <DialogHeader className="border-b border-slate-600 pb-4">
              <DialogTitle className="text-yellow-400">فاتورة طباعة مخصصة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="text-sm text-slate-400">العميل: {customerName}</div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-slate-300">تخصيص عناصر الفاتورة:</label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-600 rounded p-3 bg-slate-750">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-slate-600">
                        <TableHead className="text-slate-300 font-semibold">رقم العقد</TableHead>
                        <TableHead className="text-slate-300 font-semibold">نوع الإعلان</TableHead>
                        <TableHead className="text-slate-300 font-semibold">الكمية</TableHead>
                        <TableHead className="text-slate-300 font-semibold">سعر الوحدة</TableHead>
                        <TableHead className="text-slate-300 font-semibold">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item, index) => (
                        <TableRow key={item.contractNumber} className="hover:bg-slate-750 border-slate-700">
                          <TableCell className="text-slate-200">{item.contractNumber}</TableCell>
                          <TableCell className="text-slate-300">{item.adType}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', Number(e.target.value) || 0)}
                              className="w-20 bg-slate-700 border-slate-600 text-slate-200"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(index, 'unitPrice', Number(e.target.value) || 0)}
                              className="w-32 bg-slate-700 border-slate-600 text-slate-200"
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-yellow-400">
                            {item.total.toLocaleString('ar-LY')} د.ل
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-account-balance"
                  checked={includeAccountBalance}
                  onCheckedChange={setIncludeAccountBalance}
                />
                <label htmlFor="include-account-balance" className="text-sm cursor-pointer text-slate-300">
                  إضافة رصيد الحساب العام ({accountPayments.toLocaleString('ar-LY')} د.ل)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
                <Button 
                  variant="outline" 
                  onClick={() => setPrintInvoiceOpen(false)} 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  إلغاء
                </Button>
                <Button 
                  onClick={printCustomInvoice} 
                  className="bg-slate-700 hover:bg-slate-600 text-yellow-400"
                >
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة الفاتورة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit receipt dialog */}
        <Dialog open={editReceiptOpen} onOpenChange={setEditReceiptOpen}>
          <DialogContent className="max-w-md bg-slate-800 border-slate-600">
            <DialogHeader className="border-b border-slate-600 pb-4">
              <DialogTitle className="text-yellow-400">تعديل الإيصال</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-300">المبلغ</label>
                <Input type="number" value={editReceiptAmount} onChange={(e)=> setEditReceiptAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">طريقة الدفع</label>
                <Select value={editReceiptMethod} onValueChange={setEditReceiptMethod}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="نقدي" className="text-slate-200">نقدي</SelectItem>
                    <SelectItem value="تحويل بنكي" className="text-slate-200">تحويل بنكي</SelectItem>
                    <SelectItem value="شيك" className="text-slate-200">شيك</SelectItem>
                    <SelectItem value="بطاقة ائتمان" className="text-slate-200">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">المرجع</label>
                <Input value={editReceiptReference} onChange={(e)=> setEditReceiptReference(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">تاريخ الدفع</label>
                <Input type="date" value={editReceiptDate} onChange={(e)=> setEditReceiptDate(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">ملاحظات</label>
                <Input value={editReceiptNotes} onChange={(e)=> setEditReceiptNotes(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
                <Button 
                  variant="outline" 
                  onClick={()=> setEditReceiptOpen(false)} 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  إلغاء
                </Button>
                <Button 
                  onClick={saveReceiptEdit} 
                  className="bg-slate-700 hover:bg-slate-600 text-yellow-400"
                >
                  حفظ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add previous debt */}
        <Dialog open={addDebtOpen} onOpenChange={setAddDebtOpen}>
          <DialogContent className="max-w-md bg-slate-800 border-slate-600">
            <DialogHeader className="border-b border-slate-600 pb-4">
              <DialogTitle className="text-yellow-400">إضافة دين سابق</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-300">المبلغ</label>
                <Input type="number" value={debtAmount} onChange={(e)=> setDebtAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">ملاحظات</label>
                <Input value={debtNotes} onChange={(e)=> setDebtNotes(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">التاريخ</label>
                <Input type="date" value={debtDate} onChange={(e)=> setDebtDate(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
                <Button 
                  variant="outline" 
                  onClick={()=> setAddDebtOpen(false)} 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  إلغاء
                </Button>
                <Button onClick={async () => {
                  try {
                    if (!debtAmount) { toast.error('أدخل المبلغ'); return; }
                    const amt = Number(debtAmount);
                    if (!amt || amt <= 0) { toast.error('المبلغ يجب أن يكون أكبر من صفر'); return; }
                    
                    const payload = {
                      customer_id: customerId || null,
                      customer_name: customerName,
                      contract_number: null, // Debt is not tied to specific contract
                      amount: amt,
                      method: 'دين سابق',
                      reference: null,
                      notes: debtNotes || null,
                      paid_at: debtDate ? new Date(debtDate).toISOString() : new Date().toISOString(),
                      entry_type: 'debt',
                    };
                    
                    console.log('Saving debt with payload:', payload);
                    
                    const { error } = await supabase.from('customer_payments').insert(payload).select();
                    if (error) { 
                      console.error('Debt insert error:', error); 
                      toast.error('فشل الحفظ: ' + error.message); 
                      return; 
                    }
                    toast.success('تمت الإضافة');
                    setAddDebtOpen(false);
                    
                    // Reset form
                    setDebtAmount('');
                    setDebtNotes('');
                    
                    await loadData();
                  } catch (e) { 
                    console.error('Debt save error:', e); 
                    toast.error('خطأ غير متوقع: ' + (e as Error).message); 
                  }
                }} className="bg-red-900 hover:bg-red-800 text-red-200">
                  حفظ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}