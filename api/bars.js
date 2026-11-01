import { fetchYahooDailyBars } from '../server/yahoo.js';
import { apiErrorStatus, assertPublicBarSymbol, enforceBarRateLimit } from '../server/policy.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    enforceBarRateLimit(req);
    const symbol = assertPublicBarSymbol(req.query?.symbol);
    const requestedDays = Number(req.query?.days);
    const tradingDays = Number.isFinite(requestedDays)
      ? Math.min(260, Math.max(60, Math.round(requestedDays)))
      : 220;
    const result = await fetchYahooDailyBars({ symbol, tradingDays });
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(apiErrorStatus(error)).json({ error: message });
  }
}
