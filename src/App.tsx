/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, Smartphone, Mic, Volume2 
} from 'lucide-react';
import AndroidSimulator from './components/AndroidSimulator';
import VoiceCommandGuide from './components/VoiceCommandGuide';
import TextManager from './components/TextManager';
import { ThemeMode, PrimaryColor, FontFamily, FontSize } from './types';

export default function App() {
  // App States
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [primaryColor, setPrimaryColor] = useState<PrimaryColor>('purple');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  
  // Persistent localStorage for transcribed/typed text
  const [text, setTextState] = useState<string>(() => {
    const saved = localStorage.getItem('voiceop_transcribed_text');
    return saved !== null ? saved : 'Hello! Speak or type something here...';
  });

  const setText = (val: string) => {
    setTextState(val);
    localStorage.setItem('voiceop_transcribed_text', val);
  };
  const [lastDetectedCommand, setLastDetectedCommand] = useState<string | null>(null);

  const handleCommandDetected = (command: string) => {
    setLastDetectedCommand(command);
    // Clear last command indicator after 4 seconds
    setTimeout(() => {
      setLastDetectedCommand((current) => current === command ? null : current);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-black font-sans flex flex-col antialiased">
      {/* Sleek Top Header Navigation Bar */}
      <header className="bg-white border-b-4 border-black py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FFD600] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl">
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tighter text-black uppercase">VoiceOp</h1>
              <span className="bg-[#FFD600] text-black border-2 border-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">MVP</span>
            </div>
            <p className="text-[11px] font-bold text-gray-700">Interactive Phone Prototype & Voice Controls</p>
          </div>
        </div>
        

      </header>

      {/* Main Studio Grid Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: Interactive Phone Simulator (Col Span 5 on large screens) */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">

          <AndroidSimulator
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            fontSize={fontSize}
            setFontSize={setFontSize}
            text={text}
            setText={setText}
            onCommandDetected={handleCommandDetected}
          />
        </div>

        {/* Right Hand: CodeCompanion and Guides (Col Span 7 on large screens) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Saved Transcription Manager */}
          <TextManager text={text} setText={setText} />

          {/* Voice Command Reference Guide */}
          <VoiceCommandGuide lastDetectedCommand={lastDetectedCommand} />

        </div>

      </main>

      {/* Footer Branding */}
      <footer className="bg-black text-white py-8 px-6 mt-12 border-t-4 border-black text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#FFD600] stroke-[2.5]" />
            <span className="text-xs font-black font-mono text-white tracking-wider">VoiceOp © 2026</span>
          </div>
          <p className="text-[11px] font-bold text-slate-450 leading-normal max-w-md sm:text-right">
            VoiceOp provides a high-fidelity, interactive sandbox environment to simulate real-time speech operations, voice captioning, and speech-to-text controls.
          </p>
        </div>
      </footer>
    </div>
  );
}
