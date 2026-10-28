import { defineConfig } from 'vite';
import { fetchMassiveDailyBars } from './server/massive.js';

export default defineConfig({
  plugins: [
    {
      name: 'atlas-market-api',
      configureServer(server) {
        server.middlewares.use('/api/bars', async (req, res) => {
          try {
            const requestUrl = new URL(req.url || '/', 'http://localhost');
            const symbol = requestUrl.searchParams.get('symbol');
            const tradingDays = requestUrl.searchParams.get('days');
            const result = await fetchMassiveDailyBars({ symbol, tradingDays });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = String(error?.message || '').includes('not configured') ? 503 : 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
          }
        });
      }
    }
  ]
});
