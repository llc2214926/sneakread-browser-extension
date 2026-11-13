import { build } from 'vite'
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { gzipSync, gunzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const result = await build({
  configFile: false,
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    write: false,
    minify: true,
    lib: { entry: 'src/main.tsx', name: 'SneakRead', formats: ['iife'] },
  },
})
const output = (Array.isArray(result) ? result[0] : result).output
const scripts = output.filter((item) => item.type === 'chunk')
const styles = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
assert.equal(scripts.length, 1)
assert.equal(styles.length, 1)
assert.equal(output.length, 2, 'All resources must be embedded')
assert.equal(scripts[0].imports.length, 0)
assert.equal(scripts[0].dynamicImports.length, 0)
const css = String(styles[0].source)
for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
  assert.ok(match[1].startsWith('data:'), `External CSS resource: ${match[1]}`)
}
const js = scripts[0].code
assert.ok(!js.includes('www.googletagmanager.com'))
assert.ok(!js.includes('clarity.ms'))
assert.ok(!/r\.jina(?:ai)?\.(?:ai|cn)|(?:api\.)?firecrawl\.(?:dev|com)/i.test(js), 'Online reader APIs must not be bundled')
assert.ok(!Object.keys(scripts[0].modules).some((name) => name.includes('/monaco-editor/')))

const license = await readFile('LICENSE', 'utf8')
const packages = new Map([
  ['node_modules/@vscode/codicons', '@vscode/codicons'],
  ['node_modules/material-symbols', 'material-symbols'],
])
for (const [id, module] of Object.entries(scripts[0].modules)) {
  if (!module.renderedLength) continue
  // Use the innermost package directory, including pnpm's nested node_modules.
  const match = id.match(/^(.*\/node_modules\/((?:@[^/]+\/)?[^/]+))(?:\/|$)/)
  if (match) packages.set(match[1], match[2])
}
const notices = [license]
const licenseFallbacks = new Map([
  ['microsoft/fluentui-system-icons', 'licenses/fluentui-system-icons.LICENSE'],
  ['micromark/micromark', 'licenses/micromark.LICENSE'],
  ['remarkablemark/inline-style-parser', 'licenses/inline-style-parser.LICENSE'],
])
for (const [dir, name] of [...packages].sort((a, b) => a[1].localeCompare(b[1]))) {
  const files = await readdir(dir, { withFileTypes: true })
  const licenseFiles = files.filter((file) => file.isFile() && /^(licen[sc]e|copying|notice)([._-]|$)/i.test(file.name))
  if (!licenseFiles.length) {
    let metadata
    try {
      metadata = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'))
    } catch (error) {
      throw new Error(`Cannot read bundled dependency metadata: ${name}`, { cause: error })
    }
    const repositoryUrl = typeof metadata.repository === 'string' ? metadata.repository : metadata.repository?.url
    const repository = repositoryUrl?.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)/)?.[1]?.replace(/\.git$/, '')
    const fallback = licenseFallbacks.get(repository)
    assert.ok(fallback && metadata.license === 'MIT', `Missing bundled dependency license: ${name}`)
    notices.push(`\n--- ${name} ---\n${await readFile(fallback, 'utf8')}`)
  }
  for (const file of licenseFiles) {
    notices.push(`\n--- ${name} ---\n${await readFile(`${dir}/${file.name}`, 'utf8')}`)
  }
}
const payload = JSON.stringify({ css, js, licenses: notices.join('\n') })
const compressed = gzipSync(payload, { level: 9 })
assert.equal(gunzipSync(compressed).toString(), payload)
const csp = "default-src 'none'; connect-src https: http:; img-src data: blob: https: http:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
const head = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SneakRead — 本地单文件版</title>
<!--
来源：https://github.com/SneakRead/sneakread
使用：双击本文件；输入网址联网读取；Esc 切换预算表。
内嵌：全部应用脚本、样式、字体与图标在本文件中；不使用第三方抓取服务。网址阅读受目标网站 CORS、登录及脚本渲染限制。
隐私：用户打开网址或点击正文链接时连接目标网站及其重定向；图片仅在点击加载按钮后请求原图片地址，不加载统计；正文在本机解析，不执行网页脚本。
浏览器：需要支持 DecompressionStream 的现代浏览器；正文仅保留在当前页面会话，刷新或关闭后清除。
精简版：原有轻量代码视图替代 Monaco；使用系统字体；裁剪图标；gzip内嵌全部应用资源。
中文：选择中文后，15种伪装界面使用中文；品牌、代码及文章原文保留，其他语言不变。
第三方许可解压后保存在页面 #third-party-licenses 中。
${license.replaceAll('--', '—')}
--></head><body><div id="root"></div><p id="boot" role="status" style="font:14px system-ui;color:#555;margin:32px">正在打开本地阅读器…</p><noscript>请启用 JavaScript。</noscript>`
const boot = `(async()=>{const b=document.getElementById('boot');try{if(!('DecompressionStream'in window))throw new Error('请使用支持原生解压的新版 Chrome、Edge、Firefox 或 Safari。');performance.mark('unpack-start');const d=document.getElementById('app-data'),t=d.textContent;const bytes=Uint8Array.fromBase64?Uint8Array.fromBase64(t):Uint8Array.from(atob(t),c=>c.charCodeAt(0));d.remove();const p=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();performance.mark('unpack-end');performance.measure('unpack','unpack-start','unpack-end');const style=document.createElement('style');style.textContent=p.css;document.head.append(style);const licenses=document.createElement('script');licenses.id='third-party-licenses';licenses.type='text/plain';licenses.textContent=p.licenses;document.body.append(licenses);const script=document.createElement('script');script.textContent=p.js;document.body.append(script);script.remove();b.remove()}catch(e){b.textContent='打开失败：'+e.message;b.setAttribute('role','alert')}})();`
const html = head + `<script id="app-data" type="application/octet-stream">${compressed.toString('base64')}</script><script>${boot}</script></body></html>`
const extensionHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SneakRead</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><noscript>请启用 JavaScript。</noscript><script src="app.js"></script></body></html>`
await writeFile('../sneakread.html', html)
await mkdir('browser-extension', { recursive: true })
await writeFile('browser-extension/sneakread.html', extensionHtml)
await writeFile('browser-extension/app.js', js)
await writeFile('browser-extension/app.css', css)
await writeFile('browser-extension/third-party-licenses.txt', notices.join('\n'))
console.log(JSON.stringify({ htmlBytes: Buffer.byteLength(html), extensionHtmlBytes: Buffer.byteLength(extensionHtml), jsBytes: Buffer.byteLength(js), cssBytes: Buffer.byteLength(css), licenseBytes: Buffer.byteLength(notices.join('\n')), gzipBytes: compressed.length, packages: packages.size }, null, 2))
