import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app_state.dart';
import 'screens/dashboard_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, _) {
        final isDark = appState.themeMode == AppThemeMode.dark;

        return MaterialApp(
          title: 'VoiceOp - Voice Simulator',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: appState.primaryColorVal,
              brightness: isDark ? Brightness.dark : Brightness.light,
            ),
            fontFamily: appState.fontFamily == AppFontFamily.serif
                ? 'Georgia'
                : appState.fontFamily == AppFontFamily.mono
                    ? 'Courier'
                    : 'Roboto',
          ),
          home: const DashboardScreen(),
        );
      },
    );
  }
}
