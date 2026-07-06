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
      {/* iPhone 15 Pro Device Frame */}
      <div
        className="relative w-[360px] h-[750px] rounded-[54px] flex flex-col p-[5px] select-none"
        style={{
          background: 'linear-gradient(160deg, #5A5A5E 0%, #3A3A3C 35%, #2C2C2E 70%, #1C1C1E 100%)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(255,255,255,0.15), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.5)',
        }}
      >
        {/* Silent switch */}
        <div className="absolute left-[-3px] top-[95px] w-[3px] h-7 rounded-l-sm" style={{ background: 'linear-gradient(to right, #2A2A2C, #4A4A4C)' }} />
        {/* Volume Up */}
        <div className="absolute left-[-3px] top-[138px] w-[3px] h-14 rounded-l-sm" style={{ background: 'linear-gradient(to right, #2A2A2C, #4A4A4C)' }} />
        {/* Volume Down */}
        <div className="absolute left-[-3px] top-[218px] w-[3px] h-14 rounded-l-sm" style={{ background: 'linear-gradient(to right, #2A2A2C, #4A4A4C)' }} />
        {/* Power button */}
        <div className="absolute right-[-3px] top-[160px] w-[3px] h-20 rounded-r-sm" style={{ background: 'linear-gradient(to left, #2A2A2C, #4A4A4C)' }} />

        {/* Screen */}
        <div
          className={`relative flex-1 rounded-[50px] overflow-hidden flex flex-col transition-colors duration-500 ${
            themeMode === 'light' ? 'bg-[#F2F2F7] text-black' : 'bg-black text-white'
          }`}
          style={{ boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.08)' }}
        >
          {/* Status Bar */}
          <div className={`relative h-14 flex items-end pb-2 px-6 justify-between ${themeMode === 'light' ? 'text-black' : 'text-white'}`}>
            <span className="text-[13px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>

            {/* Dynamic Island */}
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 overflow-hidden"
              style={{
                width: isListening ? 140 : 120,
                height: 34,
                background: '#000',
                borderRadius: 20,
                transition: 'width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}
            >
              {isListening ? (
                <>
                  <Mic className="w-3 h-3 text-[#30D158] stroke-[2.5] flex-shrink-0" />
                  <div className="flex items-center gap-0.5 h-4">
                    {micWaves.slice(0, 5).map((h, i) => (
                      <motion.span
                        key={i}
                        className="w-0.5 rounded-full bg-[#30D158]"
                        animate={{ height: Math.max(Math.min(h * 0.45, 14), 2) }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#1C1C1E]" />
              )}
            </div>

            {/* Status icons */}
            <div className="flex items-center gap-1.5">
              {/* Signal bars */}
              <div className="flex items-end gap-[2px]">
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} className={`w-[3px] rounded-sm ${themeMode === 'light' ? 'bg-black' : 'bg-white'}`} style={{ height: h }} />
                ))}
              </div>
              {/* WiFi icon */}
              <svg viewBox="0 0 16 12" className={`w-4 h-3 ${themeMode === 'light' ? 'fill-black' : 'fill-white'}`}>
                <path d="M8 2.4C5.6 2.4 3.4 3.4 1.8 5L3 6.2C4.3 4.9 6.1 4.1 8 4.1s3.7.8 5 2.1L14.2 5C12.6 3.4 10.4 2.4 8 2.4zm0 3.6C6.4 6 5 6.7 4 7.7L5.2 9c.7-.7 1.7-1.2 2.8-1.2s2.1.4 2.8 1.1L12 7.7C11 6.7 9.6 6 8 6zm0 3.2c-.9 0-1.7.4-2.3 1L8 13l2.3-2.8C9.7 9.6 8.9 9.2 8 9.2z"/>
              </svg>
              {/* Battery */}
              <div className="flex items-center">
                <div className={`w-6 h-[12px] rounded-[3px] border ${themeMode === 'light' ? 'border-black/40' : 'border-white/40'} relative p-[1.5px] flex items-center`}>
                  <div className={`h-full rounded-[1.5px] ${themeMode === 'light' ? 'bg-black' : 'bg-white'}`} style={{ width: '75%' }} />
                </div>
                <div className={`w-[2px] h-[5px] rounded-r-sm ml-[1px] ${themeMode === 'light' ? 'bg-black/40' : 'bg-white/40'}`} />
              </div>
            </div>
          </div>

          {/* App Bar — iOS style */}
          <div className={`px-5 py-2.5 flex items-center justify-between ${
            themeMode === 'light' ? 'bg-[#F2F2F7]' : 'bg-black'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                primaryColor === 'purple' ? 'bg-[#BF5AF2]' :
                primaryColor === 'blue'   ? 'bg-[#007AFF]' :
                primaryColor === 'green'  ? 'bg-[#30D158]' : 'bg-[#FF9F0A]'
              }`}>
                <Mic className="w-3 h-3 text-white stroke-[2.5]" />
              </div>
              <span className={`font-bold text-[15px] tracking-tight ${themeMode === 'light' ? 'text-black' : 'text-white'}`}>VoiceOp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  themeMode === 'light' ? 'bg-[#E5E5EA] text-black' : 'bg-[#2C2C2E] text-white'
                }`}
                title="Toggle Light/Dark"
              >
                {themeMode === 'light' ? <Moon className="w-3.5 h-3.5 stroke-[2]" /> : <Sun className="w-3.5 h-3.5 stroke-[2]" />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  showSettings
                    ? 'bg-[#007AFF] text-white'
                    : themeMode === 'light' ? 'bg-[#E5E5EA] text-black' : 'bg-[#2C2C2E] text-white'
                }`}
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Hairline separator */}
          <div className={`h-px ${themeMode === 'light' ? 'bg-black/10' : 'bg-white/10'}`} />

          {/* Inner Canvas */}
          <div className="flex-1 px-4 py-3 overflow-y-auto flex flex-col gap-3 relative">

            {/* Active style chips */}
            {!showSettings && (
              <div className={`px-3 py-2 rounded-2xl flex flex-wrap gap-2 items-center justify-between ${
                themeMode === 'light' ? 'bg-white/80' : 'bg-[#1C1C1E]'
              }`} style={{ backdropFilter: 'blur(12px)' }}>
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${themeMode === 'light' ? 'text-[#8E8E93]' : 'text-[#636366]'}`}>Active Styles</span>
                <div className="flex gap-1 text-[9px] font-mono">
                  {[primaryColor, fontFamily, fontSize].map((v) => (
                    <span key={v} className={`px-1.5 py-0.5 rounded-md capitalize ${themeMode === 'light' ? 'bg-[#F2F2F7] text-black' : 'bg-[#2C2C2E] text-white'}`}>{v}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Sheet */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`p-4 rounded-3xl flex flex-col gap-4 ${
                    themeMode === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'
                  }`}
                  style={{ boxShadow: themeMode === 'light' ? '0 4px 24px rgba(0,0,0,0.1)' : '0 4px 24px rgba(0,0,0,0.4)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${themeMode === 'light' ? 'text-black' : 'text-white'}`}>Customizer</span>
                    <button onClick={() => setShowSettings(false)} className="text-[13px] font-semibold text-[#007AFF]">Done</button>
                  </div>

                  {/* Font Style */}
                  <div className="space-y-2">
                    <label className={`text-[10px] font-semibold uppercase tracking-wider ${themeMode === 'light' ? 'text-[#8E8E93]' : 'text-[#636366]'}`}>Font Style</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['sans', 'serif', 'mono'] as FontFamily[]).map((f) => (
                        <button key={f} onClick={() => setFontFamily(f)}
                          className={`py-1.5 text-xs rounded-xl capitalize font-medium transition-all active:scale-95 ${
                            fontFamily === f ? 'bg-[#007AFF] text-white' : themeMode === 'light' ? 'bg-[#F2F2F7] text-black' : 'bg-[#2C2C2E] text-white'
                          }`}>{f}</button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <label className={`text-[10px] font-semibold uppercase tracking-wider ${themeMode === 'light' ? 'text-[#8E8E93]' : 'text-[#636366]'}`}>Accent Color</label>
                    <div className="flex gap-3 items-center">
                      {(['purple', 'blue', 'green', 'amber'] as PrimaryColor[]).map((c) => {
                        const bg = { purple: '#BF5AF2', blue: '#007AFF', green: '#30D158', amber: '#FF9F0A' };
                        return (
                          <button key={c} onClick={() => setPrimaryColor(c)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${primaryColor === c ? 'ring-2 ring-offset-2 ring-offset-white scale-110' : ''}`}
                            style={{ background: bg[c], boxShadow: primaryColor === c ? `0 0 0 2px ${bg[c]}44` : 'none' }}
                          >
                            {primaryColor === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Text Size */}
                  <div className="space-y-2">
                    <label className={`text-[10px] font-semibold uppercase tracking-wider ${themeMode === 'light' ? 'text-[#8E8E93]' : 'text-[#636366]'}`}>Text Size</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
                        <button key={s} onClick={() => setFontSize(s)}
                          className={`py-1.5 text-xs rounded-xl capitalize font-medium transition-all active:scale-95 ${
                            fontSize === s ? 'bg-[#007AFF] text-white' : themeMode === 'light' ? 'bg-[#F2F2F7] text-black' : 'bg-[#2C2C2E] text-white'
                          }`}>{s}</button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Canvas */}
            <div className={`flex-1 min-h-[160px] p-4 rounded-3xl transition-all duration-300 flex flex-col relative ${
              themeMode === 'light' ? 'bg-white text-black' : 'bg-[#1C1C1E] text-white'
            }`} style={{ boxShadow: themeMode === 'light' ? '0 2px 16px rgba(0,0,0,0.07)' : 'none' }}>

              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: `0.5px solid ${themeMode === 'light' ? '#E5E5EA' : '#38383A'}` }}>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${themeMode === 'light' ? 'text-[#8E8E93]' : 'text-[#636366]'}`}>Content Canvas</span>
                <div className="flex items-center gap-3">
                  <button onClick={handleCopy} disabled={!text.trim()} title={copied ? 'Copied!' : 'Copy'}
                    className={`transition-all active:scale-90 ${text.trim() ? 'text-[#007AFF]' : themeMode === 'light' ? 'text-[#C7C7CC]' : 'text-[#48484A]'}`}>
                    {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5 stroke-[2]" />}
                  </button>
                  <button onClick={handleDownloadPDF} disabled={!text.trim()} title="Download PDF"
                    className={`transition-all active:scale-90 ${text.trim() ? 'text-[#007AFF]' : themeMode === 'light' ? 'text-[#C7C7CC]' : 'text-[#48484A]'}`}>
                    <FileDown className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                  <button onClick={() => setText('')} disabled={!text.trim()} title="Clear"
                    className={`transition-all active:scale-90 ${text.trim() ? 'text-[#FF3B30]' : themeMode === 'light' ? 'text-[#C7C7CC]' : 'text-[#48484A]'}`}>
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tap the mic and start speaking, or type here..."
                className={`w-full flex-1 bg-transparent resize-none focus:outline-none leading-relaxed ${
                  themeMode === 'light' ? 'placeholder-[#C7C7CC] text-black' : 'placeholder-[#48484A] text-white'
                } ${fontStyles[fontFamily]} ${fontSizeStyles[fontSize]}`}
              />

              {speakActive && (
                <div className="absolute bottom-3 left-3 right-3 py-2 px-3 rounded-2xl text-[10px] font-semibold flex items-center justify-between text-white"
                  style={{ background: '#30D158', boxShadow: '0 4px 16px rgba(48,209,88,0.4)' }}>
                  <div className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /><span>Speaking...</span></div>
                  <button onClick={() => { window.speechSynthesis.cancel(); setSpeakActive(false); }} className="underline text-[9px] opacity-80">Stop</button>
                </div>
              )}
            </div>

            {/* Listening wave */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className={`flex flex-col items-center gap-1.5 py-2.5 px-4 rounded-2xl ${
                    themeMode === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'
                  }`}
                  style={{ boxShadow: themeMode === 'light' ? '0 2px 12px rgba(0,0,0,0.07)' : 'none' }}
                >
                  <div className="flex items-center justify-center gap-1 h-6">
                    {micWaves.map((h, i) => (
                      <motion.span key={i} className="w-1 rounded-full bg-[#007AFF]"
                        animate={{ height: h }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold text-[#FF3B30] tracking-widest uppercase">Listening...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error banner */}
            {recognitionError && (
              <div className={`p-3 rounded-2xl flex items-start gap-2 ${themeMode === 'light' ? 'bg-[#FFF2F1]' : 'bg-[#2C1C1C]'}`}>
                <Info className="w-4 h-4 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#FF3B30] font-semibold leading-normal">{recognitionError}</p>
              </div>
            )}

            {/* Read Aloud CTA */}
            <button
              onClick={handleSpeak}
              disabled={!text.trim()}
              className={`w-full py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.97] ${
                text.trim()
                  ? 'text-white'
                  : themeMode === 'light' ? 'bg-[#E5E5EA] text-[#C7C7CC]' : 'bg-[#2C2C2E] text-[#48484A]'
              }`}
              style={text.trim() ? {
                background: primaryColor === 'purple' ? '#BF5AF2' :
                             primaryColor === 'blue'   ? '#007AFF' :
                             primaryColor === 'green'  ? '#30D158' : '#FF9F0A',
                boxShadow: `0 4px 20px ${
                  primaryColor === 'purple' ? 'rgba(191,90,242,0.35)' :
                  primaryColor === 'blue'   ? 'rgba(0,122,255,0.35)' :
                  primaryColor === 'green'  ? 'rgba(48,209,88,0.35)' : 'rgba(255,159,10,0.35)'
                }`
              } : {}}
            >
              <Volume2 className="w-4 h-4 stroke-[2.5]" />
              <span>Read Aloud</span>
            </button>
          </div>

          {/* Floating Mic FAB */}
          <div className="absolute bottom-14 right-4 z-50">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleListening}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{
                background: isListening ? '#FF3B30' : '#007AFF',
                boxShadow: isListening
                  ? '0 6px 24px rgba(255,59,48,0.45)'
                  : '0 6px 24px rgba(0,122,255,0.45)',
              }}
              title="Toggle Voice-to-Text"
            >
              {isListening
                ? <MicOff className="w-6 h-6 stroke-[2.5] text-white animate-pulse" />
                : <Mic className="w-6 h-6 stroke-[2.5] text-white" />}
            </motion.button>
          </div>

          {/* iOS Home Indicator */}
          <div className="h-8 flex items-center justify-center">
            <div className={`w-32 h-[4px] rounded-full ${themeMode === 'light' ? 'bg-black/15' : 'bg-white/20'}`} />
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
