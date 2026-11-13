export default {
  poweredByHeader: false,
  outputFileTracingIncludes: {'/dashboard/3d':['./control-room/static/hq.html'],'/hq/*':['./control-room/static/hq/*']},
  devIndicators: false,
  serverExternalPackages: ['mysql2', 'nodemailer', '@vercel/blob'],
  async rewrites(){
    return {beforeFiles:process.env.NODE_ENV==='development'&&process.env.MASTER_DASHBOARD_LOCAL==='1'?[{source:'/',destination:'/dashboard'}]:[]};
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }, ...['api', 'dashboard', 'hq', 'master-assets'].map(path => ({
      source: `/${path}/:path*`,
      headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }]
    }))];
  }
};
