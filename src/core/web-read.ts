import { parseWebContent } from './local-import'
import { summarizeMarkdown } from './content'
import type { ReaderDoc } from './types'

export function normalizeWebUrl(input: string): string {
  const value = input.trim()
  if (!value) throw new Error('请输入要阅读的网址。')
  let url: URL
  try { url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`) }
  catch { throw new Error('网址格式不正确。') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('仅支持不含用户名和密码的 HTTP / HTTPS 网址。')
  }
  return url.href
}

type RenderedPageReply = { ok: boolean; sourceUrl?: string; html?: string; error?: string }

function readRenderedPage(url: string, signal: AbortSignal): Promise<RenderedPageReply> {
  if (window.location.protocol !== 'chrome-extension:') return Promise.reject(new Error('渲染读取仅支持从 SneakRead 扩展页面调用。'))
  const runtime = (globalThis as typeof globalThis & { chrome?: { runtime?: {
    sendMessage: (message: unknown, callback: (reply?: RenderedPageReply) => void) => void
    lastError?: { message?: string }
  } } }).chrome?.runtime
  if (!runtime) return Promise.reject(new Error('未找到 SneakRead 扩展运行时。'))
  return new Promise((resolvePromise, rejectPromise) => {
    let timer = 0
    const cleanup = () => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => { cleanup(); rejectPromise(signal.reason) }
    signal.addEventListener('abort', onAbort, { once: true })
    timer = window.setTimeout(() => { cleanup(); rejectPromise(new Error('网页渲染超时。')) }, 18_000)
    runtime.sendMessage({ type: 'read-rendered-page', url }, (reply) => {
      const error = runtime.lastError?.message
      cleanup()
      if (signal.aborted) rejectPromise(signal.reason)
      else if (error) rejectPromise(new Error(error))
      else if (!reply) rejectPromise(new Error('扩展没有返回网页内容。'))
      else resolvePromise(reply)
    })
  })
}

function parseFetchedContent(raw: string, contentType: string, sourceUrl: string): ReaderDoc {
  const mime = contentType.split(';')[0].trim().toLowerCase()
  const extension = mime === 'text/html' || mime === 'application/xhtml+xml' ? 'html'
    : mime === 'text/markdown' || (mime === 'text/plain' && /\.(md|markdown)$/i.test(new URL(sourceUrl).pathname)) ? 'md'
      : mime === 'text/plain' ? 'txt' : null
  if (!extension) throw new Error(`暂不支持该网页的内容类型：${mime || '未声明'}。请使用 HTML、纯文本或 Markdown 页面。`)
  const parsed = parseWebContent(raw, `${new URL(sourceUrl).hostname}.${extension}`, sourceUrl)
  return { ...parsed, raw, sourceUrl, fetchedAt: new Date().toISOString(), summary: summarizeMarkdown(parsed.markdown, sourceUrl) }
}

export async function readWebsite(input: string, signal: AbortSignal): Promise<ReaderDoc> {
  const url = normalizeWebUrl(input)
  if (window.location.protocol === 'chrome-extension:') {
    const rendered = await readRenderedPage(url, signal)
    if (!rendered.ok || !rendered.html) throw new Error(rendered.error || '网页未返回可读取内容。')
    return parseFetchedContent(rendered.html, 'text/html', rendered.sourceUrl || url)
  }
  let response: Response
  try {
    response = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal })
  } catch (cause) {
    if (signal.aborted) throw signal.reason
    throw new Error('无法读取该网站：可能是网站未允许跨域（CORS）、网络或证书错误。没有调用第三方中转。', { cause })
  }
  if (!response.ok) throw new Error(`目标网站返回 HTTP ${response.status}，未导入错误页面。`)
  const contentType = response.headers.get('content-type') || ''
  const bytes = await response.arrayBuffer()
  const prefix = new TextDecoder().decode(bytes.slice(0, 2048))
  const charset = contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1]
    || prefix.match(/<meta\b[^>]*charset\s*=\s*["']?([\w-]+)/i)?.[1]
    || 'utf-8'
  let raw: string
  try { raw = new TextDecoder(charset, { fatal: true }).decode(bytes) }
  catch { throw new Error(`无法按 ${charset} 解码网页，请保存为 UTF-8 文件后导入。`) }
  return parseFetchedContent(raw, contentType, response.url || url)
}
