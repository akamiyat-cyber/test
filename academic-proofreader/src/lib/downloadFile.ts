import { saveAs } from "file-saver";

export function downloadTextFile(text: string, filename: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = new Blob([text], { type: mimeType });
  saveAs(blob, filename);
}
