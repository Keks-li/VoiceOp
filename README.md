<<<<<<< HEAD
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5dc24f3b-545b-497d-a46e-912f0e7b5fc3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
=======
# VoiceOp - Flutter Android App

VoiceOp is a high-fidelity interactive mobile prototype written in Flutter and Dart. It features real-time speech operations, voice captioning, and dynamic voice-activated interface controls (speech-to-text configurations).

## Features

- **Real-Time Voice Commands**: Uses the device microphone to capture voice commands:
  - `"use dark mode"` / `"use light mode"` (switches the visual theme)
  - `"use purple/blue/green/amber theme"` (updates the primary application color)
  - `"use sans/serif/mono font"` (changes the typography style)
  - `"make text large/medium/small"` (adjusts text box size)
  - `"clear text"` (resets the input content)
- **Visual Wave Animation**: A custom animation visualizer that acts dynamically when the microphone is recording.
- **Interactive Phone UI**: A preview dashboard simulating controls on the phone interface.
- **Simulation Console**: Includes a manual command injector for testing phrases without speaking.

## Project Structure

- `pubspec.yaml`: Project dependencies and configuration.
- `lib/main.dart`: Entry point of the app.
- `lib/app_state.dart`: Global theme and simulation states.
- `lib/voice_command_processor.dart`: Speech command parser.
- `lib/screens/dashboard_screen.dart`: Core layout grid.
- `lib/widgets/phone_simulator.dart`: Simulated device widget.
- `lib/widgets/command_guide.dart`: List of speech instructions.
- `lib/widgets/voice_visualizer.dart`: Listening wave micro-animation.

## Run Locally

### Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) installed on your system.

### Steps
1. **Initialize the platforms** (e.g. Android/Web) in this directory:
   ```bash
   flutter create --platforms=android,web .
   ```
2. **Retrieve dependencies**:
   ```bash
   flutter pub get
   ```
3. **Run the project**:
   ```bash
   flutter run
   ```

*Note: For Android, ensure microphone permissions are added to `android/app/src/main/AndroidManifest.xml` as specified in the `speech_to_text` documentation.*
>>>>>>> 7851262ba0acd61ae053ca1f2caaf62476cec074
