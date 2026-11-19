/**
 * Client-side image compression.
 *
 * Venue photos come straight off phones, where a single shot is routinely
 * 4–8MB of 4032x3024 JPEG. We never display them larger than a few hundred
 * pixels, so uploading the original wastes the uploader's bandwidth (often
 * mobile data), Supabase storage, and every future visitor's page load.
 *
 * This resizes the longest edge down to MAX_EDGE and re-encodes to WebP,
 * which typically lands a phone photo between 100–300KB.
 */

const MAX_EDGE = 1920;
const QUALITY = 0.82;
const TARGET_TYPE = "image/webp";

/** Animated GIFs lose their animation when drawn to a canvas, so leave them alone. */
const SKIP_TYPES = new Set(["image/gif"]);

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  /** False when the original was returned untouched. */
  didCompress: boolean;
};

/** Decode a File into something drawable, preferring the off-thread path. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation applies the EXIF rotation that phones rely on;
      // without it, portrait photos come back sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Safari < 17 and some older Android WebViews reject the options bag.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renameTo(name: string, ext: string): string {
  const stem = name.replace(/\.[^.]+$/, "") || "photo";
  return `${stem}.${ext}`;
}

/**
 * Returns a smaller version of `file`, or the original if compressing it
 * wouldn't help. Never throws: a failure here should not block an upload,
 * it should just mean the original goes up instead.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file,
    originalBytes: file.size,
    compressedBytes: file.size,
    didCompress: false,
  };

  if (SKIP_TYPES.has(file.type)) return unchanged;
  if (typeof document === "undefined") return unchanged;

  try {
    const source = await decode(file);
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height = "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!width || !height) return unchanged;

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    if ("close" in source) source.close();

    const blob = await canvasToBlob(canvas, TARGET_TYPE, QUALITY);
    if (!blob) return unchanged;

    // Re-encoding can inflate an already-optimised file. Only take the
    // result when it's a real win.
    if (blob.size >= file.size * 0.95) return unchanged;

    return {
      file: new File([blob], renameTo(file.name, "webp"), {
        type: TARGET_TYPE,
        lastModified: Date.now(),
      }),
      originalBytes: file.size,
      compressedBytes: blob.size,
      didCompress: true,
    };
  } catch {
    return unchanged;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
