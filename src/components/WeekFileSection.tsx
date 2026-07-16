import React, { useRef, useState } from 'react';
import { Paperclip, Trash2, Volume2, VolumeX, Download, FileText, FileImage, File as FileIcon, Upload, Loader2 } from 'lucide-react';
import { WeekFile } from '../types';
import { processFile, formatBytes, fileTypeLabel, isReadable, MAX_FILE_BYTES } from '../lib/fileExtractor';

// ─── File Icon helper ────────────────────────────────────────────────────────

function FileTypeIcon({ mimeType, className = 'w-4 h-4' }: { mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') return <FileText className={`${className} text-rose-500`} />;
  if (mimeType.startsWith('image/')) return <FileImage className={`${className} text-blue-500`} />;
  if (mimeType.startsWith('text/')) return <FileText className={`${className} text-emerald-500`} />;
  return <FileIcon className={`${className} text-slate-400`} />;
}

// ─── Instructor Upload Panel ─────────────────────────────────────────────────

interface InstructorFilePanelProps {
  files: WeekFile[];
  onFilesChange: (files: WeekFile[]) => void;
}

export function InstructorFilePanel({ files, onFilesChange }: InstructorFilePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    setUploading(true);
    setUploadError(null);

    try {
      const processed = await Promise.all(picked.map(processFile));
      onFilesChange([...files, ...processed]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Week Files & Resources
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD600] hover:bg-[#FEE21E] border-2 border-black rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
          ) : (
            <><Upload className="w-3.5 h-3.5" /> Attach File</>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3,.wav"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <div className="p-2.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-700">
          {uploadError}
        </div>
      )}

      <p className="text-[9px] text-gray-400 font-bold">
        Max {MAX_FILE_BYTES / 1024 / 1024} MB per file · PDF, TXT, MD, images, audio, video
      </p>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-black rounded-xl"
            >
              <FileTypeIcon mimeType={file.type} className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-black dark:text-white truncate">{file.name}</p>
                <p className="text-[9px] text-gray-400 font-bold">
                  {fileTypeLabel(file.type)} · {formatBytes(file.size)}
                  {isReadable(file.type) && (
                    <span className="ml-1.5 text-emerald-600">· 🔊 TTS readable</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
          <Paperclip className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400">No files attached yet</p>
        </div>
      )}
    </div>
  );
}

// ─── Student Reading Panel ────────────────────────────────────────────────────

interface StudentFilePanelProps {
  files: WeekFile[];
}

export function StudentFilePanel({ files }: StudentFilePanelProps) {
  const [readingFileId, setReadingFileId] = useState<string | null>(null);

  if (!files || files.length === 0) return null;

  const speakFile = (file: WeekFile) => {
    if (!file.textContent) return;

    if (readingFileId === file.id) {
      // Stop reading
      window.speechSynthesis.cancel();
      setReadingFileId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(file.textContent);

    const savedRate = localStorage.getItem('voiceop_tts_rate');
    const savedVoice = localStorage.getItem('voiceop_tts_voice_name');
    if (savedRate) utterance.rate = parseFloat(savedRate);
    if (savedVoice) {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.name === savedVoice);
      if (matched) utterance.voice = matched;
    }

    utterance.onend = () => setReadingFileId(null);
    utterance.onerror = () => setReadingFileId(null);

    setReadingFileId(file.id);
    window.speechSynthesis.speak(utterance);
  };

  const downloadFile = (file: WeekFile) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    link.click();
  };

  return (
    <div className="space-y-3">
      <h5 className="text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" />
        Week Resources ({files.length})
      </h5>

      <div className="space-y-2">
        {files.map(file => {
          const isReading = readingFileId === file.id;
          const canRead = isReadable(file.type) && !!file.textContent;
          const isImage = file.type.startsWith('image/');

          return (
            <div
              key={file.id}
              className={`border-2 border-black rounded-2xl overflow-hidden transition-all ${
                isReading ? 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : ''
              }`}
            >
              {/* File row */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950">
                <FileTypeIcon mimeType={file.type} className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-black dark:text-white truncate">{file.name}</p>
                  <p className="text-[9px] text-gray-400 font-bold">
                    {fileTypeLabel(file.type)} · {formatBytes(file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* TTS Read button — only for readable document types */}
                  {canRead && (
                    <button
                      onClick={() => speakFile(file)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-black rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        isReading
                          ? 'bg-rose-400 text-black animate-pulse'
                          : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                      }`}
                      title={isReading ? 'Stop reading' : 'Read this document aloud'}
                    >
                      {isReading ? (
                        <><VolumeX className="w-3.5 h-3.5" /> Stop</>
                      ) : (
                        <><Volume2 className="w-3.5 h-3.5" /> Read Aloud</>
                      )}
                    </button>
                  )}

                  {/* Download button */}
                  <button
                    onClick={() => downloadFile(file)}
                    className="p-1.5 bg-white dark:bg-slate-800 border-2 border-black rounded-xl text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-[1px_1px_0px_0px_#000]"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Image preview */}
              {isImage && (
                <div className="border-t-2 border-black bg-black/5 dark:bg-black/30 p-2 flex justify-center">
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="max-h-48 rounded-xl object-contain"
                  />
                </div>
              )}

              {/* TTS reading status bar */}
              {isReading && (
                <div className="border-t-2 border-black bg-[#FFD600] px-3 py-2 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-black" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-black">
                    Reading "{file.name}" aloud...
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
