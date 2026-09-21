# Chit-Chat — Working Browser Prototype

Real-time voice translation demo built with pure HTML / CSS / JavaScript.

## Features

- Hold-to-speak using the browser **Web Speech API**
- Automatic translation (online via free public APIs + offline dictionary)
- Online / Offline mode toggle
- Text-to-speech playback of the translation
- Language swap, conversation history, settings
- Mobile-friendly dark UI matching the Chit-Chat product vision

## How to run locally

1. Open `index.html` directly in Chrome or Edge (best support for speech recognition).
2. Or serve the folder with any static server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

## Deploy to GitHub Pages

1. Create or open your repository (e.g. `Chit-chat-voice-translation`).
2. Delete the old `.pptx` file if it is still there.
3. Upload **all files** from this folder (`index.html`, `styles.css`, `app.js`, `README.md`) to the **root** of the `main` branch.
4. Go to **Settings → Pages**.
5. Source: Deploy from a branch → Branch `main` → Folder `/ (root)` → Save.
6. Wait 1–2 minutes, then open:
   `https://YOUR-USERNAME.github.io/Chit-chat-voice-translation/`

## Browser support

| Feature              | Chrome / Edge | Safari (iOS) | Firefox |
|----------------------|---------------|--------------|---------|
| Speech Recognition   | Excellent     | Limited      | No      |
| Speech Synthesis     | Excellent     | Good         | Good    |
| Online Translation   | Yes           | Yes          | Yes     |

**Recommendation:** Use Chrome or Edge on desktop / Android for the best experience.

## Notes

- Online translation uses free public endpoints (MyMemory + LibreTranslate). Rate limits may apply.
- Offline mode uses a small built-in phrase dictionary for common expressions (demo quality).
- Microphone permission is required the first time you speak.
- This is a functional prototype demonstrating the product vision. Production versions would use private API keys, voice cloning, continuous streaming models, etc.

---

**Talk. HUH? Understood.**
