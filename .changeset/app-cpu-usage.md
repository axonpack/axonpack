---
"@axonpack/expo-devtools": minor
---

- **CPU usage in the Performance tab**: the Memory card now plots how busy the app keeps the CPU, as Total, JavaScript and UI thread lines from 0 to 100%. Total is a share of all the phone's cores; each thread is a share of one core, so 100% means that thread never stopped. Needs a development build, and an existing one has to be rebuilt to pick it up. Expo Go shows it as unavailable
- **Three new palette tokens**: `cpuApp`, `cpuJs` and `cpuUi` colour the CPU plot's lines. Every built-in theme sets them, and a custom theme inherits them from its base
