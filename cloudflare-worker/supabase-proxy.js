/**
 * Cloudflare Worker для проксирования запросов к Supabase
 * Обходит блокировки Supabase в РФ
 */

export default {
  async fetch(request, env, ctx) {
    const SUPABASE_URL = env.SUPABASE_URL_ENV || 'https://plsaqkfxrrtgnrhmmcho.supabase.co';
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY_ENV || '';
    
    const url = new URL(request.url);
    
    // Разрешаем только определенные методы
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    if (!allowedMethods.includes(request.method)) {
      return new Response('Method not allowed', { status: 405 });
    }
    
    // Обработка CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // Получаем путь к API Supabase
    const supabasePath = url.pathname;
    const supabaseQuery = url.search;
    
    // Формируем URL к Supabase
    const targetUrl = `${SUPABASE_URL}${supabasePath}${supabaseQuery}`;
    
    // Копируем заголовки запроса
    const headers = new Headers(request.headers);
    
    // Добавляем API ключи для Supabase
    if (SUPABASE_ANON_KEY) {
      if (!headers.has('apikey')) {
        headers.set('apikey', SUPABASE_ANON_KEY);
      }
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      }
    }
    
    try {
      // Делаем запрос к Supabase
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.body
      });
      
      // Копируем заголовки ответа
      const responseHeaders = new Headers(response.headers);
      
      // Добавляем CORS заголовки
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, X-Client-Info, Prefer');
      
      // Возвращаем ответ
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

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, Prefer',
      'Access-Control-Max-Age': '86400',
    },
  });
}
