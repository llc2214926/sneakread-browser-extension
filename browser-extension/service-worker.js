chrome.action.onClicked.addListener(() => {
  const workerPath = chrome.runtime.getManifest().background?.service_worker || ''
  const pagePath = workerPath.startsWith('browser-extension/') ? 'browser-extension/sneakread.html' : 'sneakread.html'
  void chrome.tabs.create({ url: chrome.runtime.getURL(pagePath) })
})

function waitForLoad(tabId, signal) {
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
      signal.removeEventListener('abort', onAbort)
      if (error) reject(error)
      else resolve()
    }
    const onUpdated = (updatedId, changeInfo) => {
      if (updatedId === tabId && changeInfo.status === 'complete') finish()
    }
    const onRemoved = (removedId) => {
      if (removedId === tabId) finish(new Error('目标网页已关闭。'))
    }
    const onAbort = () => finish(signal.reason)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    signal.addEventListener('abort', onAbort, { once: true })
    // Install listeners before checking: completion may precede tabs.create's reply.
    if (signal.aborted) onAbort()
    else chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') finish()
    }, finish)
  })
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
  // One deadline covers creation, loading, settling and extraction. The reader
  // waits 22 seconds, leaving time to return this error and close the target tab.
  const timer = setTimeout(() => controller.abort(new Error('网页读取超时。')), 20_000)
  signal.addEventListener('abort', closeTab, { once: true })
  try {
    signal.throwIfAborted()
    const tab = await chrome.tabs.create({ url, active: false })
    tabId = tab.id
    if (tabId === undefined) throw new Error('无法打开目标网页。')
    signal.throwIfAborted()
    await waitForLoad(tabId, signal)
    await new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(settleTimer); reject(signal.reason) }
      const settleTimer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, 4_000)
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) onAbort()
    })
    signal.throwIfAborted()
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({ html: document.documentElement.outerHTML, sourceUrl: location.href }),
    })
    signal.throwIfAborted()
    if (!result?.html) throw new Error('网页未返回可读取内容。')
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
    readRenderedPage(url.href, controller)
      .then(respond)
      .catch((error) => respond({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  })
})
