export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImage(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.';
  }
  if (file.size > maxBytes) {
    return `Ảnh quá lớn (tối đa ${(maxBytes / 1048576).toFixed(0)} MB).`;
  }
  return null;
}

export interface ProcessedImage {
  blob: Blob;
  contentType: string;
  ext: 'jpg' | 'png' | 'webp';
}

/**
 * Resizes (never enlarges) and re-encodes an image in the browser.
 * keepPng = true keeps lossless PNG (use for QR codes so they stay scannable).
 */
export async function processImage(
  file: File,
  opts: { maxSide: number; quality?: number; keepPng?: boolean },
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, opts.maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  if (opts.keepPng) {
    ctx.drawImage(bitmap, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
  }
  bitmap.close?.();

  const toBlob = (type: string, q?: number) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));

  if (opts.keepPng) {
    const png = await toBlob('image/png');
    if (!png) throw new Error('Không thể xử lý ảnh.');
    return { blob: png, contentType: 'image/png', ext: 'png' };
  }
  const jpg = await toBlob('image/jpeg', opts.quality ?? 0.82);
  if (!jpg) throw new Error('Không thể xử lý ảnh.');
  return { blob: jpg, contentType: 'image/jpeg', ext: 'jpg' };
}
