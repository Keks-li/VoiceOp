import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../app_state.dart';
import '../voice_command_processor.dart';
import 'voice_visualizer.dart';

class PhoneSimulator extends StatefulWidget {
  const PhoneSimulator({super.key});

  @override
  State<PhoneSimulator> createState() => _PhoneSimulatorState();
}

class _PhoneSimulatorState extends State<PhoneSimulator> {
  late stt.SpeechToText _speech;
  bool _isSpeechAvailable = false;
  bool _isListening = false;
  String _speechText = '';
  String? _speechError;

  final TextEditingController _simulateController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    try {
      bool available = await _speech.initialize(
        onStatus: (val) {
          if (val == 'notListening' || val == 'done') {
            setState(() => _isListening = false);
          }
        },
        onError: (val) => setState(() {
          _speechError = 'Error: ${val.errorMsg}';
          _isListening = false;
        }),
      );
      if (mounted) {
        setState(() {
          _isSpeechAvailable = available;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _speechError = 'Failed to initialize speech recognition: $e';
        });
      }
    }
  }

  void _toggleListening(AppState appState) async {
    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
    } else {
      if (!_isSpeechAvailable) {
        // Try initializing again
        await _initSpeech();
      }

      if (_isSpeechAvailable) {
        setState(() {
          _isListening = true;
          _speechError = null;
          _speechText = '';
        });

        await _speech.listen(
          onResult: (val) {
            setState(() {
              _speechText = val.recognizedWords;
            });
            if (val.recognizedWords.isNotEmpty) {
              VoiceCommandProcessor.processCommand(val.recognizedWords, appState);
            }
          },
        );
      } else {
        setState(() {
          _speechError = 'Microphone speech recognition is unavailable on this device.';
        });
      }
    }
  }

  void _injectManualCommand(AppState appState) {
    final cmd = _simulateController.text.trim();
    if (cmd.isNotEmpty) {
      VoiceCommandProcessor.processCommand(cmd, appState);
      _simulateController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Injected manual command: "$cmd"'),
          duration: const Duration(seconds: 1),
          backgroundColor: Colors.black,
        ),
      );
    }
  }

  @override
  void dispose() {
    _simulateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isDark = appState.themeMode == AppThemeMode.dark;

    return Column(
      children: [
        // Simulated Phone Case (Neo-Brutalist design)
        Container(
          width: 320,
          height: 580,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: Colors.black, width: 4),
            boxShadow: const [
              BoxShadow(
                color: Colors.black45,
                blurRadius: 15,
                offset: Offset(0, 8),
              ),
            ],
          ),
          padding: const EdgeInsets.all(12),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? Colors.grey.shade900 : Colors.white,
              borderRadius: BorderRadius.circular(30),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                // Top Notch & Status Bar
                Container(
                  height: 35,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  color: isDark ? Colors.black : Colors.grey.shade100,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '12:30',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                      // Punch-hole Camera Simulator
                      Container(
                        width: 14,
                        height: 14,
                        decoration: const BoxDecoration(
                          color: Colors.black,
                          shape: BoxShape.circle,
                        ),
                      ),
                      Row(
                        children: [
                          Icon(Icons.wifi, size: 14, color: isDark ? Colors.white : Colors.black),
                          const SizedBox(width: 4),
                          Icon(Icons.battery_full, size: 14, color: isDark ? Colors.white : Colors.black),
                        ],
                      ),
                    ],
                  ),
                ),

                // Main Display Screen Content
                Expanded(
                  child: Container(
                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Dynamic Output Bubble (Configured by theme/colors)
                        Expanded(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.black : Colors.white,
                              border: Border.all(color: appState.primaryColorVal, width: 3),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: appState.primaryColorVal.withOpacity(0.15),
                                  blurRadius: 10,
                                  spreadRadius: 2,
                                )
                              ],
                            ),
                            padding: const EdgeInsets.all(16),
                            child: SingleChildScrollView(
                              child: Text(
                                appState.text,
                                style: appState.textStyle,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Voice input captioning / feedback helper
                        if (_isListening || _speechText.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey.shade800 : Colors.amber.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _isListening
                                  ? 'Listening: "${_speechText.isEmpty ? '...' : _speechText}"'
                                  : 'Recognized: "$_speechText"',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isDark ? Colors.white : Colors.amber.shade900,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),

                        // Command feedback notification banner
                        if (appState.lastDetectedCommand != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.green.shade500,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.black, width: 2),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, color: Colors.white, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Command Matched: "${appState.lastDetectedCommand}"',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.black,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Microphone & Visualizer controls
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            VoiceVisualizer(isListening: _isListening),
                            const SizedBox(width: 16),
                            GestureDetector(
                              onTap: () => _toggleListening(appState),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: _isListening ? Colors.red : appState.primaryColorVal,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.black, width: 3),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.black,
                                      offset: Offset(2, 2),
                                    )
                                  ],
                                ),
                                child: Icon(
                                  _isListening ? Icons.mic_off_rounded : Icons.mic_rounded,
                                  color: Colors.white,
                                  size: 26,
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            // Quick text edit mode to modify the target string directly
                            IconButton(
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (context) {
                                    final controller = TextEditingController(text: appState.text);
                                    return AlertDialog(
                                      title: const Text('Update Simulator Text', style: TextStyle(fontWeight: FontWeight.bold)),
                                      content: TextField(
                                        controller: controller,
                                        maxLines: 4,
                                        decoration: const InputDecoration(
                                          border: OutlineInputBorder(),
                                          hintText: 'Type text here...',
                                        ),
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(context),
                                          child: const Text('CANCEL'),
                                        ),
                                        ElevatedButton(
                                          onPressed: () {
                                            appState.text = controller.text;
                                            Navigator.pop(context);
                                          },
                                          child: const Text('SAVE'),
                                        ),
                                      ],
                                    );
                                  },
                                );
                              },
                              icon: Icon(Icons.edit_note, color: isDark ? Colors.white : Colors.black),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Bottom Soft Keys (Home, Back, Apps)
                Container(
                  height: 40,
                  color: isDark ? Colors.black : Colors.grey.shade100,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Icon(Icons.arrow_back_ios_new, size: 16, color: isDark ? Colors.white : Colors.black54),
                      Icon(Icons.circle_outlined, size: 16, color: isDark ? Colors.white : Colors.black54),
                      Icon(Icons.crop_square_sharp, size: 16, color: isDark ? Colors.white : Colors.black54),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Simulator Error Banner (e.g. microphone not allowed)
        if (_speechError != null)
          Container(
            width: 320,
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.red.shade100,
              border: Border.all(color: Colors.red.shade700, width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _speechError!,
              style: TextStyle(color: Colors.red.shade900, fontSize: 11, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ),

        const SizedBox(height: 20),

        // Command Console Injector (for testing on desktop/emulator without microphone config)
        Container(
          width: 320,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: Colors.black, width: 3),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [BoxShadow(color: Colors.black, offset: Offset(4, 4))],
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'COMMAND INJECTOR (FALLBACK)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.black),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        border: Border.all(color: Colors.black, width: 2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: TextField(
                        controller: _simulateController,
                        style: const TextStyle(fontSize: 12, fontFamily: 'Courier'),
                        decoration: const InputDecoration(
                          hintText: 'e.g. use dark mode',
                          border: InputBorder.none,
                          isDense: true,
                        ),
                        onSubmitted: (_) => _injectManualCommand(appState),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _injectManualCommand(appState),
                    child: Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        border: Border.all(color: Colors.black, width: 2),
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: const [BoxShadow(color: Colors.black, offset: Offset(2, 2))],
                      ),
                      child: const Center(
                        child: Text(
                          'INJECT',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.black),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
// Note: In speech_to_text 6.x, we must declare permissions for Android microphone inside AndroidManifest.xml:
// <uses-permission android:name="android.permission.RECORD_AUDIO" />
// <uses-permission android:name="android.permission.INTERNET" />
// and optionally query queries for custom search setups.
