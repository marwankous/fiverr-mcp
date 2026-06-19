if (!self.FMcp) self.FMcp = {};

// The manage_orders page is server-side rendered.
// Rows use div-based layout (.tbl-row) not <tr>.
// Status tabs: ?orderStatus=active|completed|cancelled|delivered|starred|late_delivery

async function waitForOrderRows(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Non-header rows inside .orders-table
    const rows = Array.from(document.querySelectorAll('.orders-table .tbl-row:not(.header)'));
    if (rows.length > 0) return rows;
    await new Promise(r => setTimeout(r, 400));
  }
  return [];
}

function parseOrderRow(row) {
  const cells = Array.from(row.querySelectorAll('.tbl-cell'));
  // Column order (from header inspection):
  // 0: star, 1: buyer, 2: gig, 3: badge, 4: due_on, 5: total, 6: note, 7: status
  const getText = (i) => cells[i]?.textContent.trim() ?? '';
  const getLink = (i) => cells[i]?.querySelector('a')?.href ?? '';
  const orderId = row.getAttribute('data-order-id') ??
                  row.querySelector('[data-order-id]')?.getAttribute('data-order-id') ??
                  getLink(1).match(/\/orders\/([^/?#]+)/)?.[1] ?? '';
  return {
    id:           orderId,
    buyer:        getText(1),
    gig_title:    getText(2),
    due_on:       getText(4),
    total:        getText(5),
    status:       getText(7),
    order_url:    getLink(1),
  };
}

self.FMcp.list_orders = async function({ status } = {}) {
  // Map MCP status names to Fiverr's orderStatus query param values
  const statusMap = {
    active:    'active',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  const fiverr_status = status ? (statusMap[status.toLowerCase()] ?? 'active') : 'active';

  // Navigate to the right status tab if we're not already there
  const currentStatus = new URLSearchParams(window.location.search).get('orderStatus');
  if (currentStatus !== fiverr_status) {
    const link = document.querySelector(`a[href*="orderStatus=${fiverr_status}"]`);
    if (link) {
      link.click();
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const rows = await waitForOrderRows();
  if (!rows.length) return [];   // no orders for this status
  return rows.map(parseOrderRow);
};

self.FMcp.get_order = async function({ orderId }) {
  // Try active tab first, then search other tabs
  const statusOptions = ['active', 'completed', 'cancelled', 'delivered'];
  for (const s of statusOptions) {
    const link = document.querySelector(`a[href*="orderStatus=${s}"]`);
    if (link) { link.click(); await new Promise(r => setTimeout(r, 1200)); }
    const rows = await waitForOrderRows(3000);
    const row = rows.find(r => {
      const id = r.getAttribute('data-order-id') ??
                 parseOrderRow(r).id;
      return String(id) === String(orderId);
    });
    if (row) return parseOrderRow(row);
  }
  throw new Error(`Order ${orderId} not found`);
};
