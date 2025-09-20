import * as UIDialog from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Billboard } from '@/types';
import { CUSTOMERS, CustomerType, getPriceFor } from '@/data/pricing';
import { BRAND_LOGO, BRAND_NAME } from '@/lib/branding';
import { addMonths, format as fmt } from 'date-fns';

export type QuoteMeta = {
  contractNumber?: string;
  date?: Date;
  adType?: string;
  clientName?: string;
  clientRep?: string;
  clientPhone?: string;
  companyName?: string;
  companyAddress?: string;
  companyRep?: string;
  iban?: string;
  durationMonths?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: Billboard[];
  monthsById: Record<string, number>;
  customerById: Record<string, CustomerType>;
  meta?: QuoteMeta;
};

function formatCurrency(n: number | null | undefined) {
  const v = n ?? 0;
  return `${v.toLocaleString('ar-LY')} د.��`;
}

function mapUrl(b: Billboard): string {
  const coords: any = (b as any).coordinates;
  if (typeof coords === 'string' && coords.includes(',')) {
    const parts = coords.split(',').map((c: string) => c.trim());
    if (parts.length >= 2) return `https://www.google.com/maps?q=${encodeURIComponent(parts[0])},${encodeURIComponent(parts[1])}`;
  } else if (coords && typeof coords === 'object' && typeof (coords as any).lat === 'number' && typeof (coords as any).lng === 'number') {
    return `https://www.google.com/maps?q=${(coords as any).lat},${(coords as any).lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.location || '')}`;
}

function buildQuoteHtml(props: Props) {
  const { items, monthsById, customerById } = props;
  const meta: QuoteMeta = {
    contractNumber: props.meta?.contractNumber || `${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    date: props.meta?.date || new Date(),
    adType: props.meta?.adType || '—',
    clientName: props.meta?.clientName || '—',
    clientRep: props.meta?.clientRep || '��',
    clientPhone: props.meta?.clientPhone || '—',
    companyName: props.meta?.companyName || 'شركة الفارس الذهبي للدعاية والإعلان',
    companyAddress: props.meta?.companyAddress || 'طرا��لس – طريق المطار، حي الزهور',
    companyRep: props.meta?.companyRep || 'جمال امحمد زحيلق (المدير العام)',
    iban: props.meta?.iban || 'LY15014051021405100053401',
    durationMonths: props.meta?.durationMonths || Math.max(1, Math.max(...items.map(b => monthsById[b.id] || 1)))
  };

  const rows = items.map((b) => {
    const months = monthsById[b.id] || 1;
    const customer = customerById[b.id] || CUSTOMERS[0];
    const unit = getPriceFor(b.size, (b as any).level, customer, months) ?? 0;
    const start = new Date();
    const end = addMonths(start, months);
    return { b, months, unit, start, end, url: mapUrl(b) };
  });

  const grand = rows.reduce((s, r) => s + r.unit, 0);

  const tableRows = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="${r.url}">اضغط هنا</a></td>
      <td>${(r.b as any).City || (r.b as any).city || ''}</td>
      <td>${(r.b as any).Municipality || (r.b as any).municipality || ''}</td>
      <td>${r.b.location || (r.b as any).Nearest_Landmark || ''}</td>
      <td>${r.b.size || ''}</td>
      <td>${(r.b as any).Faces_Count || 'وجهين'}</td>
      <td>${fmt(r.end, 'yyyy-MM-dd')}</td>
      <td>${formatCurrency(r.unit)}</td>
      <td><img src="${r.b.image || '/placeholder.svg'}" alt="bb" style="height:48px;border-radius:6px"/></td>
    </tr>
  `).join('');

  return `<!doctype html>
<html dir="rtl" lang="ar"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>عرض سعر</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: 'Cairo','Tajawal',system-ui,sans-serif; color:#111; }
  .header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #d4af37; padding-bottom:8px; margin-bottom:12px; }
  .brand { display:block; }
  .brand img { height:64px; width:auto; border-radius:0; }
  .brand h1 { margin:0; font-size:24px; font-weight:800; }
  .meta { text-align:left; color:#333; font-weight:600; }
  .section-title { font-weight:800; font-size:18px; margin:12px 0 8px; color:#222; }
  .box { background:#fff; border:1px solid #eee; border-radius:10px; padding:12px; }
  .terms p{ margin:6px 0; line-height:1.8; }
  .footer { margin-top:12px; display:flex; justify-content:space-between; align-items:center; }
  .gold { color:#b8860b; }
  .page-break { page-break-before: always; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #eee; padding:8px; font-size:12px; }
  th { background:#faf6e8; font-weight:800; }
</style>
</head><body>
  <div class="header">
    <div class="brand">
      <img src="${BRAND_LOGO}" alt="${BRAND_NAME}" />
      <div>
        <h1>عقد استئجار مساحات إعلانية</h1>
        <div class="gold">${meta.companyName}</div>
        <div class="gold">${meta.companyAddress}</div>
      </div>
    </div>
    <div class="meta">
      <div>التاريخ: ${meta.date?.toLocaleDateString('ar-LY')}</div>
      <div>رقم العقد: ${meta.contractNumber}</div>
      <div>نوع الإعلان: ${meta.adType}</div>
    </div>
  </div>

  <div class="box terms">
    <p>نظراً لرغبة الطرف الثاني في استئجار مساحات إعلانية من الطرف الأول، تم الاتفاق على الشروط التالية:</p>
    <p>البند الأول: يلتزم الطرف الثاني بتجهيز التصميم في أسرع وقت وأي تأخير يعتبر مسؤوليته، وتبدأ مدة العقد من التاريخ المذكور في المادة السادسة.</p>
    <p>البند ��لثاني: يلتزم الطرف الأول بطباعة وتركيب التصاميم بدقة على المساح��ت المتفق عليها وفق الجدول المرفق، ويتحمل الأخير تكاليف التغيير الناتجة عن الأحوال الجوية أو الحوادث.</p>
    <p>البند الثالث: في حال وقوع ظروف قاهرة تؤثر على إحدى المساحات، يتم نقل الإعلان إلى موقع بديل، ويتولى الطرف الأول الحصول على الموافقات اللازمة من الجهات ذات العلاقة.</p>
    <p>البند الرابع: لا يجوز للطرف الثاني التنازل عن العقد أو التعامل مع جهات أخرى دون موافقة الطرف الأول، الذي يحتفظ بحق استغلال المساحات في المناسبات الوطنية والانتخابات مع تعويض الطرف الثاني بفترة بديلة.</p>
    <p>البند الخامس: قيمة العرض الإجمالية: <strong>${formatCurrency(grand)}</strong>. تُدفع نصف القيمة عند توقيع العقد والنصف الآخر بعد التركيب، وإذا تأخر السداد عن 30 يوماً يحق للطرف الأول إعادة تأجير المساحات.</p>
    <p>البند السادس: مدة العقد ${meta.durationMonths} شهراً تبدأ من ${fmt(new Date(), 'yyyy/MM/dd')} وتنتهي في ${fmt(addMonths(new Date(), meta.durationMonths || 1), 'yyyy/MM/dd')} ويجوز تجديده برضى الطرفين.</p>
    <p>البند السابع: في حال حدوث خلاف بين الطرفين يتم حله ودياً، وإذا تعذر ذلك يُعين طرفان محايدان لتسوية النزاع بقرار نهائي وملزم للطرفين.</p>
  </div>

  <div class="footer">
    <div>IBAN: <strong>${meta.iban}</strong></div>
    <div>الطرف الأول: ${meta.companyRep}</div>
    <div>الطرف الثاني: ${meta.clientRep} — هاتف: ${meta.clientPhone}</div>
  </div>

  <div class="page-break"></div>

  <div class="section-title">المواقع المتفق عليها بي�� الطرفين</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الموقع على الخريطة</th>
        <th>المدينة</th>
        <th>البلدية</th>
        <th>أقرب نقطة دالة</th>
        <th>المقاس</th>
        <th>عدد الوجوه</th>
        <th>تاريخ الانتهاء</th>
        <th>السعر</th>
        <th>صورة</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="8" style="text-align:left">الإجم��لي</td>
        <td colspan="2" style="font-weight:800">${formatCurrency(grand)}</td>
      </tr>
    </tfoot>
  </table>
</body></html>`;
}

export default function QuoteDialog(props: Props) {
  const { open, onOpenChange } = props;
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildQuoteHtml(props));
    win.document.close();
    win.focus();
  };

  return (
    <UIDialog.Dialog open={open} onOpenChange={onOpenChange}>
      <UIDialog.DialogContent className="max-w-5xl">
        <UIDialog.DialogHeader>
          <UIDialog.DialogTitle>عرض سعر (قابل للطباعة)</UIDialog.DialogTitle>
        </UIDialog.DialogHeader>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">طباعة</Button>
        </div>
      </UIDialog.DialogContent>
    </UIDialog.Dialog>
  );
}
