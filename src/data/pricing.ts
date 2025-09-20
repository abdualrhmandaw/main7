// واجهة مزامنة للأسعار مبنية على كاش محمّل وقت التشغيل
// تُصلح ظهور [object Promise] عبر إرجاع أرقام متزامنة بدل الدوال غير المتزامنة

import { getAllPricing as fetchAllPricing } from '@/services/pricingService';
export type { CustomerType, LevelType } from '@/services/pricingService';

// تحميل بيانات الأسعار مرة واحدة عند تشغيل التطبيق
const PRICING_CACHE: any[] = await fetchAllPricing().catch(() => []);
export const PRICING = PRICING_CACHE;

function canonSize(size: string): string {
  if (!size) return '4x12';
  let s = String(size).toLowerCase().replace(/[×xX]/g, 'x').replace(/[^\dx]/g, '');
  const parts = s.split('x').map(Number).filter((n) => !isNaN(n));
  if (parts.length === 2) {
    parts.sort((a, b) => a - b);
    return parts.join('x');
  }
  return s;
}

function normalizeNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function monthKey(months: number): 'one_month' | '2_months' | '3_months' | '6_months' | 'full_year' {
  switch (months) {
    case 1:
      return 'one_month';
    case 2:
      return '2_months';
    case 3:
      return '3_months';
    case 6:
      return '6_months';
    case 12:
      return 'full_year';
    default:
      return 'one_month';
  }
}

export function getPriceFor(size: string, level: string | undefined, customer: string, months: number): number | null {
  const key = monthKey(Math.max(1, Number(months || 1)));
  const cs = canonSize(size);
  const lvl = level || 'A';

  let row = PRICING_CACHE.find(
    (r) => canonSize(r.size) === cs && String(r.billboard_level) === String(lvl) && String(r.customer_category) === String(customer)
  );
  if (!row) {
    // allow fallback by ignoring level, but NEVER across categories
    row = PRICING_CACHE.find((r) => canonSize(r.size) === cs && String(r.customer_category) === String(customer));
  }
  if (!row) return null;
  return normalizeNumber((row as any)[key]);
}

export function getDailyPriceFor(size: string, level: string | undefined, customer: string): number | null {
  const cs = canonSize(size);
  const lvl = level || 'A';

  let row = PRICING_CACHE.find(
    (r) => canonSize(r.size) === cs && String(r.billboard_level) === String(lvl) && String(r.customer_category) === String(customer)
  );
  if (!row) {
    // allow fallback by ignoring level, but NEVER across categories
    row = PRICING_CACHE.find((r) => canonSize(r.size) === cs && String(r.customer_category) === String(customer));
  }
  if (!row) return null;
  return normalizeNumber((row as any).one_day);
}

export function getAvailableSizes(): string[] {
  return Array.from(new Set(PRICING_CACHE.map((p) => p.size))).filter(Boolean);
}

export function getAvailableLevels(): string[] {
  return Array.from(new Set(PRICING_CACHE.map((p) => p.billboard_level))).filter(Boolean);
}

export async function getCustomerCategories(): Promise<string[]> {
  try {
    const set = Array.from(new Set(PRICING_CACHE.map((p) => p.customer_category))).filter(Boolean) as string[];
    return set.length ? set : ['عادي', 'المدينة', 'مسوق', 'شركات'];
  } catch {
    return ['عادي', 'المدينة', 'مسوق', 'شركات'];
  }
}

export const CUSTOMERS = await getCustomerCategories().catch(() => ['عادي', 'المدينة', 'مسوق', 'شركات']);
