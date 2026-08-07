---
"@axonpack/expo-devtools": patch
---

## 🐛 Bug Fixes

- Requests no longer raise an error and go missing from the network log when their response comes back as a file, an image, or anything else that isn't plain text. In some apps this affected every request the app made.
- Those responses now show a short summary with their type and size, instead of appearing empty.
- A page open in an in-app browser is no longer disturbed when it loads that kind of response.
