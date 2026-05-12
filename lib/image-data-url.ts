/** Client-side image pipeline — long edge up to 8k (returns data URL for rare non-storage flows only). */
export function fileToGalleryDataUrlLocal(file: File): Promise<string> {
  return fileToCompressedDataUrl(file, 8192, 0.92);
}

/** Resize & JPEG-compress in-browser (optional export path). Cloud gallery uses Storage URLs, not base64 in DB. */
export async function fileToCompressedDataUrl(
  file: File,
  maxEdge = 1024,
  quality = 0.78,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unsupported.");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}
