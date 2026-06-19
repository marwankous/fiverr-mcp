// Global namespace for action handlers — populated by actions/*.js files
if (!self.FMcp) self.FMcp = {};

// Helper: wait for a DOM element matching selector, up to timeoutMs
self.FMcp.waitFor = function(selector, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); clearTimeout(timer); resolve(el); }
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timed out waiting for selector: ${selector}`));
    }, timeoutMs);
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

// Helper: wait for intercepted API data (used by read actions).
// Registers the listener first, then requests a buffer flush from the MAIN-world
// interceptor so data captured during page load (before this listener existed)
// is not missed.
self.FMcp.waitForApiData = function(urlPattern, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error(`Timed out waiting for API data matching ${urlPattern}`));
    }, timeoutMs);
    function handler(event) {
      if (event.source !== window) return;
      if (event.data?.source !== 'fiverr-mcp-interceptor') return;
      if (urlPattern.test(event.data.url)) {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve(event.data.data);
      }
    }
    window.addEventListener('message', handler);
    // Ask the interceptor to replay any buffered payloads captured before this listener registered
    window.postMessage({ source: 'fiverr-mcp-flush-request' }, window.location.origin);
  });
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const action = self.FMcp[message.tool];
  if (!action) {
    sendResponse({ error: `No action registered for tool: ${message.tool}` });
    return false;
  }
  action(message.params ?? {})
    .then((result) => sendResponse(result))
    .catch((e) => sendResponse({ error: String(e.message ?? e) }));
  return true; // async response
});
