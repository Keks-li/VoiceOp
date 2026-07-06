import React, { useEffect, useState } from 'react';
import { 
  Sun, Moon, Type, Sparkles, Sliders, Key, HelpCircle, X, ChevronRight, Check
} from 'lucide-react';
import { ThemeMode, PrimaryColor, FontFamily, FontSize } from '../types';
import { getApiKey } from '../lib/gemini';

interface AccessibilityControlsProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  ttsRate: number;
  setTtsRate: (rate: number) => void;
  ttsVoiceName: string;
  setTtsVoiceName: (voiceName: string) => void;
}

export default function AccessibilityControls({
  isOpen,
  onClose,
  themeMode,
  setThemeMode,
  primaryColor,
  setPrimaryColor,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  ttsRate,
  setTtsRate,
  ttsVoiceName,
  setTtsVoiceName
}: AccessibilityControlsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKeyFeedback, setShowKeyFeedback] = useState(false);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load API key from local storage on mount
  useEffect(() => {
    setApiKey(getApiKey());
  }, [isOpen]);

  // Load TTS voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter primarily English voices for better reading quality, or just allow all
        const englishOrAll = voices.filter(v => v.lang.startsWith('en') || v.lang.includes('EN'));
        setSystemVoices(englishOrAll.length > 0 ? englishOrAll : voices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('voiceop_gemini_api_key', apiKey.trim());
    setShowKeyFeedback(true);
    setTimeout(() => setShowKeyFeedback(false), 2000);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('voiceop_gemini_api_key');
    setApiKey('');
    setShowKeyFeedback(true);
    setTimeout(() => setShowKeyFeedback(false), 2000);
  };

  if (!isOpen) return null;

  const colorOptions: { id: PrimaryColor; hex: string; name: string }[] = [
    { id: 'purple', hex: '#9333EA', name: 'Royal Purple' },
    { id: 'blue', hex: '#2563EB', name: 'Electric Blue' },
    { id: 'green', hex: '#059669', name: 'Forest Green' },
    { id: 'amber', hex: '#FFD600', name: 'Cyber Amber' },
  ];

  const fontOptions: { id: FontFamily; label: string; class: string }[] = [
    { id: 'sans', label: 'Space Sans', class: 'font-sans' },
    { id: 'serif', label: 'Bookish Serif', class: 'font-serif' },
    { id: 'mono', label: 'Tech Mono', class: 'font-mono' },
  ];

  const sizeOptions: { id: FontSize; label: string; scale: string }[] = [
    { id: 'small', label: 'Small', scale: '85%' },
    { id: 'medium', label: 'Normal', scale: '100%' },
    { id: 'large', label: 'Large', scale: '125%' },
    { id: 'xlarge', label: 'Extra Large', scale: '150%' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Overlay Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-md bg-[#FFFBEB] dark:bg-slate-900 border-l-4 border-black text-black dark:text-white h-full flex flex-col shadow-2xl z-10 transition-transform duration-350">
        
        {/* Drawer Header */}
        <div className="p-6 bg-white dark:bg-slate-950 border-b-4 border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            <h2 className="text-xl font-black uppercase tracking-tight">Accessibility Desk</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border-2 border-black bg-rose-200 dark:bg-rose-950 rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 text-black dark:text-white"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Theme Settings (Dark/Light) */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000000]">
            <label className="text-xs font-black uppercase tracking-wider block mb-3 text-gray-500 dark:text-slate-400">
              Visual mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setThemeMode('light')}
                className={`py-2.5 px-4 border-2 border-black rounded-xl font-black uppercase tracking-tight flex items-center justify-center gap-2 transition-all ${
                  themeMode === 'light' 
                    ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_0px_#000000]' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 stroke-[3]" />
                Light
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`py-2.5 px-4 border-2 border-black rounded-xl font-black uppercase tracking-tight flex items-center justify-center gap-2 transition-all ${
                  themeMode === 'dark' 
                    ? 'bg-[#9333EA] text-white shadow-[2px_2px_0px_0px_#000000]' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 stroke-[3]" />
                Dark
              </button>
            </div>
          </div>

          {/* Color Schemes */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000000]">
            <label className="text-xs font-black uppercase tracking-wider block mb-3 text-gray-500 dark:text-slate-400">
              Accent Theme Color
            </label>
            <div className="grid grid-cols-2 gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPrimaryColor(opt.id)}
                  className={`py-2 px-3 border-2 border-black rounded-xl flex items-center gap-2 font-black text-xs uppercase transition-all ${
                    primaryColor === opt.id 
                      ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_0px_#000000]' 
                      : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span 
                    className="w-4 h-4 rounded-full border-2 border-black flex-shrink-0"
                    style={{ backgroundColor: opt.hex }}
                  />
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Fonts */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000000]">
            <label className="text-xs font-black uppercase tracking-wider block mb-3 text-gray-500 dark:text-slate-400">
              Typography Font Family
            </label>
            <div className="grid grid-cols-3 gap-2">
              {fontOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFontFamily(opt.id)}
                  className={`py-2 px-1 border-2 border-black rounded-xl text-center font-bold text-xs transition-all ${opt.class} ${
                    fontFamily === opt.id 
                      ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_0px_#000000]' 
                      : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Sizes */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000000]">
            <label className="text-xs font-black uppercase tracking-wider block mb-3 text-gray-500 dark:text-slate-400">
              Text Scaling size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFontSize(opt.id)}
                  className={`py-2 px-3 border-2 border-black rounded-xl font-black text-xs uppercase flex items-center justify-between transition-all ${
                    fontSize === opt.id 
                      ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_0px_#000000]' 
                      : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono">
                    {opt.scale}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* TTS Controls (Voice & Speed) */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000000] space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 stroke-[2.5]" />
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Text-to-Speech Settings
              </label>
            </div>
            
            <div>
              <label className="text-[11px] font-black text-slate-650 dark:text-slate-350 block mb-1">
                Reading Speed: {ttsRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsRate}
                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white border border-black"
              />
            </div>

            {systemVoices.length > 0 && (
              <div>
                <label className="text-[11px] font-black text-slate-650 dark:text-slate-350 block mb-1">
                  Synthesizer voice
                </label>
                <select
                  value={ttsVoiceName}
                  onChange={(e) => setTtsVoiceName(e.target.value)}
                  className="w-full p-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 border-2 border-black rounded-xl text-black dark:text-white"
                >
                  <option value="">System Default Voice</option>
                  {systemVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Gemini API Key Panel */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Gemini API Configuration
                </label>
              </div>
              {(import.meta as any).env.VITE_GEMINI_API_KEY && (import.meta as any).env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.5 rounded">
                  System Key Active
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-normal font-medium">
              If your developer setup has not set VITE_GEMINI_API_KEY in .env, you can paste your personal key below. It remains secure locally on your browser.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-900 text-black dark:text-white"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-2 text-xs font-black bg-black text-white hover:bg-slate-850 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
              >
                Save
              </button>
            </div>
            
            {apiKey && (
              <button
                onClick={handleClearApiKey}
                className="text-[10px] font-bold text-rose-500 hover:underline block text-left"
              >
                Clear Custom Key
              </button>
            )}

            {showKeyFeedback && (
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-250 border-2 border-black rounded-xl text-center text-xs font-bold">
                API settings updated!
              </div>
            )}
          </div>

        </div>

        {/* Info Box Footer */}
        <div className="p-4 bg-white dark:bg-slate-950 border-t-4 border-black text-center text-[10px] font-bold text-slate-500">
          Accessibility Desk • VoiceOp E-Learning
        </div>
      </div>
    </div>
  );
}
