import 'package:flutter/material.dart';
import '../widgets/phone_simulator.dart';
import '../widgets/command_guide.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;
    final bool isWideScreen = screenWidth > 768;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBEB),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: BorderSide(color: Colors.black, width: 4),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: SafeArea(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        border: Border.all(color: Colors.black, width: 2),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: const [
                          BoxShadow(
                            color: Colors.black,
                            offset: Offset(2, 2),
                          )
                        ],
                      ),
                      child: const Icon(Icons.smartphone, color: Colors.black),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'VoiceOp',
                              style: TextStyle(
                                fontWeight: FontWeight.black,
                                fontSize: 18,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.amber,
                                border: Border.all(color: Colors.black, width: 1.5),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'MVP',
                                style: TextStyle(
                                  fontSize: 8,
                                  fontWeight: FontWeight.black,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Text(
                          'Interactive Phone Prototype & Voice Controls',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (isWideScreen)
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.amber,
                          border: Border.all(color: Colors.black, width: 2),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: const [
                            BoxShadow(color: Colors.black, offset: Offset(2, 2))
                          ],
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.check_circle_outline, size: 14, color: Colors.black),
                            SizedBox(width: 6),
                            Text(
                              'FLUTTER NATIVE',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.black),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'SDK: >=3.0.0',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.black,
                          fontFamily: 'Courier',
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 1100),
              child: isWideScreen
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left: Simulator
                        const SizedBox(
                          width: 350,
                          child: PhoneSimulator(),
                        ),
                        const SizedBox(width: 32),
                        // Right: Guide
                        const Expanded(
                          child: CommandGuide(),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: const [
                        // Center Simulator
                        Center(
                          child: SizedBox(
                            width: 350,
                            child: PhoneSimulator(),
                          ),
                        ),
                        SizedBox(height: 32),
                        // Bottom Guide
                        CommandGuide(),
                      ],
                    ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: Container(
        color: Colors.black,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.smartphone, color: Colors.amber, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'VoiceOp © 2026',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Courier',
                      ),
                    ),
                  ],
                ),
                const Text(
                  'Powered by Flutter & Dart',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'VoiceOp provides a high-fidelity, interactive sandbox environment to simulate real-time speech operations, voice captioning, and speech-to-text controls natively.',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 10,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
