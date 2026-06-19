if (!self.FMcp) self.FMcp = {};

// Fiverr exposes analytics via a tRPC-style batch API on the seller dashboard.
// Endpoint: GET /seller-dashboard-page/api/analyticsData?batch=1&input={}
// from/to date filtering is not supported by Fiverr's API; we filter client-side.

self.FMcp.get_analytics = async function({ gigId, from, to } = {}) {
  const input = encodeURIComponent('{}');
  const resp = await fetch(`/seller-dashboard-page/api/analyticsData?batch=1&input=${input}`, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) throw new Error(`Analytics API returned HTTP ${resp.status}`);

  const body = await resp.json();

  // tRPC batch responses are arrays: [{ result: { data: ... } }] or [{ data: ... }]
  const payload = Array.isArray(body) ? body[0] : body;
  const data = payload?.result?.data ?? payload?.data ?? payload;

  // Normalise into a flat array of gig analytics objects
  const gigs = Array.isArray(data?.gigs) ? data.gigs
             : Array.isArray(data?.gigAnalytics) ? data.gigAnalytics
             : Array.isArray(data) ? data
             : [];

  let result = gigs.map(g => ({
    gig_id:        String(g.id ?? g.gig_id ?? ''),
    gig_title:     g.title ?? g.gig_title ?? '',
    impressions:   Number(g.impressions ?? 0),
    clicks:        Number(g.clicks ?? 0),
    orders:        Number(g.orders ?? 0),
    cancellations: Number(g.cancellations ?? 0),
    rating:        g.rating ?? null,
  }));

  if (gigId) result = result.filter(g => g.gig_id === String(gigId));

  // Client-side date filter (best-effort — Fiverr may not include date fields)
  if (from) {
    const fromTs = new Date(from).getTime();
    result = result.filter(g => !g.date || new Date(g.date).getTime() >= fromTs);
  }
  if (to) {
    const toTs = new Date(to).getTime();
    result = result.filter(g => !g.date || new Date(g.date).getTime() <= toTs);
  }

  // Fallback: if API returned nothing useful, return the raw payload for debugging
  if (!result.length && gigs.length === 0) {
    return { _raw: data, note: 'API response did not match expected shape — check _raw for actual data' };
  }

  return result;
};
