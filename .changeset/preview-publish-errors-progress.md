---
"@axonpack/preview": patch
---

- **Network errors name the request**: when the connection to the bucket fails, the CLI says which request and why, such as `PUT files/<sha256> failed: ECONNRESET read ECONNRESET`, where 0.2.0 said only `fetch failed`
- **Dropped connections are tried again**: a request whose connection was reset, refused or timed out is sent again after 1, 2 and 4 seconds
