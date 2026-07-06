import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Volume2, Moon, Sun, 
  Settings, Trash2, ArrowRight, Play, Info, Check, 
  Palette, RefreshCw, Type, Sparkles, Copy, FileDown 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ThemeMode, PrimaryColor, FontFamily, FontSize } from '../types';

interface AndroidSimulatorProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  text: string;
  setText: (val: string) => void;
  onCommandDetected: (command: string) => void;
}

export default function AndroidSimulator({
  themeMode,
  setThemeMode,
  primaryColor,
  setPrimaryColor,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  text,
  setText,
  onCommandDetected
}: AndroidSimulatorProps) {
  
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [speakActive, setSpeakActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [micWaves, setMicWaves] = useState<number[]>([15, 10, 15, 10, 15]);

  // Command Simulator (Fallback for browsers/devices without mic)
  const [simulateCommandText, setSimulateCommandText] = useState<string>('');

  const recognitionRef = useRef<any>(null);

  // Voice waves animation when listening
  useEffect(() => {
    let interval: any;
    if (isListening) {
      interval = setInterval(() => {
        setMicWaves(Array.from({ length: 6 }, () => Math.floor(Math.random() * 40) + 12));
      }, 100);
    } else {
      setMicWaves([12, 12, 12, 12, 12]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Speech Recognition API setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error === 'not-allowed') {
          setRecognitionError('Permission Denied. Please enable microphone permissions in your browser settings.');
        } else {
          setRecognitionError(`Recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const spokenText = (finalTranscript || interimTranscript).trim();
        if (spokenText) {
          setText(spokenText);
          parseSpeechCommands(spokenText);
        }
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionError('Web Speech API is not supported on this browser. Try Chrome or Safari, or use the Command Simulation box below!');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Browser doesn't support mic
      setRecognitionError('Speech recognition is not available in your browser. Use the Command Simulation panel below to test!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setText(''); // clear text on new recording session
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  // Apply a global font scale to the entire page via CSS custom property
  const setGlobalFontScale = (scale: number) => {
    document.documentElement.style.setProperty('--page-font-scale', String(scale));
  };

  // Process the spoken string and match commands
  const parseSpeechCommands = (spokenText: string) => {
    const lowerText = spokenText.toLowerCase();

    // Theme Mode
    if (lowerText.includes('use dark mode') || lowerText.includes('enable dark mode') || lowerText.includes('switch to dark mode')) {
      setThemeMode('dark');
      onCommandDetected('Theme: Dark');
    } else if (lowerText.includes('use light mode') || lowerText.includes('enable light mode') || lowerText.includes('switch to light mode')) {
      setThemeMode('light');
      onCommandDetected('Theme: Light');
    }

    // Color Scheme
    if (lowerText.includes('use purple theme') || lowerText.includes('set color purple')) {
      setPrimaryColor('purple');
      onCommandDetected('Color: Purple');
    } else if (lowerText.includes('use blue theme') || lowerText.includes('set color blue')) {
      setPrimaryColor('blue');
      onCommandDetected('Color: Blue');
    } else if (lowerText.includes('use green theme') || lowerText.includes('set color green')) {
      setPrimaryColor('green');
      onCommandDetected('Color: Green');
    } else if (lowerText.includes('use amber theme') || lowerText.includes('set color amber')) {
      setPrimaryColor('amber');
      onCommandDetected('Color: Amber');
    }

    // Typography style
    if (lowerText.includes('use sans font') || lowerText.includes('set font sans')) {
      setFontFamily('sans');
      onCommandDetected('Font: Sans');
    } else if (lowerText.includes('use serif font') || lowerText.includes('set font serif')) {
      setFontFamily('serif');
      onCommandDetected('Font: Serif');
    } else if (lowerText.includes('use mono font') || lowerText.includes('set font mono')) {
      setFontFamily('mono');
      onCommandDetected('Font: Mono');
    }

    // Font Sizing — also scales ALL text on the web page
    if (
      lowerText.includes('make text larger') ||
      lowerText.includes('make text large') ||
      lowerText.includes('make text bigger') ||
      lowerText.includes('make text big') ||
      lowerText.includes('set size large')
    ) {
      setFontSize('large');
      setGlobalFontScale(1.25); // 125 % of base — every rem/em grows
      onCommandDetected('Size: Large');
    } else if (
      lowerText.includes('make text medium') ||
      lowerText.includes('set size medium') ||
      lowerText.includes('reset text size') ||
      lowerText.includes('normal text size')
    ) {
      setFontSize('medium');
      setGlobalFontScale(1); // back to 100 %
      onCommandDetected('Size: Medium');
    } else if (
      lowerText.includes('make text small') ||
      lowerText.includes('set size small')
    ) {
      setFontSize('small');
      setGlobalFontScale(0.85); // 85 %
      onCommandDetected('Size: Small');
    }

    // Actions
    if (lowerText.includes('clear text') || lowerText.includes('reset text')) {
      setText('');
      onCommandDetected('Action: Clear Text');
    }
  };

  // Text to Voice (Speech Synthesis)
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (!text.trim()) return;
      window.speechSynthesis.cancel();
      setSpeakActive(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setSpeakActive(false);
      utterance.onerror = () => setSpeakActive(false);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech Synthesis (Text-to-Voice) is not supported in this browser.');
    }
  };

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

  const handleDownloadPDF = () => {
    if (!text.trim()) return;
    try {
      const doc = new jsPDF();
      doc.setProperties({
        title: 'VoiceOp Transcript',
        subject: 'Vocal Transcription Export',
        author: 'VoiceOp User',
        keywords: 'transcript, voiceop, audio',
        creator: 'VoiceOp App'
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      doc.text('VoiceOp Transcript', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const todayStr = new Date().toLocaleString();
      doc.text(`Exported: ${todayStr}`, 20, 31);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.5);
      doc.line(20, 35, 190, 35);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      
      const splitText = doc.splitTextToSize(text, 170);
      doc.text(splitText, 20, 48);
      
      const pageCount = (doc.internal as any).pages.length - 1;
      const pageHeight = doc.internal.pageSize.height || 297;
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
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

  const handleSimulateCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulateCommandText.trim()) return;
    
    // Fill text area with simulated command context so user sees it
    setText(simulateCommandText);
    parseSpeechCommands(simulateCommandText);
    setSimulateCommandText('');
  };

  // Color Mapping Styles aligned with the high-contrast Bold Typography / Neo-Brutalist design
  const colorSchemes = {
    purple: {
      primary: 'bg-[#9333EA] text-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] font-black uppercase tracking-tight hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000000]',
      primaryHover: 'hover:bg-[#A855F7]',
      primaryText: 'text-[#9333EA] dark:text-[#C084FC] font-black uppercase tracking-tight',
      containerBg: 'bg-white dark:bg-slate-900 border-2 border-black shadow-[4px_4px_0px_0px_#000000]',
      border: 'border-2 border-black',
      focusRing: 'focus:ring-2 focus:ring-black',
      chipSelected: 'bg-[#FFD600] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000000]'
    },
    blue: {
      primary: 'bg-[#2563EB] text-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] font-black uppercase tracking-tight hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000000]',
      primaryHover: 'hover:bg-[#3B82F6]',
      primaryText: 'text-[#2563EB] dark:text-[#60A5FA] font-black uppercase tracking-tight',
      containerBg: 'bg-white dark:bg-slate-900 border-2 border-black shadow-[4px_4px_0px_0px_#000000]',
      border: 'border-2 border-black',
      focusRing: 'focus:ring-2 focus:ring-black',
      chipSelected: 'bg-[#FFD600] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000000]'
    },
    green: {
      primary: 'bg-[#059669] text-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] font-black uppercase tracking-tight hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000000]',
      primaryHover: 'hover:bg-[#10B981]',
      primaryText: 'text-[#059669] dark:text-[#34D399] font-black uppercase tracking-tight',
      containerBg: 'bg-white dark:bg-slate-900 border-2 border-black shadow-[4px_4px_0px_0px_#000000]',
      border: 'border-2 border-black',
      focusRing: 'focus:ring-2 focus:ring-black',
      chipSelected: 'bg-[#FFD600] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000000]'
    },
    amber: {
      primary: 'bg-[#FFD600] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000000] font-black uppercase tracking-tight hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000000]',
      primaryHover: 'hover:bg-[#FEE21E]',
      primaryText: 'text-amber-600 dark:text-amber-400 font-black uppercase tracking-tight',
      containerBg: 'bg-white dark:bg-slate-900 border-2 border-black shadow-[4px_4px_0px_0px_#000000]',
      border: 'border-2 border-black',
      focusRing: 'focus:ring-2 focus:ring-black',
      chipSelected: 'bg-[#FFD600] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000000]'
    }
  };

  const currentColors = colorSchemes[primaryColor];

  // Font Classes Mapping
  const fontStyles = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  };

  const fontSizeStyles = {
    small: 'text-sm font-bold',
    medium: 'text-base md:text-lg font-extrabold',
    large: 'text-xl md:text-2xl font-black tracking-tight leading-tight'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Visual Device Wrapper (The simulated Android hardware with neo-brutalist border) */}
      <div className="relative w-[340px] h-[670px] bg-slate-950 rounded-[48px] shadow-[12px_12px_0px_0px_#000000] border-4 border-black flex flex-col p-3 select-none">
        {/* Notch / Speaker bar */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center border-b-2 border-black">
          <div className="w-16 h-1 bg-slate-800 rounded-full mb-1" />
          <div className="w-2.5 h-2.5 bg-slate-800 rounded-full ml-3 mb-1" />
        </div>

        {/* Left Side Buttons (Volume keys) */}
        <div className="absolute left-[-8px] top-28 w-2 h-12 bg-black rounded-l" />
        <div className="absolute left-[-8px] top-44 w-2 h-16 bg-black rounded-l" />
        
        {/* Right Side Buttons (Power key) */}
        <div className="absolute right-[-8px] top-36 w-2 h-16 bg-black rounded-r" />

        {/* Screen container */}
        <div className={`relative flex-1 w-full h-full rounded-[38px] overflow-hidden flex flex-col border-2 border-black transition-colors duration-300 ${
          themeMode === 'light' 
            ? 'bg-[#FFD600] text-black' 
            : 'bg-black text-white'
        }`}>
          
          {/* Status Bar Spacer */}
          <div className="h-5 z-40" />

          {/* App Bar (Flutter Styled Scaffold AppBar) */}
          <div className={`h-14 px-4 flex items-center justify-between border-b-4 border-black ${
            themeMode === 'light' 
              ? 'bg-white shadow-2xs text-black' 
              : 'bg-slate-900 border-slate-800 shadow-2xs text-white'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-4.5 h-4.5 rounded-full border-2 border-black ${currentColors.primary}`} />
              <span className="font-black text-xs tracking-tighter uppercase font-sans">VoiceOp</span>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Quick toggle theme button */}
              <button 
                onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                className={`p-1.5 rounded-lg border-2 border-black transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  themeMode === 'light' ? 'bg-white hover:bg-slate-100 text-black' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title="Toggle Light/Dark"
              >
                {themeMode === 'light' ? <Moon className="w-4 h-4 stroke-[3.5]" /> : <Sun className="w-4 h-4 stroke-[3.5]" />}
              </button>
              
              {/* Settings menu anchor */}
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg border-2 border-black transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  themeMode === 'light' ? 'bg-[#FFD600] text-black' : 'bg-slate-800 hover:bg-slate-700 text-white'
                } ${showSettings ? 'bg-amber-300!' : ''}`}
                title="UI Customization Settings"
              >
                <Settings className="w-4 h-4 stroke-[3.5]" />
              </button>
            </div>
          </div>

          {/* Inner Canvas Body */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 relative">
            
            {/* Dynamic style info overlay when settings panel is hidden */}
            {!showSettings && (
              <div className={`text-[10px] px-2.5 py-1.5 rounded-xl border-2 border-black flex flex-wrap gap-2 items-center justify-between ${
                themeMode === 'light' ? 'bg-white' : 'bg-slate-900'
              } shadow-[2px_2px_0px_0px_#000000]`}>
                <span className="text-black dark:text-slate-300 font-black uppercase">Active Flutter Styles:</span>
                <div className="flex gap-1.5 font-mono text-[9px] font-bold">
                  <span className="px-1 bg-white dark:bg-slate-800 rounded border border-black capitalize">{primaryColor}</span>
                  <span className="px-1 bg-white dark:bg-slate-800 rounded border border-black capitalize">{fontFamily}</span>
                  <span className="px-1 bg-white dark:bg-slate-800 rounded border border-black capitalize">{fontSize}</span>
                </div>
              </div>
            )}

            {/* Quick settings overlay modal in Scaffold (Simulating a Flutter Drawer or BottomSheet) */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-3 rounded-2xl border-2 border-black flex flex-col gap-3 shadow-[4px_4px_0px_0px_#000000] ${
                    themeMode === 'light' ? 'bg-white text-black' : 'bg-slate-900 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b-2 border-black">
                    <span className="text-xs font-black flex items-center gap-1.5 text-black dark:text-white uppercase tracking-wider">
                      <Settings className="w-3 h-3 text-indigo-600 stroke-[3]" />
                      Flutter Customizer
                    </span>
                    <button onClick={() => setShowSettings(false)} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter hover:underline">
                      Close
                    </button>
                  </div>

                  {/* Fonts selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wide">Font Style</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['sans', 'serif', 'mono'] as FontFamily[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFontFamily(f)}
                          className={`py-1 text-xs rounded-lg border-2 border-black capitalize transition-all font-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            fontFamily === f 
                              ? currentColors.chipSelected
                              : 'bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seed Color Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wide">Seed Accent Color</label>
                    <div className="flex gap-2 items-center">
                      {(['purple', 'blue', 'green', 'amber'] as PrimaryColor[]).map((c) => {
                        const dots = {
                          purple: 'bg-purple-600',
                          blue: 'bg-blue-600',
                          green: 'bg-emerald-600',
                          amber: 'bg-[#FFD600]'
                        };
                        return (
                          <button
                            key={c}
                            onClick={() => setPrimaryColor(c)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-black transition-all ${dots[c]} ${
                              primaryColor === c ? 'ring-2 ring-black scale-110 shadow-[2px_2px_0px_0px_#000000]' : ''
                            }`}
                          >
                            {primaryColor === c && <Check className="w-3.5 h-3.5 text-white dark:text-black stroke-[3.5]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font Size Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wide">Text Sizing</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setFontSize(s)}
                          className={`py-1 text-xs rounded-lg border-2 border-black capitalize transition-all font-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            fontSize === s 
                              ? currentColors.chipSelected
                              : 'bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Speech Canvas Box (The core text view area with neo-brutalist border and dropshadow) */}
            <div className={`flex-1 min-h-[160px] p-4 rounded-3xl border-2 border-black transition-all duration-300 flex flex-col relative ${
              themeMode === 'light' 
                ? 'bg-white shadow-[6px_6px_0px_0px_#000000] text-black' 
                : 'bg-slate-900 shadow-[6px_6px_0px_0px_#ffffff] text-white'
            }`}>
              
              {/* Text Canvas Title */}
              <div className="flex items-center justify-between mb-2 pb-1 border-b-2 border-black">
                <span className="text-[10px] font-black uppercase tracking-wider text-black dark:text-white">Content Canvas</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={!text.trim()}
                    className={`transition-all ${
                      text.trim()
                        ? 'text-black dark:text-white hover:text-emerald-500 cursor-pointer'
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    }`}
                    title={copied ? "Copied!" : "Copy text"}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-500 animate-bounce" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!text.trim()}
                    className={`transition-all ${
                      text.trim()
                        ? 'text-black dark:text-white hover:text-amber-500 cursor-pointer'
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    }`}
                    title="Download PDF"
                  >
                    <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    onClick={() => setText('')}
                    disabled={!text.trim()}
                    className={`transition-all ${
                      text.trim()
                        ? 'text-black dark:text-white hover:text-rose-500 cursor-pointer'
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    }`}
                    title="Clear text"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Text input area */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tap the mic below and start speaking, or type/paste your content here to read it aloud..."
                className={`w-full flex-1 bg-transparent resize-none focus:outline-none placeholder-slate-500 font-extrabold leading-relaxed ${
                  fontStyles[fontFamily]
                } ${fontSizeStyles[fontSize]}`}
              />

              {/* Speech synthesis visual feedback overlay */}
              {speakActive && (
                <div className="absolute bottom-3 left-3 right-3 py-1.5 px-2.5 bg-[#FFD600] text-black border-2 border-black rounded-xl text-[10px] font-black flex items-center justify-between animate-pulse shadow-[2px_2px_0px_0px_#000000]">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Speaking out loud...</span>
                  </div>
                  <button 
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        setSpeakActive(false);
                      }
                    }} 
                    className="underline text-[9px] hover:text-slate-800 font-bold"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>

            {/* Active Speech Recognition Visual Waves */}
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-1.5 py-1.5 bg-white border-2 border-black p-2 rounded-xl shadow-[3px_3px_0px_0px_#000000] dark:bg-slate-900"
                >
                  <div className="flex items-center justify-center gap-1 h-6">
                    {micWaves.map((h, index) => (
                      <motion.span
                        key={index}
                        className={`w-1 rounded-full bg-black dark:bg-white`}
                        animate={{ height: h }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-rose-600 tracking-wider uppercase animate-pulse">
                    Listening to Microphone...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Render any recognition/mic error banner inside the device */}
            {recognitionError && (
              <div className="p-2.5 bg-rose-50 border-2 border-black rounded-2xl flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
                <Info className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-rose-700 font-extrabold leading-normal">{recognitionError}</p>
              </div>
            )}

            {/* Text-to-Voice Primary Call to Action Button */}
            <button
              onClick={handleSpeak}
              disabled={!text.trim()}
              className={`w-full py-3.5 rounded-2xl text-black text-xs font-black shadow-[4px_4px_0px_0px_#000000] border-2 border-black transition-all duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-2 ${
                text.trim() 
                  ? `${currentColors.primary}` 
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-55'
              }`}
            >
              <Volume2 className="w-4 h-4 stroke-[3]" />
              <span>Read Aloud (Text-to-Voice)</span>
            </button>
          </div>

          {/* Scaffold Floating Action Button for Voice-to-Text */}
          <div className="absolute bottom-5 right-5 z-50">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_#000000] text-black transition-colors duration-200 ${
                isListening 
                  ? 'bg-rose-500 hover:bg-rose-600' 
                  : 'bg-[#FFD600] hover:bg-yellow-400'
              }`}
              title="Toggle Voice-to-Text"
            >
              {isListening ? (
                <MicOff className="w-6 h-6 stroke-[3] animate-pulse" />
              ) : (
                <Mic className="w-6 h-6 stroke-[3]" />
              )}
            </motion.button>
          </div>

          {/* Android Navigation Bar */}
          <div className="h-10 flex justify-center items-center gap-16 z-40">
            <div className={`w-3.5 h-3.5 border-2 border-black rounded-xs transform rotate-45 ${
              themeMode === 'light' ? 'bg-black' : 'bg-slate-400'
            }`} />
            <div className={`w-4 h-4 rounded-full border-2 border-black ${
              themeMode === 'light' ? 'bg-transparent' : 'bg-transparent'
            }`} />
            <div className={`w-3 h-3 rounded-xs border-2 border-black ${
              themeMode === 'light' ? 'bg-black' : 'bg-slate-400'
            }`} />
          </div>

        </div>
      </div>

      {/* Voice Commands Simulation Panel (Fallback Auxiliary Control Center) */}
      <div className="w-full max-w-[340px] mt-6 bg-white dark:bg-slate-900 border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_#000000]">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-4 h-4 text-yellow-500 stroke-[3]" />
          <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Voice Simulator Console</h3>
        </div>
        <p className="text-[11px] font-bold text-gray-600 dark:text-slate-300 mb-3 leading-relaxed">
          If you don't have a mic or want to quickly simulate a spoken voice action, type or click a preset below:
        </p>
        
        <form onSubmit={handleSimulateCommand} className="flex gap-1.5 mb-3">
          <input
            type="text"
            value={simulateCommandText}
            onChange={(e) => setSimulateCommandText(e.target.value)}
            placeholder="e.g., 'switch to dark mode'"
            className="flex-1 px-3 py-1.5 border-2 border-black rounded-xl text-xs font-extrabold focus:outline-none bg-white text-black focus:bg-amber-50"
          />
          <button
            type="submit"
            className="px-3 bg-black hover:bg-slate-800 text-white border-2 border-black rounded-xl text-xs font-black flex items-center justify-center transition-transform active:translate-y-0.5"
          >
            <Play className="w-3 h-3 fill-white" />
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {[
            'switch to dark mode',
            'switch to light mode',
            'use green theme',
            'use amber theme',
            'use mono font',
            'make text larger',
            'make text medium',
            'make text small',
            'clear text'
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setText(preset);
                parseSpeechCommands(preset);
              }}
              className="px-2 py-1 bg-white hover:bg-amber-100 dark:bg-slate-800 border-2 border-black rounded-lg text-[10px] font-black text-black dark:text-white transition-all font-mono"
            >
              "{preset}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
