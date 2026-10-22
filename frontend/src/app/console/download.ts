/** Saves a generated file in the browser (nothing is kept after the download starts). */
export function downloadBlob(blob: Blob, name: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
