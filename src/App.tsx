import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { t, lang, isRtl, langKey, LANG_NAMES, LANG_NAMES_ZH, ALL_LANGS, type Lang } from './i18n'
import { DEFAULT_SKIN_ID } from './config/defaults'
import type { DocumentRecord, SkinId } from './core/types'
import { panicDocumentId } from './core/types'
import { headingId, samePageFragment, summarizeMarkdown } from './core/content'
import { normalizeWebUrl, readWebsite } from './core/web-read'
import { getAlias, setAlias } from './core/alias'
import { WordFrame } from './skins/shared'
import { ExcelBudgetSkin } from './skins/excel'
import { VscMenuBar, ActivityBar } from './skins/vscode'
import { getSkin, skins, skinById, SkinBrandLogo } from './skins'
import { SkinControlsProvider } from './skins/controls'
import { skinLabel, skinAppName } from './skins/labels'
import './assets/icons.css'
import './App.css'

const zh = lang === 'zh'
const extensionPage = window.location.protocol === 'chrome-extension:'
const label = {
  title: zh ? '单文件阅读器，联网读网页' : 'One file. Read the web.',
  intro: extensionPage
    ? (zh ? '界面资源随扩展安装；输入网址后扩展会在后台打开目标网站，等待页面脚本渲染，再在本机提取正文，不调用第三方抓取服务。会沿用当前浏览器的登录状态。' : 'App resources are packaged with the extension. Enter a URL and it will open the target in a background tab, wait for its scripts to render, then extract text locally without third-party reader services. Your current browser login state is used.')
    : (zh ? '界面资源全部内嵌；输入网址后直接连接目标网站，在本机提取正文，不调用第三方抓取服务。遇到跨域拦截时，可安装随源码提供的 Chromium 扩展，由扩展代取、仍在本机解析。' : 'All app resources are embedded. Connect directly to a website and extract text locally, without third-party reader services. If CORS blocks the page, install the optional Chromium extension included with the source; it fetches the page and keeps parsing local.'),
  open: zh ? '打开网址' : 'Open URL',
  url: zh ? '网页地址' : 'Website URL',
  webNote: extensionPage
    ? (zh ? '扩展在后台打开网页并等待脚本渲染，沿用当前浏览器登录状态后提取页面 DOM，不调用第三方中转。点击正文链接继续在当前扩展阅读页打开；图片默认不加载，点击图片按钮后加载。验证码、付费墙或需要交互的内容仍可能无法读取。' : 'The extension renders pages in a background tab using your browser session, without a third-party proxy. Article links open inside this reader. Images load only when clicked. CAPTCHA, paywalls, or interactive content may still block reading.')
    : (zh ? '独立 HTML 读取网页受 CORS 限制；可安装 browser-extension 中的扩展并从扩展图标打开阅读器。点击链接在阅读器内继续阅读；图片默认不加载，点击后加载。' : 'Standalone HTML requests require CORS. For other sites, install browser-extension and open it from its toolbar icon. Links stay in the reader; images load only when clicked.'),
  close: zh ? '关闭' : 'Close',
  document: zh ? '网页文档' : 'Web document',
  home: zh ? '返回阅读入口' : 'Back to reader home',
  commands: zh ? '搜索命令…' : 'Search commands…',
  tip: zh ? '文件菜单 / Ctrl 或 ⌘ K：打开网址与切换外观；Esc：预算表遮盖，再按恢复。' : 'File menu / Ctrl or ⌘ K: open URLs and switch apps. Esc: budget sheet; press again to restore.',
  note: zh ? '链接在阅读器内打开，图片需点击后加载。正文仅保留在当前页面会话中，刷新或关闭页面后清除。' : 'Links stay inside the reader; images load only when clicked. Articles stay in this page session and are cleared on reload or close.',
  busy: zh ? '正在读取内容…' : 'Reading content…',
}

function storageGet(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}
function storageRemove(key: string) {
  try { localStorage.removeItem(key); return true } catch { return false }
}
function makeFileName(title: string, skin: SkinId) {
  const clean = title.replace(/[\\/:*?"<>|#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  return `${clean || label.document}.${skinById(skin).extension}`
}
function routeId() {
  const path = window.location.hash.slice(1).split('?')[0].replace(/^\//, '')
  try { return decodeURIComponent(path) } catch { return '' }
}
function documentFor(title: string, markdown: string, skin: SkinId, id: string, raw = markdown): DocumentRecord {
  const now = new Date().toISOString()
  return { id, title, markdown, raw, skin, sourceUrl: `local:${id}`, summary: summarizeMarkdown(markdown),
    fileName: makeFileName(title, skin), fetchedAt: now, lastOpenedAt: now, lastSyncedAt: now,
    projectName: label.document, pageKind: 'article', sizeBytes: new Blob([raw]).size, openCount: 1 }
}
function setFavicon(skin: SkinId) {
  const meta = skinById(skin)
  const glyph = meta.faviconGlyph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${meta.accent}"/><text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="${glyph.length > 1 ? 22 : 30}" font-weight="700" fill="white">${glyph}</text></svg>`
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.append(link) }
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
}
function SkinSurface({ doc }: { doc: DocumentRecord }) {
  if (doc.id === panicDocumentId) return <ExcelBudgetSkin doc={doc} />
  const Surface = getSkin(doc.skin)!.Surface
  return <Surface doc={doc} />
}

type Command = { id: string; title: string; hint?: string; run: () => void }

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className="offline-dialog" aria-label={title} onCancel={(event) => event.preventDefault()} dir={isRtl ? 'rtl' : undefined}>
    <header><strong>{title}</strong><button type="button" onClick={onClose} aria-label={label.close}>×</button></header>
    {children}
  </dialog>
}

function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const items = commands.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = Math.min(index, Math.max(0, items.length - 1))
  const run = (command: Command) => { onClose(); command.run() }
  return <Dialog title={label.commands} onClose={onClose}>
    <div className="offline-search"><Search size={16} aria-hidden="true" /><input autoFocus aria-label={label.commands}
      value={query} placeholder={label.commands} onChange={(e) => { setQuery(e.target.value); setIndex(0) }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(Math.min(selected + 1, items.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(Math.max(selected - 1, 0)) }
        if (e.key === 'Enter' && items[selected]) { e.preventDefault(); run(items[selected]) }
      }} /></div>
    <div className="offline-command-list">
      {!items.length && <p>{t('paletteEmpty')}</p>}
      {items.map((c, i) => <button type="button" key={c.id} className={`offline-command${i === selected ? ' is-active' : ''}`}
        onClick={() => run(c)}><span>{c.title}</span><small>{c.hint}</small></button>)}
    </div>
  </Dialog>
}

function App() {
  const [records, setRecords] = useState<DocumentRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(() => routeId() || null)
  const [homeSkin, setHomeSkin] = useState<SkinId>(() => {
    const saved = storageGet('sneakread-offline-skin')
    return skins.find((s) => s.id === saved)?.id || DEFAULT_SKIN_ID
  })
  const [panic, setPanic] = useState(false)
  const [bossMode, setBossMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [webError, setWebError] = useState('')
  const request = useRef<AbortController | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [, bumpAlias] = useState(0)
  const activeDoc = records.find((doc) => doc.id === activeId) || null
  const skin: SkinId = panic ? 'excel' : activeDoc?.skin || homeSkin
  const homeDoc = useMemo(() => documentFor(zh ? '摸鱼 — 使用入门' : 'SneakRead — Getting started',
    `# ${label.title}\n\n${label.intro}\n\n${label.webNote}\n\n## ${zh ? '使用方法' : 'How to use'}\n\n${label.tip}\n\n${label.note}`, homeSkin, 'home-welcome'), [homeSkin])
  const panicDoc = useMemo(() => documentFor(zh ? 'Q3 预算复盘' : 'Q3 Budget Review',
    zh ? '# Q3 预算复盘\n\n| 部门 | 预算 | 实际 |\n| --- | ---: | ---: |\n| 平台 | 124000 | 119400 |\n| 增长 | 98000 | 101200 |' :
      '# Q3 Budget Review\n\n| Department | Forecast | Actual |\n| --- | ---: | ---: |\n| Platform | 124000 | 119400 |\n| Growth | 98000 | 101200 |', 'excel', panicDocumentId), [])
  const shown = panic ? panicDoc : activeDoc || homeDoc

  useEffect(() => {
    storageRemove('sneakread-documents-v1')
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = `${shown.fileName} - ${skinAppName(skinById(skin), lang)}`
    setFavicon(skin)
  }, [shown, skin])
  useEffect(() => {
    const onHistory = () => {
      setActiveId(routeId() || null); setPanic(false); setMenuAnchor(null)
      request.current?.abort(new Error(zh ? '已取消读取。' : 'Reading cancelled.'))
      setPaletteOpen(false); setUrlOpen(false); setAboutOpen(false)
    }
    window.addEventListener('popstate', onHistory)
    window.addEventListener('hashchange', onHistory)
    return () => { window.removeEventListener('popstate', onHistory); window.removeEventListener('hashchange', onHistory) }
  }, [])

  useEffect(() => () => request.current?.abort(), [])
  const closePanels = () => { setMenuAnchor(null); setPaletteOpen(false); setUrlOpen(false); setAboutOpen(false) }
  const togglePanic = () => { closePanels(); setPanic((value) => !value) }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['k', 'p'].includes(event.key.toLowerCase())) {
        event.preventDefault(); closePanels(); setPanic(false); setPaletteOpen(true)
      } else if (event.key === 'Escape' || ((event.ctrlKey || event.metaKey) && event.key === '.')) {
        event.preventDefault(); togglePanic()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    if (!bossMode) return
    const onBlur = () => { closePanels(); setPanic(true) }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [bossMode])

  const navigate = (id: string | null) => {
    setActiveId(id)
    const hash = id ? `#/${encodeURIComponent(id)}` : '#/'
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
  }
  const changeSkin = (next: SkinId) => {
    setPanic(false); setHomeSkin(next); storageSet('sneakread-offline-skin', next)
    if (activeDoc) setRecords((current) => current.map((doc) => doc.id === activeDoc.id ?
      { ...doc, skin: next, fileName: makeFileName(doc.title, next) } : doc))
  }
  const openUrlDialog = () => { closePanels(); setPanic(false); setWebError(''); setUrlOpen(true) }
  const openUrl = async (input: string) => {
    if (request.current) return
    let url: string
    try { url = normalizeWebUrl(input) }
    catch (cause) { setWebError(cause instanceof Error ? cause.message : String(cause)); return }
    setBusy(true); setWebError(''); setUrlInput(url)
    const selectedSkin = activeDoc?.skin || homeSkin
    const controller = new AbortController()
    request.current = controller
    const timer = window.setTimeout(() => controller.abort(new Error(zh ? '读取超时，请检查网络或目标网站。' : 'Reading timed out. Check your connection or the target website.')), 22_000)
    try {
      const parsed = await readWebsite(url, controller.signal)
      const existing = records.find((doc) => doc.sourceUrl === parsed.sourceUrl)
      const doc = { ...documentFor(parsed.title, parsed.markdown, selectedSkin, existing?.id || crypto.randomUUID(), parsed.raw),
        ...parsed, projectName: new URL(parsed.sourceUrl).hostname }
      setRecords((current) => [doc, ...current.filter((item) => item.id !== doc.id)])
      navigate(doc.id); setUrlOpen(false)
    } catch (cause) { setWebError(cause instanceof Error ? cause.message : String(cause)) }
    finally { window.clearTimeout(timer); request.current = null; setBusy(false) }
  }
  const openWebsite = (event: FormEvent) => {
    event.preventDefault()
    void openUrl(urlInput)
  }
  const setLanguage = (code: Lang) => {
    if (code === lang) return
    if (activeDoc && !window.confirm(zh ? '切换语言会刷新页面并清除当前会话的文章，继续？' : 'Changing language reloads the page and clears articles from this session. Continue?')) return
    if (!storageSet(langKey, code)) { setNotice(zh ? '无法保存语言设置。' : 'Could not save language setting.'); return }
    window.location.reload()
  }
  const copySource = async () => {
    if (!activeDoc) return
    try { await navigator.clipboard.writeText(activeDoc.raw) }
    catch { setNotice(zh ? '浏览器禁止复制，请保留原文。' : 'Clipboard unavailable. Keep the original text.') }
  }
  const commands: Command[] = [
    { id: 'open-url', title: label.open, run: openUrlDialog },
    { id: 'home', title: label.home, run: () => { setHomeSkin(activeDoc?.skin || homeSkin); setPanic(false); navigate(null) } },
    ...skins.map((s) => ({ id: `skin-${s.id}`, title: t('openAs', { app: skinLabel(s, lang) }), run: () => changeSkin(s.id) })),
    ...(activeDoc ? [{ id: 'copy', title: t('cmdCopy'), run: copySource }] : []),
    { id: 'fullscreen', title: t('cmdFullscreen'), run: () => {
      if (document.fullscreenElement) void document.exitFullscreen()
      else void document.documentElement.requestFullscreen().catch(() => setNotice(zh ? '浏览器未允许全屏。' : 'Fullscreen denied.'))
    } },
    { id: 'boss', title: bossMode ? t('bossOn') : t('bossOff'), run: () => setBossMode((value) => !value) },
    { id: 'panic', title: t('cmdPanic'), hint: 'Esc', run: togglePanic },
  ]
  const onStageClick = (event: ReactMouseEvent) => {
    const target = event.target as Element
    const trigger = target.closest?.('[data-appmenu]')
    if (trigger) {
      event.preventDefault()
      const rect = trigger.getBoundingClientRect()
      setMenuAnchor((current) => current ? null : {
        x: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
        y: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight * 0.18 - 8)),
      })
    }
  }
  // Keep article links inside the reader instead of navigating the extension shell.
  const preventNavigation = (event: ReactMouseEvent) => {
    const target = event.target as Element
    const link = target.closest?.('a[href]') as HTMLAnchorElement | null
    if (!link) return
    event.preventDefault()
    if (target.closest('button')) return
    event.stopPropagation()
    if (!link.hasAttribute('data-reader-link') || event.button === 2) return
    const fragment = activeDoc ? samePageFragment(link.href, activeDoc.sourceUrl) : null
    if (activeDoc && fragment !== null) {
      const anchor = fragment ? event.currentTarget.querySelector<HTMLElement>(`#${CSS.escape(fragment)}`) : null
      const top = !fragment || fragment === headingId(activeDoc.title)
      const destination = anchor || (top ? event.currentTarget.querySelector('.skin-switch') : null)
      if (destination) destination.scrollIntoView({ block: 'start' })
      else void openUrl(link.href)
    } else void openUrl(link.href)
  }
  const urlForm = <form className="offline-import" onSubmit={openWebsite}>
      <label>{label.url}<input type="text" inputMode="url" autoComplete="off" spellCheck={false}
        value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://…" /></label>
      <div className="offline-import-actions"><button type="submit" disabled={busy}>{label.open}</button>
        {busy && request.current && <button type="button" onClick={() => request.current?.abort(new Error(zh ? '已取消读取。' : 'Reading cancelled.'))}>{zh ? '取消读取' : 'Cancel'}</button>}</div>
      {busy && request.current && <p role="status">{label.busy}</p>}
      {webError && <p className="welcome-error" role="alert">{webError}</p>}
      <p className="offline-note">{label.webNote}</p>
    </form>
  const welcome = <div className="welcome offline-welcome">
    <div className="welcome-hero"><h1><span className="welcome-brand">{zh ? '摸鱼 · 本地单文件版' : 'SneakRead · Single file'}</span>
      <span className="welcome-tagline">{label.title}</span></h1><p className="welcome-sub">{label.intro}</p>
      {urlForm}<div className="welcome-tip">{label.tip}</div>
      <div className="welcome-apps"><h2 className="welcome-apps-title">{t('homeOpenAs')}</h2><div className="welcome-apps-grid">
        {skins.map((s) => <button type="button" key={s.id} className={`welcome-app${homeSkin === s.id ? ' is-active' : ''}`}
          onClick={() => changeSkin(s.id)}><SkinBrandLogo id={s.id} size={32} /><span className="welcome-app-name">{skinLabel(s, lang)}</span></button>)}
      </div></div>
    </div>
    <footer className="welcome-footer">SneakRead · MIT · {zh ? '本地单文件版' : 'Local single-file edition'}</footer>
  </div>
  return <div className={`stage skin-${skin}${!activeDoc && !panic ? ' home-stage' : ''}`}
    onClick={onStageClick} onClickCapture={preventNavigation} onAuxClickCapture={preventNavigation}>
    <SkinControlsProvider value={{ activeSkin: skin, skins, onSwitchSkin: changeSkin }}>
      {!panic && !activeDoc && homeSkin === 'word' ? <WordFrame fileName={homeDoc.fileName} statusWords={homeDoc.summary.words}>
        <article className="paper welcome-paper markdown-body">{welcome}</article></WordFrame> :
        !panic && !activeDoc && homeSkin === 'vscode' ? <div className="vsc"><VscMenuBar /><div className="vsc-body"><ActivityBar />
          <section className="vsc-editor vsc-editor-welcome"><div className="vsc-tabs"><span className="vsc-tab is-active">{label.document}</span></div>
            <div className="vsc-editor-scroll">{welcome}</div></section></div><div className="vsc-status">UTF-8</div></div> : <SkinSurface key={shown.id} doc={shown} />}
    </SkinControlsProvider>
    {activeDoc && !panic && !urlOpen && (busy || webError) && <div className="offline-notice" role={webError ? 'alert' : 'status'}>
      {busy ? label.busy : webError}
      {busy ? <button type="button" onClick={() => request.current?.abort(new Error(zh ? '已取消读取。' : 'Reading cancelled.'))}>{zh ? '取消读取' : 'Cancel'}</button>
        : <button type="button" onClick={() => setWebError('')} aria-label={label.close}>×</button>}
    </div>}
    {notice && !panic && <div className="offline-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={label.close}>×</button></div>}
    {menuAnchor && <><div className="menu-scrim" onClick={() => setMenuAnchor(null)} />
      <div className="app-menu" style={{ left: menuAnchor.x, top: menuAnchor.y }} dir={isRtl ? 'rtl' : undefined}>
        <button type="button" className="menu-item" onClick={() => { closePanels(); setPaletteOpen(true) }}>{label.commands}<span className="menu-kbd">⌘K</span></button>
        {commands.map((c) => <button type="button" key={c.id} className="menu-item"
          onClick={() => { setMenuAnchor(null); c.run() }}><span>{c.title}</span><span>{c.hint}</span></button>)}
        <div className="menu-sep" /><button type="button" className="menu-item" onClick={() => setLanguageOpen((value) => !value)}>{t('mLanguage')} {languageOpen ? '▾' : '▸'}</button>
        {languageOpen && ALL_LANGS.map((code) => <button type="button" key={code} className="menu-item menu-sub" onClick={() => setLanguage(code)}>
          <span>{(zh ? LANG_NAMES_ZH : LANG_NAMES)[code]}</span>{code === lang && <span>✓</span>}</button>)}
        <button type="button" className="menu-item" onClick={() => {
          setMenuAnchor(null); const next = window.prompt(t('aliasPrompt'), getAlias()); if (next !== null) { setAlias(next); bumpAlias((v) => v + 1) }
        }}>{t('mAlias')}</button>
        <button type="button" className="menu-item" onClick={() => { closePanels(); setAboutOpen(true) }}>{t('mHelp')}</button>
      </div></>}
    {paletteOpen && <CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />}
    {urlOpen && <Dialog title={label.open} onClose={() => setUrlOpen(false)}>{urlForm}</Dialog>}
    {aboutOpen && <Dialog title={label.title} onClose={() => setAboutOpen(false)}><p>{label.intro}</p><p>{label.webNote}</p><p>{label.tip}</p><p>{label.note}</p></Dialog>}
  </div>
}

export default App
