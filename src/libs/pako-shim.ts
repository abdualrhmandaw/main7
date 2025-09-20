// Import from a deep path so Vite alias for 'pako' -> this file doesn't cause a circular import
import * as realPako from 'pako/dist/pako.js';

// Default export for consumers expecting default
export default realPako;

// Named exports passthrough
export const deflate = (realPako as any).deflate;
export const inflate = (realPako as any).inflate;
export const gzip = (realPako as any).gzip;
export const ungzip = (realPako as any).ungzip;
export const inflateRaw = (realPako as any).inflateRaw;
export const deflateRaw = (realPako as any).deflateRaw;
export const constants = (realPako as any).constants;
