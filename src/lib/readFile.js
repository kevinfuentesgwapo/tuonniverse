// Reads plain text out of a file, right in the browser.
// The file itself never leaves the student's device. Only the text is used.
// Supports: .docx, .pptx, .pdf (with real text), .txt, .md
// Heavy libraries load only when a file is picked, so the app stays fast.

export const ACCEPT = ".docx,.pptx,.pdf,.txt,.md";
export const MAX_FILE_MB = 15;
export const MAX_CHARS = 20000;

class FileReadError extends Error {}

const entities = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeXml(s) {
  return s
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => entities[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
}

async function readDocx(buffer) {
  const mod = await import("mammoth/mammoth.browser");
  const mammoth = mod.default || mod;
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || "";
}

async function readPptx(buffer) {
  const mod = await import("jszip");
  const JSZip = mod.default || mod;
  const zip = await JSZip.loadAsync(buffer);

  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort(
      (a, b) =>
        Number(a.match(/slide(\d+)\.xml/)[1]) -
        Number(b.match(/slide(\d+)\.xml/)[1]),
    );

  if (slideNames.length === 0) return "";

  const slides = [];
  for (const name of slideNames) {
    const xml = await zip.file(name).async("string");
    // Each <a:p> is one paragraph. Its text sits inside <a:t> tags.
    const paragraphs = xml
      .split("</a:p>")
      .map((chunk) => {
        const parts = [
          ...chunk.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g),
        ];
        return decodeXml(parts.map((m) => m[1]).join("")).trim();
      })
      .filter(Boolean);
    if (paragraphs.length) slides.push(paragraphs.join("\n"));
  }
  return slides.join("\n\n");
}

async function readPdf(buffer) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (err) {
    if (err && err.name === "PasswordException") {
      throw new FileReadError(
        "This PDF has a password. Please open it, save a copy without a password, and try again.",
      );
    }
    throw err;
  }

  const pages = [];
  let total = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) =>
        "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
      )
      .join("");
    pages.push(text);
    total += text.length;
    // Enough text already. No need to read the rest of a huge book.
    if (total > MAX_CHARS * 2) break;
  }
  return pages.join("\n\n");
}

function tidy(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Returns { text, truncated }. Throws an Error with a friendly message.
export async function readFileText(file) {
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".doc") || name.endsWith(".ppt")) {
    throw new Error(
      "That is an old Office file. Please open it and save it as .docx or .pptx, then try again.",
    );
  }
  const known = [".docx", ".pptx", ".pdf", ".txt", ".md"].some((ext) =>
    name.endsWith(ext),
  );
  if (!known) {
    throw new Error("Tuo can read .pptx, .docx, .pdf, .txt and .md files.");
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(
      `That file is bigger than ${MAX_FILE_MB} MB. Try a smaller file, or paste part of it.`,
    );
  }

  let raw = "";
  try {
    const buffer = await file.arrayBuffer();
    if (name.endsWith(".docx")) raw = await readDocx(buffer);
    else if (name.endsWith(".pptx")) raw = await readPptx(buffer);
    else if (name.endsWith(".pdf")) raw = await readPdf(buffer);
    else raw = new TextDecoder().decode(buffer);
  } catch (err) {
    if (err instanceof FileReadError) throw err;
    throw new Error(
      "Tuo could not open that file. It may be damaged. Try another file, or paste the text.",
    );
  }

  let text = tidy(raw);
  if (!text) {
    throw new Error(
      "Tuo could not find any text in that file. If it is a scan or photos of pages, try a file with real text, or paste the text.",
    );
  }

  let truncated = false;
  if (text.length > MAX_CHARS) {
    truncated = true;
    const cut = text.slice(0, MAX_CHARS);
    const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
    text = (lastBreak > MAX_CHARS * 0.8 ? cut.slice(0, lastBreak) : cut).trim();
  }
  return { text, truncated };
}
