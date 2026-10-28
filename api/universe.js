import { fetchActiveStockUniverse } from '../server/massive.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error:'Method not allowed' });
  }
  try {
    const maxPages = req.query?.pages;
    const result = await fetchActiveStockUniverse({ maxPages });
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(message.includes('not configured') ? 503 : 400).json({ error:message });
  }
}
