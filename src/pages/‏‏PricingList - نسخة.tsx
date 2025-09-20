import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MultiSelect from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as UIDialog from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PRICING, CustomerType, CUSTOMERS } from '@/data/pricing';
import { Printer } from 'lucide-react';

function normalize(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const num = Number(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? null : num;
}

const lsKey = 'pricing_overrides_v1';

type MonthKeyAll = 'شهر واحد' | '2 أشهر' | '3 أشهر' | '6 أشهر' | 'سنة كاملة' | 'يوم واحد';

type OverrideMap = Record<string, Partial<Record<MonthKeyAll, number>>>; // key = `${level}__${size}__${customer}`

const MONTH_OPTIONS = [
  { key: 'شهر واحد', label: 'شهرياً', months: 1 },
  { key: '2 أشهر', label: 'كل شهرين', months: 2 },
  { key: '3 أشهر', label: 'كل 3 أشهر', months: 3 },
  { key: '6 أشهر', label: 'كل 6 أشهر', months: 6 },
  { key: 'سنة كاملة', label: 'سنوي', months: 12 },
] as const;

type MonthKey = typeof MONTH_OPTIONS[number]['key'];

const PRIMARY_CUSTOMERS: string[] = ['عادي', 'مسوق', 'شركات'];
const PRIMARY_SENTINEL = '__primary__';
const extraCustomersLsKey = 'pricing_extra_customers_v1';
const customSizesLsKey = 'pricing_custom_sizes_v1';

export default function PricingList() {
  const allLevels = useMemo(() => Array.from(new Set(PRICING.map(p => p['المستوى']))), []);
  const allSizes = useMemo(() => Array.from(new Set(PRICING.map(p => p['المقاس']))), []);

  const [selectedLevel, setSelectedLevel] = useState<string>(allLevels[0] || 'A');
  const [selectedMonthKey, setSelectedMonthKey] = useState<MonthKey>('شهر واحد');
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const [otherCustomer, setOtherCustomer] = useState<string>(PRIMARY_SENTINEL);

  const [extraCustomers, setExtraCustomers] = useState<string[]>(() => {
    try { const raw = localStorage.getItem(extraCustomersLsKey); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [customSizes, setCustomSizes] = useState<Record<string, string[]>>(() => {
    try { const raw = localStorage.getItem(customSizesLsKey); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });

  const [overrides, setOverrides] = useState<OverrideMap>(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      return raw ? (JSON.parse(raw) as OverrideMap) : {};
    } catch {
      return {};
    }
  });
  const [editing, setEditing] = useState<{ key: string; month: MonthKeyAll } | null>(null);

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addSizeOpen, setAddSizeOpen] = useState(false);
  const [newSize, setNewSize] = useState('');

  const [printOpen, setPrintOpen] = useState(false);
  const [printCategory, setPrintCategory] = useState<string>(PRIMARY_SENTINEL);

  const saveNewCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (PRIMARY_CUSTOMERS.includes(name)) { setOtherCustomer(PRIMARY_SENTINEL); setAddCatOpen(false); setNewCatName(''); return; }
    if (!extraCustomers.includes(name)) {
      const next = [...extraCustomers, name];
      setExtraCustomers(next);
      localStorage.setItem(extraCustomersLsKey, JSON.stringify(next));
    }
    setOtherCustomer(name);
    setAddCatOpen(false);
    setNewCatName('');
  };

  const saveNewSize = () => {
    const sz = newSize.trim();
    if (!sz) return;
    setCustomSizes(prev => {
      const list = Array.from(new Set([...(prev[selectedLevel] || []), sz]));
      const next = { ...prev, [selectedLevel]: list };
      localStorage.setItem(customSizesLsKey, JSON.stringify(next));
      return next;
    });
    setAddSizeOpen(false);
    setNewSize('');
  };

  const sizesForLevel = useMemo(() => {
    const set = new Set(
      PRICING.filter(r => r['المستوى'] === selectedLevel).map(r => r['المقاس'])
    );
    (customSizes[selectedLevel] || []).forEach(s => set.add(s));
    const arr = Array.from(set);
    return sizeFilter.length ? arr.filter(s => sizeFilter.includes(s)) : arr;
  }, [selectedLevel, sizeFilter, customSizes]);

  const keyFor = (size: string, customer: string) => `${selectedLevel}__${size}__${customer}`;

  const otherCategories = useMemo(() => Array.from(new Set([
    ...new Set(PRICING.map(p=>p['الزبون'] as string).filter(c=>!PRIMARY_CUSTOMERS.includes(c))),
    ...extraCustomers,
  ])), [extraCustomers]);

  const getBase = (size: string, customer: string, month: MonthKeyAll): number | null => {
    const row = PRICING.find(r => r['المقاس'] === size && r['المستوى'] === selectedLevel && r['الزبون'] === (customer as any));
    return row ? normalize((row as any)[month]) : null;
  };

  const getVal = (size: string, customer: string, month: MonthKeyAll): number | null => {
    const k = keyFor(size, customer);
    const o = overrides[k]?.[month];
    return o ?? getBase(size, customer, month);
  };

  const setVal = (size: string, customer: string, month: MonthKeyAll, value: number | null) => {
    const k = keyFor(size, customer);
    setOverrides(prev => {
      const next: OverrideMap = { ...prev, [k]: { ...(prev[k] || {}) } };
      if (value == null || isNaN(value as any)) delete next[k][month]; else next[k][month] = value;
      localStorage.setItem(lsKey, JSON.stringify(next));
      return next;
    });
  };

  const priceFor = (size: string, customer: string): string => {
    const v = getVal(size, customer, selectedMonthKey);
    return v == null ? '—' : `${v.toLocaleString()} د.ل`;
  };

  const buildPrintHtml = (cat: string) => {
    const cats = cat === PRIMARY_SENTINEL ? PRIMARY_CUSTOMERS : [cat];
    const today = new Date().toLocaleDateString('ar-LY');
    const monthLabel = MONTH_OPTIONS.find(m=>m.key===selectedMonthKey)?.label || 'شهرياً';
    const rows = sizesForLevel.map(size => {
      const cols = cats.map(c => {
        const v = getVal(size, c, selectedMonthKey);
        return v == null ? '—' : `${Number(v).toLocaleString('ar-LY')} د.ل`;
      }).join('</td><td class="cell">');
      return `<tr><td class="size">${size}</td><td class="cell">${cols}</td></tr>`;
    }).join('');

    const headCols = cats.map(c=>`<th class="cell">${c}</th>`).join('');

    return `<!doctype html><html dir="rtl" lang="ar"><head>
      <meta charset="utf-8" />
      <title>طباعة الأسعار</title>
      <style>
        body{font-family:'Cairo','Tajawal',system-ui,sans-serif;color:#111}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .title{font-weight:800;font-size:22px}
        .meta{color:#555}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #ddd;padding:8px;text-align:right}
        thead th{background:#f5f5f5}
        .size{font-weight:700;background:#fafafa}
        @media print{button{display:none}}
      </style>
    </head><body>
      <div class="header">
        <div class="title">قائمة الأسعار — مستوى ${selectedLevel} (${monthLabel})</div>
        <div class="meta">${today}</div>
      </div>
      <table>
        <thead>
          <tr><th class="cell">المقاس</th>${headCols}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top:12px"><button onclick="window.print()">طباعة</button></div>
    </body></html>`;
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintHtml(printCategory));
    w.document.close();
    w.focus();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">الأسعار</CardTitle>
              <p className="text-muted-foreground text-sm">إدارة أسعار الخدمات الإعلانية حسب فئة العميل</p>
            </div>
            <div className="flex items-center gap-2">
              {MONTH_OPTIONS.map(opt => (
                <button
                  key={`m-${opt.key}`}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-fast ${selectedMonthKey === opt.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                  onClick={() => setSelectedMonthKey(opt.key)}
                >
                  {opt.months === 1 ? 'شهرياً' : opt.label}
                </button>
              ))}
              <div className="mx-3 h-6 w-px bg-border" />
              <Select value={otherCustomer} onValueChange={setOtherCustomer}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="فئة أخرى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRIMARY_SENTINEL}>الأساسية (عادي/مسوق/شركات)</SelectItem>
                  {Array.from(new Set([...new Set(PRICING.map(p=>p['الزبون'] as string).filter(c=>!PRIMARY_CUSTOMERS.includes(c))), ...extraCustomers])).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="ml-2" onClick={() => setAddCatOpen(true)}>إضافة فئة</Button>
              <Button variant="outline" onClick={() => setAddSizeOpen(true)}>إضافة مقاس</Button>
              <Button className="ml-2" onClick={() => setPrintOpen(true)}>
                <Printer className="h-4 w-4 ml-2" /> طباعة الأسعار
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 bg-amber-500 text-white font-semibold rounded-lg px-3 py-1 shadow-sm">مستوى {selectedLevel}</span>
              <span className="text-sm text-muted-foreground">أسعار الأحجام حسب فئة العميل</span>
            </div>
            <div className="flex items-center gap-2">
              {allLevels.map(lvl => (
                <button
                  key={`lvl-${String(lvl)}`}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-fast ${lvl === selectedLevel ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MultiSelect options={allSizes.map(s => ({ label: s, value: s }))} value={sizeFilter} onChange={setSizeFilter} placeholder="تصفية الأحجام" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-muted/20 border-b border-border/30">
                  {(otherCustomer === PRIMARY_SENTINEL ? PRIMARY_CUSTOMERS : [otherCustomer]).map(c => (
                    <th key={`head-${c}`} className="p-3 font-medium">{c}</th>
                  ))}
                  <th className="p-3 text-center w-24 bg-muted/20">الحجم</th>
                </tr>
              </thead>
              <tbody>
                {sizesForLevel.map(size => (
                  <tr key={size} className="border-b border-border/20 hover:bg-background/50">
                    {(otherCustomer === PRIMARY_SENTINEL ? PRIMARY_CUSTOMERS : [otherCustomer]).map(c => {
                      const k = keyFor(size, c);
                      const isEditing = editing && editing.key === k && editing.month === selectedMonthKey;
                      const current = getVal(size, c, selectedMonthKey);
                      return (
                        <td key={`col-${c}`} className="p-3">
                          {isEditing ? (
                            <input
                              autoFocus
                              type="number"
                              className="w-24 rounded-md border px-2 py-1 bg-background"
                              defaultValue={current ?? ''}
                              onBlur={(e) => { const v = e.target.value.trim(); setVal(size, c, selectedMonthKey, v === '' ? null : Number(v)); setEditing(null); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }}
                            />
                          ) : (
                            <button className="text-right w-full text-foreground" onClick={() => setEditing({ key: k, month: selectedMonthKey })}>
                              {priceFor(size, c)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-semibold bg-muted/20">{size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <UIDialog.Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <UIDialog.DialogContent>
          <UIDialog.DialogHeader>
            <UIDialog.DialogTitle>طباعة الأسعار</UIDialog.DialogTitle>
          </UIDialog.DialogHeader>
          <div className="grid gap-3">
            <Select value={printCategory} onValueChange={setPrintCategory}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PRIMARY_SENTINEL}>الأساسية (عادي/مسوق/شركات)</SelectItem>
                {otherCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <UIDialog.DialogFooter>
            <Button variant="outline" onClick={()=>setPrintOpen(false)}>إلغاء</Button>
            <Button onClick={handlePrint}>طباعة</Button>
          </UIDialog.DialogFooter>
        </UIDialog.DialogContent>
      </UIDialog.Dialog>

      <UIDialog.Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <UIDialog.DialogContent>
          <UIDialog.DialogHeader>
            <UIDialog.DialogTitle>إضافة فئة جديدة</UIDialog.DialogTitle>
          </UIDialog.DialogHeader>
          <Input placeholder="اسم الفئة (مثال: المدينة)" value={newCatName} onChange={e=>setNewCatName(e.target.value)} />
          <UIDialog.DialogFooter>
            <Button variant="outline" onClick={()=>setAddCatOpen(false)}>إلغاء</Button>
            <Button onClick={saveNewCategory}>حفظ</Button>
          </UIDialog.DialogFooter>
        </UIDialog.DialogContent>
      </UIDialog.Dialog>

      <UIDialog.Dialog open={addSizeOpen} onOpenChange={setAddSizeOpen}>
        <UIDialog.DialogContent>
          <UIDialog.DialogHeader>
            <UIDialog.DialogTitle>إضافة مقاس</UIDialog.DialogTitle>
          </UIDialog.DialogHeader>
          <Input placeholder="أدخل المقاس (مثال 4x12)" value={newSize} onChange={e=>setNewSize(e.target.value)} />
          <UIDialog.DialogFooter>
            <Button variant="outline" onClick={()=>setAddSizeOpen(false)}>إلغاء</Button>
            <Button onClick={saveNewSize}>حفظ</Button>
          </UIDialog.DialogFooter>
        </UIDialog.DialogContent>
      </UIDialog.Dialog>
    </div>
  );
}
