const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com/gsi/client",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://*.vercel-storage.com https://*.googleusercontent.com https://opengraph.githubassets.com",
      "media-src 'self' blob: data: https:",
      "connect-src 'self' https://api.github.com https://*.supabase.co https://n8n.shivpatel.in https://*.vercel-storage.com https://accounts.google.com/gsi/ https://apis.google.com",
      "frame-src 'self' https://accounts.google.com/gsi/ https://docs.google.com/picker",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ')
  }
];

export default {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ['mysql2', 'nodemailer', '@vercel/blob'],
  async rewrites(){
    return {beforeFiles:process.env.NODE_ENV==='development'&&process.env.MASTER_DASHBOARD_LOCAL==='1'?[{source:'/',destination:'/dashboard'}]:[]};
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...['api', 'dashboard', 'master-assets'].map(path => ({
        source: `/${path}/:path*`,
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }]
      }))
    ];
  }
};
