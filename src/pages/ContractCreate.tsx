import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Search, Calendar, User, DollarSign, X, Send, Calculator, Plus as PlusIcon, Trash2 } from 'lucide-react';
import { loadBillboards } from '@/services/billboardService';
import type { Billboard } from '@/types';
import { createContract } from '@/services/contractService';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';

export default function ContractCreate() {
  const navigate = useNavigate();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextContractNumber, setNextContractNumber] = useState<string>('');

  // selection
  const [selected, setSelected] = useState<string[]>([]);

  // customers combobox (id+name)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);

  // pricing categories from database
  const [pricingCategories, setPricingCategories] = useState<string[]>([]);
  
  // pricing data from database
  const [pricingData, setPricingData] = useState<any[]>([]);

  // filters - matching ContractEdit exactly
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string>('all');
  const [size, setSize] = useState<string>('all');
  const [status, setStatus] = useState<string>('available'); // Show available boards by default

  // form fields (sidebar)
  const [customerName, setCustomerName] = useState('');
  const [adType, setAdType] = useState('');
  const [pricingCategory, setPricingCategory] = useState<string>('عادي');
  const [startDate, setStartDate] = useState('');
  const [pricingMode, setPricingMode] = useState<'months' | 'days'>('months');
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [durationDays, setDurationDays] = useState<number>(0);
  const [endDate, setEndDate] = useState('');
  const [rentCost, setRentCost] = useState<number>(0);
  const [userEditedRentCost, setUserEditedRentCost] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [installments, setInstallments] = useState<Array<{ amount: number; months: number; paymentType: string }>>([]);
  const [showSettlement, setShowSettlement] = useState(false);

  // Function to normalize size format (handle both 4x12 and 12x4)
  const normalizeSizeFormat = (size: string): string[] => {
    if (!size) return [size];
    const parts = size.split('x');
    if (parts.length === 2) {
      const [a, b] = parts;
      return [`${a}x${b}`, `${b}x${a}`]; // Return both possible formats
    }
    return [size];
  };

  // Get next contract number
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('Contract')
          .select('Contract_Number')
          .order('Contract_Number', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastNumber = parseInt(data[0].Contract_Number) || 0;
          setNextContractNumber(String(lastNumber + 1));
        } else {
          setNextContractNumber('1');
        }
      } catch (e) {
        console.warn('Failed to get next contract number, using 1');
        setNextContractNumber('1');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadBillboards();
        setBillboards(data);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'فشل تحميل اللوحات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any).from('customers').select('id,name').order('name', { ascending: true });
        if (!error && Array.isArray(data)) {
          setCustomers((data as any) || []);
        }
      } catch (e) {
        console.warn('load customers failed');
      }
    })();
  }, []);

  // Load pricing categories from database
  useEffect(() => {
    (async () => {
      try {
        // Get unique categories from pricing table
        const { data, error } = await (supabase as any)
          .from('pricing')
          .select('customer_category')
          .order('customer_category', { ascending: true });

        if (!error && Array.isArray(data)) {
          const categories = Array.from(new Set(data.map((item: any) => item.customer_category)));
          setPricingCategories(categories);
        } else {
          // Fallback to static categories if database fails
          setPricingCategories(['عادي', 'مسوق', 'شركات', 'المدينة']);
        }
      } catch (e) {
        console.warn('Failed to load pricing categories, using defaults');
        setPricingCategories(['عادي', 'مسوق', 'شركات', 'المدينة']);
      }
    })();
  }, []);

  // Load pricing data from database
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('pricing')
          .select('*')
          .order('size', { ascending: true });

        if (!error && Array.isArray(data)) {
          setPricingData(data);
          console.log('Loaded pricing data:', data);
        }
      } catch (e) {
        console.warn('Failed to load pricing data');
      }
    })();
  }, []);

  // derive cities and sizes
  const cities = useMemo(
    () => Array.from(new Set(billboards.map((b) => b.city || (b as any).City))).filter(Boolean) as string[],
    [billboards]
  );
  const sizes = useMemo(
    () => Array.from(new Set(billboards.map((b) => b.size || (b as any).Size))).filter(Boolean) as string[],
    [billboards]
  );

  // compute end date when start or duration changes (month = 30 days)
  useEffect(() => {
    if (!startDate) return;
    const d = new Date(startDate);
    const end = new Date(d);
    if (pricingMode === 'months') {
      const days = Math.max(0, Number(durationMonths || 0)) * 30;
      end.setDate(end.getDate() + days);
    } else {
      const days = Math.max(0, Number(durationDays || 0));
      end.setDate(end.getDate() + days);
    }
    const iso = end.toISOString().split('T')[0];
    setEndDate(iso);
  }, [startDate, durationMonths, durationDays, pricingMode]);

  // Enhanced price lookup function that checks database first with size normalization
  const getPriceFromDatabase = (size: string, level: any, customer: string, months: number): number | null => {
    console.log('Looking for pricing:', { size, level, customer, months });
    
    // Normalize level to string and handle different cases
    const normalizedLevel = String(level || '').toUpperCase();
    
    // Get all possible size formats (4x12 and 12x4)
    const possibleSizes = normalizeSizeFormat(size);
    console.log('Checking sizes:', possibleSizes);
    
    // Find pricing from database - try all possible size formats
    let dbRow = null;
    for (const possibleSize of possibleSizes) {
      dbRow = pricingData.find(p => 
        p.size === possibleSize && 
        String(p.billboard_level || '').toUpperCase() === normalizedLevel && 
        p.customer_category === customer
      );
      if (dbRow) {
        console.log(`Found match with size format: ${possibleSize}`);
        break;
      }
    }
    
    console.log('Found database row:', dbRow);
    
    if (dbRow) {
      // Map months to database columns - note the quotes around column names with numbers
      const monthColumnMap: { [key: number]: string } = {
        1: 'one_month',
        2: '2_months', 
        3: '3_months',
        6: '6_months',
        12: 'full_year'
      };
      
      const column = monthColumnMap[months];
      if (column && dbRow[column] !== null && dbRow[column] !== undefined && dbRow[column] > 0) {
        console.log(`Found price in column ${column}:`, dbRow[column]);
        return Number(dbRow[column]);
      }
    }
    
    console.log('No price found in database, returning null');
    return null;
  };

  const getDailyPriceFromDatabase = (size: string, level: any, customer: string): number | null => {
    // Normalize level to string and handle different cases
    const normalizedLevel = String(level || '').toUpperCase();
    
    // Get all possible size formats (4x12 and 12x4)
    const possibleSizes = normalizeSizeFormat(size);
    
    // Find pricing from database - try all possible size formats
    let dbRow = null;
    for (const possibleSize of possibleSizes) {
      dbRow = pricingData.find(p => 
        p.size === possibleSize && 
        String(p.billboard_level || '').toUpperCase() === normalizedLevel && 
        p.customer_category === customer
      );
      if (dbRow) break;
    }
    
    if (dbRow && dbRow.one_day !== null && dbRow.one_day !== undefined && dbRow.one_day > 0) {
      return Number(dbRow.one_day);
    }
    
    return null;
  };

  // estimated price based on pricing tiers (supports months/days)
  const estimatedTotal = useMemo(() => {
    const sel = billboards.filter((b) => selected.includes(String((b as any).ID)));
    if (pricingMode === 'months') {
      const months = Math.max(0, Number(durationMonths || 0));
      if (!months) return 0;
      return sel.reduce((acc, b) => {
        const size = (b.size || (b as any).Size || '') as string;
        const level = ((b as any).level || (b as any).Level) as any;
        
        // Try database first
        let price = getPriceFromDatabase(size, level, pricingCategory, months);
        
        if (price !== null) return acc + price;

        // No price found - return 0
        console.warn(`No price found for size: ${size}, level: ${level}, category: ${pricingCategory}, months: ${months}`);
        return acc + 0;
      }, 0);
    } else {
      const days = Math.max(0, Number(durationDays || 0));
      if (!days) return 0;
      return sel.reduce((acc, b) => {
        const size = (b.size || (b as any).Size || '') as string;
        const level = ((b as any).level || (b as any).Level) as any;
        
        // Try database first
        let daily = getDailyPriceFromDatabase(size, level, pricingCategory);
        
        if (daily !== null) {
          return acc + daily * days;
        }

        // No daily price found - return 0
        console.warn(`No daily price found for size: ${size}, level: ${level}, category: ${pricingCategory}`);
        return acc + 0;
      }, 0);
    }
  }, [billboards, selected, durationMonths, durationDays, pricingMode, pricingCategory, pricingData]);

  const baseTotal = useMemo(() => (rentCost && rentCost > 0 ? rentCost : estimatedTotal), [rentCost, estimatedTotal]);

  // auto update rent cost with new estimation unless user manually edited it
  useEffect(() => {
    if (!userEditedRentCost) {
      setRentCost(estimatedTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedTotal]);

  const discountAmount = useMemo(() => {
    if (!discountValue) return 0;
    return discountType === 'percent'
      ? (baseTotal * Math.max(0, Math.min(100, discountValue)) / 100)
      : Math.max(0, discountValue);
  }, [discountType, discountValue, baseTotal]);

  const finalTotal = useMemo(() => Math.max(0, baseTotal - discountAmount), [baseTotal, discountAmount]);

  useEffect(() => {
    if (installments.length === 0 && finalTotal > 0) {
      const half = Math.round((finalTotal / 2) * 100) / 100;
      setInstallments([
        { amount: half, months: 1, paymentType: 'شهري' },
        { amount: finalTotal - half, months: 2, paymentType: 'شهري' },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalTotal]);

  const distributeEvenly = (count: number) => {
    count = Math.max(1, Math.min(6, Math.floor(count)));
    const even = Math.floor((finalTotal / count) * 100) / 100;
    const list = Array.from({ length: count }).map((_, i) => ({
      amount: i === count - 1 ? Math.round((finalTotal - even * (count - 1)) * 100) / 100 : even,
      months: Math.max(1, i + 1),
      paymentType: 'شهري',
    }));
    setInstallments(list);
  };

  const cumulativeMonthsTo = (index: number) =>
    installments.slice(0, index + 1).reduce((acc, it) => acc + (Number(it.months) || 0), 0);
  const dueDateFor = (idx: number) => {
    if (!startDate) return '';
    const d = new Date(startDate);
    const inst = installments[idx];
    if (inst.paymentType === 'شهري') {
      d.setMonth(d.getMonth() + cumulativeMonthsTo(idx));
    } else if (inst.paymentType === 'شهرين') {
      d.setMonth(d.getMonth() + (idx + 1) * 2);
    } else if (inst.paymentType === 'ثلاثة أشهر') {
      d.setMonth(d.getMonth() + (idx + 1) * 3);
    }
    return d.toISOString().split('T')[0];
  };

  // تصفية اللوحات المحسنة - إصلاح فلتر المتاحة
  const filtered = useMemo(() => {
    const today = new Date();
    const NEAR_DAYS = 30; // قريب الانتهاء خلال 30 يوماً

    const isNearExpiring = (b: any) => {
      const raw = b.Rent_End_Date || b.rent_end_date || b.rentEndDate || b['End Date'];
      if (!raw) return false;
      const end = new Date(raw);
      if (isNaN(end.getTime())) return false;
      const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
      return diff > 0 && diff <= NEAR_DAYS;
    };

    const list = billboards.filter((b: any) => {
      const text = b.name || b.Billboard_Name || '';
      const loc = b.location || b.Nearest_Landmark || '';
      const c = String(b.city || b.City || '');
      const s = String(b.size || b.Size || '');
      const st = String(b.status || b.Status || '').toLowerCase();

      // التحقق من التطابق مع الفلاتر
      const matchesQ = !q || text.toLowerCase().includes(q.toLowerCase()) || loc.toLowerCase().includes(q.toLowerCase());
      const matchesCity = city === 'all' || c === city;
      const matchesSize = size === 'all' || s === size;

      // تحديد حالة اللوحة بدقة أكبر
      const hasContract = !!(b.contractNumber || b.Contract_Number || b.contract_number);
      const isAvailable = st === 'available' || (!hasContract && st !== 'rented');
      const isNear = isNearExpiring(b);
      const isRented = hasContract || st === 'rented';
      
      // منطق العرض حسب فلتر الحالة - إصلاح المنطق
      let shouldShow = false;
      if (status === 'all') {
        shouldShow = true; // عرض جميع اللوحات
      } else if (status === 'available') {
        shouldShow = isAvailable && !isRented; // عرض المتاحة فقط (ليست مؤجرة)
      } else if (status === 'rented') {
        shouldShow = isRented && !isNear; // عرض المؤجرة فقط (وليست قريبة الانتهاء)
      }

      return matchesQ && matchesCity && matchesSize && shouldShow;
    });

    // ترتيب اللوحات: المتاحة أولاً، ثم القريبة من الانتهاء، ثم المؤجرة
    return list.sort((a: any, b: any) => {
      const aHasContract = !!(a.contractNumber || a.Contract_Number || a.contract_number);
      const bHasContract = !!(b.contractNumber || b.Contract_Number || b.contract_number);
      const aStatus = (a.status || a.Status || '').toLowerCase();
      const bStatus = (b.status || b.Status || '').toLowerCase();
      
      const aAvailable = aStatus === 'available' || (!aHasContract && aStatus !== 'rented');
      const bAvailable = bStatus === 'available' || (!bHasContract && bStatus !== 'rented');
      
      const aNear = isNearExpiring(a);
      const bNear = isNearExpiring(b);
      
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;
      if (aNear && !bNear) return -1;
      if (!aNear && bNear) return 1;
      
      return 0;
    }).slice(0, 20); // زيادة الحد الأعلى إلى 20 عنصر
  }, [billboards, q, city, size, status]);

  const toggleSelect = (b: Billboard) => {
    const id = String((b as any).ID);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const removeSelected = (id: string) => setSelected((prev) => prev.filter((x) => x !== id));

  const submit = async () => {
    try {
      if (!customerName || !startDate || !endDate || selected.length === 0) {
        toast.error('يرجى تعبئة بيانات الزبون والتواريخ واختيار لوحات');
        return;
      }

      // Prepare billboards data for saving in contract
      const selectedBillboardsData = billboards
        .filter((b) => selected.includes(String((b as any).ID)))
        .map((b) => ({
          id: String((b as any).ID),
          name: (b as any).name || (b as any).Billboard_Name || '',
          location: (b as any).location || (b as any).Nearest_Landmark || '',
          city: (b as any).city || (b as any).City || '',
          size: (b as any).size || (b as any).Size || '',
          level: (b as any).level || (b as any).Level || '',
          price: Number((b as any).price) || 0,
          image: (b as any).image || ''
        }));

      const payload: any = {
        customer_name: customerName,
        start_date: startDate,
        end_date: endDate,
        rent_cost: finalTotal,
        discount: discountAmount,
        ad_type: adType,
        billboard_ids: selected,
        contract_number: nextContractNumber,
        // Add customer_category to save pricing category
        customer_category: pricingCategory,
        // Save billboards data in the contract for future reference
        billboards_data: JSON.stringify(selectedBillboardsData),
        billboards_count: selectedBillboardsData.length,
      };
      if (installments.length > 0) payload['Payment 1'] = installments[0]?.amount || 0;
      if (installments.length > 1) payload['Payment 2'] = installments[1]?.amount || 0;
      if (installments.length > 2) payload['Payment 3'] = installments[2]?.amount || 0;
      payload['Total Paid'] = 0;
      payload['Remaining'] = finalTotal;
      if (customerId) payload.customer_id = customerId;
      
      await createContract(payload);
      toast.success('تم إنشاء العقد مع حفظ بيانات اللوحات بنجاح');
      navigate('/admin/contracts');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'فشل إنشاء العقد');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إنشاء عقد جديد {nextContractNumber && `#${nextContractNumber}`}</h1>
          <p className="text-muted-foreground">إنشاء عقد إيجار جديد مع تحديد اللوحات والشروط</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/contracts')}>
            عودة
          </Button>
          <Button onClick={submit} className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-smooth">
            إنشاء العقد
          </Button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* main area */}
        <div className="flex-1 space-y-6">
          {/* selected on top */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                اللوحات المرتبطة ({selected.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selected.length === 0 ? (
                <p className="text-muted-foreground">لا توجد لوحات</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {billboards.filter((b) => selected.includes(String((b as any).ID))).map((b) => {
                    const size = (b as any).size || (b as any).Size || '';
                    const level = (b as any).level || (b as any).Level;
                    let totalForBoard = 0;
                    if (pricingMode === 'months') {
                      const months = Math.max(0, Number(durationMonths || 0));
                      // Try database first
                      let price = getPriceFromDatabase(size as string, level as any, pricingCategory, months);
                      totalForBoard = price !== null ? price : 0;
                    } else {
                      const days = Math.max(0, Number(durationDays || 0));
                      // Try database first
                      let daily = getDailyPriceFromDatabase(size as string, level as any, pricingCategory);
                      totalForBoard = daily !== null ? daily * days : 0;
                    }
                    return (
                      <Card key={(b as any).ID} className="overflow-hidden">
                        <CardContent className="p-0">
                          {(b as any).image && (
                            <img src={(b as any).image} alt={(b as any).name || (b as any).Billboard_Name} className="w-full h-36 object-cover" />
                          )}
                          <div className="p-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{(b as any).name || (b as any).Billboard_Name}</div>
                              <div className="text-xs text-muted-foreground">{(b as any).location || (b as any).Nearest_Landmark}</div>
                              <div className="text-xs">الحجم: {(b as any).size || (b as any).Size} • المستوى: {(b as any).level || (b as any).Level || 'A'} • {(b as any).city || (b as any).City}</div>
                              <div className="text-xs font-medium mt-1">السعر: {totalForBoard.toLocaleString('ar-LY')} د.ل {pricingMode === 'months' ? `/${durationMonths} شهر` : `/${durationDays} يوم`}</div>
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => removeSelected(String((b as any).ID))}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* filters */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                البحث والتصفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 relative min-w-[220px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="بحث عن لوحة" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
                </div>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="المدينة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المدن</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="المقاس" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المقاسات</SelectItem>
                    {sizes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="available">المتاحة فقط</SelectItem>
                    <SelectItem value="rented">المؤجرة فقط</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={pricingCategory} onValueChange={setPricingCategory}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="فئة السعر" /></SelectTrigger>
                  <SelectContent>
                    {pricingCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* grid below */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                اللوحات المتاحة ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">جاري التحميل...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((b) => {
                    const isSelected = selected.includes(String((b as any).ID));
                    const st = ((b as any).status || (b as any).Status || '').toString().toLowerCase();
                    const hasContract = !!(b as any).contractNumber || !!(b as any).Contract_Number || !!(b as any).contract_number;
                    const isAvailable = st === 'available' || (!hasContract && st !== 'rented');
                    
                    // تحديد ما إذا كانت اللوحة قريبة من الانتهاء
                    const today = new Date();
                    const endDate = (b as any).Rent_End_Date || (b as any).rent_end_date || (b as any).rentEndDate;
                    const isNearExpiring = endDate ? (() => {
                      const end = new Date(endDate);
                      if (isNaN(end.getTime())) return false;
                      const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
                      return diff > 0 && diff <= 30;
                    })() : false;

                    const canSelect = isAvailable || isNearExpiring || isSelected;
                    
                    return (
                      <Card key={(b as any).ID} className={`overflow-hidden ${!canSelect ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-0">
                          {(b as any).image && (
                            <img src={(b as any).image} alt={(b as any).name || (b as any).Billboard_Name} className="w-full h-40 object-cover" />
                          )}
                          <div className="p-3 space-y-1">
                            <div className="font-semibold">{(b as any).name || (b as any).Billboard_Name}</div>
                            <div className="text-xs text-muted-foreground">{(b as any).location || (b as any).Nearest_Landmark}</div>
                            <div className="text-xs">{(b as any).city || (b as any).City} • {(b as any).size || (b as any).Size} • المستوى: {(b as any).level || (b as any).Level || 'A'}</div>
                            <div className="text-sm font-medium">{(Number((b as any).price) || 0).toLocaleString('ar-LY')} د.ل / شهر</div>
                            
                            {/* عرض حالة اللوحة */}
                            <div className="flex items-center gap-2 text-xs">
                              {isAvailable && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">متاحة</span>
                              )}
                              {isNearExpiring && (
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">قريبة الانتهاء</span>
                              )}
                              {!isAvailable && !isNearExpiring && (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">مؤجرة</span>
                              )}
                            </div>
                            
                            <div className="pt-2">
                              <Button 
                                size="sm" 
                                variant={isSelected ? 'destructive' : 'outline'} 
                                onClick={() => toggleSelect(b as any)} 
                                disabled={!canSelect}
                                className="w-full"
                              >
                                {isSelected ? 'إزالة' : 'إضافة'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  لا توجد لوحات تطابق معايير البحث
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* sidebar */}
        <div className="w-full lg:w-[360px] space-y-4">
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                بيانات الزبون
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm">اسم الزبون</label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {customerName ? customerName : 'اختر أو اكتب اسم الزبون'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Command>
                      <CommandInput placeholder="ابحث أو اكتب اسم جديد" value={customerQuery} onValueChange={setCustomerQuery} />
                      <CommandList>
                        <CommandEmpty>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={async () => {
                              if (customerQuery.trim()) {
                                const name = customerQuery.trim();
                                try {
                                  const { data: newC, error } = await (supabase as any)
                                    .from('customers')
                                    .insert({ name })
                                    .select()
                                    .single();
                                  if (!error && newC && (newC as any).id) {
                                    setCustomerId((newC as any).id);
                                    setCustomerName(name);
                                    setCustomers((prev) => [{ id: (newC as any).id, name }, ...prev]);
                                  }
                                } catch (e) {
                                  console.warn(e);
                                }
                                setCustomerOpen(false);
                                setCustomerQuery('');
                              }
                            }}
                          >
                            إضافة "{customerQuery}" كعميل جديد
                          </Button>
                        </CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setCustomerName(c.name);
                                setCustomerId(c.id);
                                setCustomerOpen(false);
                                setCustomerQuery('');
                              }}
                            >
                              {c.name}
                            </CommandItem>
                          ))}
                          {customerQuery && !customers.some((x) => x.name === customerQuery.trim()) && (
                            <CommandItem
                              value={`__add_${customerQuery}`}
                              onSelect={async () => {
                                const name = customerQuery.trim();
                                try {
                                  const { data: newC, error } = await (supabase as any)
                                    .from('customers')
                                    .insert({ name })
                                    .select()
                                    .single();
                                  if (!error && newC && (newC as any).id) {
                                    setCustomerId((newC as any).id);
                                    setCustomerName(name);
                                    setCustomers((prev) => [{ id: (newC as any).id, name }, ...prev]);
                                  }
                                } catch (e) {
                                  console.warn(e);
                                }
                                setCustomerOpen(false);
                                setCustomerQuery('');
                              }}
                            >
                              إضافة "{customerQuery}" كعميل جديد
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm">نوع الإعلان</label>
                <Input value={adType} onChange={(e) => setAdType(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">فئة السعر</label>
                <Select value={pricingCategory} onValueChange={setPricingCategory}>
                  <SelectTrigger className="border-2 border-primary/20">
                    <SelectValue placeholder="الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1">
                  الفئة المحددة: <span className="font-medium text-primary">{pricingCategory}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                المدة والتواريخ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm">تاريخ البداية</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">نظام الإيجار</label>
                <Select value={pricingMode} onValueChange={(v)=>setPricingMode(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نظام الإيجار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="months">شهري</SelectItem>
                    <SelectItem value="days">يومي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pricingMode === 'months' ? (
                <div>
                  <label className="text-sm">عدد الأشهر</label>
                  <Select value={String(durationMonths)} onValueChange={(v) => setDurationMonths(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عدد الأشهر" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 12].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} {m === 1 ? 'شهر' : 'أشهر'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <label className="text-sm">عدد الأيام</label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={durationDays} 
                    onChange={(e) => setDurationDays(Number(e.target.value) || 0)} 
                    placeholder="أدخل عدد الأيام"
                  />
                </div>
              )}
              <div>
                <label className="text-sm">تاريخ النهاية</label>
                <Input type="date" value={endDate} readOnly disabled />
              </div>
            </CardContent>
          </Card>

          {/* Enhanced installments section */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                تقسيم الدفعات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={6}
                  placeholder="عدد الدفعات (1-6)"
                  onChange={(e) => distributeEvenly(parseInt(e.target.value || '1'))}
                />
                <Button type="button" variant="outline" onClick={() => distributeEvenly(3)} className="gap-2">
                  <Calculator className="h-4 w-4" />تقسيم تلقائي
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInstallments([...installments, { amount: 0, months: 1, paymentType: 'شهري' }])}
                  className="gap-2"
                >
                  <PlusIcon className="h-4 w-4" />إضافة
                </Button>
              </div>
              <div className="space-y-2">
                {installments.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">المبلغ</label>
                      <Input
                        type="number"
                        value={inst.amount}
                        onChange={(e) => {
                          const v = Number(e.target.value || 0);
                          setInstallments((list) => list.map((it, i) => (i === idx ? { ...it, amount: v } : it)));
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">الأشهر</label>
                      <Select
                        value={String(inst.months)}
                        onValueChange={(v) => setInstallments((list) => list.map((it, i) => (i === idx ? { ...it, months: parseInt(v) } : it)))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="الأشهر" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 6, 12].map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">نوع الدفع</label>
                      <Select
                        value={inst.paymentType}
                        onValueChange={(v) => setInstallments((list) => list.map((it, i) => (i === idx ? { ...it, paymentType: v } : it)))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="شهري">شهري</SelectItem>
                          <SelectItem value="شهرين">كل شهرين</SelectItem>
                          <SelectItem value="ثلاثة أشهر">كل ثلاثة أشهر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">تاريخ الاستحقاق</label>
                      <Input value={dueDateFor(idx)} readOnly />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="destructive" onClick={() => setInstallments((list) => list.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">الإجمالي: {finalTotal.toLocaleString('ar-LY')} د.ل</div>
            </CardContent>
          </Card>

          {/* settlement and sharing */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                التسوية والإرسال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowSettlement((s) => !s)}>
                  تسوية العقد
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const text = `عقد جديد\nالزبون: ${customerName}\nمن ${startDate} إلى ${endDate}\nالإجمالي: ${finalTotal.toLocaleString('ar-LY')} د.ل\nاللوحات: ${selected.length}\nالدفعات: ${installments
                      .map((i, idx) => `#${idx + 1}:${i.amount}د.ل ${i.paymentType}`)
                      .join(' | ')}`;
                    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Send className="h-4 w-4" /> إرسال عبر الواتساب
                </Button>
              </div>
              {showSettlement && (
                <div className="space-y-2 text-sm">
                  {(() => {
                    const s = startDate ? new Date(startDate) : null;
                    const e = endDate ? new Date(endDate) : null;
                    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime()))
                      return <div className="text-muted-foreground">يرجى تحديد تاريخ البداية والنهاية</div>;
                    const today = new Date();
                    const end = e < today ? e : today;
                    const totalDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
                    const consumedDays = Math.max(0, Math.min(totalDays, Math.ceil((end.getTime() - s.getTime()) / 86400000)));
                    const ratio = consumedDays / totalDays;
                    const currentDue = Math.round(finalTotal * ratio);
                    return (
                      <div className="space-y-1">
                        <div>
                          تاريخ انتهاء العقد: <span className="font-medium">{endDate}</span>
                        </div>
                        <div>
                          الأيام المستهلكة: <span className="font-medium">{consumedDays}</span> / {totalDays}
                        </div>
                        <div>
                          التكلفة الحالية عند التسوية: <span className="font-bold text-primary">{currentDue.toLocaleString('ar-LY')} د.ل</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> التكلفة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                تقدير تلقائي حسب الفئة والمدة: {estimatedTotal.toLocaleString('ar-LY')} د.ل
              </div>
              <Input
                type="number"
                value={rentCost}
                onChange={(e) => {
                  setRentCost(Number(e.target.value));
                  setUserEditedRentCost(true);
                }}
                placeholder="تكلفة قبل الخصم (تُحدّث تلقائياً)"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm">نوع الخصم</label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="نوع الخصم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">نسبة %</SelectItem>
                      <SelectItem value="amount">قيمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm">قيمة الخصم</label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="text-sm">الإجمالي قبل الخصم: {baseTotal.toLocaleString('ar-LY')} د.ل</div>
              <div className="text-sm">الخصم: {discountAmount.toLocaleString('ar-LY')} د.ل</div>
              <div className="text-base font-semibold">الإجمالي بعد الخصم: {finalTotal.toLocaleString('ar-LY')} د.ل</div>
              <Button className="w-full" onClick={submit}>
                إنشاء العقد
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/admin/contracts')}>
                إلغاء
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}