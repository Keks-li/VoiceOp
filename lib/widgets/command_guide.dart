import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';

class VoiceCommand {
  final String phrase;
  final String action;
  final String category;

  VoiceCommand({
    required this.phrase,
    required this.action,
    required this.category,
  });
}

final List<VoiceCommand> voiceCommandsList = [
  VoiceCommand(phrase: 'use dark mode', action: 'Switch theme to Dark', category: 'theme'),
  VoiceCommand(phrase: 'use light mode', action: 'Switch theme to Light', category: 'theme'),
  VoiceCommand(phrase: 'use purple theme', action: 'Set primary color to Purple', category: 'color'),
  VoiceCommand(phrase: 'use blue theme', action: 'Set primary color to Blue', category: 'color'),
  VoiceCommand(phrase: 'use green theme', action: 'Set primary color to Green', category: 'color'),
  VoiceCommand(phrase: 'use amber theme', action: 'Set primary color to Amber', category: 'color'),
  VoiceCommand(phrase: 'use sans font', action: 'Set font style to Sans-Serif', category: 'font'),
  VoiceCommand(phrase: 'use serif font', action: 'Set font style to Elegant Serif', category: 'font'),
  VoiceCommand(phrase: 'use mono font', action: 'Set font style to Technical Mono', category: 'font'),
  VoiceCommand(phrase: 'make text large', action: 'Increase font size', category: 'size'),
  VoiceCommand(phrase: 'make text medium', action: 'Reset font size to Medium', category: 'size'),
  VoiceCommand(phrase: 'make text small', action: 'Decrease font size', category: 'size'),
  VoiceCommand(phrase: 'clear text', action: 'Reset and clear input field', category: 'action'),
];

class CommandGuide extends StatelessWidget {
  const CommandGuide({super.key});

  IconData _getIconForCategory(String category) {
    switch (category) {
      case 'theme':
        return Icons.wb_sunny_rounded;
      case 'color':
        return Icons.palette_rounded;
      case 'font':
        return Icons.font_download_rounded;
      case 'size':
        return Icons.text_fields_rounded;
      case 'action':
        return Icons.delete_sweep_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final lastCommand = appState.lastDetectedCommand;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black, width: 4),
        boxShadow: const [
          BoxShadow(
            color: Colors.black,
            offset: Offset(6, 6),
          )
        ],
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber,
                  border: Border.all(color: Colors.black, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.mic, color: Colors.black),
              ),
              const SizedBox(width: 12),
              const Text(
                'VOICE COMMAND GUIDE',
                style: TextStyle(
                  fontWeight: FontWeight.black,
                  fontSize: 18,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Try saying or typing these commands to interact with the device simulator:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: voiceCommandsList.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final cmd = voiceCommandsList[index];
              final isActive = lastCommand == cmd.phrase;

              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: isActive ? Colors.amber.shade200 : Colors.grey.shade50,
                  border: Border.all(
                    color: isActive ? Colors.black : Colors.grey.shade300,
                    width: isActive ? 3 : 2,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: isActive
                      ? const [
                          BoxShadow(
                            color: Colors.black,
                            offset: Offset(3, 3),
                          )
                        ]
                      : null,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    Icon(
                      _getIconForCategory(cmd.category),
                      size: 20,
                      color: isActive ? Colors.black : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '"${cmd.phrase}"',
                            style: TextStyle(
                              fontFamily: 'Courier',
                              fontWeight: FontWeight.black,
                              fontSize: 14,
                              color: isActive ? Colors.black : Colors.grey.shade800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            cmd.action,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isActive ? Colors.black.withOpacity(0.7) : Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isActive)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'ACTIVE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.black,
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
