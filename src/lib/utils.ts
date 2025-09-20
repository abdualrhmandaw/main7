import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGregorianDate(input: string | Date, locale: string = 'ar-LY'): string {
  try {
    const date = input instanceof Date ? input : new Date(input);
    const options: Intl.DateTimeFormatOptions & { calendar?: string } = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'gregory'
    };
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return '';
  }
}

// Normalize Arabic text for robust searching: lowercase, remove diacritics, normalize alef/yaa/taa marbuta, remove tatweel
export function normalizeArabic(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  let s = String(input).toLowerCase();
  // Remove diacritics and superscript alef
  s = s.replace(/[\u064B-\u0652\u0670]/g, '');
  // Tatweel
  s = s.replace(/[\u0640]/g, '');
  // Normalize Alef variants to ا
  s = s.replace(/[\u0622\u0623\u0625]/g, '\u0627');
  // Normalize Yaa forms and Alef Maqsura to ي
  s = s.replace(/[\u0649\u0626]/g, '\u064A');
  // Normalize Taa Marbuta to ه for broader matching
  s = s.replace(/[\u0629]/g, '\u0647');
  // Convert Arabic-Indic digits to Latin digits for consistency
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  for (let i = 0; i < arabicDigits.length; i++) {
    const ar = arabicDigits[i];
    s = s.replace(new RegExp(ar, 'g'), String(i));
  }
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function queryTokens(query: string): string[] {
  return normalizeArabic(query).split(/\s+/).filter(Boolean);
}
