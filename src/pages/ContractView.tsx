import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getContractWithBillboards } from '@/services/contractService';
import { getPriceFor, CustomerType, CUSTOMERS } from '@/data/pricing';
import { Calendar, ArrowLeft, Printer, User } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ContractView() {
  const navigate = useNavigate();
  const query = useQuery();
  const contractId = query.get('contract');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      if (!contractId) {
        setLoading(false);
        return;
      }
      try {
        const c = await getContractWithBillboards(String(contractId));
        setData(c);
      } catch (e) {
        console.error('Failed to load contract', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [contractId]);

  const months = useMemo(() => {
    if (!data?.start_date || !data?.end_date) return 1;
    const sd = new Date(data.start_date);
    const ed = new Date(data.end_date);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return 1;
    const diffDays = Math.max(0, Math.ceil(Math.abs(ed.getTime() - sd.getTime()) / 86400000));
    return Math.max(1, Math.round(diffDays / 30));
  }, [data?.start_date, data?.end_date]);

  const category: CustomerType = (data?.customer_category as CustomerType) || (CUSTOMERS?.[0] as CustomerType);

  const rows = useMemo(() => {
    const boards: any[] = Array.isArray(data?.billboards) ? data?.billboards : [];
    return boards.map((b) => {
      const size = (b.size || b.Size || '') as string;
      const level = (b.level || b.Level) as any;
      const unit = getPriceFor(size, level, category, months) ?? 0;
      const img = b.image || b.Image || '';
      const name = b.name || b.Billboard_Name || '';
      const loc = b.location || b.Nearest_Landmark || '';
      const city = b.city || b.City || '';
      return { id: String(b.ID || b.id), img, name, loc, city, size: size || (b.Size || ''), level: level || '', unit };
    });
  }, [data?.billboards, category, months]);

  const grand = rows.reduce((s, r) => s + (Number(r.unit) || 0), 0);

  if (!contractId) {
    return (
      <div className="container mx-auto px-4 py-10" dir="rtl">
        <div className="mb-4">
          <Button variant="outline" onClick={() => navigate('/admin/contracts')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> عودة للعقود
          </Button>
        </div>
        <div className="text-center text-muted-foreground">لا يوجد معرف عقد</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل تفاصيل العقد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">عرض العقد #{String(contractId)}</h1>
          <p className="text-muted-foreground">تفاصيل كاملة مع صور اللوحات وسعر الإيجار لكل لوحة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/contracts')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> عودة
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>
      </div>

      {/* معلومات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />الزبون</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div><span className="text-sm text-muted-foreground">الاسم:</span> <span className="font-medium">{data?.customer_name || '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">الفئة:</span> <span className="font-medium">{category}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />المدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div><span className="text-sm text-muted-foreground">البداية:</span> <span className="font-medium">{data?.start_date ? new Date(data.start_date).toLocaleDateString('ar-LY') : '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">النهاية:</span> <span className="font-medium">{data?.end_date ? new Date(data.end_date).toLocaleDateString('ar-LY') : '—'}</span></div>
              <div><span className="text-sm text-muted-foreground">المدة:</span> <span className="font-medium">{months} {months === 1 ? 'شهر' : 'أشهر'}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">الإجمالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grand.toLocaleString('ar-LY')} د.ل</div>
          </CardContent>
        </Card>
      </div>

      {/* اللوحات */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">اللوحات ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">لا توجد لوحات مرتبطة</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {r.img ? (
                      <img src={r.img} alt={r.name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground">لا توجد صورة</div>
                    )}
                    <div className="p-3 space-y-1">
                      <div className="font-semibold">{r.name || `لوحة ${r.id}`}</div>
                      <div className="text-xs text-muted-foreground">{r.loc}</div>
                      <div className="text-xs">{r.city} • {r.size}{r.level ? ` / ${r.level}` : ''}</div>
                      <div className="text-sm font-medium mt-1">السعر: {(Number(r.unit) || 0).toLocaleString('ar-LY')} د.ل / {months} شهر</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
