import { fetchMassiveDailyBars } from '../server/massive.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const symbol = req.query?.symbol;
    const tradingDays = req.query?.days;
    const result = await fetchMassiveDailyBars({ symbol, tradingDays });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not configured') ? 503 : 400;
    return res.status(status).json({ error: message });
  }
}
