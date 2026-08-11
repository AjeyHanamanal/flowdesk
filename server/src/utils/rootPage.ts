import { Request, Response } from 'express';
import { config } from '../config';
import prisma from '../config/database';

function isNetlifyOrigin(origin: string) {
  return origin.endsWith('.netlify.app') || origin.endsWith('.netlify.live');
}

export function corsOriginCheck(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (config.allowedOrigins.includes(origin) || isNetlifyOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}

export async function healthCheck(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'flowdesk-api',
        database: 'connected',
        environment: config.nodeEnv,
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'API is running but database connection failed. Check DATABASE_URL on Render.',
      },
    });
  }
}

export function rootHandler(req: Request, res: Response) {
  const acceptsHtml = req.accepts('html');
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
  const frontendUrl = config.frontendUrl;

  if (acceptsHtml) {
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowDesk API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 24px; color: #1c1917; background: #faf9f7; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .tagline { color: #57534e; margin-bottom: 2rem; }
    .badge { display: inline-block; background: #ecfdf3; color: #2d6a4f; padding: 4px 10px; border-radius: 4px; font-size: 0.875rem; margin-bottom: 1.5rem; }
    a { color: #c45d2c; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { line-height: 1.8; padding-left: 1.25rem; }
    .note { background: #fff; border: 1px solid #e8e6e3; border-radius: 8px; padding: 16px; margin-top: 2rem; font-size: 0.9rem; color: #57534e; }
  </style>
</head>
<body>
  <h1>FlowDesk API</h1>
  <p class="tagline">Operations Command Center — Backend Service</p>
  <span class="badge">● Running</span>
  <p>This URL is the <strong>REST API server</strong>, not the web application UI.</p>
  ${frontendUrl ? `<p><a href="${frontendUrl}">→ Open FlowDesk App</a></p>` : '<p>Open your <strong>Netlify site URL</strong> to use the FlowDesk application.</p>'}
  <h2>API Links</h2>
  <ul>
    <li><a href="${baseUrl}/health">Health check</a></li>
    <li><a href="${baseUrl}/api/docs">Swagger documentation</a></li>
    <li><a href="${baseUrl}/api/auth/login">POST /api/auth/login</a></li>
  </ul>
  <div class="note">
    <strong>For Netlify frontend:</strong> set environment variable<br />
    <code>VITE_API_URL=${baseUrl}/api</code>
  </div>
</body>
</html>`);
    return;
  }

  res.json({
    success: true,
    data: {
      service: 'FlowDesk API',
      tagline: 'Operations Command Center',
      status: 'running',
      message: 'This is the backend API. Open your Netlify frontend URL to use the app.',
      frontend: frontendUrl || null,
      docs: '/api/docs',
      health: '/health',
      endpoints: {
        auth: '/api/auth',
        customers: '/api/customers',
        products: '/api/products',
        inventory: '/api/inventory',
        challans: '/api/challans',
        dashboard: '/api/dashboard',
        activity: '/api/activity',
      },
    },
  });
}
