// Chrome + content primitives shared across skins: icon helpers, MarkdownContent,
// the static code editor, Windows caption buttons, and the Microsoft-365 title
// bar / ribbon frame. Imports only libs + logos — never the app shell — so there
// are no cycles.
import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { WordLogo, ExcelLogo } from '../../logos'
import { aliasInitial } from '../../core/alias'
import { lang } from '../../i18n'
import { skinLabel } from '../labels'
import { useSkinControls } from '../controls'
import { safeHttpUrl } from '../../core/content'
import {
  Save20Regular,
  ArrowUndo20Regular,
  ArrowRedo20Regular,
  ClipboardPaste24Regular,
  Cut20Regular,
  Copy20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  Highlight20Regular,
  TextColor20Regular,
  TextBulletList20Regular,
  TextNumberListLtr20Regular,
  TextAlignLeft20Regular,
  TextAlignCenter20Regular,
  TextAlignRight20Regular,
  TextAlignJustify20Regular,
  Search20Regular,
} from '@fluentui/react-icons'

// ===== EXTRACTED BLOCKS APPENDED BELOW =====
export function MSym({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded${className ? ` ${className}` : ''}`} aria-hidden="true">
      {name}
    </span>
  )
}

// VS Code's real icon font (Codicons) — pixel-accurate to the editor.
export function Codicon({ name, size }: { name: string; size?: number }) {
  return (
    <i
      className={`codicon codicon-${name}`}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    />
  )
}

// Flatten heading children to plain text so we can slug it into an id.
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return nodeText((node as { props?: { children?: ReactNode } }).props?.children)
  }
  return ''
}
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function LazyImage({ src, alt }: { src?: string; alt?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const label = alt || (lang === 'zh' ? '图片' : 'Image')
  if (!src) return <span role="img" aria-label={label}>[{label}]</span>
  if (status !== 'loading') return <button type="button" className="reader-lazy-image" onClick={() => setStatus('loading')}>
    {status === 'error' ? (lang === 'zh' ? '图片加载失败，点击重试：' : 'Image failed, retry: ') : (lang === 'zh' ? '点击加载图片：' : 'Load image: ')}{label}
  </button>
  return <img src={src} alt={label} referrerPolicy="no-referrer" onError={() => setStatus('error')} />
}

export function MarkdownContent({ markdown, baseUrl }: { markdown: string; baseUrl?: string }) {
  const components = useMemo(() => {
    const heading = (Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
      function Heading({ children }: { children?: ReactNode }) {
        return <Tag id={slugify(nodeText(children)) || undefined}>{children}</Tag>
      }
    return {
      h1: heading('h1'),
      h2: heading('h2'),
      h3: heading('h3'),
      h4: heading('h4'),
      h5: heading('h5'),
      h6: heading('h6'),
      a: ({ children, href }: { children?: ReactNode; href?: string }) => {
        const absolute = safeHttpUrl(href, baseUrl)
        return absolute ? <a href={absolute} data-reader-link>{children}</a> : <span>{children}</span>
      },
      img: ({ alt, src }: { alt?: string; src?: string }) => {
        const absolute = safeHttpUrl(src, baseUrl)
        return <LazyImage key={absolute || src} alt={alt} src={absolute || undefined} />
      },
    }
  }, [baseUrl])
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
}

// The one non-native affordance we allow inside a disguise: a flat row of plain
// text links at the very TOP of the content (not in the app chrome) letting you
// hop to any other disguise. Rendered as buttons styled as links so the stage's
// link/appmenu click delegation ignores them. Names are localized (飞书/Lark …).
export function SkinSwitcher({ className }: { className?: string }) {
  const ctl = useSkinControls()
  if (!ctl) return null
  const { activeSkin, skins, onSwitchSkin } = ctl
  return (
    <div className={`skin-switch${className ? ` ${className}` : ''}`} aria-label={lang === 'zh' ? '使用其他应用打开' : 'Open as another app'}>
      {skins.map((s, i) => (
        <Fragment key={s.id}>
          {i > 0 && (
            <span className="skin-switch-sep" aria-hidden="true">
              ·
            </span>
          )}
          {s.id === activeSkin ? (
            <span className="skin-switch-cur" aria-current="true">
              {skinLabel(s, lang)}
            </span>
          ) : (
            <button
              type="button"
              className="skin-switch-link"
              onClick={() => onSwitchSkin(s.id)}
            >
              {skinLabel(s, lang)}
            </button>
          )}
        </Fragment>
      ))}
    </div>
  )
}

// Split an article body into a handful of coherent chunks for chat-style skins
// (Slack), breaking at heading boundaries and merging the tail so a long piece
// never explodes into dozens of tiny messages.
export function splitMarkdownForChat(
  markdown: string,
  opts?: { targetChars?: number; maxChunks?: number },
): string[] {
  const targetChars = opts?.targetChars ?? 520
  const maxChunks = opts?.maxChunks ?? 14
  const blocks = markdown
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
  const chunks: string[] = []
  let cur = ''
  // Track the active fence's marker char AND length so we never split a fenced
  // code block across messages. Per CommonMark, a fence closes only on the same
  // char with length >= the opener — so a ```` (4) block can contain ``` lines.
  let fence: { ch: string; len: number } | null = null
  for (const block of blocks) {
    const startsInFence = fence !== null
    for (const line of block.split('\n')) {
      const marker = line.match(/^\s*(`{3,}|~{3,})/)
      if (!marker) continue
      const ch = marker[1][0]
      const len = marker[1].length
      if (fence === null) fence = { ch, len }
      else if (fence.ch === ch && len >= fence.len) fence = null
    }
    const isHeading = !startsInFence && /^#{1,6}\s/.test(block)
    // Recovery: a malformed (never-closed) fence would otherwise pull the whole
    // rest of the article into one giant message — force a split past a hard cap.
    const recover = startsInFence && cur.length >= targetChars * 6
    if (cur && (recover || (!startsInFence && (isHeading || cur.length >= targetChars)))) {
      chunks.push(cur.trim())
      cur = ''
    }
    cur = cur ? `${cur}\n\n${block}` : block
  }
  if (cur.trim()) chunks.push(cur.trim())
  if (chunks.length <= maxChunks) return chunks
  // Never drop content: fold the tail into the last message (rare with maxChunks=14).
  const head = chunks.slice(0, maxChunks - 1)
  head.push(chunks.slice(maxChunks - 1).join('\n\n'))
  return head
}

export function escapeHtml(value: string) {
  // Highlighted source is inserted as HTML; never let source text create tags.
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}


export function highlightMarkdownLine(line: string, _baseUrl?: string) {
  if (line.trim() === '') return ' '
  const escaped = escapeHtml(line)
  if (/^\s*#{1,6}\s/.test(line)) return `<span class="tok-heading">${escaped}</span>`
  if (/^\s*>/.test(line)) return `<span class="tok-quote">${escaped}</span>`
  if (/^\s*\|/.test(line)) return `<span class="tok-table">${escaped}</span>`
  let html = escaped
  // Source links stay highlighted text, including cached online documents.
  html = html.replace(
    /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text: string, url: string) =>
      `<span class="tok-link">[${text}]</span><span class="tok-link-url">(${url})</span>`,
  )
  html = html.replace(/\*\*([^*]+)\*\*/g, '<span class="tok-strong">**$1**</span>')
  html = html.replace(/`([^`]+)`/g, '<span class="tok-code">`$1`</span>')
  html = html.replace(/^(\s*[-*+]\s)/, '<span class="tok-punct">$1</span>')
  return html
}

export function CodeEditor({ text, baseUrl }: { text: string; baseUrl?: string }) {
  const lines = useMemo(() => text.split('\n'), [text])
  return (
    <div className="code-editor">
      <div className="code-gutter" aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <pre className="code-lines">
        {lines.map((line, i) => (
          <code key={i} dangerouslySetInnerHTML={{ __html: highlightMarkdownLine(line, baseUrl) }} />
        ))}
      </pre>
    </div>
  )
}

export function WindowButtons() {
  return (
    <div className="win-buttons" aria-hidden="true">
      <span className="win-btn">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span className="win-btn">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span className="win-btn win-close">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1" />
          <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
    </div>
  )
}

export const wordTabs = [
  'File',
  'Home',
  'Insert',
  'Draw',
  'Design',
  'Layout',
  'References',
  'Mailings',
  'Review',
  'View',
  'Help',
]

export function MsTitleBar({ fileName, app, accent }: { fileName: string; app: string; accent: string }) {
  const logo =
    app === 'Word' ? <WordLogo size={18} /> : app === 'Excel' ? <ExcelLogo size={18} /> : null
  return (
    <div className="ms-titlebar" style={{ background: accent }}>
      <div className="ms-qat">
        {logo}
        <span className="ms-autosave" title={lang === 'zh' ? '自动保存' : 'AutoSave'}>
          <span className="ms-autosave-track">
            <span className="ms-autosave-knob" />
          </span>
          {lang === 'zh' ? '自动保存' : 'AutoSave'}
        </span>
        <button type="button" aria-label={lang === 'zh' ? '保存' : 'Save'}>
          <Save20Regular />
        </button>
        <button type="button" aria-label={lang === 'zh' ? '撤销' : 'Undo'}>
          <ArrowUndo20Regular />
        </button>
        <button type="button" aria-label={lang === 'zh' ? '重做' : 'Redo'}>
          <ArrowRedo20Regular />
        </button>
      </div>
      <div className="ms-doctitle">
        <span className="ms-doctitle-name">{fileName}</span>
        <span className="ms-doctitle-sub">{lang === 'zh' ? '已保存到 OneDrive' : 'Saved to OneDrive'}</span>
      </div>
      <div className="ms-search">
        <Search20Regular />
        <span>{lang === 'zh' ? '搜索' : 'Search'}</span>
        <span className="ms-search-kbd">Alt+Q</span>
      </div>
      <div className="ms-titlebar-right">
        <span className="ms-account">{aliasInitial()}</span>
        <WindowButtons />
      </div>
    </div>
  )
}

// The Comments / Share cluster pinned to the right edge of the ribbon tab strip.
export function MsRibbonRight() {
  return (
    <>
      <span className="ms-tabs-cmd">{lang === 'zh' ? '批注' : 'Comments'}</span>
      <span className="ms-tabs-share">{lang === 'zh' ? '共享 ▾' : 'Share ▾'}</span>
    </>
  )
}

const MS_TABS_ZH: Record<string, string> = {
  File: '文件', Home: '开始', Insert: '插入', Draw: '绘图', Design: '设计',
  Layout: '布局', References: '引用', Mailings: '邮件', Review: '审阅',
  View: '视图', Help: '帮助', 'Page Layout': '页面布局', Formulas: '公式',
  Data: '数据', Automate: '自动化',
}

export function MsRibbonTabs({
  tabs,
  active,
  accent,
  right,
}: {
  tabs: string[]
  active: number
  accent: string
  right?: ReactNode
}) {
  return (
    <div className="ms-ribbon-tabs" style={{ background: accent }}>
      {tabs.map((tab, i) => (
        <span
          key={tab}
          className={i === active ? 'is-active' : i === 0 ? 'ms-file-tab' : undefined}
          data-appmenu={i === 0 ? 'file' : undefined}
        >
          {lang === 'zh' ? MS_TABS_ZH[tab] ?? tab : tab}
        </span>
      ))}
      {right && <div className="ms-tabs-right">{right}</div>}
    </div>
  )
}

// The full Word window (title bar + ribbon + ruler + status), reused by both the
// article skin and the Word home so they share one chrome.
export function WordFrame({
  fileName,
  statusWords,
  children,
}: {
  fileName: string
  statusWords?: number
  children: ReactNode
}) {
  return (
    <div className="msapp word">
      <MsTitleBar fileName={fileName} app="Word" accent="#2b579a" />
      <MsRibbonTabs tabs={wordTabs} active={1} accent="#2b579a" right={<MsRibbonRight />} />
      <div className="ms-ribbon word-ribbon">
        <div className="ms-group">
          <div className="ms-row">
            <button type="button" className="ms-btn-lg">
              <ClipboardPaste24Regular />
              <span>{lang === 'zh' ? '粘贴' : 'Paste'}</span>
            </button>
            <div className="ms-col">
              <button type="button" className="ms-btn-row">
                <Cut20Regular /> {lang === 'zh' ? '剪切' : 'Cut'}
              </button>
              <button type="button" className="ms-btn-row">
                <Copy20Regular /> {lang === 'zh' ? '复制' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="ms-group-name">{lang === 'zh' ? '剪贴板' : 'Clipboard'}</div>
        </div>

        <div className="ms-group">
          <div className="ms-col">
            <div className="ms-row ms-font-row">
              <span className="ms-fontbox">{lang === 'zh' ? 'Aptos (正文)' : 'Aptos (Body)'}</span>
              <span className="ms-sizebox">11</span>
            </div>
            <div className="ms-row">
              <button type="button" className="ms-btn-sm">
                <TextBold20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextItalic20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextUnderline20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextStrikethrough20Regular />
              </button>
              <button type="button" className="ms-btn-sm ms-btn-hl">
                <Highlight20Regular />
              </button>
              <button type="button" className="ms-btn-sm ms-btn-color">
                <TextColor20Regular />
              </button>
            </div>
          </div>
          <div className="ms-group-name">{lang === 'zh' ? '字体' : 'Font'}</div>
        </div>

        <div className="ms-group">
          <div className="ms-col">
            <div className="ms-row">
              <button type="button" className="ms-btn-sm">
                <TextBulletList20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextNumberListLtr20Regular />
              </button>
            </div>
            <div className="ms-row">
              <button type="button" className="ms-btn-sm">
                <TextAlignLeft20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextAlignCenter20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextAlignRight20Regular />
              </button>
              <button type="button" className="ms-btn-sm">
                <TextAlignJustify20Regular />
              </button>
            </div>
          </div>
          <div className="ms-group-name">{lang === 'zh' ? '段落' : 'Paragraph'}</div>
        </div>

        <div className="ms-group ms-group-grow">
          <div className="ms-styles">
            {(lang === 'zh' ? ['正文', '无间距', '标题 1', '标题 2', '标题'] : ['Normal', 'No Spacing', 'Heading 1', 'Heading 2', 'Title']).map((s, i) => (
              <span key={s} className={i === 0 ? 'ms-style is-active' : 'ms-style'}>
                {s}
              </span>
            ))}
          </div>
          <div className="ms-group-name">{lang === 'zh' ? '样式' : 'Styles'}</div>
        </div>

        <div className="ms-group">
          <div className="ms-col">
            <button type="button" className="ms-btn-row">
              <Search20Regular /> {lang === 'zh' ? '查找' : 'Find'}
            </button>
            <button type="button" className="ms-btn-row">
              {lang === 'zh' ? '替换' : 'Replace'}
            </button>
            <button type="button" className="ms-btn-row">
              {lang === 'zh' ? '选择' : 'Select'}
            </button>
          </div>
          <div className="ms-group-name">{lang === 'zh' ? '编辑' : 'Editing'}</div>
        </div>
      </div>
      <div className="word-ruler" aria-hidden="true" />
      <div className="paper-canvas">{children}</div>
      <div className="ms-status word-status">
        <span>{lang === 'zh' ? '页面：1/4' : 'Page 1 of 4'}</span>
        <span>{lang === 'zh' ? `字数：${statusWords ?? 0}` : `${statusWords ?? 0} words`}</span>
        <span>{WORD_STATUS_LANG[lang] ?? 'English (US)'}</span>
        <span className="ms-status-right">100%</span>
      </div>
    </div>
  )
}

// Word shows the proofing language of the document — an English status bar
// under a Chinese document is a quiet giveaway. Keyed by UI language.
const WORD_STATUS_LANG: Record<string, string> = {
  en: 'English (US)',
  zh: '中文(中国)',
  es: 'Español (España)',
  hi: 'हिन्दी (भारत)',
  ar: 'العربية',
  pt: 'Português (Brasil)',
  ru: 'Русский (Россия)',
  ja: '日本語',
  fr: 'Français (France)',
  de: 'Deutsch (Deutschland)',
}
