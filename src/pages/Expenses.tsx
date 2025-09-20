import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { getContracts, getContractWithBillboards, Contract } from '@/services/contractService';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, Filter, Printer, FileDown } from 'lucide-react';

interface RateRow { size: string; install_price: number | null; print_price: number | null }

export default function Expenses() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [rates, setRates] = useState<Record<string, { install: number; print: number }>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Filters
  const [fromContract, setFromContract] = useState<string>('');
  const [toContract, setToContract] = useState<string>('');
  const [fromMonth, setFromMonth] = useState<string>(''); // yyyy-mm
  const [toMonth, setToMonth] = useState<string>('');

  // Global 3% pool states
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [withdrawals, setWithdrawals] = useState<{ id: string; amount: number; date: string; method?: string; note?: string }[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawDate, setWithdrawDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [withdrawMethod, setWithdrawMethod] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const list = await getContracts();
        setContracts(list as any);
        if (list && list.length) setSelectedId(String((list[0] as any).id));

        // load exclusions
        try {
          const { data } = await supabase.from('expenses_flags').select('contract_id, excluded');
          if (Array.isArray(data)) {
            const s = new Set<string>();
            data.forEach((r: any) => { if (r.excluded && r.contract_id != null) s.add(String(r.contract_id)); });
            setExcludedIds(s);
          } else {
            const raw = localStorage.getItem('expenses_excluded_v1');
            if (raw) setExcludedIds(new Set(JSON.parse(raw)));
          }
        } catch {
          const raw = localStorage.getItem('expenses_excluded_v1');
          if (raw) setExcludedIds(new Set(JSON.parse(raw)));
        }

        // load withdrawals
        try {
          const { data } = await supabase.from('expenses_withdrawals').select('id, amount, date, method, note, notes');
          if (Array.isArray(data)) setWithdrawals(data.map((d: any) => ({ id: String(d.id || crypto.randomUUID()), amount: Number(d.amount)||0, date: (d.date || new Date().toISOString()).slice(0,10), method: d.method || null || undefined, note: (d.note ?? d.notes) || undefined })));
          else {
            const raw = localStorage.getItem('expenses_withdrawals_v1');
            setWithdrawals(raw ? JSON.parse(raw) : []);
          }
        } catch {
          const raw = localStorage.getItem('expenses_withdrawals_v1');
          setWithdrawals(raw ? JSON.parse(raw) : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedId) return;
      setLoadingCalc(true);
      try {
        const c = await getContractWithBillboards(String(selectedId));
        setSelected(c);
        const sizes = Array.from(new Set(((c?.billboards || []) as any[]).map(b => String((b.Size || b.size || '').toString().trim())).filter(Boolean)));
        if (sizes.length) {
          const { data, error } = await supabase
            .from('installation_print_pricing')
            .select('size, install_price, print_price')
            .in('size', sizes);
          if (!error && Array.isArray(data)) {
            const map: Record<string, { install: number; print: number }> = {};
            (data as RateRow[]).forEach(r => {
              map[String(r.size)] = {
                install: typeof r.install_price === 'number' ? r.install_price : 0,
                print: typeof r.print_price === 'number' ? r.print_price : 0,
              };
            });
            setRates(map);
          } else {
            setRates({});
          }
        } else {
          setRates({});
        }
      } finally {
        setLoadingCalc(false);
      }
    })();
  }, [selectedId]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as any[];
    return (contracts as any[]).filter((c:any) => {
      const id = String(c.id ?? c.Contract_Number ?? '');
      const name = String(c.customer_name ?? c['Customer Name'] ?? '');
      const ad = String(c.ad_type ?? c['Ad Type'] ?? '');
      return id.includes(q) || name.toLowerCase().includes(q) || ad.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [contracts, searchQuery]);

  const contractIds = useMemo(() => (contracts as any[]).map(c => String(c.id ?? c.Contract_Number ?? '')).filter(Boolean).sort((a,b)=>{
    const na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  }), [contracts]);

  const cmpIds = (a: string, b: string) => {
    const na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  };

  const inRange = (id: string) => {
    if (fromContract && cmpIds(id, fromContract) < 0) return false;
    if (toContract && cmpIds(id, toContract) > 0) return false;
    return true;
  };

  const inMonthRange = (c: any) => {
    if (!fromMonth && !toMonth) return true;
    const dStr = String(c['Contract Date'] ?? c.start_date ?? c['Start Date'] ?? c['End Date'] ?? '');
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (fromMonth && ym < fromMonth) return false;
    if (toMonth && ym > toMonth) return false;
    return true;
  };

  const calc = useMemo(() => {
    if (!selected) return { total: 0, install: 0, print: 0, net: 0, fee3: 0, rows: [] as any[] };
    const total = Number(selected.rent_cost || (selected as any)['Total Rent'] || 0) || 0;
    const items = (selected.billboards || []) as any[];
    const rowsMap = new Map<string, { size: string; count: number; install: number; print: number }>();
    let installTotal = 0;
    let printTotal = 0;
    for (const b of items) {
      const size = String((b.Size || (b as any).size || '').toString().trim());
      if (!size) continue;
      const r = rates[size] || { install: 0, print: 0 };
      installTotal += r.install;
      printTotal += r.print;
      const prev = rowsMap.get(size) || { size, count: 0, install: 0, print: 0 };
      prev.count += 1;
      prev.install += r.install;
      prev.print += r.print;
      rowsMap.set(size, prev);
    }
    const net = total - installTotal - printTotal;
    const fee3 = Math.max(0, Math.round(total * 0.03));
    return { total, install: installTotal, print: printTotal, net, fee3, rows: Array.from(rowsMap.values()) };
  }, [selected, rates]);

  const total3All = useMemo(() => {
    return (contracts || []).reduce((s, c: any) => {
      const id = String(c.id ?? c.Contract_Number ?? '');
      if (!inRange(id) || !inMonthRange(c)) return s;
      if (excludedIds.has(id)) return s;
      const total = Number(c.rent_cost ?? c['Total Rent'] ?? 0) || 0;
      return s + Math.round(total * 0.03);
    }, 0);
  }, [contracts, excludedIds, fromContract, toContract, fromMonth, toMonth]);

  const totalWithdrawn = (withdrawals || []).reduce((s, w) => s + (Number(w.amount)||0), 0);
  const remaining3All = Math.max(0, total3All - totalWithdrawn);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              المصروفات
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const q = new URLSearchParams(window.location.search);
                const id = selectedId || '';
                const title = `تقرير المصروفات للعقد ${id}`;
                const rows = (calc.rows as any[]).map(r => `<tr><td class=\"sz\">${r.size}</td><td>${r.count}</td><td>${Number(r.install).toLocaleString('ar-LY')} د.ل</td><td>${Number(r.print).toLocaleString('ar-LY')} د.ل</td></tr>`).join('');
                const html = `<!doctype html><html dir=rtl lang=ar><head><meta charset=utf-8 /><title>${title}</title>
                  <style>
                    body{font-family:'Cairo','Tajawal',system-ui,sans-serif;color:#111}
                    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
                    .title{font-weight:800;font-size:22px}
                    table{width:100%;border-collapse:collapse}
                    th,td{border:1px solid #ddd;padding:8px;text-align:right}
                    thead th{background:#f5f5f5}
                    .sz{font-weight:700;background:#fafafa}
                    @media print{button{display:none}}
                  </style></head><body>
                  <div class="header"><div class="title">${title}</div><div>${new Date().toLocaleDateString('ar-LY')}</div></div>
                  <div style="margin-bottom:10px">
                    <div>إجمالي العقد: <b>${calc.total.toLocaleString('ar-LY')} د.ل</b></div>
                    <div>إجمالي التركيب: <b>${calc.install.toLocaleString('ar-LY')} د.ل</b></div>
                    <div>إجمالي الطباعة: <b>${calc.print.toLocaleString('ar-LY')} د.ل</b></div>
                    <div>الصافي بعد المصروفات: <b>${(calc.net).toLocaleString('ar-LY')} د.ل</b></div>
                    <div>نسبة 3% من الإجمالي: <b>${calc.fee3.toLocaleString('ar-LY')} د.ل</b></div>
                  </div>
                  <table><thead><tr><th>المقاس</th><th>العدد</th><th>تركيب</th><th>طباعة</th></tr></thead>
                  <tbody>${rows}</tbody></table>
                  <div style="margin-top:12px"><button onclick="window.print()">طباعة</button></div>
                  </body></html>`;
                const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); w.focus();
              }}>
                <Printer className="h-4 w-4 ml-2" /> طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const lines = [
                  ['المقاس','العدد','إجمالي التركيب','إجمالي الطباعة'],
                  ...((calc.rows as any[]).map(r => [r.size, String(r.count), String(r.install), String(r.print)])),
                  [],
                  ['إجمالي العقد', String(calc.total)],
                  ['إجمالي التركيب', String(calc.install)],
                  ['إجمالي الطباعة', String(calc.print)],
                  ['الصافي بعد المصروفات', String(calc.net)],
                  ['نسبة 3% من الإجمالي', String(calc.fee3)],
                ];
                const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
                const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `expenses-${selectedId || 'contract'}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}>
                <FileDown className="h-4 w-4 ml-2" /> تصدير CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 items-start">
            <div>
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><Filter className="h-4 w-4" />ابحث بالاسم / رقم العقد / نوع الإعلان</div>
              <Input placeholder="ابدأ الكتابة للبحث..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
              {searchQuery && (
                <div className="mt-2 border rounded-md divide-y max-h-64 overflow-auto bg-background">
                  {suggestions.length > 0 ? suggestions.map((c:any)=>{
                    const id = String(c.id ?? c.Contract_Number ?? '');
                    const name = String(c.customer_name ?? c['Customer Name'] ?? '');
                    const ad = String(c.ad_type ?? c['Ad Type'] ?? '');
                    return (
                      <button key={id} className={`w-full text-right p-2 hover:bg-muted ${String(selectedId)===id?'bg-muted/50':''}`} onClick={()=>{ setSelectedId(id); }}>
                        <div className="font-medium">{id} • {name}</div>
                        <div className="text-xs text-muted-foreground">نوع الإعلان: {ad || '—'}</div>
                      </button>
                    );
                  }) : (
                    <div className="p-2 text-sm text-muted-foreground">لا نتائج مطابقة</div>
                  )}
                </div>
              )}
              {selected && (
                <div className="mt-2 text-sm text-muted-foreground">العقد الحالي: <span className="font-semibold">{String(selectedId)}</span> • {(selected.customer_name || selected['Customer Name'] || '')}</div>
              )}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">من عقد</div>
                  <Select value={fromContract} onValueChange={setFromContract}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {contractIds.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">إلى عقد</div>
                  <Select value={toContract} onValueChange={setToContract}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {contractIds.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">من شهر</div>
                  <Input type="month" value={fromMonth} onChange={(e)=>setFromMonth(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">إلى شهر</div>
                  <Input type="month" value={toMonth} onChange={(e)=>setToMonth(e.target.value)} />
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={()=>{ setFromContract(''); setToContract(''); setFromMonth(''); setToMonth(''); }}>مسح التصفية</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global 3% pool */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">مجموع 3% من كل العقود</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">الإجمالي (3%)</div><div className="text-2xl font-bold">{total3All.toLocaleString('ar-LY')} د.ل</div></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">المسحوب</div><div className="text-2xl font-bold text-destructive">{totalWithdrawn.toLocaleString('ar-LY')} د.ل</div></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">المتبقي</div><div className="text-2xl font-bold text-primary">{remaining3All.toLocaleString('ar-LY')} د.ل</div></CardContent></Card>
            <div className="space-y-2">
              <label className="text-sm font-medium">سحب من الرصيد</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input type="number" placeholder="المبلغ" value={withdrawAmount} onChange={(e)=>setWithdrawAmount(e.target.value)} />
                <Input type="date" value={withdrawDate} onChange={(e)=>setWithdrawDate(e.target.value)} />
                <Input placeholder="طريقة السحب (نقدي/تحويل/شيك)" value={withdrawMethod} onChange={(e)=>setWithdrawMethod(e.target.value)} />
                <Input placeholder="البيان" value={withdrawNote} onChange={(e)=>setWithdrawNote(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={async ()=>{
                  const amt = Number(withdrawAmount)||0; if (!amt) { toast.error('أدخل مبلغاً'); return; }
                  try {
                    let row: any = null;
                    try {
                      const { data } = await supabase.from('expenses_withdrawals').insert({ amount: amt, date: withdrawDate ? new Date(withdrawDate).toISOString() : new Date().toISOString(), method: withdrawMethod || null, note: withdrawNote || null }).select().single();
                      if (data) row = data;
                    } catch {}
                    const rec = { id: String(row?.id || crypto.randomUUID()), amount: amt, date: (withdrawDate || new Date().toISOString()).slice(0,10), method: withdrawMethod || undefined, note: withdrawNote || undefined };
                    const list = [rec, ...withdrawals];
                    setWithdrawals(list);
                    try { localStorage.setItem('expenses_withdrawals_v1', JSON.stringify(list)); } catch {}
                    setWithdrawAmount(''); setWithdrawMethod(''); setWithdrawNote(''); setWithdrawDate(new Date().toISOString().slice(0,10));
                    toast.success('تم السحب');
                  } catch (e) { console.error(e); toast.error('فشل السحب'); }
                }}>سحب</Button>
                <Button variant="outline" onClick={()=>{
                  const title = 'سجل السحوبات';
                  const rows = withdrawals.map(w => `<tr><td>${new Date(w.date).toLocaleDateString('ar-LY')}</td><td>${(w.amount||0).toLocaleString('ar-LY')} د.ل</td><td>${w.method||'—'}</td><td>${w.note||'—'}</td></tr>`).join('');
                  const html = `<!doctype html><html dir=rtl lang=ar><head><meta charset=utf-8 /><title>${title}</title>
                  <style>body{font-family:'Cairo','Tajawal',system-ui,sans-serif} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:right} thead th{background:#f5f5f5}</style></head><body>
                  <h2>${title}</h2><div>المجموع: <b>${(withdrawals.reduce((s,w)=>s+(Number(w.amount)||0),0)).toLocaleString('ar-LY')} د.ل</b></div>
                  <table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>البيان</th></tr></thead><tbody>${rows}</tbody></table>
                  <div style="margin-top:12px"><button onclick="window.print()">طباعة</button></div></body></html>`;
                  const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); w.focus();
                }}><Printer className="h-4 w-4 ml-2" /> طباعة السحوبات</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">سجل السحوبات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>��لمبلغ</TableHead>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>البيان</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w)=> (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.date).toLocaleDateString('ar-LY')}</TableCell>
                    <TableCell>{(w.amount||0).toLocaleString('ar-LY')} د.ل</TableCell>
                    <TableCell>{w.method || '—'}</TableCell>
                    <TableCell>{w.note || '—'}</TableCell>
                  </TableRow>
                ))}
                {withdrawals.length===0 && (<TableRow><TableCell colSpan={4} className="text-muted-foreground">لا توجد سحوبات بعد</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">العقود في الحسبة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>قيمة العقد</TableHead>
                  <TableHead>3%</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contracts as any[]).filter(c => inRange(String(c.id ?? c.Contract_Number ?? '')) && inMonthRange(c)).map((c:any)=>{
                  const id = String(c.id ?? c.Contract_Number ?? '');
                  const total = Number(c.rent_cost ?? c['Total Rent'] ?? 0) || 0;
                  const fee = Math.round(total * 0.03);
                  const excluded = excludedIds.has(id);
                  return (
                    <TableRow key={id}>
                      <TableCell>{id}</TableCell>
                      <TableCell>{c.customer_name || c['Customer Name'] || ''}</TableCell>
                      <TableCell>{total.toLocaleString('ar-LY')} د.ل</TableCell>
                      <TableCell>{fee.toLocaleString('ar-LY')} د.ل</TableCell>
                      <TableCell>{excluded ? 'مستبعد' : 'ضمن الحسبة'}</TableCell>
                      <TableCell>
                        {excluded ? (
                          <Button size="sm" variant="outline" onClick={async ()=>{
                            try{
                              let ok=false; try{ const { error } = await supabase.from('expenses_flags').upsert({ contract_id: id, excluded: false }); if(!error) ok=true; }catch{}
                              const s = new Set(Array.from(excludedIds)); s.delete(id); setExcludedIds(s);
                              try { localStorage.setItem('expenses_excluded_v1', JSON.stringify(Array.from(s))); } catch {}
                              toast.success('تم إرجاع العقد إلى الحسبة');
                            }catch(e){ console.error(e); toast.error('تعذر التحديث'); }
                          }}>إلغاء الاستبعاد</Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={async ()=>{
                            try{
                              let ok=false; try{ const { error } = await supabase.from('expenses_flags').upsert({ contract_id: id, excluded: true }); if(!error) ok=true; }catch{}
                              const s = new Set(Array.from(excludedIds)); s.add(id); setExcludedIds(s);
                              try { localStorage.setItem('expenses_excluded_v1', JSON.stringify(Array.from(s))); } catch {}
                              toast.success('تم وضع علامة: سحب كامل');
                            }catch(e){ console.error(e); toast.error('تعذر التحديث'); }
                          }}>تم السحب بالكامل</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">إجمالي العقد</div><div className="text-2xl font-bold">{calc.total.toLocaleString()} د.ل</div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">إجمالي التركيب</div><div className="text-2xl font-bold text-destructive">{calc.install.toLocaleString()} د.ل</div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">إجمالي الطباعة</div><div className="text-2xl font-bold text-destructive">{calc.print.toLocaleString()} د.ل</div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-sm text-muted-foreground">نسبة 3% من الإجمالي</div><div className="text-2xl font-bold text-primary">{calc.fee3.toLocaleString()} د.ل</div></CardContent></Card>
      </div>

      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">تفاصيل المقاسات</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCalc ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> جاري الحساب...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المقاس</TableHead>
                    <TableHead>العدد</TableHead>
                    <TableHead>تركيب</TableHead>
                    <TableHead>طباعة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calc.rows.map((r) => (
                    <TableRow key={r.size}>
                      <TableCell className="font-medium">{r.size}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell>{r.install.toLocaleString()} د.ل</TableCell>
                      <TableCell>{r.print.toLocaleString()} د.ل</TableCell>
                    </TableRow>
                  ))}
                  {calc.rows.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground">لا توجد لوحات مرتبطة بالعقد</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
