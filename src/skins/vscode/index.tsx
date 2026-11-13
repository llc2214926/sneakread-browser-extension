import { useMemo, useState } from 'react'
import type { DocumentRecord } from '../../core/types'
import type { SkinDefinition } from '../types'
import { articleBody } from '../../core/content'
import { Codicon, MarkdownContent, CodeEditor, SkinSwitcher } from '../shared'
import { VscodeLogo } from '../../logos'
import { lang } from '../../i18n'
import { ChevronDown, ChevronRight } from 'lucide-react'


// ===== BLOCK APPENDED BELOW =====
const vscMenus = ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help']
const vscMenusZh = ['文件', '编辑', '选择', '查看', '转到', '运行', '终端', '帮助']

export function VscMenuBar() {
  return (
    <div className="vsc-menubar">
      <span className="vsc-menubar-brand">
        <VscodeLogo size={17} />
      </span>
      {vscMenus.map((item, index) => (
        <span
          key={item}
          className={item === 'File' ? 'is-clickable' : undefined}
          data-appmenu={item === 'File' ? 'file' : undefined}
        >
          {lang === 'zh' ? vscMenusZh[index] : item}
        </span>
      ))}
    </div>
  )
}

export function ActivityBar() {
  return (
    <div className="vsc-activity">
      <button type="button" className="vsc-act is-active" aria-label={lang === 'zh' ? '资源管理器' : 'Explorer'}>
        <Codicon name="files" size={24} />
      </button>
      <button type="button" className="vsc-act" aria-label={lang === 'zh' ? '搜索' : 'Search'}>
        <Codicon name="search" size={24} />
      </button>
      <button type="button" className="vsc-act" aria-label={lang === 'zh' ? '源代码管理' : 'Source Control'}>
        <Codicon name="source-control" size={24} />
        <span className="vsc-act-badge">1</span>
      </button>
      <button type="button" className="vsc-act" aria-label={lang === 'zh' ? '运行和调试' : 'Run and Debug'}>
        <Codicon name="debug-alt" size={24} />
      </button>
      <button type="button" className="vsc-act" aria-label={lang === 'zh' ? '扩展' : 'Extensions'}>
        <Codicon name="extensions" size={24} />
      </button>
      <button type="button" className="vsc-act vsc-act-bottom" aria-label={lang === 'zh' ? '账户' : 'Accounts'}>
        <Codicon name="account" size={24} />
      </button>
      <button type="button" className="vsc-act" aria-label={lang === 'zh' ? '设置' : 'Settings'}>
        <Codicon name="settings-gear" size={24} />
      </button>
    </div>
  )
}

// Easter-egg files a curious user can click in the Explorer. They open in the
// code editor just like a real source file — in-character dev humor that also
// teaches the app's hidden controls. Localized: a Chinese reader finding
// English-only jokes is its own disguise break.
const vscodeEggsZh: Record<string, string> = {
  'README.md': `# SneakRead · 摸鱼

在工位上阅读网页，伪装成你本来就开着的那些软件。

## 为什么
因为"我在看文档"这句话，应该更经常是真的。

## 怎么用
1. 打开允许跨域的网站，或从扩展阅读器打开网址。
2. 挑一个伪装——VS Code、Word、飞书、Notion、钉钉、Excel……
3. 有人走过来的瞬间，按 \`Esc\`。

## 说明
- 界面资源全部内嵌，网页正文在本机解析。
- 网址请求直接发给目标网站，不使用第三方中转，受 CORS 限制。

MIT 开源。现在，去读点什么吧。`,
  'FAQ.md': `# 摸鱼 — 常见问题

## 这算摸鱼吗？
这算*阅读*。你已经盯着同一个工单发呆 40 分钟了——读点东西反而更诚实。

## 老板能看出来吗？
除非他有凑近读 Markdown 源码的爱好。他走近时按 **Esc**，屏幕瞬间变成 Q3 预算表。

## 会上传我的数据吗？
没有后端。网页正文只保留在当前标签页会话中，刷新或关闭后清除。

## 开大会用哪个伪装最好？
Excel。没人敢打断一个对着表格皱眉的人。`,
  'TODO.md': `# TODO

- [x] 打开电脑
- [x] 摆出专注的表情
- [x] 再读一篇（就一篇）
- [ ] 回复那封邮件
- [ ] 正经工作
- [x] 续杯咖啡
- [ ] 别再刷世界杯了   <- 世界杯而已，不怪我`,
  '.secrets.md': `# 你发现了秘密文件

直觉不错。这里是没人告诉你的：

- **Esc** —— 一键切成预算表，再按一次切回来。
- **Cmd/Ctrl + K** —— 打开命令面板，打开网址。
- 预览中的链接在阅读器内打开，图片点击后加载；源码页仍显示 Markdown 原文。
- **文件**菜单是真的：语言、外观、失焦自动隐藏，都在里面。

好了，装作无事发生。

---

_SneakRead 是真开源（MIT）——这年头不多了。点个 star：_
_https://github.com/SneakRead/sneakread_`,
}

const vscodeEggsEn: Record<string, string> = {
  'README.md': `# SneakRead

Read web pages at your desk, disguised as the tools you already have open.

## Why
Because "I'm reading the docs" should be true more often.

## How
1. Open a CORS-enabled website, or open a URL from the extension reader.
2. Pick a disguise — VS Code, Word, Google Docs, Notion, Slack, Lark, Excel, Outlook.
3. Press \`Esc\` the instant someone walks by.

## Notes
- All app resources are embedded; page text is parsed locally.
- Requests go directly to the target website without a proxy; CORS still applies.

MIT licensed. Now go read something.`,
  'FAQ.md': `# SneakRead — FAQ

## Is this cheating?
It's *reading*. You've been staring at the same ticket for 40 minutes — this is
more honest.

## Can my boss tell?
Only if they read Markdown source for fun. Press **Esc** if they approach and the
screen flips to a Q3 budget spreadsheet instantly.

## Does it phone home?
No backend. Articles stay in this tab's session and are cleared on reload or close.

## Best disguise for a big meeting?
Excel. Nobody interrupts someone frowning at a spreadsheet.`,
  'TODO.md': `# TODO

- [x] Open laptop
- [x] Look focused
- [x] Read one (1) more article
- [ ] Reply to that email
- [ ] Actual work
- [x] Refill coffee
- [ ] Stop refreshing r/soccer   <- World Cup, not my fault`,
  '.secrets.md': `# You found the secrets file

Nice instinct. Here's what nobody tells you:

- **Esc** — panic button. Instant budget spreadsheet.
- **Cmd/Ctrl + K** — open commands to open a URL.
- Preview links open inside the reader; images load when clicked. Source view remains literal Markdown.
- The **File** menu is real: language, disguise, boss auto-hide — all in there.

Now act natural.

---

_SneakRead is open source (MIT) — genuinely, which is rare. Star it:_
_https://github.com/SneakRead/sneakread_`,
}

const vscodeEggs = lang === 'zh' ? vscodeEggsZh : vscodeEggsEn

// Approximate VS Code's default (Seti) file-icon theme: a per-extension glyph
// with the theme's signature colors, so the tree reads like the real Explorer.
function treeIconName(name: string) {
  if (/\.tsx?$/.test(name)) return 'file-code'
  if (/\.json$/.test(name)) return 'json'
  if (/\.md$/.test(name)) return 'markdown'
  return 'file'
}
function treeIconColor(name: string) {
  if (/\.tsx?$/.test(name)) return '#4d9fd6'
  if (/\.json$/.test(name)) return '#e0c53d'
  if (/\.md$/.test(name)) return '#6a9fb5'
  return '#9aa0a6'
}

function buildVscodeFiles(doc: DocumentRecord) {
  const sourceFile = doc.fileName.endsWith('.md') ? doc.fileName : 'source.md'
  return [
    { name: 'README.md', level: 0, egg: 'README.md' },
    { name: 'FAQ.md', level: 0, egg: 'FAQ.md' },
    { name: 'src', level: 0, folder: true },
    { name: sourceFile, level: 1, active: true },
    { name: 'index.ts', level: 1 },
    { name: 'reader.ts', level: 1 },
    { name: 'data', level: 0, folder: true },
    { name: 'links.json', level: 1 },
    { name: 'meta.json', level: 1 },
    { name: 'TODO.md', level: 0, egg: 'TODO.md' },
    { name: '.secrets.md', level: 0, egg: '.secrets.md' },
    { name: 'package.json', level: 0 },
    { name: 'tsconfig.json', level: 0 },
  ] as { name: string; level: number; active?: boolean; folder?: boolean; egg?: string }[]
}

export function VscodeSkin({ doc }: { doc: DocumentRecord }) {
  const sourceFile = doc.fileName.endsWith('.md') ? doc.fileName : 'source.md'
  const body = articleBody(doc)
  // Start in preview so article links and image controls are available immediately.
  const [view, setView] = useState<'code' | 'preview'>('preview')
  // An open easter-egg file (README/FAQ/TODO/secrets) shown in the editor
  // instead of the article; null = the article itself.
  const [openEgg, setOpenEgg] = useState<string | null>(null)
  const files = buildVscodeFiles(doc)
  const eggBody = openEgg ? vscodeEggs[openEgg] : null
  const openSource = () => setOpenEgg(null)
  const outline = useMemo(() => {
    const matches = Array.from(body.matchAll(/^(#{1,4})\s+(.+)$/gm))
    if (!matches.length) return [{ title: lang === 'zh' ? '概览' : 'Overview', line: 1, level: 1 }]
    return matches.slice(0, 60).map((match) => ({
      title: match[2].replace(/\s+#+$/, '').trim(),
      line: body.slice(0, match.index ?? 0).split('\n').length,
      level: match[1].length,
    }))
  }, [body])
  const terminal = [
    `$ open "${doc.fileName}"`,
    lang === 'zh' ? '正文已在本机解析；界面资源全部内嵌' : 'Content parsed locally; all app resources embedded',
    lang === 'zh'
      ? `✓ 已解析 ${doc.summary.words} 字 · ${doc.summary.links} 个链接 · ${doc.summary.images} 张图片`
      : `✓ parsed ${doc.summary.words} words · ${doc.summary.links} links · ${doc.summary.images} images`,
    lang === 'zh' ? '单文件阅读器已就绪' : 'Single-file reader ready',
  ]

  return (
    <div className="vsc">
      <VscMenuBar />
      <div className="vsc-body">
        <ActivityBar />
        <aside className="vsc-side">
          <div className="vsc-side-title">
            {lang === 'zh' ? '资源管理器' : 'EXPLORER'}
            <span>⋯</span>
          </div>
          <div className="vsc-tree-group">
            <div className="vsc-tree-head">
              <ChevronDown size={13} aria-hidden="true" /> {lang === 'zh' ? '打开的编辑器' : 'OPEN EDITORS'}
            </div>
            <button type="button" className="vsc-file is-active" style={{ paddingLeft: 24 }}>
              <Codicon name="markdown" size={16} />
              <span>{sourceFile}</span>
              <em className="dot" />
            </button>
          </div>
          <div className="vsc-tree-group">
            <div className="vsc-tree-head">
              <Codicon name="chevron-down" size={16} /> {doc.projectName.toUpperCase()}
            </div>
            {files.map((file) => {
              const isActive = file.egg ? openEgg === file.egg : file.active && !openEgg
              return (
              <button
                key={`${file.level}-${file.name}`}
                type="button"
                className={isActive ? 'vsc-file is-active' : 'vsc-file'}
                style={{ paddingLeft: 16 + file.level * 14 }}
                onClick={
                  file.egg
                    ? () => {
                        setOpenEgg(file.egg as string)
                        setView('code')
                      }
                    : file.active
                      ? openSource
                      : undefined
                }
              >
                {file.folder ? (
                  <Codicon name="chevron-right" size={16} />
                ) : (
                  <span className="vsc-ficon" style={{ color: treeIconColor(file.name) }}>
                    <Codicon name={treeIconName(file.name)} size={16} />
                  </span>
                )}
                <span>{file.name}</span>
                {isActive && <em className="dot" />}
              </button>
              )
            })}
          </div>
          <div className="vsc-tree-group">
            <div className="vsc-tree-head">
              <ChevronDown size={13} aria-hidden="true" /> {lang === 'zh' ? '大纲' : 'OUTLINE'}
            </div>
            {outline.slice(0, 24).map((item) => (
              <button
                key={`${item.line}-${item.title}`}
                type="button"
                className="vsc-outline"
                style={{ paddingLeft: 20 + (item.level - 1) * 12 }}
              >
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="vsc-editor">
          <div className="vsc-tabs">
            <button
              type="button"
              className={view === 'code' && !openEgg ? 'vsc-tab is-active' : 'vsc-tab'}
              onClick={() => {
                openSource()
                setView('code')
              }}
            >
              <Codicon name="markdown" size={16} />
              {sourceFile}
              <em className="dot" />
            </button>
            <button
              type="button"
              className={view === 'preview' && !openEgg ? 'vsc-tab is-active' : 'vsc-tab'}
              onClick={() => {
                openSource()
                setView('preview')
              }}
            >
              <Codicon name="preview" size={16} />
              {lang === 'zh' ? '预览' : 'Preview'} {sourceFile}
            </button>
            {openEgg && (
              <button type="button" className="vsc-tab is-active">
                <Codicon name="markdown" size={16} />
                {openEgg}
                <em
                  className="vsc-tab-close"
                  role="button"
                  aria-label={lang === 'zh' ? '关闭' : 'Close'}
                  onClick={(event) => {
                    event.stopPropagation()
                    openSource()
                  }}
                >
                  ×
                </em>
              </button>
            )}
            <div className="vsc-tab-actions">
              <button type="button" aria-label={lang === 'zh' ? '运行' : 'Run'}>
                <Codicon name="play" size={16} />
              </button>
              <button
                type="button"
                aria-label={lang === 'zh' ? '切换预览' : 'Toggle preview'}
                onClick={() => setView((v) => (v === 'code' ? 'preview' : 'code'))}
              >
                <Codicon name="split-horizontal" size={16} />
              </button>
              <span aria-hidden="true">⋯</span>
            </div>
          </div>
          <div className="vsc-breadcrumb">
            <span>{doc.projectName}</span>
            <ChevronRight size={12} aria-hidden="true" />
            {openEgg ? (
              <span>{openEgg}</span>
            ) : (
              <>
                <span>src</span>
                <ChevronRight size={12} aria-hidden="true" />
                <span>{sourceFile}</span>
              </>
            )}
          </div>
          <div className="vsc-editor-scroll">
            {view === 'code' ? (
              <CodeEditor text={eggBody ?? body} baseUrl={openEgg ? undefined : doc.sourceUrl} />
            ) : (
              <div className="vsc-render markdown-body">
                {!openEgg && <SkinSwitcher className="vsc-switch" />}
                {!openEgg && <h1>{doc.title}</h1>}
                <MarkdownContent markdown={eggBody ?? body} baseUrl={openEgg ? undefined : doc.sourceUrl} />
              </div>
            )}
          </div>
          <div className="vsc-panel">
            <div className="vsc-panel-tabs">
              <button type="button">{lang === 'zh' ? '问题' : 'PROBLEMS'}</button>
              <button type="button">{lang === 'zh' ? '输出' : 'OUTPUT'}</button>
              <button type="button" className="is-active">
                <Codicon name="terminal" size={14} /> {lang === 'zh' ? '终端' : 'TERMINAL'}
              </button>
              <button type="button">{lang === 'zh' ? '端口' : 'PORTS'}</button>
            </div>
            <pre className="vsc-terminal">{terminal.join('\n')}</pre>
          </div>
        </section>
      </div>

      <div className="vsc-status">
        <span className="vsc-status-remote">
          <Codicon name="remote" size={14} />
        </span>
        <span className="vsc-status-accent">
          <Codicon name="git-branch" size={13} /> main
        </span>
        <span>
          <Codicon name="sync" size={13} /> 0↓ 0↑
        </span>
        <span>
          <Codicon name="error" size={13} /> 0 <Codicon name="warning" size={13} /> 0
        </span>
        <span className="vsc-status-right">{lang === 'zh' ? '行 1，列 1' : 'Ln 1, Col 1'}</span>
        <span>{lang === 'zh' ? '空格: 2' : 'Spaces: 2'}</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>
          Markdown <Codicon name="check" size={13} />
        </span>
        <span>
          <Codicon name="bell" size={13} />
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Word
 * ------------------------------------------------------------------ */



/* ------------------------------------------------------------------ *
 * Google Docs
 * ------------------------------------------------------------------ */


const vscode: SkinDefinition = {
  id: 'vscode',
  label: 'VS Code',
  appName: 'Visual Studio Code',
  fileExtension: 'md',
  accent: '#007acc',
  faviconGlyph: '<>',
  Surface: VscodeSkin,
}
export default vscode
