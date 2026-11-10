import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { t, lang, isRtl, langKey, LANG_NAMES, LANG_NAMES_ZH, ALL_LANGS, type Lang } from './i18n'
import { DEFAULT_SKIN_ID } from './config/defaults'
import type { DocumentRecord, SkinId } from './core/types'
import { storageKey, panicDocumentId } from './core/types'
import { summarizeMarkdown } from './core/content'
import { parseLocalContent } from './core/local-import'
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
    ? (zh ? '界面资源随扩展安装；输入网址后扩展会在后台打开目标网站，等待页面脚本渲染，再在本机提取正文，不调用第三方抓取服务。会沿用当前浏览器的登录状态。也可粘贴正文或导入本地文件。' : 'App resources are packaged with the extension. Enter a URL and it will open the target in a background tab, wait for its scripts to render, then extract text locally without third-party reader services. Your current browser login state is used. Pasting text and importing files also work.')
    : (zh ? '界面资源全部内嵌；输入网址后直接连接目标网站，在本机提取正文，不调用第三方抓取服务。遇到跨域拦截时，可安装随源码提供的 Chromium 扩展，由扩展代取、仍在本机解析。也可粘贴正文或导入本地文件。' : 'All app resources are embedded. Connect directly to a website and extract text locally, without third-party reader services. If CORS blocks the page, install the optional Chromium extension included with the source; it fetches the page and keeps parsing local. Pasting text and importing files also work.'),
  open: zh ? '打开网址' : 'Open URL',
  url: zh ? '网页地址' : 'Website URL',
  webNote: extensionPage
    ? (zh ? '扩展在后台打开网页并等待脚本渲染，沿用当前浏览器登录状态后提取页面 DOM，不调用第三方中转。点击正文链接继续在当前扩展阅读页打开；图片默认不加载，点击图片按钮后加载。验证码、付费墙或需要交互的内容仍可能无法读取。' : 'The extension renders pages in a background tab using your browser session, without a third-party proxy. Article links open inside this reader. Images load only when clicked. CAPTCHA, paywalls, or interactive content may still block reading.')
    : (zh ? '独立 HTML 读取网页受 CORS 限制；可安装 browser-extension 中的扩展并从扩展图标打开阅读器。点击链接在阅读器内继续阅读；图片默认不加载，点击后加载。' : 'Standalone HTML requests require CORS. For other sites, install browser-extension and open it from its toolbar icon. Links stay in the reader; images load only when clicked.'),
  paste: zh ? '粘贴正文' : 'Paste text',
  import: zh ? '导入本地文件' : 'Import local file',
  read: zh ? '开始阅读' : 'Start reading',
  text: zh ? '正文（支持 Markdown）' : 'Text (Markdown supported)',
  name: zh ? '标题（可选）' : 'Title (optional)',
  close: zh ? '关闭' : 'Close',
  local: zh ? '本地文档' : 'Local document',
  home: zh ? '返回阅读入口' : 'Back to reader home',
  recent: zh ? '最近阅读' : 'Recent documents',
  commands: zh ? '搜索命令或本地文档…' : 'Search commands or local documents…',
  tip: zh ? '文件菜单 / Ctrl 或 ⌘ K：打开网址、导入与切换外观；Esc：预算表遮盖，再按恢复。' : 'File menu / Ctrl or ⌘ K: open URLs, import and switch apps. Esc: budget sheet; press again to restore.',
  note: zh ? '文件按 UTF-8 读取；HTML 仅提取内容，不执行脚本。链接在阅读器内打开，图片需点击后加载。本地记录不是备份。' : 'Files use UTF-8. Imported HTML scripts never run. Links stay inside the reader; images load only when clicked. Local history is not a backup.',
  busy: zh ? '正在读取内容…' : 'Reading content…',
}

function storageGet(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}
function makeFileName(title: string, skin: SkinId) {
  const clean = title.replace(/[\\/:*?"<>|#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  return `${clean || label.local}.${skinById(skin).extension}`
}
function loadDocuments(): DocumentRecord[] {
  try {
    const saved: unknown = JSON.parse(storageGet(storageKey) || '[]')
    if (!Array.isArray(saved)) return []
    return saved.filter((doc): doc is DocumentRecord => doc && typeof doc === 'object' &&
      typeof doc.id === 'string' && typeof doc.title === 'string' &&
      typeof doc.markdown === 'string' && typeof doc.sourceUrl === 'string').map((doc) => {
      const skin = skins.some((s) => s.id === doc.skin) ? doc.skin : DEFAULT_SKIN_ID
      return { ...doc, skin, raw: typeof doc.raw === 'string' ? doc.raw : doc.markdown,
        fileName: makeFileName(doc.title, skin), summary: summarizeMarkdown(doc.markdown),
        projectName: doc.projectName || label.local, pageKind: doc.pageKind || 'article',
        sizeBytes: doc.sizeBytes || new Blob([doc.markdown]).size, openCount: doc.openCount || 1 }
    })
  } catch { return [] }
}
function routeId() {
  const path = window.location.hash.slice(1).split('?')[0].replace(/^\//, '')
  try { return decodeURIComponent(path) } catch { return '' }
}
function documentFor(title: string, markdown: string, skin: SkinId, id: string, raw = markdown): DocumentRecord {
  const now = new Date().toISOString()
  return { id, title, markdown, raw, skin, sourceUrl: `local:${id}`, summary: summarizeMarkdown(markdown),
    fileName: makeFileName(title, skin), fetchedAt: now, lastOpenedAt: now, lastSyncedAt: now,
    projectName: label.local, pageKind: 'article', sizeBytes: new Blob([raw]).size, openCount: 1 }
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

function ImportForm({ text, title, setText, setTitle, busy, onSubmit, onFile, error }: {
  text: string; title: string; setText: (value: string) => void; setTitle: (value: string) => void
  busy: boolean; onSubmit: (event: FormEvent) => void; onFile: (file: File) => void; error: string
}) {
  return <form className="offline-import" onSubmit={onSubmit}>
    <label>{label.name}<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <label>{label.text}<textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} spellCheck={false}
      placeholder={zh ? '把要阅读的文章粘贴到这里…' : 'Paste the article you want to read…'} /></label>
    <div className="offline-import-actions">
      <button type="submit" disabled={busy}>{label.read}</button>
      <label className="offline-file">{label.import}<input type="file" aria-label={label.import}
        accept=".txt,.md,.markdown,.html,.htm" disabled={busy} onChange={(e) => {
          const file = e.target.files?.[0]; e.target.value = ''; if (file) onFile(file)
        }} /></label>
    </div>
    {busy && <p role="status">{label.busy}</p>}
    {error && <p className="welcome-error" role="alert">{error}</p>}
    <p className="offline-note">{label.note}</p>
  </form>
}

function App() {
  const [records, setRecords] = useState(loadDocuments)
  const [activeId, setActiveId] = useState<string | null>(() => routeId() || null)
  const [homeSkin, setHomeSkin] = useState<SkinId>(() => {
    const saved = storageGet('sneakread-offline-skin')
    return skins.find((s) => s.id === saved)?.id || DEFAULT_SKIN_ID
  })
  const [panic, setPanic] = useState(false)
  const [bossMode, setBossMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [webError, setWebError] = useState('')
  const request = useRef<AbortController | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const importing = useRef(false)
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
    // Never silently drop older documents to fit a storage quota.
    if (!storageSet(storageKey, JSON.stringify(records))) {
      setNotice(zh ? '本地记录保存失败（存储已满或被禁用）。本次仍可阅读，关闭前请保留原文件或正文。' : 'History could not be saved (storage full or disabled). Keep your original file or text before closing.')
    }
  }, [records])
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = `${shown.fileName} - ${skinAppName(skinById(skin), lang)}`
    setFavicon(skin)
  }, [shown, skin])
  useEffect(() => {
    const onHistory = () => {
      setActiveId(routeId() || null); setPanic(false); setMenuAnchor(null)
      setPaletteOpen(false); setImportOpen(false); setAboutOpen(false)
    }
    window.addEventListener('popstate', onHistory)
    window.addEventListener('hashchange', onHistory)
    return () => { window.removeEventListener('popstate', onHistory); window.removeEventListener('hashchange', onHistory) }
  }, [])

  const closePanels = () => { setMenuAnchor(null); setPaletteOpen(false); setImportOpen(false); setAboutOpen(false) }
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
  const openRecord = (doc: DocumentRecord) => {
    closePanels(); setPanic(false); navigate(doc.id)
    setRecords((current) => [{ ...doc, lastOpenedAt: new Date().toISOString(), openCount: doc.openCount + 1 },
      ...current.filter((item) => item.id !== doc.id)])
  }
  const changeSkin = (next: SkinId) => {
    setPanic(false); setHomeSkin(next); storageSet('sneakread-offline-skin', next)
    if (activeDoc) setRecords((current) => current.map((doc) => doc.id === activeDoc.id ?
      { ...doc, skin: next, fileName: makeFileName(doc.title, next) } : doc))
  }
  const openImport = () => { closePanels(); setPanic(false); setError(''); setWebError(''); setImportOpen(true) }
  const addDocument = (raw: string, filename: string, chosenSkin: SkinId, customTitle = '') => {
    const parsed = parseLocalContent(raw, filename)
    const doc = documentFor(customTitle.trim() || parsed.title, parsed.markdown, chosenSkin, crypto.randomUUID(), raw)
    setRecords((current) => [doc, ...current]); navigate(doc.id); setImportOpen(false); setError('')
    return doc
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (importing.current) return
    try {
      addDocument(text, zh ? '粘贴内容.md' : 'Pasted text.md', activeDoc?.skin || homeSkin, title)
      setText(''); setTitle('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }
  const importFile = async (file: File) => {
    if (importing.current) return
    importing.current = true; setBusy(true); setError('')
    const selectedSkin = activeDoc?.skin || homeSkin
    try {
      // Fatal decoding avoids silently corrupting legacy-encoded files.
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
      addDocument(raw, file.name, selectedSkin)
    } catch (cause) {
      setError(cause instanceof TypeError ? (zh ? '文件不是有效 UTF-8，请先另存为 UTF-8 再导入。' : 'Save the file as UTF-8 before importing.') :
        cause instanceof Error ? cause.message : String(cause))
    } finally { importing.current = false; setBusy(false) }
  }
  const openUrl = async (input: string) => {
    if (importing.current) return
    let url: string
    try { url = normalizeWebUrl(input) }
    catch (cause) { setWebError(cause instanceof Error ? cause.message : String(cause)); return }
    importing.current = true; setBusy(true); setWebError(''); setUrlInput(url)
    const selectedSkin = activeDoc?.skin || homeSkin
    const controller = new AbortController()
    request.current = controller
    const timer = window.setTimeout(() => controller.abort(new Error(zh ? '读取超时（20 秒），请检查网络或目标网站。' : 'Reading timed out after 20 seconds.')), 20_000)
    try {
      const parsed = await readWebsite(url, controller.signal)
      const existing = records.find((doc) => doc.sourceUrl === parsed.sourceUrl)
      const doc = { ...documentFor(parsed.title, parsed.markdown, selectedSkin, existing?.id || crypto.randomUUID(), parsed.raw),
        ...parsed, projectName: new URL(parsed.sourceUrl).hostname }
      setRecords((current) => [doc, ...current.filter((item) => item.id !== doc.id)])
      navigate(doc.id); setImportOpen(false)
    } catch (cause) { setWebError(cause instanceof Error ? cause.message : String(cause)) }
    finally { window.clearTimeout(timer); request.current = null; importing.current = false; setBusy(false) }
  }
  const openWebsite = (event: FormEvent) => {
    event.preventDefault()
    void openUrl(urlInput)
  }
  const setLanguage = (code: Lang) => {
    if (code === lang) return
    if (text.trim() && !window.confirm(zh ? '切换语言会重载页面。尚未导入的草稿不会保存，继续？' : 'Changing language reloads the page. Unimported text will be lost. Continue?')) return
    if (!storageSet(langKey, code)) { setNotice(zh ? '无法保存语言设置。' : 'Could not save language setting.'); return }
    window.location.reload()
  }
  const copySource = async () => {
    if (!activeDoc) return
    try { await navigator.clipboard.writeText(activeDoc.raw) }
    catch { setNotice(zh ? '浏览器禁止复制，请在导入前保留原文。' : 'Clipboard unavailable. Keep the original file.') }
  }
  const commands: Command[] = [
    { id: 'import', title: `${label.open} / ${label.paste} / ${label.import}`, run: openImport },
    { id: 'home', title: label.home, run: () => { setHomeSkin(activeDoc?.skin || homeSkin); setPanic(false); navigate(null) } },
    ...skins.map((s) => ({ id: `skin-${s.id}`, title: t('openAs', { app: skinLabel(s, lang) }), run: () => changeSkin(s.id) })),
    ...(activeDoc ? [{ id: 'copy', title: t('cmdCopy'), run: copySource }] : []),
    { id: 'fullscreen', title: t('cmdFullscreen'), run: () => {
      if (document.fullscreenElement) void document.exitFullscreen()
      else void document.documentElement.requestFullscreen().catch(() => setNotice(zh ? '浏览器未允许全屏。' : 'Fullscreen denied.'))
    } },
    { id: 'boss', title: bossMode ? t('bossOn') : t('bossOff'), run: () => setBossMode((value) => !value) },
    { id: 'panic', title: t('cmdPanic'), hint: 'Esc', run: togglePanic },
    ...records.map((doc) => ({ id: `doc-${doc.id}`, title: doc.fileName, hint: label.recent, run: () => openRecord(doc) })),
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
    if (link.hasAttribute('data-reader-link') && event.button !== 2) void openUrl(link.href)
  }
  const importForm = <>
    <form className="offline-import" onSubmit={openWebsite}>
      <label>{label.url}<input type="text" inputMode="url" autoComplete="off" spellCheck={false}
        value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://…" /></label>
      <div className="offline-import-actions"><button type="submit" disabled={busy}>{label.open}</button>
        {busy && request.current && <button type="button" onClick={() => request.current?.abort(new Error(zh ? '已取消读取。' : 'Reading cancelled.'))}>{zh ? '取消读取' : 'Cancel'}</button>}</div>
      {busy && request.current && <p role="status">{label.busy}</p>}
      {webError && <p className="welcome-error" role="alert">{webError}</p>}
      <p className="offline-note">{label.webNote}</p>
    </form>
    <ImportForm text={text} title={title} setText={setText} setTitle={setTitle}
      busy={busy} onSubmit={submit} onFile={importFile} error={error} />
  </>
  const welcome = <div className="welcome offline-welcome">
    <div className="welcome-hero"><h1><span className="welcome-brand">{zh ? '摸鱼 · 本地单文件版' : 'SneakRead · Single file'}</span>
      <span className="welcome-tagline">{label.title}</span></h1><p className="welcome-sub">{label.intro}</p>
      {importForm}<div className="welcome-tip">{label.tip}</div>
      <div className="welcome-apps"><h2 className="welcome-apps-title">{t('homeOpenAs')}</h2><div className="welcome-apps-grid">
        {skins.map((s) => <button type="button" key={s.id} className={`welcome-app${homeSkin === s.id ? ' is-active' : ''}`}
          onClick={() => changeSkin(s.id)}><SkinBrandLogo id={s.id} size={32} /><span className="welcome-app-name">{skinLabel(s, lang)}</span></button>)}
      </div></div>
    </div>
    {!!records.length && <section className="welcome-section"><h2>{label.recent}</h2><div className="welcome-recents">
      {records.map((doc) => <button type="button" className="welcome-recent" key={doc.id} onClick={() => openRecord(doc)}>
        <span>{doc.fileName}</span><small>{label.local}</small></button>)}
    </div></section>}
    <footer className="welcome-footer">SneakRead · MIT · {zh ? '本地单文件版' : 'Local single-file edition'}</footer>
  </div>
  return <div className={`stage skin-${skin}${!activeDoc && !panic ? ' home-stage' : ''}`}
    onClick={onStageClick} onClickCapture={preventNavigation} onAuxClickCapture={preventNavigation}>
    <SkinControlsProvider value={{ activeSkin: skin, skins, onSwitchSkin: changeSkin }}>
      {!panic && !activeDoc && homeSkin === 'word' ? <WordFrame fileName={homeDoc.fileName} statusWords={homeDoc.summary.words}>
        <article className="paper welcome-paper markdown-body">{welcome}</article></WordFrame> :
        !panic && !activeDoc && homeSkin === 'vscode' ? <div className="vsc"><VscMenuBar /><div className="vsc-body"><ActivityBar />
          <section className="vsc-editor vsc-editor-welcome"><div className="vsc-tabs"><span className="vsc-tab is-active">{label.local}</span></div>
            <div className="vsc-editor-scroll">{welcome}</div></section></div><div className="vsc-status">UTF-8</div></div> : <SkinSurface doc={shown} />}
    </SkinControlsProvider>
    {activeDoc && !panic && !importOpen && (busy || webError) && <div className="offline-notice" role={webError ? 'alert' : 'status'}>
      {busy ? label.busy : webError}
      {busy ? <button type="button" onClick={() => request.current?.abort(new Error(zh ? '已取消读取。' : 'Reading cancelled.'))}>{zh ? '取消读取' : 'Cancel'}</button>
        : <button type="button" onClick={() => setWebError('')} aria-label={label.close}>×</button>}
    </div>}
    {notice && !panic && <div className="offline-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={label.close}>×</button></div>}
    {menuAnchor && <><div className="menu-scrim" onClick={() => setMenuAnchor(null)} />
      <div className="app-menu" style={{ left: menuAnchor.x, top: menuAnchor.y }} dir={isRtl ? 'rtl' : undefined}>
        <button type="button" className="menu-item" onClick={() => { closePanels(); setPaletteOpen(true) }}>{label.commands}<span className="menu-kbd">⌘K</span></button>
        {commands.filter((c) => !c.id.startsWith('doc-')).map((c) => <button type="button" key={c.id} className="menu-item"
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
    {importOpen && <Dialog title={`${label.open} / ${label.import}`} onClose={() => setImportOpen(false)}>{importForm}</Dialog>}
    {aboutOpen && <Dialog title={label.title} onClose={() => setAboutOpen(false)}><p>{label.intro}</p><p>{label.webNote}</p><p>{label.tip}</p><p>{label.note}</p></Dialog>}
  </div>
}

export default App
