import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export async function downloadTextAsDocx(text: string, filename: string): Promise<void> {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => new Paragraph({ children: [new TextRun(line)] }));

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
