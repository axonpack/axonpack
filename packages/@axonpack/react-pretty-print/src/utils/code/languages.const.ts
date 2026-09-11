/**
 * Keyword vocabularies, one per language. Facts about each language rather than logic, kept apart
 * from the rule builders in `code-highlight.util.ts` so that adding a language is a list here plus
 * one line there.
 *
 * Each is an alternation body, longest-first where one keyword prefixes another (`instanceof`
 * before `in`), because the tokenizer takes the first rule that matches and a shorter keyword
 * would otherwise swallow the head of a longer one.
 */
const shared = {
  control:
    'return|if|else|for|while|do|switch|case|default|break|continue|throw|try|catch|finally|goto',
  literals: 'true|false|null|nil|none|undefined',
};

export const KEYWORDS = {
  javascript:
    `const|let|var|function|class|extends|super|this|import|export|from|as|async|await|` +
    `typeof|instanceof|delete|in|of|new|void|yield|static|get|set|${shared.control}|` +
    `${shared.literals}`,

  typescript:
    `const|let|var|function|class|interface|type|enum|namespace|declare|abstract|implements|` +
    `extends|super|this|import|export|from|as|async|await|readonly|public|private|protected|` +
    `satisfies|keyof|infer|typeof|instanceof|delete|in|of|new|void|yield|static|get|set|` +
    `${shared.control}|${shared.literals}|any|unknown|never|string|number|boolean|object|symbol`,

  java:
    `abstract|assert|boolean|byte|char|class|double|enum|extends|final|float|implements|import|` +
    `instanceof|int|interface|long|native|new|package|private|protected|public|record|sealed|` +
    `short|static|strictfp|super|synchronized|this|throws|transient|var|void|volatile|yield|` +
    `${shared.control}|${shared.literals}`,

  kotlin:
    `abstract|actual|annotation|as|by|companion|const|constructor|crossinline|data|delegate|` +
    `enum|expect|external|final|fun|get|import|infix|init|inline|inner|interface|internal|` +
    `is|lateinit|object|open|operator|out|override|package|private|protected|public|reified|` +
    `sealed|set|super|suspend|tailrec|this|typealias|val|value|var|vararg|when|where|` +
    `${shared.control}|${shared.literals}`,

  swift:
    `associatedtype|actor|any|as|async|await|borrowing|case|catch|class|consuming|deinit|` +
    `didSet|enum|extension|fallthrough|fileprivate|func|guard|import|indirect|inout|internal|` +
    `is|lazy|let|mutating|nonisolated|nonmutating|open|operator|override|package|postfix|` +
    `precedencegroup|prefix|private|protocol|public|repeat|required|rethrows|self|Self|some|` +
    `static|struct|subscript|super|throws|typealias|var|weak|where|willSet|` +
    `${shared.control}|${shared.literals}`,

  go:
    `break|chan|const|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|` +
    `range|return|select|struct|switch|type|var|case|default|continue|` +
    `${shared.literals}|iota|string|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|` +
    `float32|float64|complex64|complex128|byte|rune|bool|error|any`,

  rust:
    `abstract|async|await|become|box|crate|dyn|enum|extern|final|fn|impl|let|loop|macro|match|` +
    `mod|move|mut|override|priv|pub|ref|self|Self|static|struct|super|trait|type|typeof|` +
    `unsafe|unsized|use|virtual|where|yield|${shared.control}|${shared.literals}|` +
    `i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|` +
    `Option|Result|Some|None|Ok|Err`,

  c:
    `auto|_Bool|_Complex|char|const|double|enum|extern|float|inline|int|long|register|restrict|` +
    `short|signed|sizeof|static|struct|typedef|union|unsigned|void|volatile|${shared.control}`,

  cpp:
    `alignas|alignof|auto|bool|catch|char|char8_t|char16_t|char32_t|class|concept|const|` +
    `consteval|constexpr|constinit|const_cast|decltype|delete|double|dynamic_cast|enum|` +
    `explicit|export|extern|float|friend|inline|int|long|mutable|namespace|new|noexcept|` +
    `operator|private|protected|public|register|reinterpret_cast|requires|short|signed|sizeof|` +
    `static|static_assert|static_cast|struct|template|this|thread_local|typedef|typeid|` +
    `typename|union|unsigned|using|virtual|void|volatile|wchar_t|${shared.control}|` +
    `${shared.literals}|nullptr`,

  csharp:
    `abstract|as|base|bool|byte|char|checked|class|const|decimal|delegate|double|enum|event|` +
    `explicit|extern|fixed|float|implicit|in|int|interface|internal|is|lock|long|namespace|` +
    `new|object|operator|out|override|params|partial|private|protected|public|readonly|ref|` +
    `sbyte|sealed|short|sizeof|stackalloc|static|string|struct|this|typeof|uint|ulong|` +
    `unchecked|unsafe|ushort|using|var|virtual|void|volatile|where|yield|async|await|record|` +
    `${shared.control}|${shared.literals}`,

  php:
    `abstract|and|array|as|callable|class|clone|const|declare|echo|elseif|empty|enddeclare|` +
    `endfor|endforeach|endif|endswitch|endwhile|enum|extends|final|fn|function|global|` +
    `implements|include_once|include|instanceof|insteadof|interface|isset|list|match|` +
    `namespace|new|or|print|private|protected|public|readonly|require_once|require|static|` +
    `trait|unset|use|var|xor|yield|foreach|${shared.control}|${shared.literals}`,

  dart:
    `abstract|as|assert|async|await|base|class|const|covariant|deferred|dynamic|enum|export|` +
    `extends|extension|external|factory|final|get|hide|implements|import|interface|is|late|` +
    `library|mixin|new|on|operator|part|required|rethrow|sealed|set|show|static|super|sync|` +
    `this|typedef|var|void|when|with|yield|${shared.control}|${shared.literals}`,

  scala:
    `abstract|case|catch|class|def|derives|do|else|enum|export|extends|extension|false|final|` +
    `finally|for|forSome|given|if|implicit|import|infix|inline|lazy|match|new|null|object|` +
    `opaque|open|override|package|private|protected|return|sealed|super|then|this|throw|` +
    `trait|transparent|true|try|type|using|val|var|while|with|yield`,

  python:
    `and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|` +
    `global|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|` +
    `True|False|None|self|cls|match|case`,

  ruby:
    `alias|and|begin|break|case|class|def|defined\\?|do|else|elsif|end|ensure|false|for|if|in|` +
    `module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|` +
    `when|while|yield|require_relative|require|attr_accessor|attr_reader|attr_writer`,

  bash:
    `if|then|elif|else|fi|for|while|until|do|done|case|esac|function|select|in|return|break|` +
    `continue|local|readonly|declare|export|unset|shift|source|eval|exec|trap|set|echo|printf|` +
    `read|cd|test`,

  sql:
    `SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|VIEW|INDEX|` +
    `JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|USING|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|` +
    `UNION|ALL|DISTINCT|AS|AND|OR|NOT|NULL|IS|IN|BETWEEN|LIKE|ILIKE|EXISTS|CASE|WHEN|THEN|` +
    `ELSE|END|WITH|RETURNING|PRIMARY|FOREIGN|KEY|REFERENCES|UNIQUE|CHECK|DEFAULT|CONSTRAINT|` +
    `CASCADE|BEGIN|COMMIT|ROLLBACK|TRANSACTION|GRANT|REVOKE|TRUE|FALSE`,

  graphql:
    `query|mutation|subscription|fragment|on|type|input|interface|union|enum|scalar|schema|` +
    `directive|extend|implements|repeatable|true|false|null`,

  protobuf:
    `syntax|package|import|public|weak|option|message|enum|service|rpc|returns|oneof|map|` +
    `repeated|optional|required|reserved|extend|extensions|to|stream|` +
    `double|float|int32|int64|uint32|uint64|sint32|sint64|fixed32|fixed64|sfixed32|sfixed64|` +
    `bool|string|bytes|true|false`,

  dockerfile:
    `FROM|AS|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|` +
    `ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL`,

  makefile: `ifeq|ifneq|ifdef|ifndef|else|endif|include|export|unexport|define|endef|vpath`,

  json5: `true|false|null|Infinity|NaN`,
} as const;
