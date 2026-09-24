import { buildCurlCommand } from './curl.util';
import { buildFetchCommand, buildNodeFetchCommand } from './fetch-snippet.util';

export type SnippetSource = {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
};

/**
 * JSON's string escapes are valid in Python and Go as they stand. The other languages need one
 * change each, and missing it is how a snippet with a `$` or a control character stops compiling.
 */
const jsonString = (value: string) => JSON.stringify(value);

/** Kotlin reads `$` as the start of a template, so it is escaped too. */
const kotlinString = (value: string) => jsonString(value).replace(/\$/g, '\\$');

/** Swift writes a Unicode escape as `\u{…}`, where JSON writes `\uXXXX`. */
const swiftString = (value: string) =>
  jsonString(value).replace(/\\u([0-9a-f]{4})/gi, (_match, hex: string) => `\\u{${hex}}`);

/** One single-quoted shell word, with any single quote in it closed, escaped and reopened. */
const shellWord = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const headersOf = (source: SnippetSource) => Object.entries(source.requestHeaders ?? {});

/** A body is only offered to the languages that send one for this method, as `fetch` does. */
const bodyOf = (source: SnippetSource) =>
  source.method === 'GET' || source.method === 'HEAD' ? undefined : source.requestBody || undefined;

function python(source: SnippetSource): string {
  const headers = headersOf(source);
  const body = bodyOf(source);
  return [
    'import requests',
    '',
    `url = ${jsonString(source.url)}`,
    ...(headers.length
      ? [
          'headers = {',
          ...headers.map(([key, value]) => `    ${jsonString(key)}: ${jsonString(value)},`),
          '}',
        ]
      : []),
    ...(body ? [`data = ${jsonString(body)}`] : []),
    '',
    `response = requests.request(${[
      jsonString(source.method),
      'url',
      ...(headers.length ? ['headers=headers'] : []),
      ...(body ? ['data=data'] : []),
    ].join(', ')})`,
    'print(response.status_code)',
    'print(response.text)',
  ].join('\n');
}

function axios(source: SnippetSource): string {
  const headers = headersOf(source);
  const body = bodyOf(source);
  return [
    "import axios from 'axios';",
    '',
    'const response = await axios.request({',
    `  method: ${jsonString(source.method)},`,
    `  url: ${jsonString(source.url)},`,
    ...(headers.length
      ? [
          '  headers: {',
          ...headers.map(([key, value]) => `    ${jsonString(key)}: ${jsonString(value)},`),
          '  },',
        ]
      : []),
    ...(body ? [`  data: ${jsonString(body)},`] : []),
    '});',
    '',
    'console.log(response.status, response.data);',
  ].join('\n');
}

function swift(source: SnippetSource): string {
  const body = bodyOf(source);
  return [
    'import Foundation',
    '',
    `var request = URLRequest(url: URL(string: ${swiftString(source.url)})!)`,
    `request.httpMethod = ${swiftString(source.method)}`,
    ...headersOf(source).map(
      ([key, value]) =>
        `request.setValue(${swiftString(value)}, forHTTPHeaderField: ${swiftString(key)})`
    ),
    ...(body ? [`request.httpBody = ${swiftString(body)}.data(using: .utf8)`] : []),
    '',
    'let (data, response) = try await URLSession.shared.data(for: request)',
    'print((response as? HTTPURLResponse)?.statusCode ?? 0)',
    'print(String(data: data, encoding: .utf8) ?? "")',
  ].join('\n');
}

function kotlin(source: SnippetSource): string {
  const body = bodyOf(source);
  const contentType = headersOf(source).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
  return [
    'import okhttp3.MediaType.Companion.toMediaTypeOrNull',
    'import okhttp3.OkHttpClient',
    'import okhttp3.Request',
    'import okhttp3.RequestBody.Companion.toRequestBody',
    '',
    'val client = OkHttpClient()',
    ...(body
      ? [
          `val body = ${kotlinString(body)}.toRequestBody(${
            contentType ? `${kotlinString(contentType)}.toMediaTypeOrNull()` : 'null'
          })`,
        ]
      : []),
    'val request = Request.Builder()',
    `    .url(${kotlinString(source.url)})`,
    `    .method(${kotlinString(source.method)}, ${body ? 'body' : 'null'})`,
    ...headersOf(source).map(
      ([key, value]) => `    .addHeader(${kotlinString(key)}, ${kotlinString(value)})`
    ),
    '    .build()',
    '',
    'client.newCall(request).execute().use { response ->',
    '    println(response.code)',
    '    println(response.body?.string())',
    '}',
  ].join('\n');
}

function go(source: SnippetSource): string {
  const body = bodyOf(source);
  return [
    'package main',
    '',
    'import (',
    '\t"fmt"',
    '\t"io"',
    '\t"net/http"',
    ...(body ? ['\t"strings"'] : []),
    ')',
    '',
    'func main() {',
    `\treq, _ := http.NewRequest(${jsonString(source.method)}, ${jsonString(source.url)}, ${
      body ? `strings.NewReader(${jsonString(body)})` : 'nil'
    })`,
    ...headersOf(source).map(
      ([key, value]) => `\treq.Header.Set(${jsonString(key)}, ${jsonString(value)})`
    ),
    '',
    '\tres, err := http.DefaultClient.Do(req)',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '\tdefer res.Body.Close()',
    '\tdata, _ := io.ReadAll(res.Body)',
    '\tfmt.Println(res.StatusCode, string(data))',
    '}',
  ].join('\n');
}

/** HTTPie's own syntax: `Name:value` for a header, and `--raw` so the body goes as it is. */
function httpie(source: SnippetSource): string {
  const body = bodyOf(source);
  return [
    `http ${source.method} ${shellWord(source.url)}`,
    ...headersOf(source).map(([key, value]) => `  ${shellWord(`${key}:${value}`)}`),
    ...(body ? [`  --raw ${shellWord(body)}`] : []),
  ].join(' \\\n');
}

/**
 * Every language the sandbox offers a request in. The first three are the app's own "Copy as"
 * generators, so a snippet here and a copy in the app always agree.
 */
export const CODE_SNIPPET_TARGETS: {
  id: string;
  label: string;
  build: (source: SnippetSource) => string;
}[] = [
  { id: 'curl', label: 'Shell cURL', build: buildCurlCommand },
  { id: 'httpie', label: 'Shell HTTPie', build: httpie },
  { id: 'fetch', label: 'JavaScript fetch', build: buildFetchCommand },
  { id: 'axios', label: 'JavaScript axios', build: axios },
  { id: 'node', label: 'Node.js fetch', build: buildNodeFetchCommand },
  { id: 'python', label: 'Python requests', build: python },
  { id: 'swift', label: 'Swift URLSession', build: swift },
  { id: 'kotlin', label: 'Kotlin OkHttp', build: kotlin },
  { id: 'go', label: 'Go net/http', build: go },
];
