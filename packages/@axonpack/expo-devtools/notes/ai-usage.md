# AI Usage

Every query an AI agent made of the app from the terminal, and the reply it got.

## Features

- [x] A list of the queries, newest first: the command, when, how many rows it matched of how many,
      and how long the app took
- [x] An error shows in red on its row
- [x] Open a query to see the reply exactly as the agent got it, as a tree or as text, and copy it
- [x] Pause recording and clear the list, and start paused from the config
- [x] The same tab inside React Native DevTools
- [x] Read the list back from the terminal, like any other tab
- [ ] Walked live in the app and in DevTools against a real agent session
- [ ] Search and filter the list

## How it records

Every query goes through the one call the tool makes into the app, so that call records it after
answering: the time, the query written back as the command line that asks it, the topic, rows
matched of the total, how long the app took, the reply's size, the error, and the reply itself.

## Decisions worth knowing

- **The reply is what left the app.** It is recorded after every redaction, so the tab never shows
  anything raw, and what it shows is exactly what the agent read.
- **Probes are not queries.** The call that lists apps and topics is not recorded.
- **Only the answer the agent got.** A topic that is still reading answers `# wait:` and is asked
  again every 200 ms. Those replies are not recorded, only the one the tool ends on.
- **A known ceiling.** A ring buffer of 100, and each reply cut at 64 K characters with the row
  marked, since `--full` and `--out` can ask for megabytes.
- **A query of this tab keeps no reply.** It would otherwise repeat every earlier reply inside it.
  Its size and counts are kept.
- **Paused keeps nothing but answers everything.** Pausing stops the list, never the agent, the way
  the record button on the other tabs stops capture and nothing else. `aiUsage.disabledByDefault`
  starts it paused.
- **The command is written so it can be pasted back.** Quoted only where a shell would read it as
  something else.
