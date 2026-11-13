// Pure content transforms shared by the app core and every skin: reader
// markdown → article body / email body, link/heading/image extraction, and
// small label helpers. No React, no app state.
import type { DocumentRecord, Summary } from './types'
import type { Lang } from '../i18n'

export function getSiteLabel(url: string) {
  if (url.startsWith('local:')) return 'local'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}

export function safeHttpUrl(value: string | null | undefined, baseUrl?: string) {
  const raw = value?.trim()
  if (!raw) return null
  try {
    const url = baseUrl ? new URL(raw, baseUrl) : new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function headingId(text: string) {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
}

export function samePageFragment(href: string, sourceUrl: string): string | null {
  try {
    const target = new URL(href, sourceUrl)
    const source = new URL(sourceUrl)
    if (!target.href.includes('#')) return null
    const fragment = target.hash.slice(1)
    target.hash = ''; source.hash = ''
    if (target.href !== source.href) return null
    try { return decodeURIComponent(fragment) } catch { return fragment }
  } catch { return null }
}

// Strip fenced code blocks so `# comment` / `## Heading` lines inside code aren't
// harvested as real document headings.
function stripCodeFences(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')
}

export function extractHeadings(markdown: string, language: Lang) {
  const headings = Array.from(stripCodeFences(markdown).matchAll(/^#{1,6}\s+(.+)$/gm)).map(
    (match) => match[1].replace(/\s+#+$/, '').trim(),
  )
  return headings.length ? headings : language === 'zh' ? ['概览', '详情', '链接'] : ['Overview', 'Details', 'Links']
}

// Headings with their level — for the Lark/Feishu doc outline rail (目录).
export function extractOutline(markdown: string) {
  return Array.from(stripCodeFences(markdown).matchAll(/^(#{1,6})\s+(.+)$/gm)).map((match) => ({
    level: match[1].length,
    text: match[2].replace(/\s+#+$/, '').trim(),
  }))
}

export function extractLinks(markdown: string, baseUrl?: string) {
  return Array.from(markdown.matchAll(/(?<!!)\[([^\]]+)]\(([^)]+)\)/g))
    .map((match) => {
      const href = safeHttpUrl(match[2].trim(), baseUrl)
      if (!href) return null
      return {
        text: match[1].replace(/\s+/g, ' ').trim(),
        href,
      }
    })
    .filter((link): link is { text: string; href: string } => Boolean(link))
    .filter((link) => !link.text.startsWith('!['))
}

export function extractImages(markdown: string, baseUrl?: string) {
  return Array.from(markdown.matchAll(/!\[([^\]]*)]\(([^)]+)\)/g))
    .map((match) => {
      const src = safeHttpUrl(match[2].trim(), baseUrl)
      if (!src) return null
      return {
        alt: match[1].replace(/\s+/g, ' ').trim(),
        src,
      }
    })
    .filter((image): image is { alt: string; src: string } => Boolean(image))
}

export function normalizeTitleForCompare(value: string) {
  return value
    .replace(/\s+#+$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

export function removeDuplicateLeadingHeading(markdown: string, title: string) {
  const documentTitle = normalizeTitleForCompare(title)
  const leading = markdown.match(/^(?:[ \t]*\r?\n)* {0,3}#{1,2}[ \t]+([^\r\n]*)(?:\r?\n|$)/)
  if (!documentTitle || !leading || normalizeTitleForCompare(leading[1]) !== documentTitle) return markdown
  return markdown.slice(leading[0].length).replace(/^(?:[ \t]*\r?\n)+/, '')
}

export function articleBody(doc: DocumentRecord) {
  if (doc.sourceUrl.startsWith('local:')) return doc.markdown
  return removeDuplicateLeadingHeading(doc.markdown, doc.title)
}

export function emailBody(doc: DocumentRecord, language: Lang) {
  const links = extractLinks(doc.markdown, doc.sourceUrl)
  return [
    language === 'zh' ? '各位同事好：' : 'Hi team,',
    '',
    language === 'zh' ? '以下是最新资料，供大家审阅。' : 'Sharing the latest readout below for review.',
    '',
    doc.markdown,
    ...(links.length
      ? [
          '',
          language === 'zh' ? '参考链接：' : 'References:',
          ...links.slice(0, 8).map((link, i) => {
            const label =
              link.text.replace(/^[[\s]+|[\]\s]+$/g, '').trim() || getSiteLabel(link.href)
            return `${i + 1}. [${label}](${link.href})`
          }),
        ]
      : []),
    '',
    language === 'zh' ? '此致' : 'Best,',
    language === 'zh' ? '研究运营团队' : 'Research Ops',
  ].join('\n')
}

// Initialism domains that read wrong when title-cased ("Bbc" screams fake).
const ACRONYM_SITES = new Set([
  'bbc', 'cnn', 'espn', 'nba', 'nfl', 'mlb', 'nhl', 'ufc', 'wwe', 'ign',
  'gq', 'npr', 'wsj', 'nyt', 'abc', 'cbs', 'nbc', 'itv', 'rte', 'cnbc',
])

export function inferProjectName(url: string) {
  const site = getSiteLabel(url)
  const root = site.split('.').slice(-2, -1)[0] || site
  if (root.length <= 4 && (ACRONYM_SITES.has(root.toLowerCase()) || !/[aeiouy]/i.test(root))) {
    return root.toUpperCase()
  }
  return `${root.charAt(0).toUpperCase()}${root.slice(1)}`
}

/* ------------------------------------------------------------------ *
 * Believable "recent activity" clocks for disguise chrome. Derived from the
 * real current time so a skin never shows a timestamp in the future — the
 * loudest tell of a fake. Pure helpers; skins call them at render time.
 * ------------------------------------------------------------------ */

export function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000)
}

export function clockLabel(date: Date, opts?: { ampm?: boolean }) {
  const h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  if (!opts?.ampm) return `${String(h).padStart(2, '0')}:${m}`
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${m} ${suffix}`
}

// "Jul 3" / "7月3日" style short labels for sidebar lists, N days back.
export function daysAgoLabel(daysBack: number, zh: boolean) {
  const d = new Date(Date.now() - daysBack * 86_400_000)
  if (zh) return daysBack === 1 ? '昨天' : `${d.getMonth() + 1}月${d.getDate()}日`
  if (daysBack === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Parse a stored DocumentRecord timestamp ("07/07/2026, 10:14"); fall back to
// now rather than "Invalid Date" leaking into chrome.
export function parseTimestamp(value: string | undefined) {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function summarizeMarkdown(markdown: string, baseUrl?: string): Summary {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/[#>*_`~|[\]()]/g, ' ')
  return {
    words: plain.trim() ? plain.trim().split(/\s+/).length : 0,
    headings: (markdown.match(/^#{1,6}\s+/gm) || []).length,
    links: extractLinks(markdown, baseUrl).length,
    images: extractImages(markdown, baseUrl).length,
    tables: (markdown.match(/^\|.+\|$/gm) || []).length,
  }
}
