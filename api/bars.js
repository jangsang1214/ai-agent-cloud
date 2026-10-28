import { fetchMassiveDailyBars } from '../server/massive.js';
import { apiErrorStatus, assertPublicBarSymbol } from '../server/policy.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const symbol = assertPublicBarSymbol(req.query?.symbol);
    const tradingDays = req.query?.days;
    const result = await fetchMassiveDailyBars({ symbol, tradingDays });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(apiErrorStatus(error)).json({ error: message });
  }
}
