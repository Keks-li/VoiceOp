import 'app_state.dart';

class VoiceCommandProcessor {
  static void processCommand(String transcript, AppState appState) {
    final cleanText = transcript.trim().toLowerCase();

    if (cleanText.isEmpty) return;

    bool commandMatched = false;

    // Theme commands
    if (cleanText.contains('use dark mode')) {
      appState.themeMode = AppThemeMode.dark;
      commandMatched = true;
    } else if (cleanText.contains('use light mode')) {
      appState.themeMode = AppThemeMode.light;
      commandMatched = true;
    }
    // Color theme commands
    else if (cleanText.contains('use purple theme')) {
      appState.primaryColor = AppPrimaryColor.purple;
      commandMatched = true;
    } else if (cleanText.contains('use blue theme')) {
      appState.primaryColor = AppPrimaryColor.blue;
      commandMatched = true;
    } else if (cleanText.contains('use green theme')) {
      appState.primaryColor = AppPrimaryColor.green;
      commandMatched = true;
    } else if (cleanText.contains('use amber theme')) {
      appState.primaryColor = AppPrimaryColor.amber;
      commandMatched = true;
    }
    // Font style commands
    else if (cleanText.contains('use sans font')) {
      appState.fontFamily = AppFontFamily.sans;
      commandMatched = true;
    } else if (cleanText.contains('use serif font')) {
      appState.fontFamily = AppFontFamily.serif;
      commandMatched = true;
    } else if (cleanText.contains('use mono font')) {
      appState.fontFamily = AppFontFamily.mono;
      commandMatched = true;
    }
    // Font size commands
    else if (cleanText.contains('make text large')) {
      appState.fontSize = AppFontSize.large;
      commandMatched = true;
    } else if (cleanText.contains('make text medium')) {
      appState.fontSize = AppFontSize.medium;
      commandMatched = true;
    } else if (cleanText.contains('make text small')) {
      appState.fontSize = AppFontSize.small;
      commandMatched = true;
    }
    // Action commands
    else if (cleanText.contains('clear text')) {
      appState.text = '';
      commandMatched = true;
    }

    if (commandMatched) {
      // Find the specific matching command string to trigger feedback UI
      final matchedPhrase = _getMatchedPhrase(cleanText);
      if (matchedPhrase != null) {
        appState.triggerCommandFeedback(matchedPhrase);
      }
    }
  }

  static String? _getMatchedPhrase(String text) {
    final phrases = [
      'use dark mode',
      'use light mode',
      'use purple theme',
      'use blue theme',
      'use green theme',
      'use amber theme',
      'use sans font',
      'use serif font',
      'use mono font',
      'make text large',
      'make text medium',
      'make text small',
      'clear text'
    ];

    for (var phrase in phrases) {
      if (text.contains(phrase)) {
        return phrase;
      }
    }
    return null;
  }
}
