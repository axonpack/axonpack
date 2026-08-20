# Database

Nothing is built yet. This note exists to say what it would be, and why it is not part of the
Storage tab.

## Features

- [ ] SQLite tab — tables, schema, queries and paging

## Decisions worth knowing

- **A table is not a key list.** The Storage tab reads keys and values from a store that can
  enumerate itself; a database needs schema, a query, and paging through rows that will not fit in
  memory. Squeezing SQLite into a key-value adapter would give a worse version of both.
- **It would follow the same registration rule.** `expo-sqlite` is a separate install with its own
  native code, so a database would come in through the config the way the storage adapters do — this
  package would still depend on nothing.
