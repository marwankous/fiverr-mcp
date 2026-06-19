const NATIVE_HOST = 'com.fiverr_mcp.bridge';

// Cached seller URLs — populated on first use from the live Fiverr tab's nav links.
// Avoids hardcoding user-specific slugs (profile URL, manage_orders, analytics).
let _cachedSellerUrls = null;

async function discoverSellerUrls(tabId) {
  if (_cachedSellerUrls) return _cachedSellerUrls;
  try {
    const [frame] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const strip = el => el?.href?.split('?')[0].split('#')[0] || null;
        return {
          profile:       strip(document.querySelector('a[href*="/sellers/"][href*="/edit"]')),
          manage_orders: strip(document.querySelector('a[href*="manage_orders"]')),
          manage_gigs:   strip(document.querySelector('a[href*="manage_gigs"]')),
          analytics:     strip(document.querySelector('a[href*="seller_analytics_dashboard"]')),
          create_gig:    strip(document.querySelector('.btn-create-gig, #btn-create-gig, a[href*="manage_gigs/new"]')),
        };
      },
    });
    if (frame?.result?.manage_gigs) _cachedSellerUrls = frame.result;
  } catch (_) {}
  return _cachedSellerUrls || {};
}

// Static tool URLs — generic /users/ paths redirect to the user-specific URL automatically.
// null means "must be discovered at runtime".
const TOOL_URLS = {
  update_profile: null,   // resolved via discoverSellerUrls
  list_gigs:      'https://www.fiverr.com/users/manage_gigs',
  get_gig:        'https://www.fiverr.com/users/manage_gigs',
  create_gig:     null,   // resolved via discoverSellerUrls (.btn-create-gig href)
  update_gig:     'https://www.fiverr.com/users/manage_gigs',
  pause_gig:      'https://www.fiverr.com/users/manage_gigs',
  activate_gig:   'https://www.fiverr.com/users/manage_gigs?current_filter=suspend',
  delete_gig:     'https://www.fiverr.com/users/manage_gigs',
  list_orders:    null,   // resolved via discoverSellerUrls
  get_order:      null,   // resolved via discoverSellerUrls
  list_messages:  'https://www.fiverr.com/conversations',
  get_conversation: 'https://www.fiverr.com/conversations',
  get_analytics:  'https://www.fiverr.com/seller_dashboard',
};

// Tools that require a tab reload so the interceptor captures a fresh API response
const RELOAD_TOOLS = new Set(['list_messages', 'get_conversation', 'get_analytics']);

let port = null;

function connectNative() {
  if (port) return;
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST);
    port.onMessage.addListener(async (cmd) => {
      if (!cmd || !cmd.tool) return;
      const response = await handleCommand(cmd);
      if (port) port.postMessage(response);
    });
    port.onDisconnect.addListener(() => { port = null; });
  } catch (e) {
    console.error('Fiverr MCP: failed to connect to native host:', e);
  }
}

async function waitForTabLoad(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Tab ${tabId} did not finish loading within ${timeoutMs}ms`));
    }, timeoutMs);
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function ensureFiverrTab(url, forceReload = false) {
  const tabs = await chrome.tabs.query({ url: '*://*.fiverr.com/*' });
  if (tabs.length > 0) {
    const tabId = tabs[0].id;
    const currentBase = (tabs[0].url || '').split('?')[0].split('#')[0];
    const targetBase = url.split('?')[0].split('#')[0];
    // Navigate when base paths differ, OR when the target includes a query string
    // that the current URL lacks (e.g. ?current_filter=suspend for activate_gig).
    const currentQuery = (tabs[0].url || '').split('?')[1] || '';
    const targetQuery  = url.split('?')[1] || '';
    const needsNav = currentBase !== targetBase || (targetQuery && currentQuery !== targetQuery);
    if (needsNav) {
      await chrome.tabs.update(tabId, { url });
      await waitForTabLoad(tabId);
    } else if (forceReload) {
      await chrome.tabs.reload(tabId);
      await waitForTabLoad(tabId);
    }
    return tabId;
  }
  const tab = await chrome.tabs.create({ url });
  await waitForTabLoad(tab.id);
  return tab.id;
}

// execute_js: run code in the MAIN world of a Fiverr tab.
// Code is wrapped in an async IIFE so `await` works.
async function executeJsInTab(tabId, code) {
  const [frame] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (src) => {
      // Wrap in async IIFE so the caller can use await / return
      return new Function('return (async () => { ' + src + ' })()')();
    },
    args: [code],
  });
  return frame?.result;
}

async function handleCommand(cmd) {
  // ── execute_js ──────────────────────────────────────────────────────────────
  if (cmd.tool === 'execute_js') {
    const url  = cmd.params?.url;   // undefined = use current tab
    const code = cmd.params?.code ?? 'return undefined;';
    const forceReload = !!(cmd.params?.reload);
    try {
      let tabId;
      if (url) {
        tabId = await ensureFiverrTab(url, forceReload);
      } else {
        const tabs = await chrome.tabs.query({ url: '*://*.fiverr.com/*' });
        if (!tabs.length) return { id: cmd.id, error: 'No Fiverr tab is open' };
        tabId = tabs[0].id;
        if (forceReload) { await chrome.tabs.reload(tabId); await waitForTabLoad(tabId); }
      }
      await new Promise(r => setTimeout(r, 500));
      const result = await executeJsInTab(tabId, code);
      return { id: cmd.id, result };
    } catch (e) {
      return { id: cmd.id, error: String(e.message ?? e) };
    }
  }

  // ── get_gig / update_gig: two-step — discover edit URL, then navigate ──────
  if (cmd.tool === 'get_gig' || cmd.tool === 'update_gig') {
    try {
      // Step 1: land on manage_gigs and extract the gig's edit URL
      const listTabId = await ensureFiverrTab('https://www.fiverr.com/users/manage_gigs');
      await new Promise(r => setTimeout(r, 500));
      const editUrl = await executeJsInTab(listTabId, `
        const gigId = ${JSON.stringify(String(cmd.params.gigId))};
        for (let i = 0; i < 20; i++) {
          const rows = Array.from(document.querySelectorAll('.js-db-table tbody tr[data-id]'));
          const row = rows.find(r => r.getAttribute('data-id') === gigId);
          if (row) {
            const link = row.querySelector('a[href*="/edit"]');
            if (link) return link.href;
          }
          await new Promise(r => setTimeout(r, 500));
        }
        return null;
      `);
      if (!editUrl) return { id: cmd.id, error: `Gig ${cmd.params.gigId} not found on manage_gigs page` };

      // Step 2: navigate to the edit page and send the tool message
      const editTabId = await ensureFiverrTab(editUrl);
      await new Promise(r => setTimeout(r, 1500));
      const result = await chrome.tabs.sendMessage(editTabId, { tool: cmd.tool, params: cmd.params });
      return { id: cmd.id, result };
    } catch (e) {
      return { id: cmd.id, error: String(e.message ?? e) };
    }
  }

  // ── All other tools ──────────────────────────────────────────────────────────
  let url = TOOL_URLS[cmd.tool];

  // Resolve null URLs via nav-link discovery
  if (url === null) {
    const tabs = await chrome.tabs.query({ url: '*://*.fiverr.com/*' });
    if (!tabs.length) return { id: cmd.id, error: 'No Fiverr tab is open' };
    const discovered = await discoverSellerUrls(tabs[0].id);
    switch (cmd.tool) {
      case 'update_profile': url = discovered.profile; break;
      case 'create_gig':     url = discovered.create_gig; break;
      case 'list_orders':
      case 'get_order':      url = discovered.manage_orders; break;
      default:               break;
    }
    if (!url) return { id: cmd.id, error: `Could not determine URL for tool: ${cmd.tool}` };
  }

  try {
    const forceReload = RELOAD_TOOLS.has(cmd.tool);
    const tabId = await ensureFiverrTab(url, forceReload);
    await new Promise(r => setTimeout(r, 800));
    const result = await chrome.tabs.sendMessage(tabId, { tool: cmd.tool, params: cmd.params });
    return { id: cmd.id, result };
  } catch (e) {
    return { id: cmd.id, error: String(e.message ?? e) };
  }
}

connectNative();
chrome.runtime.onStartup.addListener(connectNative);
chrome.runtime.onInstalled.addListener(connectNative);
