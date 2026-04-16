import EditorModule from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-python'
import 'prismjs/themes/prism.css'

const PRISM_LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  html: 'markup',
}

const Editor = EditorModule?.default || EditorModule

function CodeEditor({ value, onChange, language = 'python', readOnly = false, minHeight = 220 }) {
  const code = value || ''
  const prismLanguage = PRISM_LANGUAGE_MAP[language] || 'plain'

  if (typeof Editor !== 'function') {
    return (
      <textarea
        value={code}
        readOnly={readOnly}
        onChange={(event) => {
          if (!readOnly) {
            onChange?.(event.target.value)
          }
        }}
        className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-sm text-slate-100 focus:outline-none"
        style={{ minHeight }}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-sm text-slate-100">
      <Editor
        value={code}
        onValueChange={(nextValue) => {
          if (!readOnly) {
            onChange?.(nextValue)
          }
        }}
        highlight={(input) => {
          const grammar = Prism.languages[prismLanguage] || Prism.languages.plain
          return Prism.highlight(input, grammar, prismLanguage)
        }}
        padding={14}
        textareaClassName="focus:outline-none"
        preClassName="!m-0"
        style={{
          minHeight,
          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      />
    </div>
  )
}

export default CodeEditor
