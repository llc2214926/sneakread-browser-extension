import { renderToStaticMarkup } from 'react-dom/server'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ExcelSkin } from '../skins/excel'
import { parseLocalContent, parseWebContent } from './local-import'
import { normalizeWebUrl } from './web-read'
import type { DocumentRecord } from './types'
import { skinDefinitions } from '../skins'
import { MarkdownContent, highlightMarkdownLine, splitMarkdownForChat } from '../skins/shared'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`离线检查失败：${message}`)
}

function fragment(html: string): DocumentFragment {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.content
}

// Bundle this entry as an IIFE with Vite write:false, inject into the built file:// page,
// then call the bundle's exported runOfflineChecks(); no dev server is required.
// Also record browser network traffic: no request to offline-check.invalid is allowed.
export async function runOfflineChecks() {
  let executed = false
  const markExecuted = () => { executed = true }
  document.addEventListener('offline-import-executed', markExecuted)
  const remote = 'https://offline-check.invalid'
  const resources: string[] = []
  const observer = new PerformanceObserver((list) => {
    resources.push(...list.getEntries().map((entry) => entry.name).filter((name) => name.startsWith(remote)))
  })
  observer.observe({ type: 'resource' })
  try {
    assert(normalizeWebUrl(' example.com/article ') === 'https://example.com/article', '缺省协议采用 HTTPS')
    for (const input of ['', 'javascript:alert(1)', 'file:///etc/passwd', 'https://user:password@example.com']) {
      let rejected = false
      try { normalizeWebUrl(input) } catch { rejected = true }
      assert(rejected, '拒绝不安全网址或内嵌凭据')
    }
    const web = parseWebContent('<title>网页标题</title><nav>导航噪声</nav><main><h1>正文</h1><p>网页尾段</p><script>throw 1</script></main>', 'page.html')
    assert(web.title === '网页标题' && web.markdown.includes('网页尾段') && !web.markdown.includes('导航噪声') && !web.markdown.includes('throw 1'), '网页正文在本机提取且不执行脚本')
    const relative = parseWebContent('<base href="../assets/"><main><a href="../chapter?q=(next)">下一章</a><a href="javascript:alert(1)">不可执行</a><img src="cover.png" alt="封面"></main>', 'page.html', `${remote}/book/index.html`)
    const relativeSurface = fragment(renderToStaticMarkup(<MarkdownContent markdown={relative.markdown} />))
    assert(relativeSurface.querySelector('a')?.getAttribute('href') === `${remote}/chapter?q=%28next%29` && relativeSurface.querySelectorAll('a').length === 1, '相对链接按页面基址解析且拒绝脚本协议')
    assert(relativeSurface.querySelector('button.reader-lazy-image')?.textContent?.includes('封面') && !relativeSurface.querySelector('img'), '图片默认显示加载按钮且不请求资源')
    for (const [text, name] of [['  ', '空.txt'], ['内容', '文件.pdf'], ['<script>坏代码</script>', '空.html']]) {
      let failed = false
      try { parseLocalContent(text, name) } catch (error) {
        failed = error instanceof Error && /[\u4e00-\u9fff]/.test(error.message)
      }
      assert(failed, `${name} 应返回中文错误`)
    }
    const plain = '# 不是标题\n换行仍在\n\n**不是粗体**\n\n```\n\n    缩进不是代码\n\n' + '原文\n\n'.repeat(1800) + '长文尾段保留\n[不是链接](https://offline-check.invalid)'
    const txt = parseLocalContent(plain, '原文.TXT')
    for (const chunk of splitMarkdownForChat(txt.markdown)) {
      const rendered = fragment(renderToStaticMarkup(<MarkdownContent markdown={chunk} />))
      assert(!rendered.querySelector('h1,strong,pre,code,ul,ol,table'), 'TXT 不将字面标点转换为标题、粗体或代码块')
    }
    const txtRendered = fragment(renderToStaticMarkup(<MarkdownContent markdown={txt.markdown} />))
    assert(txtRendered.textContent?.includes('# 不是标题') && txtRendered.querySelector('br'), 'TXT 保留标题字面量和换行')
    assert(txtRendered.textContent?.includes('长文尾段保留'), 'TXT 保留长文尾段')
    const markdown = '# 标题\n\n**正文**\n\n[链接](https://offline-check.invalid)'
    assert(parseLocalContent(markdown, '粘贴内容.md').markdown === markdown, 'MD 不改写')

    const trigger = "document.dispatchEvent(new Event('offline-import-executed'))"
    const imported = parseLocalContent(`<!doctype html><html><head><title>本地标题</title>
      <script>${trigger}</script><script src="${remote}/script.js"></script>
      <style>@import '${remote}/style.css';</style><link rel="stylesheet" href="${remote}/link.css">
      <meta http-equiv="refresh" content="0;url=${remote}"></head><body onload="${trigger}">
      <h1>正文标题</h1><p>第一段 <b>保留文字</b></p><p>第二段</p>
      <ul><li>列表一<ul><li>嵌套项</li></ul></li><li>列表二</li></ul>
      <ol start="3"><li>有序项</li></ol>
      <table><tr><th>姓名</th><th>值</th></tr><tr><td>甲</td><td>A | B</td></tr></table>
      <a href="${remote}/link">外链文字</a><img src="${remote}/image.png" srcset="${remote}/image2.png 2x" alt="图片说明" onerror="${trigger}">
      <iframe src="${remote}/frame"></iframe><object data="${remote}/object">主动内容</object>
      <svg><image href="${remote}/svg.png" /></svg></body></html>`, '输入.html')
    const html = fragment(renderToStaticMarkup(<MarkdownContent markdown={imported.markdown} />))
    assert(imported.title === '本地标题', 'HTML 标题')
    assert(html.querySelector('h1')?.textContent === '正文标题', 'HTML 标题结构')
    assert(html.querySelectorAll('p').length >= 2 && html.textContent?.includes('第二段'), 'HTML 段落')
    assert(html.querySelectorAll('ul li').length === 3 && html.querySelector('ol')?.getAttribute('start') === '3', 'HTML 列表结构')
    assert(html.querySelectorAll('tbody td').length === 2 && html.textContent?.includes('A | B'), 'HTML 表格文字与管道符')
    assert(html.querySelector('a[data-reader-link]')?.getAttribute('href') === `${remote}/link`, '链接可点击且保留地址')
    assert(html.textContent?.includes('图片说明') && html.textContent.includes('外链文字'), '图片替代文本和链接文字')
    assert(!html.textContent?.includes('主动内容'), '主动内容必须移除')

    const body = `${markdown}\n\n![图片说明](${remote}/cached.png)\n\n| 标题 | URL |\n| --- | --- |\n| 测试 | ${remote}/table |\n\n<img src="${remote}/raw.png">\n\n<${remote}/auto>`
    const doc: DocumentRecord = {
      id: 'offline-check', title: '离线检查', sourceUrl: 'local:offline-check', markdown: body,
      fetchedAt: '2026-10-28T00:00:00Z', raw: body,
      summary: { words: 20, headings: 1, links: 1, images: 1, tables: 1 },
      fileName: '离线检查.md', skin: 'word', pageKind: 'article',
      lastOpenedAt: '2026-10-28T00:00:00Z', projectName: '本地', sizeBytes: 200,
      openCount: 1, lastSyncedAt: '2026-10-28T00:00:00Z',
    }
    assert(skinDefinitions.length === 15, '保留 15 个皮肤')
    for (const sourceUrl of ['local:offline-check', `${remote}/cached`]) {
      for (const skin of skinDefinitions) {
        const Surface = skin.Surface
        const surface = fragment(renderToStaticMarkup(<Surface doc={{ ...doc, sourceUrl, skin: skin.id }} />))
        assert(surface.querySelector('a[data-reader-link]') && !surface.querySelector('img,iframe,object,embed,script,link,source'), `${skin.id} 保留链接且默认不加载资源`)
        const textSurface = fragment(renderToStaticMarkup(<Surface doc={{ ...doc, title: txt.title, markdown: txt.markdown, skin: skin.id }} />))
        assert(textSurface.textContent?.includes('长文尾段保留'), `${skin.id} 不截断 TXT 尾段`)
        assert(textSurface.textContent?.includes('不是标题'), `${skin.id} 不移除 TXT 标题字面量`)
        const codeSurface = fragment(renderToStaticMarkup(<Surface doc={{ ...doc, title: '代码标题', markdown: '```\n# 代码标题\n```', skin: skin.id }} />))
        assert(codeSurface.textContent?.includes('# 代码标题'), `${skin.id} 保留代码中的标题`)
      }
    }
    const resizeHost = document.createElement('div')
    const resizeRoot = createRoot(resizeHost)
    try {
      flushSync(() => resizeRoot.render(<ExcelSkin doc={doc} />))
      const separator = resizeHost.querySelector<HTMLElement>('[role="separator"]')!
      for (const [key, expected] of [['End', 80], ['ArrowRight', 80], ['Home', 20], ['ArrowLeft', 20], ['ArrowRight', 22]] as const) {
        flushSync(() => { separator.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) })
        assert(Number(separator.getAttribute('aria-valuenow')) === expected, 'Excel 分栏可通过键盘调整且不会超出边界')
      }
    } finally { flushSync(() => resizeRoot.unmount()) }
    const highlighted = fragment(highlightMarkdownLine(`[链接](${remote}/code) ![图](${remote}/code.png) <img src=x onerror=alert(1)>`))
    assert(!highlighted.querySelector('a,img,script'), '代码高亮不生成链接或原始 HTML')
    // ES2023 target does not provide Promise.withResolvers.
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert(!executed && resources.length === 0, '恶意 HTML 不执行、不加载远程资源')
    return { skins: skinDefinitions.length, cachedAndLocal: true, parser: 'TXT/MD/HTML', resources }
  } finally {
    document.removeEventListener('offline-import-executed', markExecuted)
    observer.disconnect()
  }
}
