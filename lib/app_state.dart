import 'package:flutter/material.dart';

enum AppThemeMode { light, dark }

enum AppPrimaryColor { purple, blue, green, amber }

enum AppFontFamily { sans, serif, mono }

enum AppFontSize { small, medium, large }

class AppState extends ChangeNotifier {
  AppThemeMode _themeMode = AppThemeMode.light;
  AppPrimaryColor _primaryColor = AppPrimaryColor.purple;
  AppFontFamily _fontFamily = AppFontFamily.sans;
  AppFontSize _fontSize = AppFontSize.medium;
  String _text = 'Hello! Speak or type something here...';
  String? _lastDetectedCommand;

  // Getters
  AppThemeMode get themeMode => _themeMode;
  AppPrimaryColor get primaryColor => _primaryColor;
  AppFontFamily get fontFamily => _fontFamily;
  AppFontSize get fontSize => _fontSize;
  String get text => _text;
  String? get lastDetectedCommand => _lastDetectedCommand;

  // Setters
  set themeMode(AppThemeMode value) {
    if (_themeMode != value) {
      _themeMode = value;
      notifyListeners();
    }
  }

  set primaryColor(AppPrimaryColor value) {
    if (_primaryColor != value) {
      _primaryColor = value;
      notifyListeners();
    }
  }

  set fontFamily(AppFontFamily value) {
    if (_fontFamily != value) {
      _fontFamily = value;
      notifyListeners();
    }
  }

  set fontSize(AppFontSize value) {
    if (_fontSize != value) {
      _fontSize = value;
      notifyListeners();
    }
  }

  set text(String value) {
    if (_text != value) {
      _text = value;
      notifyListeners();
    }
  }

  set lastDetectedCommand(String? value) {
    _lastDetectedCommand = value;
    notifyListeners();
  }

  // Helper getters for colors
  Color get primaryColorVal {
    switch (_primaryColor) {
      case AppPrimaryColor.purple:
        return Colors.deepPurple;
      case AppPrimaryColor.blue:
        return Colors.blue;
      case AppPrimaryColor.green:
        return Colors.green;
      case AppPrimaryColor.amber:
        return Colors.amber;
    }
  }

  // Get style configs
  TextStyle get textStyle {
    TextStyle base;
    switch (_fontFamily) {
      case AppFontFamily.sans:
        base = const TextStyle(fontFamily: 'Roboto'); // standard material sans-serif
        break;
      case AppFontFamily.serif:
        base = const TextStyle(fontFamily: 'Georgia'); // serif fallback
        break;
      case AppFontFamily.mono:
        base = const TextStyle(fontFamily: 'Courier'); // monospace fallback
        break;
    }

    double size;
    switch (_fontSize) {
      case AppFontSize.small:
        size = 14.0;
        break;
      case AppFontSize.medium:
        size = 18.0;
        break;
      case AppFontSize.large:
        size = 24.0;
        break;
    }

    return base.copyWith(
      fontSize: size,
      color: _themeMode == AppThemeMode.light ? Colors.black : Colors.white,
    );
  }

  void triggerCommandFeedback(String command) {
    _lastDetectedCommand = command;
    notifyListeners();

    // Reset command feedback after 4 seconds
    Future.delayed(const Duration(seconds: 4), () {
      if (_lastDetectedCommand == command) {
        _lastDetectedCommand = null;
        notifyListeners();
      }
    });
  }
}
