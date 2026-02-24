export default {
  async fetch(request, env, ctx) {
    const SUPABASE_URL = env.SUPABASE_URL_ENV || 'https://plsaqkfxrrtgnrhmmcho.supabase.co';
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY_ENV || '';
    
    const url = new URL(request.url);
    const targetUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
    
    const headers = new Headers({
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'X-Client-Info': 'cloudflare-worker'
    });
    
    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.body
      });
      
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (error) {
      return new Response('Error: ' + error.message, { status: 500 });
    }
  }
};
