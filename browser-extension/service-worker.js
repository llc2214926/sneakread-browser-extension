const pendingLaunches = new Map()

function openReader(tab) {
  const workerPath = chrome.runtime.getManifest().background?.service_worker || ''
  const pagePath = workerPath.startsWith('browser-extension/') ? 'browser-extension/sneakread.html' : 'sneakread.html'
  const readerUrl = new URL(chrome.runtime.getURL(pagePath))
  const sourceUrl = tab.url
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
    const launch = crypto.randomUUID()
    readerUrl.searchParams.set('url', sourceUrl)
    readerUrl.searchParams.set('launch', launch)
    const snapshot = tab.id === undefined ? null : chrome.scripting.executeScript({
      target: { tabId: tab.id }, injectImmediately: true, func: readPage, args: [sourceUrl, 'source'],
    }).then(([entry]) => entry?.result, () => null)
    const reader = chrome.tabs.create({ url: readerUrl.href }).catch(() => null)
    const expires = setTimeout(() => pendingLaunches.delete(launch), 20_000)
    pendingLaunches.set(launch, { sourceUrl, snapshot, reader, expires })
  } else {
    void chrome.tabs.create({ url: readerUrl.href }).catch(() => {})
  }
}

chrome.action.onClicked.addListener(openReader)

function readPage(expectedUrl, mode) {
  const sourceUrl = location.href
  if (!['https:', 'http:'].includes(location.protocol) || (expectedUrl && expectedUrl !== sourceUrl)) return null
  if (!document.body || document.readyState === 'loading') return null
  const snapshot = () => ({ sourceUrl, html: document.documentElement.outerHTML })
  if (mode === 'snapshot') return snapshot()

  const semantic = document.querySelector('article,main,[role="main"]')
  const body = semantic || document.body
  const text = body.innerText?.trim() || ''
  const heading = body.querySelector('h1,h2,h3')?.innerText?.trim()
  const afterHeading = heading && text.startsWith(`${heading}\n`) ? text.slice(heading.length).trim() : text
  const hasText = afterHeading && text !== heading && !/^(?:loading|please wait|加载中|正在加载|请稍候)[\s.…!。]*$/i.test(afterHeading)
  const hasContent = semantic || text.length >= 80 || body.querySelector('p,pre,li,td')
  const hasImage = semantic?.querySelector('img[src],img[data-src]')
  const readable = !body.closest('[aria-busy="true"]') && Boolean((hasText && hasContent) || hasImage)
  if (mode === 'source') return readable ? snapshot() : null
  // Sample text, not just its length: a placeholder can be replaced by text of equal length.
  return { sourceUrl, readable, signature: `${text.length}:${text.slice(0, 128)}:${text.slice(-128)}` }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      if (signal.aborted) reject(signal.reason)
      else resolve()
    }
    const timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted) finish()
  })
}

async function probePage(tabId, signal, mode, expectedUrl = null, documentId = undefined) {
  try {
    const [entry] = await chrome.scripting.executeScript({
      target: documentId ? { tabId, documentIds: [documentId] } : { tabId },
      injectImmediately: true, func: readPage, args: [expectedUrl, mode],
    })
    return entry
  } catch (error) {
    signal.throwIfAborted()
    // During a navigation WebExtension scripts can briefly have no usable document.
    const tab = await chrome.tabs.get(tabId)
    if (!documentId && !tab.pendingUrl && tab.status === 'complete') throw error
  }
}

async function waitForReadableContent(tabId, signal) {
  let previous
  let stableSince = 0
  let firstReady = 0
  while (!signal.aborted) {
    const probe = await probePage(tabId, signal, 'probe')
    signal.throwIfAborted()
    const current = probe?.result
    const now = Date.now()
    if (current) {
      const sameDocument = previous?.documentId === probe.documentId && previous?.result.sourceUrl === current.sourceUrl
      if (!sameDocument) firstReady = now
      if (!sameDocument || previous.result.signature !== current.signature || !previous.result.readable) stableSince = now
      if ((current.readable && now - stableSince >= 300) || now - firstReady >= 8_000) {
        const snapshot = await probePage(tabId, signal, 'snapshot', current.sourceUrl, probe.documentId)
        signal.throwIfAborted()
        if (snapshot?.result?.html) return snapshot.result
      }
      previous = probe
    } else {
      previous = undefined
    }
    await delay(150, signal)
  }
  signal.throwIfAborted()
}

async function readRenderedPage(url, controller) {
  const { signal } = controller
  let tabId
  let closing
  const closeTab = () => {
    if (tabId !== undefined) {
      const id = tabId
      tabId = undefined
      closing = chrome.tabs.remove(id).catch(() => {})
    }
    return closing
  }
  // One deadline covers creation, loading, settling and extraction.
  const timer = setTimeout(() => controller.abort(new Error('网页读取超时。')), 20_000)
  signal.addEventListener('abort', closeTab, { once: true })
  try {
    signal.throwIfAborted()
    const tab = await chrome.tabs.create({ url, active: false })
    tabId = tab.id
    if (tabId === undefined) throw new Error('无法打开目标网页。')
    signal.throwIfAborted()
    const result = await waitForReadableContent(tabId, signal)
    return { ok: true, html: result.html, sourceUrl: result.sourceUrl }
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', closeTab)
    await closeTab()
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.sender?.id !== chrome.runtime.id || port.name !== 'read-rendered-page') {
    port.disconnect()
    return
  }
  const controller = new AbortController()
  let connected = true
  let started = false
  port.onDisconnect.addListener(() => {
    connected = false
    controller.abort(new Error('读取已取消。'))
  })
  const respond = (reply) => {
    if (!connected) return
    try { port.postMessage(reply) } catch { port.disconnect() }
  }
  port.onMessage.addListener((message) => {
    if (started) return
    started = true
    let url
    try {
      url = new URL(message?.url)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('仅支持不含凭据的 HTTP / HTTPS 网址。')
    } catch (error) {
      respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
      return
    }
    const launch = typeof message.launch === 'string' ? pendingLaunches.get(message.launch) : undefined
    const read = async () => {
      // Only the reader tab created by this click can consume its snapshot, once.
      if (launch?.sourceUrl === url.href && port.sender?.frameId === 0 && port.sender.tab &&
        (await launch.reader)?.id === port.sender.tab.id && pendingLaunches.get(message.launch) === launch) {
        pendingLaunches.delete(message.launch)
        clearTimeout(launch.expires)
        const { signal } = controller
        const snapshot = await Promise.race([launch.snapshot, delay(1_000, signal).then(() => null)])
        signal.throwIfAborted()
        if (snapshot) return { ok: true, ...snapshot, fromSourceTab: true }
      }
      return readRenderedPage(url.href, controller)
    }
    read().then(respond)
      .catch((error) => respond({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  })
})
