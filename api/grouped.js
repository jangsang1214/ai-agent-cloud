import { fetchGroupedDailyBars } from '../server/massive.js';
import { apiErrorStatus, requireBatchToken } from '../server/policy.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error:'Method not allowed' });
  }

  try {
    requireBatchToken(req);
    const result = await fetchGroupedDailyBars({ date:req.query?.date });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(apiErrorStatus(error)).json({ error:message });
  }
}
