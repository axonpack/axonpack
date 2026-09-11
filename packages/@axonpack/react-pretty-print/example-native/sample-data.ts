import type { Language } from '@axonpack/react-pretty-print';

/** Shaped to hit every branch of the tree: chunking, nesting, the preview cap and each leaf type. */
export const sampleData = {
  ok: true,
  status: 200,
  ratio: 0.75,
  cursor: null,
  note: 'A string long enough that the collapsed preview has to cut it off with an ellipsis.',
  empty: {},
  nothing: [],
  user: {
    id: 4821,
    name: 'Ada Lovelace',
    tags: ['math', 'engines'],
    address: { city: 'London', geo: { lat: 51.5072, lng: -0.1276 } },
  },
  // 23 entries, so the tree buckets them into [0 … 9] / [10 … 19] / [20 … 22].
  events: Array.from({ length: 23 }, (_, index) => ({
    seq: index,
    kind: index % 2 === 0 ? 'tick' : 'tock',
    at: 1_700_000_000 + index * 60,
  })),
};

/**
 * One realistic sample per supported language, deliberately unformatted — minified where the
 * language has a formatter, one line where it doesn't. Keyed by language rather than content type
 * so the picker can offer every entry `SUPPORTED_LANGUAGES` reports.
 */
export const CODE_SAMPLES: Record<Language, string> = {
  javascript:
    'function total(items){const sum=items.reduce((a,b)=>a+b.price,0);' +
    'if(sum>100){return sum*0.9}return sum}',
  typescript:
    'export interface Cart{items:Item[];total:number}' +
    'export const empty=(c:Cart):boolean=>c.items.length===0;',
  tsx: 'const Row=({label}:Props)=><View style={styles.row}><Text>{label}</Text></View>;',
  java:
    '@Override public String describe(){if(items.isEmpty()){return "empty";}' +
    'return String.format("%d items",items.size());}',
  kotlin: 'data class User(val id:Int,val name:String?=null){fun label()=name?:"anon"}',
  swift:
    'func total(_ items:[Item]) async throws -> Double {' +
    'guard !items.isEmpty else { return 0 }; return items.reduce(0){$0+$1.price}}',
  go: 'func Total(items []Item)(float64,error){if len(items)==0{return 0,nil};return sum(items),nil}',
  rust:
    '#[derive(Debug,Clone)] pub struct Cart{pub items:Vec<Item>}' +
    'impl Cart{pub fn total(&self)->f64{self.items.iter().map(|i|i.price).sum()}}',
  c: 'static int total(const int *xs,size_t n){int s=0;for(size_t i=0;i<n;i++){s+=xs[i];}return s;}',
  cpp: 'template<typename T> constexpr T clamp(T v,T lo,T hi){return v<lo?lo:(v>hi?hi:v);}',
  csharp: 'public async Task<User?> GetAsync(int id){var u=await _db.FindAsync(id);return u;}',
  php: '<?php function total(array $items):float{ $s=0.0; foreach($items as $i){$s+=$i->price;} return $s; }',
  dart: 'Future<Cart> load(int id) async { final r = await client.get(id); return Cart.from(r); }',
  scala:
    'case class User(id:Int,name:Option[String]=None){def label:String=name.getOrElse("anon")}',
  protobuf: 'syntax="proto3"; message User{ optional string name=1; repeated int64 ids=2; }',
  python:
    'def total(items):\n    """Sum the prices."""\n    return sum(i.price for i in items)  # cheap',
  ruby: 'def total(items)\n  items.sum { |i| i.price } # cheap\nend',
  bash: '#!/usr/bin/env bash\nset -euo pipefail\nif [ -f "$1" ]; then echo "found $1"; fi',
  dockerfile:
    'FROM node:24-alpine AS build\nWORKDIR /app\nCOPY package.json .\nRUN npm ci --omit=dev\nCMD ["node","server.js"]',
  makefile: 'build: ## compile the package\n\ttsc --noEmit\n\nclean:\n\trm -rf build',
  graphql: 'query User($id: ID!) { user(id: $id) { id name tags } } # one round trip',
  yaml: 'name: axonpack\nversion: 2.5.0 # current\npackages:\n  - expo-devtools\n  - react-pretty-print',
  toml: '[server]\nport = 8080\ndebug = true\nhosts = ["a.dev", "b.dev"]',
  ini: '[server]\nport = 8080 ; inline comment\ndebug = true',
  properties: '# generated\nserver.port=8080\nserver.host=0.0.0.0',
  json: '{"id":4821,"name":"Ada Lovelace","ok":true,"tags":["math","engines"],"cursor":null}',
  json5: '{ id: 4821, /* trailing comma is fine */ name: "Ada", ok: true, }',
  html:
    '<section class="card" data-id="a"><h2>Totals</h2>' +
    '<!-- a comment --><p>Nine items, <b>90.00</b> after discount.</p></section>',
  xml: '<feed count="2" lang="en"><item id="a"><title>Hello</title></item><item id="b"/></feed>',
  svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12h16M12 4v16" stroke="#888"/></svg>',
  markdown:
    '# Totals\n\nNine items, **90.00** after discount.\n\n- one\n- two\n\nSee [the docs](https://axonpack.github.io/docs) or `formatCode`.',
  css: '.card{padding:12px;border:1px solid #30363d}.card h2{margin:0;font-size:13px}',
  scss: '$gap:8px;.card{padding:$gap;&:hover{opacity:.8}h2{margin:0}}',
  less: '@gap:8px;.card{padding:@gap;h2{margin:0}}',
  sql:
    'SELECT u.id, u.name, count(o.id) AS orders FROM users u ' +
    'LEFT JOIN orders o ON o.user_id = u.id WHERE u.id = 4821 GROUP BY u.id ORDER BY orders DESC; -- lookup',
  diff: 'diff --git a/src/total.ts b/src/total.ts\n@@ -1,3 +1,3 @@\n-const sum = 0;\n+const sum = items.length;\n unchanged line',
  log:
    '2026-09-09T21:04:11Z  WARN  cache miss for key=user:4821 (took 214ms, retrying once)\n' +
    '2026-09-09T21:04:12Z  INFO  cache write key=user:4821 size=1024',
  plain: 'Nothing structured about this at all — no keywords, no delimiters, just prose.',
};

export const sampleXml = `<?xml version="1.0"?>
<!-- a comment, dropped by the parser -->
<feed count="2" lang="en">
  <item id="a">
    <title>Hello &amp; welcome</title>
    <body><![CDATA[<b>not markup</b>]]></body>
  </item>
  <item id="b" draft="true"/>
</feed>`;
