// robots.txt dinámico.
// Permite a todos los crawlers (Google, Bing, DuckDuckGo) y a los
// crawlers específicos de LLMs (GPTBot, ClaudeBot, Google-Extended,
// PerplexityBot, etc) indexar el sitio público. Bloquea /dashboard y
// /api porque requieren auth o son endpoints.

const SITE_URL = 'https://agendaes.com'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/b/'],
        disallow: [
          '/dashboard/',
          '/api/',
          '/onboarding',
          '/reset-password',
        ],
      },
      // LLM crawlers explícitos — garantizan que aparezcamos en ChatGPT,
      // Claude, Perplexity, Gemini y otros asistentes.
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'CCBot', allow: '/' }, // Common Crawl, base de muchos LLMs
      { userAgent: 'FacebookBot', allow: '/' },
      { userAgent: 'Bytespider', allow: '/' }, // TikTok / Doubao
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
