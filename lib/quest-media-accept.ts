/** iOS / 部分相册导出常见 `file.type === ""`，仅靠 MIME 会误判为「非图片」并静默跳过上传。 */

export function fileAcceptsAsQuestPhoto(file: File): boolean {
  if (file.type?.trim() && file.type.startsWith("image/")) return true;
  const n = (file.name || "").toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tif|tiff)$/i.test(n);
}

export function fileAcceptsAsQuestVideo(file: File): boolean {
  if (file.type?.trim() && file.type.startsWith("video/")) return true;
  const n = (file.name || "").toLowerCase();
  return /\.(mp4|webm|mov|m4v|mkv)$/i.test(n);
}
