import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { Printer, ArrowRight, Plus, Minus, RefreshCw, Database, Trash2, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateModernInvoiceHTML } from '@/components/billing/InvoiceTemplates';

// Import types and utilities
import {
  ContractRow,
  InstallationPrintPricing,
  BillboardSize
} from '@/components/billing/BillingTypes';

import {
  parseBillboardSizes
} from '@/components/billing/BillingUtils';

// Helper function to convert number to Arabic words
const numberToArabicWords = (num: number): string => {
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
  
  return num.toString();
};

interface SelectedContract {
  contractNumber: string;
  adType: string;
  customerCategory: string;
  sizes: BillboardSize[];
  total: number;
}

export default function PrintInstallationInvoice() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const customerId = params.get('customerId') || '';
  const customerName = params.get('customerName') || '';

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [contractBillboards, setContractBillboards] = useState<Record<string, any[]>>({});
  const [installationPricingData, setInstallationPricingData] = useState<InstallationPrintPricing[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<SelectedContract[]>([]);
  const [printInvoiceReason, setPrintInvoiceReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setDebugInfo('جاري تحميل البيانات...');
      
      // Load contracts
      let contractsData: ContractRow[] = [];
      
      if (customerId) {
        setDebugInfo('البحث بمعرف العميل...');
        const { data: contractsByCustomerId, error: error1 } = await supabase
          .from('Contract')
          .select('*')
          .eq('customer_id', customerId);
        
        if (!error1 && contractsByCustomerId && contractsByCustomerId.length > 0) {
          contractsData = contractsByCustomerId;
          setDebugInfo(`تم العثور على ${contractsData.length} عقد بمعرف العميل`);
        }
      }
      
      if (contractsData.length === 0 && customerName) {
        setDebugInfo('البحث باسم العميل...');
        const { data: contractsByName, error: error2 } = await supabase
          .from('Contract')
          .select('*')
          .ilike('Customer Name', `%${customerName.trim()}%`);
        
        if (!error2 && contractsByName && contractsByName.length > 0) {
          contractsData = contractsByName;
          setDebugInfo(`تم العثور على ${contractsData.length} عقد باسم العميل`);
        }
      }
      
      setContracts(contractsData);
      
      // Load billboards for each contract
      const billboardsMap: Record<string, any[]> = {};
      for (const contract of contractsData) {
        const contractNumber = contract.Contract_Number;
        if (contractNumber) {
          const { data: billboards, error: billboardsError } = await supabase
            .from('billboards')
            .select('*')
            .eq('Contract_Number', contractNumber);
          
          if (!billboardsError && billboards) {
            billboardsMap[String(contractNumber)] = billboards;
          }
        }
      }
      setContractBillboards(billboardsMap);

      // Load pricing data
      const { data: pricingData, error: pricingError } = await supabase
        .from('installation_print_pricing')
        .select('*');
      
      if (pricingError) {
        const defaultPricing: InstallationPrintPricing[] = [
          { id: 1, size: '3x4', level: 'أرضي', category: 'عادي', print_price: 50, installation_price: 30 },
          { id: 2, size: '3x4', level: 'أول', category: 'عادي', print_price: 60, installation_price: 40 },
          { id: 3, size: '4x6', level: 'أرضي', category: 'عادي', print_price: 80, installation_price: 50 },
        ];
        setInstallationPricingData(defaultPricing);
        setDebugInfo(`تم إنشاء ${defaultPricing.length} سعر افتراضي`);
      } else if (pricingData && pricingData.length > 0) {
        setInstallationPricingData(pricingData);
        setDebugInfo(`تم تحميل ${pricingData.length} سعر من قاعدة البيانات`);
      } else {
        const defaultPricing: InstallationPrintPricing[] = [
          { id: 1, size: '3x4', level: 'أرضي', category: 'عادي', print_price: 50, installation_price: 30 },
          { id: 2, size: '3x4', level: 'أول', category: 'عادي', print_price: 60, installation_price: 40 },
          { id: 3, size: '4x6', level: 'أرضي', category: 'عادي', print_price: 80, installation_price: 50 }
        ];
        setInstallationPricingData(defaultPricing);
        setDebugInfo(`تم إنشاء ${defaultPricing.length} سعر افتراضي (الجدول فارغ)`);
      }
      
    } catch (e) {
      console.error('Error in loadData:', e);
      setDebugInfo('خطأ في تحميل البيانات: ' + String(e));
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [customerId, customerName]);

  const availableContracts = contracts.filter(contract => {
    const hasRequiredFields = contract['Customer Name'] || contract.customer_name;
    const isNotSelected = !selectedContracts.some(selected => 
      selected.contractNumber === String(contract.Contract_Number)
    );
    return hasRequiredFields && isNotSelected;
  });

  const addContractToInvoice = (contract: ContractRow) => {
    const contractNumber = String(contract.Contract_Number || '');
    const customerCategory = contract.customer_category || 'عادي';
    const billboards = contractBillboards[contractNumber] || [];
    
    const sizes = parseBillboardSizes(
      contractNumber,
      contract.billboards_data || null,
      contract.billboards_count || 0,
      customerCategory,
      installationPricingData,
      billboards
    );

    const newContract: SelectedContract = {
      contractNumber: contractNumber,
      adType: contract['Ad Type'] || contract.ad_type || 'غير محدد',
      customerCategory: customerCategory,
      sizes: sizes,
      total: 0
    };

    // Calculate initial total
    newContract.total = sizes.reduce((sum, size) => 
      sum + (size.quantity * ((size.print_price || 0) + (size.install_price || 0))), 0);

    setSelectedContracts(prev => [...prev, newContract]);
    toast.success(`تم إضافة عقد رقم ${contractNumber} للفاتورة`);
  };

  const removeContractFromInvoice = (contractNumber: string) => {
    setSelectedContracts(prev => prev.filter(contract => contract.contractNumber !== contractNumber));
    toast.success(`تم إزالة عقد رقم ${contractNumber} من الفاتورة`);
  };

  const updateContractSizeItem = (contractIndex: number, sizeIndex: number, field: keyof BillboardSize, value: any) => {
    setSelectedContracts(prev => {
      const newContracts = [...prev];
      const contract = { ...newContracts[contractIndex] };
      const newSizes = [...contract.sizes];
      newSizes[sizeIndex] = { ...newSizes[sizeIndex], [field]: value };
      
      // Recalculate total
      contract.total = newSizes.reduce((sum, size) => 
        sum + (size.quantity * ((size.print_price || 0) + (size.install_price || 0))), 0);
      
      contract.sizes = newSizes;
      newContracts[contractIndex] = contract;
      
      return newContracts;
    });
  };

  const printInstallationInvoice = async () => {
    if (selectedContracts.length === 0) {
      toast.error('يرجى إضافة عقد واحد على الأقل للفاتورة');
      return;
    }

    if (!printInvoiceReason.trim()) {
      toast.error('يرجى كتابة سبب الطباعة');
      return;
    }

    const totalAmount = selectedContracts.reduce((sum, contract) => sum + contract.total, 0);

    if (totalAmount <= 0) {
      toast.error('إجمالي الفاتورة يجب أن يكون أكبر من صفر');
      return;
    }

    // Save invoice to customer account
    try {
      const payload = {
        customer_id: customerId || null,
        customer_name: customerName,
        contract_number: selectedContracts.length === 1 ? selectedContracts[0].contractNumber : null,
        amount: totalAmount,
        method: 'فاتورة طباعة وتركيب',
        reference: `#${Date.now().toString().slice(-6)}`,
        notes: printInvoiceReason,
        paid_at: new Date().toISOString(),
        entry_type: 'invoice',
      };
      
      const { error } = await supabase.from('customer_payments').insert(payload);
      if (error) {
        console.error('Error saving invoice:', error);
        toast.error('فشل في حفظ الفاتورة: ' + error.message);
        return;
      }
      
      toast.success('تم حفظ الفاتورة في حساب العميل');
    } catch (e) {
      console.error('Error saving invoice:', e);
      toast.error('خطأ في حفظ الفاتورة');
      return;
    }

    // Prepare invoice data
    const invoiceItems = selectedContracts.flatMap(contract => 
      contract.sizes.map(size => ({
        description: `${contract.adType} - ${size.size} (${size.level}) - عقد ${contract.contractNumber} - ${size.faces} وجه`,
        quantity: size.quantity,
        unitPrice: (size.print_price || 0) + (size.install_price || 0),
        total: size.quantity * ((size.print_price || 0) + (size.install_price || 0))
      }))
    );

    const invoiceData = {
      invoiceNumber: `${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('ar-LY'),
      customerName: customerName,
      items: invoiceItems,
      totalAmount: totalAmount,
      totalInWords: numberToArabicWords(totalAmount) + ' دينار ليبي',
      notes: printInvoiceReason
    };

    // Generate and print invoice
    const html = generateModernInvoiceHTML(invoiceData);
    const w = window.open('', '_blank'); 
    if (w) { 
      w.document.open(); 
      w.document.write(html); 
      w.document.close(); 
    }

    // Navigate back
    navigate(`/admin/customer-billing?id=${customerId}&name=${encodeURIComponent(customerName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-primary text-xl mb-2">جاري التحميل...</div>
          <div className="text-sm text-muted-foreground">{debugInfo}</div>
        </div>
      </div>
    );
  }

  const totalInvoiceAmount = selectedContracts.reduce((sum, contract) => sum + contract.total, 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">فاتورة طباعة وتركيب</h1>
            <p className="text-muted-foreground mt-1">{customerName || '—'}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={loadData}
              disabled={loading}
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/admin/customer-billing?id=${customerId}&name=${encodeURIComponent(customerName)}`)} 
              className="border-border text-foreground hover:bg-muted"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              رجوع لفواتير العميل
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm text-blue-800">
                <strong>معلومات التشخيص:</strong> {debugInfo}
              </div>
              <div className="text-xs text-blue-600 mt-2">
                عدد العقود المتاحة: {availableContracts.length} | العقود المختارة: {selectedContracts.length} | إجمالي الفاتورة: {totalInvoiceAmount} د.ل
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Contracts */}
          <Card className="bg-card border-border">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-primary flex items-center gap-2">
                <Database className="h-5 w-5" />
                العقود المتاحة ({availableContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableContracts.length > 0 ? (
                  availableContracts.map((contract, index) => (
                    <div 
                      key={`available-${index}`}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">عقد رقم {contract.Contract_Number}</h4>
                        <p className="text-sm text-muted-foreground">{contract['Ad Type'] || contract.ad_type || 'غير محدد'}</p>
                        <p className="text-xs text-muted-foreground">
                          فئة العميل: {contract.customer_category || 'عادي'} | 
                          اللوحات: {contractBillboards[String(contract.Contract_Number)]?.length || 0}
                        </p>
                      </div>
                      <Button
                        onClick={() => addContractToInvoice(contract)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        إضافة
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>لا توجد عقود متاحة للإضافة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Contracts */}
          <Card className="bg-card border-border">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-primary flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                العقود المختارة ({selectedContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedContracts.length > 0 ? (
                  selectedContracts.map((contract, index) => (
                    <div 
                      key={`selected-${index}`}
                      className="p-3 border border-primary/20 rounded-lg bg-primary/5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">عقد رقم {contract.contractNumber}</h4>
                          <p className="text-sm text-muted-foreground">{contract.adType}</p>
                          <p className="text-xs text-muted-foreground">
                            إجمالي الأوجه: {contract.sizes.reduce((sum, size) => sum + size.faces, 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">{contract.total.toLocaleString('ar-LY')} د.ل</span>
                          <Button
                            onClick={() => removeContractFromInvoice(contract.contractNumber)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>لم يتم اختيار أي عقود بعد</p>
                    <p className="text-xs mt-1">اختر عقود من القائمة اليسرى</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Details */}
        {selectedContracts.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-primary">تفاصيل المقاسات والأسعار</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {selectedContracts.map((contract, contractIndex) => (
                  <div key={`details-${contractIndex}`} className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-lg text-foreground mb-3">
                      عقد رقم {contract.contractNumber} - {contract.adType}
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead className="text-foreground font-semibold">المقاس</TableHead>
                            <TableHead className="text-foreground font-semibold">المستوى</TableHead>
                            <TableHead className="text-foreground font-semibold">عدد الأوجه</TableHead>
                            <TableHead className="text-foreground font-semibold">الكمية</TableHead>
                            <TableHead className="text-foreground font-semibold">سعر الطباعة</TableHead>
                            <TableHead className="text-foreground font-semibold">سعر التركيب</TableHead>
                            <TableHead className="text-foreground font-semibold">الإجمالي</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contract.sizes.map((size, sizeIndex) => (
                            <TableRow key={`size-${contractIndex}-${sizeIndex}`} className="hover:bg-muted/10">
                              <TableCell className="font-medium">{size.size}</TableCell>
                              <TableCell>{size.level}</TableCell>
                              <TableCell className="text-center">
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm font-semibold">
                                  {size.faces}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateContractSizeItem(contractIndex, sizeIndex, 'quantity', Math.max(1, (size.quantity || 1) - 1))}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={size.quantity}
                                    onChange={(e) => updateContractSizeItem(contractIndex, sizeIndex, 'quantity', Number(e.target.value) || 1)}
                                    className="w-16 h-8 text-center"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateContractSizeItem(contractIndex, sizeIndex, 'quantity', (size.quantity || 1) + 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={size.print_price || 0}
                                  onChange={(e) => updateContractSizeItem(contractIndex, sizeIndex, 'print_price', Number(e.target.value) || 0)}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={size.install_price || 0}
                                  onChange={(e) => updateContractSizeItem(contractIndex, sizeIndex, 'install_price', Number(e.target.value) || 0)}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell className="font-semibold text-primary">
                                {(size.quantity * ((size.print_price || 0) + (size.install_price || 0))).toLocaleString('ar-LY')} د.ل
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Summary & Actions */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">سبب الطباعة والتركيب</Label>
              <Textarea 
                value={printInvoiceReason} 
                onChange={(e) => setPrintInvoiceReason(e.target.value)}
                className="min-h-[80px]"
                placeholder="اكتب سبب الطباعة والتركيب..."
              />
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-foreground">إجمالي الفاتورة:</span>
                  <span className="text-primary text-2xl">
                    {totalInvoiceAmount.toLocaleString('ar-LY')} د.ل
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/admin/customer-billing?id=${customerId}&name=${encodeURIComponent(customerName)}`)} 
              >
                إلغاء
              </Button>
              <Button 
                onClick={printInstallationInvoice} 
                disabled={selectedContracts.length === 0 || !printInvoiceReason.trim() || totalInvoiceAmount <= 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Printer className="h-4 w-4 ml-2" />
                طباعة وحفظ الفاتورة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}