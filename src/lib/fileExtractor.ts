import { WeekFile } from '../types';

/** Max file size we allow (5 MB) */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** File types that we can extract text from for TTS */
const TEXT_EXTRACTABLE = ['text/plain', 'text/markdown', 'text/csv'];
const PDF_TYPE = 'application/pdf';

/**
 * Returns true if we can extract readable text from this MIME type
 * (i.e. TTS "Read Aloud" will work).
 */
export function isReadable(mimeType: string): boolean {
  return TEXT_EXTRACTABLE.includes(mimeType) || mimeType === PDF_TYPE;
}

/**
 * Human-friendly file type label.
 */
export function fileTypeLabel(mimeType: string): string {
  if (mimeType === PDF_TYPE) return 'PDF';
  if (mimeType.startsWith('text/')) return 'Text';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.includes('word')) return 'Word Doc';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Slides';
  return 'File';
}

/**
 * Reads a File as a base64 data URL.
 */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a plain-text File as a UTF-8 string.
 */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Extracts all text from a PDF file using pdf.js (lazy loaded).
 */
async function extractPdfText(dataUrl: string): Promise<string> {
  // Dynamically import pdf.js to keep initial bundle small
  const pdfjs = await import('pdfjs-dist');

  // Point the worker to the bundled worker file
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  // Strip the data:application/pdf;base64, prefix
  const base64 = dataUrl.split(',')[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n');
}

/**
 * Reads a File from the browser and returns a WeekFile ready to store.
 * Throws if the file exceeds MAX_FILE_BYTES.
 */
export async function processFile(file: File): Promise<WeekFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
      `Maximum allowed size is ${MAX_FILE_BYTES / 1024 / 1024} MB.`
    );
  }

  const dataUrl = await readAsDataUrl(file);

  let textContent: string | undefined;

  if (TEXT_EXTRACTABLE.includes(file.type)) {
    textContent = await readAsText(file);
  } else if (file.type === PDF_TYPE) {
    try {
      textContent = await extractPdfText(dataUrl);
    } catch (err) {
      console.warn('PDF text extraction failed:', err);
      textContent = undefined;
    }
  }

  return {
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl,
    textContent,
  };
}

/** Format bytes as a human-readable string, e.g. "1.4 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
