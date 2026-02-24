export default {
  async fetch(request, env, ctx) {
    const SUPABASE_URL = env.SUPABASE_URL_ENV || 'https://plsaqkfxrrtgnrhmmcho.supabase.co';
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY_ENV || '';
    
    const url = new URL(request.url);
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    
    if (!allowedMethods.includes(request.method)) {
      return new Response('Method not allowed', { status: 405 });
    }
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': allowedMethods.join(', '),
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, Prefer',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    const targetUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);
    
    if (SUPABASE_ANON_KEY) {
      headers.set('apikey', SUPABASE_ANON_KEY);
      headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    }
    
    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.body
      });
      
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin': '*');
      responseHeaders.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, X-Client-Info, Prefer');
      
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });
      
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy error: ' + error.message, { status: 500 });
    }
  }
};
