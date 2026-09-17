# Refactor tasks

- [x] Remove props that disappear between renders, confirmed stale, `title` survives `update: {}`
- [x] Reset `value` and `checked` when they go, same gap on the property path
- [x] Name the two ends for direction, not shape: `RemoteTree` and `RemoteRoot` say neither
- [x] Name each file after what it exports
- [x] Test the `clear` op's deliberate half-reset: children go, ids stay
- [x] Carry `key` on a described event, so a keyboard handler has something to read
- [x] Say what an event cannot carry, where a consumer will look for it
