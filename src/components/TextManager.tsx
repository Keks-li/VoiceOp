import React, { useState, useRef } from 'react';
import { Copy, Check, FileDown, Trash2, FileText, Info, UploadCloud, RefreshCw, FileUp, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';

// Helper to dynamically load PDF.js from cdnjs
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const globalWindow = window as any;
    if (globalWindow['pdfjs-dist/build/pdf']) {
      resolve(globalWindow['pdfjs-dist/build/pdf']);
      return;
    }
    
    const existingScript = document.getElementById('pdfjs-script');
    if (existingScript) {
      let attempts = 0;
      const interval = setInterval(() => {
        if (globalWindow['pdfjs-dist/build/pdf']) {
          clearInterval(interval);
          resolve(globalWindow['pdfjs-dist/build/pdf']);
        }
        attempts++;
        if (attempts > 30) {
          clearInterval(interval);
          reject(new Error('Timeout loading PDF.js'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdfjs-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = globalWindow['pdfjs-dist/build/pdf'];
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      } else {
        reject(new Error('pdfjsLib not found after load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js script'));
    document.body.appendChild(script);
  });
};

interface TextManagerProps {
  text: string;
  setText: (val: string) => void;
}

export default function TextManager({ text, setText }: TextManagerProps) {
  const [copied, setCopied] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Character and word calculations
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const speakingTimeSecs = Math.ceil((wordCount / 150) * 60);

  const handleCopy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processPdfFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processPdfFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setExtractError('Please upload a valid PDF file (.pdf format)');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const pdfjsLib = await loadPdfJS();
      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let extractedText = '';
      const numPages = pdf.numPages;
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        extractedText += pageText + ' ';
      }
      
      const cleanedText = extractedText.replace(/\s+/g, ' ').trim();
      
      if (!cleanedText) {
        throw new Error("No readable text could be extracted from this PDF. It might contain only images or scanned pages.");
      }
      
      // Sync into state
      if (text === 'Hello! Speak or type something here...' || !text.trim()) {
        setText(cleanedText);
      } else {
        setText(text + '\n\n' + cleanedText);
      }
      
      setIsExtracting(false);
    } catch (err: any) {
      console.error(err);
      setExtractError(err.message || 'Failed to extract text from PDF.');
      setIsExtracting(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processPdfFile(file);
    }
  };

  const handleDownloadPDF = () => {
    if (!text.trim()) return;
    try {
      const doc = new jsPDF();
      
      // Document metadata
      doc.setProperties({
        title: 'VoiceOp Transcript',
        subject: 'Vocal Transcription Export',
        author: 'VoiceOp User',
        keywords: 'transcript, voiceop, audio',
        creator: 'VoiceOp App'
      });

      // Header Branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      doc.text('VoiceOp Transcript', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const todayStr = new Date().toLocaleString();
      doc.text(`Exported: ${todayStr}`, 20, 31);

      // Accent Divider Line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.5);
      doc.line(20, 35, 190, 35);
      
      // Body text wrapping
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      
      const splitText = doc.splitTextToSize(text, 170);
      doc.text(splitText, 20, 48);
      
      // Footer
      const pageCount = (doc.internal as any).pages.length - 1;
      const pageHeight = doc.internal.pageSize.height || 297;
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        // Accent line above footer
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 18, 190, pageHeight - 18);
        
        doc.text(
          'Generated via VoiceOp • High-Fidelity Speech-to-Text & Custom Controls Studio',
          20,
          pageHeight - 12
        );
        doc.text(`Page ${i} of ${pageCount}`, 175, pageHeight - 12);
      }

      doc.save(`voiceop-transcript-${Date.now().toString().slice(-6)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
          <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Saved Transcription Manager</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-green-300">
          ● Saved to Cache
        </div>
      </div>

      {/* Live Text Area / Editor Sync */}
      <div className="mb-4 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="No transcription text saved yet. Speak to the microphone or start typing in the simulator..."
          className="w-full h-36 p-3 text-xs md:text-sm font-extrabold border-2 border-black rounded-xl bg-amber-50/50 dark:bg-slate-950 text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD600] resize-none leading-relaxed"
        />
        {text.trim() && (
          <button
            onClick={() => setText('')}
            className="absolute bottom-3 right-3 p-1.5 bg-rose-500 hover:bg-rose-600 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
            title="Clear saved text"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* PDF Uploader for Text-to-Voice */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-4 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center min-h-[95px] ${
          isDragging 
            ? 'border-[#FFD600] bg-amber-50 dark:bg-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-[1.01]' 
            : 'border-black hover:bg-slate-50 dark:hover:bg-slate-950 bg-white dark:bg-slate-900'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handlePdfUpload}
          accept="application/pdf"
          className="hidden"
        />
        {isExtracting ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 text-black dark:text-white stroke-[2.5] animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Extracting text from PDF...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 bg-[#FFD600] text-black border-2 border-black px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-1">
              <FileUp className="w-3.5 h-3.5 stroke-[3]" />
              <span>PDF Voice Reader</span>
            </div>
            <p className="text-xs font-extrabold text-black dark:text-white">
              Drag & Drop PDF here or <span className="underline decoration-2 text-blue-600 dark:text-blue-400">click to upload</span>
            </p>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
              Extracts text dynamically for mobile Text-to-Voice playback
            </p>
          </div>
        )}
      </div>

      {/* Extract Error Alert */}
      {extractError && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
          <div className="text-[11px] font-bold">
            <span className="font-black uppercase block tracking-wider text-xs mb-0.5">Extraction Failed</span>
            {extractError}
          </div>
        </div>
      )}

      {/* Stats display */}
      <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
        <div className="p-2 bg-[#FFFBEB] dark:bg-slate-950 border-2 border-black rounded-xl">
          <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Characters</span>
          <span className="text-sm font-black text-black dark:text-white">{charCount}</span>
        </div>
        <div className="p-2 bg-[#FFFBEB] dark:bg-slate-950 border-2 border-black rounded-xl">
          <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Words</span>
          <span className="text-sm font-black text-black dark:text-white">{wordCount}</span>
        </div>
        <div className="p-2 bg-[#FFFBEB] dark:bg-slate-950 border-2 border-black rounded-xl">
          <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Speaking Time</span>
          <span className="text-sm font-black text-black dark:text-white">
            {speakingTimeSecs === 0 ? '0s' : speakingTimeSecs < 60 ? `${speakingTimeSecs}s` : `${Math.floor(speakingTimeSecs / 60)}m`}
          </span>
        </div>
      </div>

      {/* Action buttons bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          disabled={!text.trim()}
          className={`py-3 px-4 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 flex items-center justify-center gap-2 ${
            text.trim()
              ? 'bg-[#FFD600] text-black hover:bg-yellow-400 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-600 border-gray-300 dark:border-slate-700 cursor-not-allowed shadow-none'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 stroke-[3] text-black" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 stroke-[2.5]" />
              <span>Copy Text</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={!text.trim()}
          className={`py-3 px-4 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 flex items-center justify-center gap-2 ${
            text.trim()
              ? 'bg-black text-white hover:bg-slate-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-600 border-gray-300 dark:border-slate-700 cursor-not-allowed shadow-none'
          }`}
        >
          <FileDown className="w-4 h-4 stroke-[2.5]" />
          <span>Download PDF</span>
        </button>
      </div>

      {/* Tip panel */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-900 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold leading-normal">
          Any text you speak to the microphone or type inside the active mobile screen is synced here instantly and auto-cached. Clearing it resets the cache.
        </p>
      </div>
    </div>
  );
}
