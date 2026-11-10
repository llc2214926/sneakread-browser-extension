// Claude Code skin — a full-screen macOS terminal window running the Claude
// Code CLI. The article is disguised as the assistant's answer to a "read this
// URL" request: welcome banner, a user prompt, a Fetch() tool call, then the
// full text streamed back. Chrome follows the selected interface language.
import './style.css'
import type { DocumentRecord } from '../../core/types'
import type { SkinDefinition } from '../types'
import { articleBody, getSiteLabel } from '../../core/content'
import { MarkdownContent, SkinSwitcher } from '../shared'
import { lang } from '../../i18n'

// Claude's spark mark: a white starburst on the clay-orange rounded tile.
// Rays alternate long/short with a slight taper so it reads as the brand's
// hand-drawn asterisk rather than a geometric star.
const SPARK_RAYS = [
  { deg: 0, len: 19 },
  { deg: 44, len: 16.5 },
  { deg: 90, len: 19 },
  { deg: 136, len: 16.5 },
  { deg: 180, len: 19 },
  { deg: 224, len: 16.5 },
  { deg: 270, len: 19 },
  { deg: 316, len: 16.5 },
]
function sparkRay(len: number) {
  const mid = (len * -0.62).toFixed(1)
  const low = (len * -0.28).toFixed(1)
  return `M0 ${-len} C2.7 ${mid} 3.3 ${low} 0 0 C-3.3 ${low} -2.7 ${mid} 0 ${-len} Z`
}
function ClaudeCodeLogo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#d97757" />
      <g fill="#fff" transform="translate(32 32)">
        {SPARK_RAYS.map((r) => (
          <path key={r.deg} transform={`rotate(${r.deg})`} d={sparkRay(r.len)} />
        ))}
      </g>
    </svg>
  )
}

// Session started "a while ago" — derived from now so the clock never lies.
// (Kept dynamic per project rule #7; currently only used to seed plausible
// session-age numbers, never rendered as a wall-clock time.)
function sessionMinutes() {
  return 9 + (new Date().getMinutes() % 17)
}

// The title-bar geometry must match the actual window, or a fullscreen
// terminal claiming "132×40" gives the game away. Cascadia Code at 13px has a
// ~7.8px advance; line-height 1.5 → 19.5px rows; 28px title bar.
function termSize() {
  if (typeof window === 'undefined') return { cols: 132, rows: 40 }
  return {
    cols: Math.max(80, Math.round((window.innerWidth - 40) / 7.8)),
    rows: Math.max(24, Math.round((window.innerHeight - 28) / 19.5)),
  }
}

function Surface({ doc }: { doc: DocumentRecord }) {
  const body = articleBody(doc)
  const zh = lang === 'zh'
  const host = getSiteLabel(doc.sourceUrl)
  const project = (doc.projectName || 'workspace').toLowerCase()
  const words = doc.summary.words
  const links = doc.summary.links
  // A plausible context meter: ~200k window, minus system+session overhead
  // (scaled by how long this session has "been running"), minus the article.
  const tokensUsed = 14000 + sessionMinutes() * 260 + Math.round(words * 1.4)
  const contextLeft = Math.max(12, Math.min(93, Math.round(((200000 - tokensUsed) / 200000) * 100)))
  const { cols, rows } = termSize()

  return (
    <div className="claude-code">
      {/* macOS unified title bar — the whole bar is the menu mount, not just
          the small centered title (a target nobody discovers). */}
      <header className="cc-titlebar" data-appmenu="file">
        <div className="cc-lights" aria-hidden="true">
          <span className="cc-light cc-light-red" />
          <span className="cc-light cc-light-yellow" />
          <span className="cc-light cc-light-green" />
        </div>
        <div className="cc-title">
          {project} — claude — {cols}×{rows}
        </div>
        <div className="cc-titlebar-end" aria-hidden="true" />
      </header>

      {/* scrollback */}
      <div className="cc-term">
        <div className="cc-cols">
          <SkinSwitcher className="cc-switch" />

          <div className="cc-welcome">
            <div className="cc-welcome-head">
              <span className="cc-spark">✻</span> {zh ? '欢迎使用 ' : 'Welcome to '}<b>Claude Code</b>!
            </div>
            <div className="cc-welcome-sub">{zh ? '/help 查看帮助，/status 查看当前设置' : '/help for help, /status for your current setup'}</div>
            <div className="cc-welcome-sub">
              {zh ? '当前目录: ' : 'cwd: '}<span className="cc-welcome-cwd">~/projects/{project}</span>
            </div>
          </div>

          <div className="cc-user">
            <span className="cc-user-caret">&gt;</span> {zh ? `阅读 ${host} 并提供全文` : `read ${host} and give me the full text`}
          </div>

          <div className="cc-tool">
            <div className="cc-tool-head">
              <span className="cc-dot cc-dot-green">⏺</span>{' '}
              <b className="cc-tool-name">Fetch</b>
              <span className="cc-tool-arg">({host})</span>
            </div>
            <div className="cc-tool-result">
              <span className="cc-elbow">⎿</span>
              <span>
                200 OK · {words.toLocaleString('en-US')} {zh ? '字' : 'words'} · {links.toLocaleString('en-US')}{' '}
                {zh ? '个链接' : 'links'}
              </span>
            </div>
          </div>

          <div className="cc-lead">
            <span className="cc-dot">⏺</span> {zh ? '以下是文章全文：' : 'Here’s the full article:'}
          </div>

          <article className="cc-article">
            <h1 className="cc-article-title">{doc.title}</h1>
            <div className="cc-md">
              <MarkdownContent markdown={body} baseUrl={doc.sourceUrl} />
            </div>
          </article>

          <div className="cc-lead cc-done">
            <span className="cc-dot">⏺</span> {zh ? '已完成。还有什么想让我深入了解的吗？' : 'Done. Anything else you’d like me to dig into?'}
          </div>
        </div>
      </div>

      {/* pinned prompt + status line */}
      <footer className="cc-composer">
        <div className="cc-inputbox">
          <span className="cc-prompt">&gt;</span>
          <span className="cc-cursor" aria-hidden="true" />
          <span className="cc-placeholder">{zh ? '试试“总结要点”' : 'Try "summarize the key points"'}</span>
        </div>
        <div className="cc-statusline">
          {/* "? for shortcuts" is the terminal's natural help affordance — a
              second, semantically obvious mount for the real menu. */}
          <span data-appmenu="file" className="cc-shortcuts">
            {zh ? '? 查看快捷键' : '? for shortcuts'}
          </span>
          <span className="cc-status-right">claude-fable-5 · {contextLeft}% {zh ? '剩余上下文' : 'context left'}</span>
        </div>
      </footer>
    </div>
  )
}

const claudeCode: SkinDefinition = {
  id: 'claude-code',
  label: 'Claude Code',
  appName: 'Claude Code',
  fileExtension: 'md',
  accent: '#d97757',
  faviconGlyph: '✳',
  Surface,
  Logo: ClaudeCodeLogo,
}
export default claudeCode
