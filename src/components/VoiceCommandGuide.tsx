import React from 'react';
import { Sparkles, Moon, Sun, Palette, Type, RefreshCw } from 'lucide-react';
import { VoiceCommand } from '../types';

interface VoiceCommandGuideProps {
  lastDetectedCommand: string | null;
}

export const COMMANDS: VoiceCommand[] = [
  { phrase: 'use dark mode', action: 'Switch theme to Dark', category: 'theme' },
  { phrase: 'use light mode', action: 'Switch theme to Light', category: 'theme' },
  { phrase: 'use purple theme', action: 'Set primary color to Purple', category: 'color' },
  { phrase: 'use blue theme', action: 'Set primary color to Blue', category: 'color' },
  { phrase: 'use green theme', action: 'Set primary color to Green', category: 'color' },
  { phrase: 'use amber theme', action: 'Set primary color to Amber', category: 'color' },
  { phrase: 'use sans font', action: 'Set font style to Sans-Serif', category: 'font' },
  { phrase: 'use serif font', action: 'Set font style to Elegant Serif', category: 'font' },
  { phrase: 'use mono font', action: 'Set font style to Technical Mono', category: 'font' },
  { phrase: 'make text larger', action: 'Enlarge ALL page text (125%)', category: 'size' },
  { phrase: 'make text medium', action: 'Reset ALL page text to normal (100%)', category: 'size' },
  { phrase: 'make text small', action: 'Shrink ALL page text (85%)', category: 'size' },
  { phrase: 'clear text', action: 'Reset and clear input field', category: 'action' },
];

export default function VoiceCommandGuide({ lastDetectedCommand }: VoiceCommandGuideProps) {
  const getIcon = (category: string) => {
    switch (category) {
      case 'theme':
        return <Sun className="w-4 h-4 text-black stroke-[3.5]" />;
      case 'color':
        return <Palette className="w-4 h-4 text-black stroke-[3.5]" />;
      case 'font':
        return <Type className="w-4 h-4 text-black stroke-[3.5]" />;
      case 'size':
        return <Sparkles className="w-4 h-4 text-black stroke-[3.5]" />;
      case 'action':
        return <RefreshCw className="w-4 h-4 text-black stroke-[3.5]" />;
      default:
        return <Sparkles className="w-4 h-4 text-black stroke-[3.5]" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-black dark:text-white animate-pulse stroke-[3]" />
        <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Voice Commands Cheat Sheet</h2>
      </div>
      
      <p className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-4 leading-relaxed">
        While the voice recorder inside the simulator is active, speak any of the following triggers. The speech recognition engine will parse your words and instantly adjust the Flutter app:
      </p>

      {lastDetectedCommand && (
        <div className="mb-4 p-3 bg-[#FFD600] border-2 border-black rounded-xl flex items-center justify-between animate-bounce text-black shadow-[3px_3px_0px_0px_#000000]">
          <span className="text-xs font-black uppercase tracking-tight">Last Command Detected:</span>
          <span className="text-xs font-black bg-black text-white px-3 py-1 rounded-full font-mono">
            "{lastDetectedCommand}"
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
        {COMMANDS.map((cmd) => {
          const isMatched = lastDetectedCommand?.toLowerCase().includes(cmd.phrase.toLowerCase());
          return (
            <div
              key={cmd.phrase}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border-2 border-black transition-all ${
                isMatched
                  ? 'bg-emerald-300 text-black shadow-[3px_3px_0px_0px_#000000]'
                  : 'bg-white dark:bg-slate-850 hover:bg-amber-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="mt-0.5 p-1 bg-[#FFD600] rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                {getIcon(cmd.category)}
              </div>
              <div>
                <code
                  className={`text-xs font-black font-mono block ${
                    isMatched ? 'text-black' : 'text-black dark:text-white'
                  }`}
                >
                  "{cmd.phrase}"
                </code>
                <span className={`text-[10px] font-extrabold ${
                  isMatched ? 'text-black/85' : 'text-gray-500 dark:text-gray-400'
                } leading-none`}>
                  {cmd.action}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
