import { headingId, safeHttpUrl, samePageFragment } from './content'

function literalMarkdown(text: string): string {
  return text.replace(/[!-/:-@[-`{-~]/g, '\\$&')
}

function fencedText(text: string): string {
  let size = 3
  for (const match of text.matchAll(/`+/g)) size = Math.max(size, match[0].length + 1)
  const fence = '`'.repeat(size)
  return `${fence}\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}`
}

const blockTags: Record<string, true> = {
  ADDRESS: true, ARTICLE: true, ASIDE: true, DIV: true, DL: true, DT: true, DD: true,
  FIGCAPTION: true, FIGURE: true, FOOTER: true, HEADER: true, MAIN: true, NAV: true,
  P: true, SECTION: true,
}

const articleSelector = 'article,[itemprop~="articleBody"]'
const headingSelector = 'h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]'

function webBody(content: DocumentFragment) {
  const hasContent = (node: Element) => Boolean(node.textContent?.trim() || node.querySelector('img[src],img[data-src]'))
  const scope = Array.from(content.querySelectorAll('main,[role="main"]')).find(hasContent) || content
  // shortcut: rely on semantic landmarks rather than guessing from site-specific classes.
  const articles = Array.from(scope.querySelectorAll(articleSelector)).filter((node) =>
    !node.parentElement?.closest(articleSelector) && hasContent(node))
  return articles.length === 1 ? articles[0] : scope
}

function cleanWebContent(content: DocumentFragment, documentUrl?: string, sourceUrl?: string) {
  content.querySelectorAll('[hidden],[role="banner"],[role="contentinfo"]').forEach((node) => node.remove())
  content.querySelectorAll('aside,[role="complementary"]').forEach((node) => {
    if (!node.closest(articleSelector)) node.remove()
  })
  const headings = new Set(Array.from(content.querySelectorAll(headingSelector), (node) => node.id))
  content.querySelectorAll('nav,[role="navigation"]').forEach((node) => {
    const isOutline = sourceUrl && Array.from(node.querySelectorAll('a[href]')).some((link) => {
      const url = safeHttpUrl(link.getAttribute('href'), documentUrl)
      return url !== null && headings.has(samePageFragment(url, sourceUrl) || '')
    })
    if (!isOutline) node.remove()
  })
}

function htmlMarkdown(text: string, articleOnly = false, baseUrl?: string): { title: string; markdown: string } {
  // Parse in the template's inert document. Never mount or adopt the parsed nodes.
  const inertDocument = document.createElement('template').content.ownerDocument
  const range = inertDocument.createRange()
  range.selectNodeContents(inertDocument.createElement('template'))
  const content = range.createContextualFragment(text)
  const documentUrl = safeHttpUrl(content.querySelector('base[href]')?.getAttribute('href'), baseUrl) || baseUrl
  content.querySelectorAll(
    'script,style,iframe,frame,frameset,object,embed,link,meta,base,svg,math,template,noscript,audio,video,source,track,canvas,form,input,button,select,textarea',
  ).forEach((node) => node.remove())
  const pageTitle = content.querySelector('title')?.textContent?.trim()
  content.querySelectorAll('title').forEach((node) => node.remove())
  if (articleOnly) cleanWebContent(content, documentUrl, baseUrl)
  const body = articleOnly ? webBody(content) : content
  const title = (pageTitle || body.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim()
  const fragments = new Map(Array.from(body.querySelectorAll(headingSelector),
    (heading) => [heading.id, headingId(heading.textContent || '')]))

  function children(node: Node): string {
    return Array.from(node.childNodes, render).join('')
  }

  function render(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return literalMarkdown((node.textContent || '').replace(/\s+/g, ' '))
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const element = node as Element
    const tag = element.tagName
    if (tag === 'BR') return '  \n'
    if (tag === 'HR') return '\n\n---\n\n'
    if (tag === 'A') {
      let absolute = safeHttpUrl(element.getAttribute('href'), documentUrl)
      if (absolute && baseUrl) {
        const fragment = samePageFragment(absolute, baseUrl)
        const targetId = fragment === null ? undefined : fragments.get(fragment)
        if (targetId) absolute = `${absolute.split('#')[0]}#${encodeURIComponent(targetId)}`
      }
      const body = children(element).trim()
      return absolute && body ? `[${body}](${absolute.replace(/[()<>]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)})` : body
    }
    if (tag === 'IMG') {
      const absolute = safeHttpUrl(element.getAttribute('src') || element.getAttribute('data-src'), documentUrl)
      const alt = element.getAttribute('alt')?.trim() || '图片'
      return absolute ? `![${literalMarkdown(alt)}](${absolute.replace(/[()<>]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)})` : literalMarkdown(`[${alt}]`)
    }
    if (tag === 'PRE') return `\n\n${fencedText(element.textContent || '')}\n\n`
    if (tag === 'TABLE') {
      const rows = Array.from(element.querySelectorAll('tr'))
        .filter((row) => row.closest('table') === element)
        .map((row) => Array.from(row.children)
          .filter((cell) => cell.tagName === 'TH' || cell.tagName === 'TD')
          .map((cell) => children(cell).trim().replace(/\s+/g, ' ')))
        .filter((row) => row.length)
      if (!rows.length) return `\n\n${children(element).trim()}\n\n`
      const width = Math.max(...rows.map((row) => row.length))
      const line = (row: string[]) => `| ${Array.from({ length: width }, (_, index) => row[index] || '').join(' | ')} |`
      const caption = Array.from(element.children).find((child) => child.tagName === 'CAPTION')
      return `\n\n${caption ? `${children(caption).trim()}\n\n` : ''}${[
        line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line),
      ].join('\n')}\n\n`
    }
    if (tag === 'UL' || tag === 'OL') {
      const start = Number.parseInt(element.getAttribute('start') || '1', 10)
      const items = Array.from(element.children).filter((child) => child.tagName === 'LI')
      return `\n\n${items.map((item, index) => {
        const marker = tag === 'OL' ? `${Number.isFinite(start) ? start + index : index + 1}. ` : '- '
        return marker + children(item).trim().replace(/\n/g, `\n${' '.repeat(marker.length)}`)
      }).join('\n')}\n\n`
    }
    const body = children(element)
    if (/^H[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${body.trim()}\n\n`
    if (tag === 'BLOCKQUOTE') return `\n\n${body.trim().replace(/^/gm, '> ')}\n\n`
    if (blockTags[tag]) return `\n\n${body.trim()}\n\n`
    return body
  }

  return { title, markdown: children(body).trim() }
}

export function parseLocalContent(text: string, fileName: string): { title: string; markdown: string } {
  const extension = fileName.match(/\.([^.]+)$/)?.[1].toLowerCase()
  if (!extension || !['txt', 'md', 'markdown', 'html', 'htm'].includes(extension)) {
    throw new Error('不支持的文件类型，请选择 TXT、MD 或 HTML 文件。')
  }
  if (!text.trim()) throw new Error('网页未包含可读取的正文。')
  const fileTitle = fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').trim() || '本地文档'
  if (extension === 'txt') {
    const markdown = text.split(/\r\n?|\n/).map((line) => line.trim()
      ? literalMarkdown(line).replace(/^[ \t]+/, (indent) => indent.replace(/ /g, '&#32;').replace(/\t/g, '&#9;')) + '  '
      : '').join('\n').trimEnd()
    return { title: fileTitle, markdown }
  }
  if (extension === 'md' || extension === 'markdown') {
    return { title: text.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1] || fileTitle, markdown: text }
  }
  const parsed = htmlMarkdown(text)
  if (!parsed.markdown) throw new Error('HTML 中没有可读取的正文。')
  return { title: parsed.title || fileTitle, markdown: parsed.markdown }
}

export function parseWebContent(text: string, fileName: string, sourceUrl?: string) {
  if (!fileName.endsWith('.html')) return parseLocalContent(text, fileName)
  const parsed = htmlMarkdown(text, true, sourceUrl)
  if (!parsed.markdown) throw new Error('网页未包含可读取的正文；目标页可能仍在加载、需要验证码，或正文需要点击/滚动后才出现。')
  return { title: parsed.title || '网页文章', markdown: parsed.markdown }
}
