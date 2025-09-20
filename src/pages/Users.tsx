import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import MultiSelect from '@/components/ui/multi-select';
import { CUSTOMERS } from '@/data/pricing';
import { loadBillboards } from '@/services/billboardService';
import { useAuth } from '@/contexts/AuthContext';

interface Permissions {
  can_view_unavailable?: boolean;
  can_manage_billboards?: boolean;
  can_manage_bookings?: boolean;
  can_view_reports?: boolean;
  can_manage_pricing?: boolean;
  can_manage_users?: boolean;
}

const defaultPermissions: Permissions = {
  can_view_unavailable: false,
  can_manage_billboards: false,
  can_manage_bookings: false,
  can_view_reports: false,
  can_manage_pricing: false,
  can_manage_users: false,
};

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
  allowed_clients?: string[] | null;
  price_tier?: string | null;
}

export default function Users() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const { profile, isAdmin } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 40;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hasAssignedClient, setHasAssignedClient] = useState<boolean>(true);
  const [hasPermissions, setHasPermissions] = useState<boolean>(true);
  const [permOpenId, setPermOpenId] = useState<string | null>(null);
  const [allClients, setAllClients] = useState<string[]>([]);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const fetchPage = async (pageIndex: number) => {
    setLoading(true);
    setError(null);
    const from = (pageIndex - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const inNetlify = typeof window !== 'undefined' && /netlify\.app$/i.test(window.location.hostname);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token || '';
      if (inNetlify && token) {
        const res = await fetch(`/.netlify/functions/admin-list-profiles?from=${from}&to=${to}` , {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const normalize = (v: any): string[] | null => {
            if (!v) return null;
            if (Array.isArray(v)) return v.map(String);
            return null;
          };
          const data = (json.data || []).map((d: any) => ({
            ...d,
            allowed_clients: normalize(d.allowed_clients),
            price_tier: d.price_tier ?? null,
          }));
          setRows(data);
          setCount(json.count || 0);
          setHasAssignedClient(Boolean(json.hasAssignedClient));
          setHasPermissions(Boolean(json.hasPermissions));
          setLoading(false);
          return;
        }
      }
    } catch (e: any) {
      // fallthrough to direct supabase query
    }

    // Fallback to direct query (may be limited by RLS)
    let resp = await supabase
      .from('users')
      .select('id,name,email,role,created_at,allowed_customers,pricing_category', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (resp.error && (resp.error.code === '42703' || /does not exist/i.test(resp.error.message))) {
      // إذا فشل الاستعلام الأول، جرب استعلام أبسط
      const simpleResp = await supabase
        .from('users')
        .select('id,name,email,role,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (simpleResp.error) {
        setError(simpleResp.error.message);
        setRows([]);
        setCount(0);
        setLoading(false);
        return;
      }
      
      const data = (simpleResp.data || []).map((d: any) => ({
        ...d,
        allowed_clients: null,
        price_tier: null,
      }));
      setRows(data);
      setCount(simpleResp.count || 0);
      setHasAssignedClient(false);
      setHasPermissions(false);
    } else {
      setHasAssignedClient(true);
      setHasPermissions(true);
    }

    if (resp.error) {
      setError(resp.error.message);
      setRows([]);
      setCount(0);
    } else {
      const normalize = (v: any): string[] | null => {
        if (!v) return null;
        if (Array.isArray(v)) return v.map(String);
        return null;
      };
      const data = (resp.data || []).map((d: any) => ({
        ...d,
        allowed_clients: normalize(d.allowed_customers),
        price_tier: d.pricing_category ?? null,
      }));
      setRows(data);
      setCount(resp.count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPage(page);
    (async () => {
      try {
        const bbs = await loadBillboards();
        const clients = Array.from(new Set(bbs.map(b => (b as any).clientName).filter(Boolean))) as string[];
        setAllClients(clients);
      } catch (e) {
        setAllClients([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const handleSave = async (row: ProfileRow) => {
    setSavingId(row.id);
    let payload: any = { role: row.role, pricing_category: row.price_tier ?? null, allowed_customers: row.allowed_clients ?? null };

    let { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', row.id);

    if (error && (error.code === '42703' || /does not exist/i.test(error.message))) {
      // retry without additional columns
      const retry = await supabase
        .from('users')
        .update({ role: row.role })
        .eq('id', row.id);
      error = retry.error;
    }

    if (error) {
      toast.error(`فشل حفظ التعديلات: ${error.message}`);
    } else {
      toast.success('تم حفظ التعديلات بنجاح');
      fetchPage(page);
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المستخدمون</h1>
          <p className="text-muted-foreground">قائمة المستخدمين من قاعدة البيانات (Supabase)</p>
        </div>
      </div>

      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">عدد المستخدمين: {count}</CardTitle>
          {!hasAssignedClient && (
            <div className="text-sm text-warning mt-2">حقل الزبون المخصص غير موجود في profiles. يمكن إضافته لاحقاً.</div>
          )}
          {!hasPermissions && (
            <div className="text-sm text-warning mt-1">  قل الصلاحيات غير موجود في profiles. يمكن إضافته لاحقاً.</div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">جاري التحميل...</div>
          ) : error ? (
            <div className="text-destructive">خطأ: {error}</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">لا يوجد مستخدمون</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الزبائن المسموح بهم</TableHead>
                    <TableHead>فئة الأسعار</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name || '—'}</TableCell>
                      <TableCell>{r.email || '—'}</TableCell>
                      <TableCell className="min-w-[160px]">
                        <Select
                          value={r.role || ''}
                          onValueChange={(val) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, role: val } : x))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الدور" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">مدير</SelectItem>
                            <SelectItem value="client">زبون</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="min-w-[240px]">
                        <MultiSelect
                          options={allClients.map(c => ({ label: c, value: c }))}
                          value={(r.allowed_clients || []) as string[]}
                          onChange={(vals) => setRows(prev => prev.map(x => x.id === r.id ? { ...x, allowed_clients: vals } : x))}
                          placeholder="اختر الزبائن"
                        />
                      </TableCell>

                      <TableCell className="min-w-[160px]">
                        <Select
                          value={r.price_tier || ''}
                          onValueChange={(val) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, price_tier: val } : x))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                          <SelectContent>
                            {CUSTOMERS.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(r)} disabled={savingId === r.id}>حفظ</Button>
                          {isAdmin && (
                            <Button size="sm" variant="outline" onClick={() => { setPasswordTargetId(r.id); setPasswordNew(''); setPasswordConfirm(''); setPasswordModalOpen(true); }}>تغيير كلمة المرور</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {count > PAGE_SIZE && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password change modal for admins */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Input type="password" placeholder="كلمة المرور الجديدة" value={passwordNew} onChange={(e)=>setPasswordNew(e.target.value)} />
            <Input type="password" placeholder="تأكيد كلمة المرور" value={passwordConfirm} onChange={(e)=>setPasswordConfirm(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>إلغاء</Button>
              <Button onClick={async () => {
                if (!passwordTargetId) return;
                if (!passwordNew) { toast.error('ادخل كلمة المرور'); return; }
                if (passwordNew !== passwordConfirm) { toast.error('كلمات المرور غير متطابقة'); return; }
                try {
                  const { data: sess } = await supabase.auth.getSession();
                  const token = (sess as any)?.session?.access_token || '';
                  const resp = await fetch('/.netlify/functions/admin-set-profile-password', {
                    method: 'POST',
                    headers: {
                      'content-type': 'application/json',
                      ...(token ? { authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ userId: passwordTargetId, password: passwordNew })
                  });
                  const json = await resp.json().catch(()=>null);
                  if (!resp.ok) {
                    console.error('set password error', json || resp.statusText);
                    toast.error(json?.error || 'فشل تحديث كلمة المرور');
                  } else {
                    toast.success('تم تحديث كلمة المرور');
                    setPasswordModalOpen(false);
                    setPasswordTargetId(null);
                    setPasswordNew('');
                    setPasswordConfirm('');
                  }
                } catch (e) {
                  console.error('set password error', e);
                  toast.error('فشل تحديث كلمة المرور');
                }
              }}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
