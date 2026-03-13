// api/generate.js
// Proxy seguro a Anthropic — la API key nunca sale al browser

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key (no la anon)
);

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Verificar token de sesión de Supabase
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sesión inválida' });

  // 2. Verificar usage y plan
  const { data: result } = await sb.rpc('increment_usage', { user_id: user.id });
  if (!result?.ok) {
    return res.status(403).json({ error: 'limit_reached', message: 'Límite del plan Free alcanzado' });
  }

  // 3. Llamar a Anthropic con la key del servidor
  const { system, messages, max_tokens = 1800 } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens,
        system,
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
