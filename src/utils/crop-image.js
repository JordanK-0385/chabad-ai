/* ─── crop-image.js ─── Center-crop a base64 image to a target aspect ratio ─── */

export function aspectRatioForFormat(fmt) {
  if (fmt === "story") return 9 / 16;    // 0.5625 portrait tall
  if (fmt === "a4") return 3 / 4;        // 0.75 portrait
  if (fmt === "paysage") return 4 / 3;   // 1.333 landscape
  return 1;                              // carre default
}

/**
 * Loads a base64 data URL into an Image, center-crops it to the target
 * aspect ratio (width/height), and returns a new PNG data URL.
 * If the source already matches the ratio (within tolerance), returns as-is.
 */
export function cropImageToRatio(dataUrl, targetRatio) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      if (!srcW || !srcH) { reject(new Error("Image has no dimensions")); return; }
      const srcRatio = srcW / srcH;

      // Already matches target within 0.5% tolerance — skip crop
      if (Math.abs(srcRatio - targetRatio) / targetRatio < 0.005) {
        resolve(dataUrl);
        return;
      }

      let cropW, cropH, offsetX, offsetY;
      if (srcRatio > targetRatio) {
        // Source is wider than target → trim sides
        cropH = srcH;
        cropW = Math.round(srcH * targetRatio);
        offsetX = Math.round((srcW - cropW) / 2);
        offsetY = 0;
      } else {
        // Source is taller than target → trim top/bottom
        cropW = srcW;
        cropH = Math.round(srcW / targetRatio);
        offsetX = 0;
        offsetY = Math.round((srcH - cropH) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = dataUrl;
  });
}
