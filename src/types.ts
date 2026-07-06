export type ThemeMode = 'light' | 'dark';

export type PrimaryColor = 'purple' | 'blue' | 'green' | 'amber';

export type FontFamily = 'sans' | 'serif' | 'mono';

export type FontSize = 'small' | 'medium' | 'large';

export interface TranscriptionHistoryEntry {
  id: string;
  text: string;
  savedAt: string; // ISO string
  wordCount: number;
}

export interface AppState {
  themeMode: ThemeMode;
  primaryColor: PrimaryColor;
  fontFamily: FontFamily;
  fontSize: FontSize;
  text: string;
}

export interface VoiceCommand {
  phrase: string;
  action: string;
  category: string;
}
