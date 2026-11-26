---
"@axonpack/expo-devtools": patch
---

- **XHR overrides no longer crash the app**: a response override on a request made through `XMLHttpRequest` (axios included) threw "Cannot assign to property 'status' which has only a getter" when the real response arrived. The app now gets the overridden response
