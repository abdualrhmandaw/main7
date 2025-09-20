import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Billboard } from '@/types';
import { fetchAllBillboards } from '@/services/supabaseService';
import { BillboardGridCard } from '@/components/BillboardGridCard';
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Filter, MapPin, Star, Play, ArrowDown, LogOut, User, BarChart3, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { addRequest } from '@/services/bookingService';
import { getPriceFor, CUSTOMERS } from '@/data/pricing';
import { useAuth } from '@/contexts/AuthContext';
import heroBillboard from '@/assets/hero-billboard.jpg';
import { BRAND_NAME, BRAND_LOGO } from '@/lib/branding';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
export { default as ContractPDFDialog } from './ContractPDFDialog';
const Index = () => {
  const { user, logout, isAdmin } = useAuth();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [selectedBillboards, setSelectedBillboards] = useState<Billboard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('متاحة');
  const [loading, setLoading] = useState(true);
  const [myOnly, setMyOnly] = useState(false);
  const [selectedContractNumbers, setSelectedContractNumbers] = useState<string[]>([]);
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('all');
  const [adTypeFilter, setAdTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 9;

  useEffect(() => {
    loadBillboards();
  }, []);

  const loadBillboards = async () => {
    try {
      const data = await fetchAllBillboards();
      setBillboards(data);
    } catch (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: "تعذر تحميل اللوحا   الإعلانية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBillboards = billboards.filter(billboard => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || [
      billboard.Billboard_Name,
      billboard.District,
      billboard.City,
      billboard.Municipality,
      billboard.Nearest_Landmark,
      billboard.Size,
      billboard.Level,
      (billboard as any).Customer_Name,
      (billboard as any).Ad_Type,
      (billboard as any)['Ad Type'],
      String(billboard.ID),
      String((billboard as any).Contract_Number ?? (billboard as any)['Contract Number'] ?? '')
    ].some((v) => String(v || '').toLowerCase().includes(q));
    const matchesSize = sizeFilter === 'all' || billboard.Size === sizeFilter;
    const matchesMunicipality = municipalityFilter === 'all' || (billboard.Municipality ?? '') === municipalityFilter;
    const adTypeVal = String((billboard as any).Ad_Type ?? (billboard as any)['Ad Type'] ?? '');
    const matchesAdType = adTypeFilter === 'all' || adTypeVal === adTypeFilter;

    const statusVal = String((billboard as any).Status || (billboard as any).status || '').trim();
    const isAvailable = statusVal === 'متاح' || (!billboard.Contract_Number && statusVal !== 'صيانة');
    const isBooked = statusVal === 'مؤجر' || statusVal === 'محجوز';
    const isMaintenance = statusVal === 'صيانة';

    // near expiry = within 20 days
    let isNearExpiry = false;
    if (billboard.Rent_End_Date) {
      try {
        const endDate = new Date(billboard.Rent_End_Date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isNearExpiry = diffDays <= 20 && diffDays > 0;
      } catch {
        isNearExpiry = false;
      }
    }

    const allowed = Array.isArray((user as any)?.allowedCustomers)
      ? ((user as any).allowedCustomers as string[]).map((s) => String(s).trim().toLowerCase())
      : [];
    const customerName = String(billboard.Customer_Name ?? '').trim().toLowerCase();
    const isAllowedBoard = allowed.length > 0 && allowed.includes(customerName);

    const finalStatusMatch =
      (statusFilter === 'متاحة' && isAvailable) ||
      (statusFilter === 'مح  وز' && isBooked) ||
      (statusFilter === 'قريبة الانتهاء' && isNearExpiry);

    const boardContract = String((billboard as any).Contract_Number ?? (billboard as any)['Contract Number'] ?? '').trim();
    const appliesContractFilter = isAdmin ? selectedContractNumbers.length > 0 : (myOnly && selectedContractNumbers.length > 0);
    const matchesContract = !appliesContractFilter || (boardContract && selectedContractNumbers.includes(boardContract));

    const matchesMyOnly = !myOnly || isAllowedBoard;

    return matchesSearch && matchesSize && matchesMunicipality && matchesAdType && finalStatusMatch && matchesMyOnly && matchesContract;
  });

  const handleToggleSelect = (billboard: Billboard) => {
    setSelectedBillboards(prev => {
      const isSelected = prev.find(b => b.ID === billboard.ID);
      if (isSelected) {
        return prev.filter(b => b.ID !== billboard.ID);
      } else {
        return [...prev, billboard];
      }
    });
  };

  const handleRemoveBillboard = (billboardId: string) => {
    setSelectedBillboards(prev => prev.filter(b => b.ID.toString() !== billboardId));
  };

  const handleSubmitBooking = () => {
    const months = 1; // افتراضي
    const customer = CUSTOMERS[0];
    const total = selectedBillboards.reduce((s,b)=> s + (getPriceFor((b as any).Size || (b as any).size, (b as any).Level || (b as any).level, customer, months) ?? 0), 0);
    addRequest(String((user as any)?.id || 'guest'), selectedBillboards, total);
    toast({
      title: "تم إرسال طلب الحجز",
      description: `تم إرسال طلب حجز ${selectedBillboards.length} لوحة بنجاح`,
    });
    setSelectedBillboards([]);
  };

  const availableBillboards = billboards.filter(b => 
    b.Status === 'متاح' || b.Status === 'available' || !b.Contract_Number
  ).length;
  const uniqueSizes = [...new Set(billboards.map(b => b.Size))].filter(Boolean);
  const uniqueMunicipalities = [...new Set(billboards.map(b => b.Municipality).filter(Boolean))] as string[];
  const uniqueAdTypes = [...new Set(billboards.map((b:any) => (b.Ad_Type ?? b['Ad Type'] ?? '')).filter(Boolean))] as string[];

  const allowedList = Array.isArray((user as any)?.allowedCustomers)
    ? ((user as any).allowedCustomers as string[]).map((s) => String(s).trim().toLowerCase())
    : [];
  const sourceBillboards = isAdmin
    ? billboards
    : myOnly
    ? billboards.filter((b) => allowedList.includes(String((b as any).Customer_Name ?? '').trim().toLowerCase()))
    : [];
  const contractNumbers = Array.from(new Set(
    sourceBillboards
      .map((b) => (b as any).Contract_Number ?? (b as any)['Contract Number'] ?? '')
      .filter((v) => !!v)
      .map((v) => String(v))
  ));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">جاري تحم  ل اللوحات الإعلانية...</p>
        </div>
      </div>
    );
  }

  // pagination computations
  const totalPages = Math.max(1, Math.ceil(filteredBillboards.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedBillboards = filteredBillboards.slice(startIndex, startIndex + PAGE_SIZE);
  const getVisiblePages = () => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - windowSize + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="min-h-screen bg-gradient-dark" dir="rtl">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBillboard})` }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-luxury opacity-80" />
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <img src={BRAND_LOGO} alt={BRAND_NAME} className="mx-auto h-16 md:h-20 w-auto" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">احجز</span>{' '}
            أفضل المواقع
            <br />
            <span className="text-primary">الإعلانية</span> في المدينة
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
            منصة متكاملة لحجز وإدارة اللوحات الإعلانية الطرقي  
            <br />
            بأسع  ر تنافسية وخدمة مميزة على مدار الساعة
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-12">
            <Button size="lg" variant="hero" className="text-lg px-8 py-4 h-auto">
              ابدأ الحجز الآن
              <Play className="mr-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 h-auto border-white/30 text-white hover:bg-white/10">
              شاهد العروض
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-white/80">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{availableBillboards}+</div>
              <div className="text-sm">لوحة متاحة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm">خدمة العملاء</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-sm">ضمان الجودة</div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ArrowDown className="h-6 w-6 text-primary" />
        </div>
      </section>

      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-10 md:h-12 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-2">
                <Star className="h-4 w-4 text-primary" />
                {availableBillboards} لوحة متاحة
              </Badge>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{user.name}</span>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs">مدير</Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <Link to="/dashboard">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        لوحة التحكم
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    خروج
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button variant="outline">تسجيل الدخول</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8 shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن اللوحات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="حجم اللوحة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأحجام</SelectItem>
                  {uniqueSizes.map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v)=>{ setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="حالة اللوحة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="متاحة">متاحة</SelectItem>
                  <SelectItem value="قريبة الانتهاء">قريبة الانتهاء</SelectItem>
                  <SelectItem value="محجوز">محجوز</SelectItem>
                </SelectContent>
              </Select>

              <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="البلدية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الب  ديات</SelectItem>
                  {uniqueMunicipalities.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {user && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {adTypeFilter === 'all' ? 'نوع الإعلان (الكل)' : `نوع الإعلان: ${adTypeFilter}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="ابحث ع   نوع الإعلان..." />
                      <CommandList>
                        <CommandEmpty>لا يوجد نتائج</CommandEmpty>
                        <CommandGroup>
                          <CommandItem onSelect={() => setAdTypeFilter('all')}>الكل</CommandItem>
                          {uniqueAdTypes.map((t) => (
                            <CommandItem key={t} onSelect={() => setAdTypeFilter(t)}>{t}</CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {user && (
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                  <Switch id="my-only" checked={myOnly} onCheckedChange={setMyOnly} />
                  <Label htmlFor="my-only">لوحاتي</Label>
                </div>
              )}

              {(isAdmin || myOnly) && contractNumbers.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      أرقام العقود {selectedContractNumbers.length > 0 ? `(${selectedContractNumbers.length})` : ''}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="ابحث عن رقم عقد..." />
                      <CommandList>
                        <CommandEmpty>لا يوجد نتائج</CommandEmpty>
                        <CommandGroup>
                          {contractNumbers.map((num) => {
                            const selected = selectedContractNumbers.includes(num);
                            return (
                              <CommandItem
                                key={num}
                                onSelect={() => {
                                  setSelectedContractNumbers((prev) => selected ? prev.filter((n) => n !== num) : [...prev, num]);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                                {num}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                فلترة متقدمة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billboards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pagedBillboards.map((billboard) => (
            <BillboardGridCard
              key={billboard.ID}
              billboard={billboard}
              onBooking={handleToggleSelect}
            />
          ))}
        </div>

        {filteredBillboards.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              className={`px-3 py-1 rounded border ${currentPage === 1 ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              السابق
            </button>
            {getVisiblePages().map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-3 py-1 rounded border ${p === currentPage ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {p}
              </button>
            ))}
            <button
              className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي
            </button>
          </div>
        )}

        {filteredBillboards.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">جرب تعديل مع  يير البحث أو الفلترة</p>
          </div>
        )}
      </div>

      {/* Booking Summary */}
      <BookingSummary
        selectedBillboards={selectedBillboards}
        onRemoveBillboard={handleRemoveBillboard}
        onSubmitBooking={handleSubmitBooking}
        isOpen={selectedBillboards.length > 0}
      />
    </div>
  );
};

export default Index;
