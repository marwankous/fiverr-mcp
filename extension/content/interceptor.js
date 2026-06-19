// Intercepts Fiverr's internal API calls in the MAIN world and buffers them
// so content-script action handlers can consume them via waitForApiData().
// Currently a ring-buffer of the last 20 responses; extend API_PATTERNS as needed.
(function () {
  if (window.__fmcpIntercepted) return;
  window.__fmcpIntercepted = true;

  // Capture any /api/ call on fiverr.com — broad pattern intentionally
  const API_PATTERNS = [
    /fiverr\.com\/api\//,
    /fiverr\.com\/seller-dashboard-page\/api\//,
    /fiverr\.com\/inbox\//,
    /fiverr\.com\/manage_orders/,
  ];

  window.__fmcpBuffer = [];

  function shouldIntercept(url) {
    return API_PATTERNS.some(p => p.test(String(url)));
  }

  function postAndBuffer(url, data) {
    window.__fmcpBuffer.push({ url, data });
    if (window.__fmcpBuffer.length > 20) window.__fmcpBuffer.shift();
    window.postMessage({ source: 'fiverr-mcp-interceptor', url, data }, window.location.origin);
  }

  window.addEventListener('message', function (e) {
    if (e.data?.source === 'fiverr-mcp-flush-request') {
      for (const entry of window.__fmcpBuffer) {
        window.postMessage({ source: 'fiverr-mcp-interceptor', url: entry.url, data: entry.data }, window.location.origin);
      }
    }
  });

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '');
    if (shouldIntercept(url)) {
      response.clone().json().then(data => postAndBuffer(url, data)).catch(() => {});
    }
    return response;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._fmcpUrl = String(url);
    return origOpen.call(this, method, url, ...rest);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (shouldIntercept(this._fmcpUrl ?? '')) {
      this.addEventListener('load', () => {
        try { postAndBuffer(this._fmcpUrl, JSON.parse(this.responseText)); } catch (_) {}
      });
    }
    return origSend.apply(this, args);
  };
})();
