const APP_FLAGS = `App flags (only needed when more than one app is running)
  --app <slug>        the app's Expo slug, as \`devtools apps\` shows it
  --device <text>     part of the device name, any case
  --port <n>          look on this Metro port only (default: 8081 to 8090)
  --force             attach to an app that can't share its debugger (React Native below
                      0.86, or Expo started headless) when metro.config.js has no
                      withDevtools to ask through its DevTools window. It closes that window`;

const QUERY_FLAGS = `Query flags (the same for every topic)
  --grep <text>       rows holding this text in any value, bodies included; or '/regex/i'
  --where <clause>    <field><op><value>. Ops: = != > >= < <= ~ !~ (~ is "contains", or a
                      /regex/). = and ~ ignore case. a,b,c means any of them. <field>? means
                      it has a value. Repeat --where to AND them
  --since <time>      30s, 10m, 2h, 1d or an ISO time, on the device's clock
  --until <time>
  --limit <n>         rows to print (default 50)
  --after <id>        only rows newer than this one, oldest first. Poll with the "# next:" line
  --before <id>       only rows older than this one. Page with the "# more:" line
  --sort <field>      -<field> for descending (default: newest first, no cursors when sorted)
  --fields <a,b,c>    columns to print (default: the topic's own). A wrong name lists them all
  --count             print only how many rows match
  --group-by <field>  how many rows have each value, most first
  --full              strings whole, not cut at 2 KB
  --json              JSON lines, with no # lines
  --out <file>        write the reply whole to a file instead of printing it`;

const OUTPUT = `Output
  Tab-separated, with a header row. "#" lines are a summary or a cursor. "-" is an empty value.
  Values in the app are redacted as the app's devtools config says, and authorization, cookie
  and set-cookie are always masked.

Exit codes
  0  ok
  1  an "error:" reply (bad flag, unknown topic or field, no such row), or no reply in 5 s
  2  no app found, several apps match, the app has no devtools agent, or it needs --force`;

const MAIN = `devtools: read what @axonpack/expo-devtools recorded in a running app

Run it as \`npx devtools <command>\` in the app's project folder. In a monorepo, or outside the
app's folder, \`npx devtools\` can miss the local install and fetch an unrelated npm package named
\`devtools\`; \`npx @axonpack/expo-devtools <command>\` always runs this one. With bun, yarn or
pnpm: \`bunx devtools\`, \`yarn devtools\`, \`pnpm exec devtools\`.
Needs Node 22 or newer, the app open in a dev build or Expo Go, and \`expo start\` running.

Usage
  devtools apps                  the apps running on Metro, and whether they have devtools
  devtools topics                what you can query in the app, with row counts
  devtools <topic> [flags]       a topic's rows, newest first
  devtools get <topic> <id>      one row, whole
  devtools <command> --help      more on one command

${QUERY_FLAGS}

${APP_FLAGS}

${OUTPUT}

Examples
  devtools apps
  devtools topics
  devtools network --where state=error --since 10m   requests that failed (4xx, 5xx, no answer)
  devtools network --grep timeout --fields id,method,url,error
  devtools network --group-by code
  devtools console --where 'level=error,warn' --limit 20
  devtools console --after <id from "# next:">     what is new since the last call
  devtools get network <id> --full
  devtools storage --grep token --app my-app --device pixel`;

const APPS = `devtools apps: the apps running on Metro ports 8081 to 8090

One row per app and device:
  app       the Expo slug, which --app takes
  name      the app's name
  device    the device name, which --device matches part of
  devtools  the @axonpack/expo-devtools version in the app, "-" without it, "?" when unknown
  metro     the Metro port
  note      why an app can't be queried as is

  --port <n>   look on this Metro port only
  --force      ask the "?" apps too, which closes a DevTools window open on them
  --json       JSON lines

Exit code 2 when no app is running.

Examples
  devtools apps
  devtools apps --port 8082 --json`;

const TOPICS = `devtools topics: what you can query in the app

One row per topic: its name, how many rows it holds now ("off" when the app turned it off), and
what a row is. Query one with \`devtools <topic>\`.

${APP_FLAGS}

  --json              JSON lines

Examples
  devtools topics
  devtools topics --app my-app`;

const QUERY = `devtools <topic> [flags]: a topic's rows, newest first

The first line is "# <topic> · <app> · <device> · <n> of <total> match". "# next: --after <id>"
is the cursor for the next poll, and "# more: --before <id>" pages to older rows the limit cut off.

${QUERY_FLAGS}

${APP_FLAGS}

${OUTPUT}

Examples
  devtools network
  devtools network --where 'code>=400' --where 'url~/v1/' --since 10m
  devtools network --where 'method=post,put' --sort -ms --limit 10
  devtools network --where 'error?' --fields id,url,error
  devtools console --where 'level=error' --count
  devtools console --grep '/timed? ?out/i' --json
  devtools navigation --after <id from "# next:">`;

const GET = `devtools get <topic> <id>: one row, whole, as indented JSON

Strings over 2 KB are cut unless you pass --full. Take the id from a list's id column.

  --full          strings whole
  --json          one line of JSON
  --out <file>    write it whole to a file instead of printing it

${APP_FLAGS}

Exit code 1 when there is no such row (it may have aged out of the buffer).

Examples
  devtools get network <id>
  devtools get network <id> --out response.json
  devtools get crash <id> --full`;

export const HELP = { main: MAIN, apps: APPS, topics: TOPICS, query: QUERY, get: GET };
