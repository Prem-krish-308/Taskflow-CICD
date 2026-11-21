const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const port = process.env.PORT || 3000;
const taskUrl = process.env.TASK_SERVICE_URL || 'http://localhost:5001';
const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5002';

app.get('/health', (_req, res) => res.json({status:'ok', service:'frontend'}));

app.use(createProxyMiddleware({
  pathFilter: '/api',
  router: (req) => {
    if (req.path.startsWith('/api/tasks')) {
      return taskUrl;
    }
    if (req.path.startsWith('/api/stats')) {
      return analyticsUrl;
    }
    return taskUrl;
  },
  changeOrigin: true
}));

app.use(express.static('public'));
app.listen(port, '0.0.0.0', () => console.log(`Frontend listening on ${port}`));
