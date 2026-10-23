/** اعتبارسنجی فایل رسید — خالص و تست‌پذیر (تشخیص نوع از magic bytes). */
export const RECEIPT_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;
export type ReceiptMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
export interface SniffResult { ok: boolean; mime?: ReceiptMime; ext?: "jpg" | "png" | "webp" | "pdf"; reason?: string }
const startsWith = (buf: Uint8Array, bytes: number[], offset = 0): boolean => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf: Uint8Array, offset: number, len: number): string => String.fromCharCode(...Array.from(buf.subarray(offset, offset + len)));

export function sniffReceiptFile(buf: Uint8Array): SniffResult {
  if (buf.length < 12) return { ok: false, reason: "فایل خیلی کوچک است یا خالی است." };
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { ok: true, mime: "image/jpeg", ext: "jpg" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ok: true, mime: "image/png", ext: "png" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return { ok: true, mime: "image/webp", ext: "webp" };
  if (ascii(buf, 0, 4) === "%PDF") return { ok: true, mime: "application/pdf", ext: "pdf" };
  if (buf.slice(0, 200).some((b) => b === 0x3c)) {
    return { ok: false, reason: "فقط تصویر اسکرین‌شات رسید (JPG/PNG/WebP) یا PDF پذیرفته می‌شود." };
  }
  return { ok: false, reason: "نوع فایل قابل تشخیص نیست؛ تصویر رسید (JPG/PNG/WebP) یا PDF بفرستید." };
}
export function maxReceiptBytes(): number {
  const v = Number(process.env.RECEIPT_MAX_BYTES ?? "");
  return Number.isFinite(v) && v > 0 ? Math.min(v, 25 * 1024 * 1024) : RECEIPT_MAX_BYTES_DEFAULT;
}
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} بایت`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} کیلوبایت`;
  return `${(n / (1024 * 1024)).toFixed(1)} مگابایت`;
}
export function safeFileName(input: string, ext: string): string {
  const cleaned = (input || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, "-").slice(0, 80).replace(/\.+$/, "");
  const base = cleaned.replace(/\.(jpe?g|png|webp|pdf)$/i, "");
  return `${base || "receipt"}.${ext}`;
}
