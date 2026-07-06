import 'dart:math';
import 'package:flutter/material.dart';

class VoiceVisualizer extends StatefulWidget {
  final bool isListening;

  const VoiceVisualizer({super.key, required this.isListening});

  @override
  State<VoiceVisualizer> createState() => _VoiceVisualizerState();
}

class _VoiceVisualizerState extends State<VoiceVisualizer> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<double> _baseHeights = [15.0, 30.0, 45.0, 35.0, 20.0, 10.0];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );

    if (widget.isListening) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant VoiceVisualizer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isListening && !_controller.isAnimating) {
      _controller.repeat(reverse: true);
    } else if (!widget.isListening && _controller.isAnimating) {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: List.generate(_baseHeights.length, (index) {
            double height = 6.0;
            if (widget.isListening) {
              // Add a bit of randomness combined with the sine animation
              final animValue = _controller.value;
              final randomFactor = 0.7 + _random.nextDouble() * 0.6;
              height = max(6.0, _baseHeights[index] * animValue * randomFactor);
            }

            return Container(
              width: 5.0,
              height: height,
              margin: const EdgeInsets.symmetric(horizontal: 3.0),
              decoration: BoxDecoration(
                color: widget.isListening ? Colors.black : Colors.grey.shade400,
                borderRadius: BorderRadius.circular(10.0),
              ),
            );
          }),
        );
      },
    );
  }
}
