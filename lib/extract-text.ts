import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function extractTextFromFile(file: File): Promise<{ title: string; text: string }> {
  const fileName = file.name;
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();

  const arrayBuffer = await file.arrayBuffer();

  let text = "";

  if (extension === "docx") {
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (extension === "pdf") {
    const { text: pdfText } = await extractText(new Uint8Array(arrayBuffer));
    text = Array.isArray(pdfText) ? pdfText.join("\n\n") : pdfText;
  } else if (extension === "txt" || extension === "md") {
    text = Buffer.from(arrayBuffer).toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: .${extension}. Please upload a .pdf, .docx, or .txt file.`);
  }

  const cleanedText = text.trim();
  if (!cleanedText) {
    throw new Error("No readable text could be extracted from this document.");
  }

  return {
    title,
    text: cleanedText,
  };
}
