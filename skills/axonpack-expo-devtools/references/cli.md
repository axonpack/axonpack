# devtools CLI reference

Everything `devtools` can query, every flag and action, how to read a reply, and what each error
means. The
same reference is online at https://axonpack.dev/docs/expo-devtools/reference/cli.

`devtools` below stands for the form that fits the project: `npx devtools`, `yarn devtools`,
`pnpm exec devtools`, `bunx devtools`, or `npx @axonpack/expo-devtools` from a monorepo root.

## Commands

| Command                     | What it prints                                                 |
| --------------------------- | -------------------------------------------------------------- |
| `devtools apps`             | The apps running on Metro, and whether they have devtools      |
| `devtools topics`           | What you can query in the app, with how many rows each has     |
| `devtools <topic> [flags]`  | A topic's rows, newest first                                   |
| `devtools get <topic> <id>` | One row, whole                                                 |
| `devtools network <action>` | Mock, block, send or replay a request. See [Actions](#actions) |
| `devtools <command> --help` | Every flag of one command, with examples                       |

Every command also takes `--port <n>` (Metro on another port), `--app <slug>` and
`--device <part of the name>` (pick one app when several run), and `--force` (see the last section).

## Topics

`id` and `t` (the time) are on every topic. A wrong `--fields` name answers with the topic's fields.

In `network`, `code` is the HTTP status only and `close` is a socket's close code (`-` on HTTP
rows). `state` is `error` for a 4xx or 5xx answer, a request with no answer and a failed socket,
so `--where state=error` lists every failure, while `--where 'code>=400'` lists only HTTP 4xx and
5xx answers.

| Topic         | A row is                                                                   | Default columns                  | Every field                                                                             |
| ------------- | -------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `network`     | A request, socket or event stream since launch. The last 1,000             | `id method code state ms url`    | `id t kind method code close state ms url error type size msgs source request response` |
| `console`     | A console line. The last 500, repeats folded into one row                  | `id level text`                  | `id t level text count source crash`                                                    |
| `performance` | A long task, slow interaction, mark or measure. Only while its tab records | `id kind name ms`                | `id t kind name ms handler detail`                                                      |
| `storage`     | A key in a registered store. `id` is `<store>/<key>`. No time              | `id type value`                  | `id t store key type size value error`                                                  |
| `query`       | A TanStack Query query (`id` is its hash) or mutation (`mutation-<n>`)     | `id type status observers error` | `id t type key status observers variables data error`                                   |
| `navigation`  | A move the navigator made. The last 200                                    | `id action from to`              | `id t action from to path params container noop`                                        |
| `redux`       | A dispatched action and what it changed. The last 200                      | `id type changed`                | `id t type action changed changes`                                                      |
| `crash`       | A captured crash                                                           | `id kind name message`           | `id t kind name message route previous seen`                                            |
| `ai-usage`    | A query or action an agent made, with its reply. The last 100              | `id command matched total ms`    | `id t command topic action matched total ms size error cut reply`                       |

## Query flags

The same on every topic. Pass the topic and each flag as separate arguments, and quote every
`--where` clause: an unquoted `>` or `<` is a shell redirect.

```sh
devtools network --where state=error --since 10m
devtools network --grep timeout --fields id,method,url,error
devtools network --where 'method=post,put' --sort -ms --limit 10
devtools network --group-by code
devtools console --where 'level=error,warn' --limit 20
devtools console --where 'level=error' --count
devtools storage --grep token
```

| Flag                 | What it does                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--grep <text>`      | Rows holding the text in any value, bodies included, any case. `'/regex/i'` for a regular expression                                                                                                    |
| `--where <clause>`   | `<field><op><value>`. Ops `=` `!=` `>` `>=` `<` `<=` `~` `!~`. `~` means contains, or takes a `/regex/`. `a,b` means any of them. `<field>?` means it has a value. Repeat it and every clause must hold |
| `--since`, `--until` | `30s`, `10m`, `2h`, `1d` or an ISO time, on the device's clock. Rows with no time (storage) are left out                                                                                                |
| `--limit <n>`        | Rows to print. Default 50                                                                                                                                                                               |
| `--after <id>`       | Only rows newer than this one, oldest first                                                                                                                                                             |
| `--before <id>`      | Only rows older than this one                                                                                                                                                                           |
| `--sort <field>`     | `-<field>` for descending. A sorted list has no cursors                                                                                                                                                 |
| `--fields <a,b,c>`   | The columns to print                                                                                                                                                                                    |
| `--count`            | Only how many rows match                                                                                                                                                                                |
| `--group-by <field>` | How many rows have each value, most first                                                                                                                                                               |
| `--full`             | Strings whole. Without it a string over 2,048 characters is cut and says so                                                                                                                             |
| `--json`             | One JSON object per line, with no `#` lines. No rows prints nothing                                                                                                                                     |
| `--out <file>`       | Write the whole reply to a file and print one line saying so. With `get`, the file holds the JSON alone                                                                                                 |

## One row, whole

```sh
devtools get network <id>                     # headers, bodies and timing
devtools get network <id> --out response.json # prints: # network <id>: wrote <n> chars to response.json
devtools get crash <id> --full                # stack and breadcrumbs
```

Take the id from a list's `id` column. A socket comes with its frames, a stream with its events,
and a crash with its stack and the recent console, network and navigation rows. A request's
initiator leaves out library frames unless you pass `--full`. A row that aged out of the buffer
answers with an error.

## Actions

`devtools network <action>` changes the app. `devtools topics` lists each topic's actions in its
`actions` column; only `network` has any. Query flags don't go with an action.

```sh
devtools network override https://api.example.com/v1/me --status 500 --body '{"error":"down"}'
devtools network override https://api.example.com/v1/feed --body-file feed.json --content-type application/json
devtools network block https://cdn.example.com/avatar.png
devtools network overrides
devtools network unoverride https://api.example.com/v1/me
devtools network unoverride --all
devtools network send GET https://api.example.com/v1/me --header 'Accept: application/json'
devtools network send POST https://api.example.com/v1/notes --body '{"text":"hi"}' --header 'Content-Type: application/json' --yes
devtools network replay <id> --header 'X-Debug: 1'
```

| Action                        | Flags                                                                                        | Reply                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `override <url>`              | `--status <100-599>` (200), `--body` or `--body-file`, `--content-type` (`application/json`) | `# network · override on <url>: <status>, <type>, <n> chars. ...`     |
| `block <url>`                 | none                                                                                         | `# network · blocking <url>: ...`                                     |
| `unoverride <url>` or `--all` | `--all`                                                                                      | `# network · removed the override on <url>` / `removed <n> overrides` |
| `overrides`                   | none                                                                                         | `# network · <n> overrides`, then `url action status type size` rows  |
| `send <METHOD> <url>`         | `--header 'Name: value'` (repeat), `--body` or `--body-file`, `--yes`                        | The new row: `id method code state ms url error`                      |
| `replay <id>`                 | the same; a `--header` replaces one of the same name                                         | The new row, `replayed <id> as <new id>`                              |

- An override matches the **exact URL** the app requests, scheme and query included. No patterns:
  copy the URL from a `devtools network` row. It applies to fetch and XMLHttpRequest, shows in the
  Network tab's Overrides view, and lasts until the app reloads. Remove yours when done.
- `send` goes out from inside the app through its own fetch, so overrides and network conditions
  apply and it is a row in the log. `replay` sends a logged request again as the Sandbox would, with
  the app's own headers; a header the app's `redactHeaders` removed goes as `[redacted]`.
- **Anything but GET, HEAD and OPTIONS needs `--yes`**, checked in the app. Without it the reply
  is `error: POST can change data on the server, so it needs --yes. GET, HEAD and OPTIONS go without`,
  exit 1. Ask the
  user before passing `--yes`.
- The reply row is masked like any other. Take its id to `devtools get network <id>` for the body.
- A failed request is still a row, `state` `error`, exit 0. With network recording paused there is
  no row: the reply gives the status and time only.
- While the request is in flight the tool asks again every 200 ms. Past 5 seconds it stops with
  `still sending ... after 5 s`; the request carries on, and `devtools ai-usage --where 'action?'`
  shows how it ended. Don't rerun it: that sends it again.

## Reading the output

- Tab-separated, with a header row. `-` is an empty value, a tab or line break inside a value is
  written `\t` or `\n`, and `t` prints as an ISO time.
- The first line is `# <topic> · <app> · <device> · <n> of <total> match`. It ends in
  `· showing <n>` when `--limit` cut rows off.
- `# next: --after <id>` is the cursor for the next poll. Run the same command with it to get only
  new rows. A request still in flight holds it back, so the next poll shows how it ended.
- `# more: --before <id>` pages to the older rows the limit cut off.
- `# <topic> is off: <reason>` means the app has no setup for that tab.
- `# paused: the Performance tab records only after record is pressed` ends an empty
  `performance` list while that tab is paused.
- An error is one line that starts with `error:`.

| Exit code | When                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| `0`       | It answered. An off topic, a query that matched nothing, or a sent request that failed is `0`                      |
| `1`       | An `error:` reply (bad flag, unknown topic or field, no such row, `--yes` missing), Node below 22, no reply in 5 s |
| `2`       | No app found, several apps match, the app has no devtools in it, or it needs `--force`                             |

Each command gives the app 5 seconds. A topic that has to read first answers with a `# wait:` line
while it reads. Every `storage` query lists each store's keys again this way, so keys the app wrote
since show up; values already read aren't read again. The tool asks again every 200 ms and
prints only the final answer. If the 5 seconds run out, run the same command again: it picks up
where it stopped.

## Recipes

- **Something failed on screen.** `devtools network --where state=error --since 5m`, then
  `devtools console --where 'level=error,warn' --since 5m`, then `devtools get network <id>` on the
  row that matters.
- **Requests with no answer.** `devtools network --where 'error?' --fields id,method,url,error`.
- **Only HTTP 4xx and 5xx.** `devtools network --where 'code>=400'`.
- **Requests still waiting.** `devtools network --where 'state=pending'`.
- **Slow requests.** `devtools network --sort -ms --limit 10 --fields id,method,ms,url`.
- **A crash.** `devtools crash`, then `devtools get crash <id> --full`.
- **Watch while the user reproduces it.** Run the list once, then rerun it with the
  `# next: --after <id>` line it printed. Repeat.
- **A stored value.** `devtools storage --grep <key>`, or `devtools get storage <store>/<key>`.
- **The query cache.** `devtools query --where 'status=error'`.
- **How the user got to this screen.** `devtools navigation --limit 10`.
- **What changed the Redux state.** `devtools redux --where 'type~cart/'`.
- **Performance.** Rows exist only while the Performance tab records, and it starts paused. Ask the
  user to open that tab and press record first.
- **How a screen handles a failing endpoint.** `devtools network override <exact url> --status 500
--body '{"error":"down"}'`, ask the user to open the screen, check `devtools console` and
  `devtools network --where 'url=<exact url>'`, then `devtools network unoverride --all`.
- **Does the endpoint answer from the app.** `devtools network send GET <url>`, then
  `devtools get network <id>` for the body.

## What it reads, and what the user sees

- The tool reads the same stores the tabs read, after every redaction in the app's config
  (`network.redactHeaders`, `network.redact`, `storage.redactKeys`, `storage.redact`,
  `navigation.redact`, `crash.redact`).
- The `authorization`, `cookie` and `set-cookie` headers and a page's `document.cookie` are always
  `[redacted]`, in every output, and no flag turns that off. Filters run on the masked row, so
  `--grep` can't find those values either.
- Storage values, SecureStore included, show as the tab shows them unless the config redacts them.
  Console, Query and Redux have no redaction setting.
- Every query and action, and the reply it got, is listed in the app's AI Usage tab, refused actions
  too. `apps` and `topics` are not listed. Read the log with `devtools ai-usage --since 1h`,
  `devtools ai-usage --where 'action?'` or `devtools get ai-usage <id>`.
- The network actions are the only changes it makes. Nothing can be cleared or navigated from the
  terminal, and a row that aged out of a tab's buffer is gone for the tool too.

## When it doesn't answer

| Message                                    | What to do                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `no app found on Metro ports 8081 to 8090` | Ask the user to run `expo start` and open the app, or pass `--port`                               |
| `... has no devtools agent`                | Mount `<DevtoolsProvider>` with `enabled` on, in a development bundle                             |
| `no reply from ... in 5 s`                 | The app's JS may be paused at a breakpoint. Ask the user to resume it, then run the command again |
| `"network --limit 8" isn't a topic`        | The command reached the tool as one argument. Pass the topic and each flag separately             |
| `2 apps match. Pick one:`                  | Add one of the `--app` and `--device` pairs it lists                                              |
| `... can't share its debugger ...`         | React Native below 0.86, or Expo started headless. See below                                      |
| `... is not a whole URL`                   | Pass the exact URL the app requests, `https://` and query included                                |
| `POST can change data ..., needs --yes`    | Ask the user, then add `--yes`                                                                    |
| `still sending ... after 5 s`              | Don't rerun. `devtools ai-usage --where 'action?'` shows how it ended                             |

On React Native below 0.86, or with Expo started headless, the app takes one debugger at a time.
With `withDevtools` in `metro.config.js` the tool asks through an open React Native DevTools window
instead. Without it, `devtools apps` shows `?` and a query stops with exit code 2. `--force`
connects anyway and closes any DevTools window open on the app, so ask the user first, or add
`withDevtools`.
