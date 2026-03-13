// api/create-subscription.js
// Crea un pago único con Checkout Pro de MercadoPago

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificar sesión
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'No autorizado' });

  const { plan = 'monthly' } = req.body;
  const amount = plan === 'yearly' ? 71880 : 8990;
  const title  = plan === 'yearly' ? 'CopyOS Pro — Anual' : 'CopyOS Pro — Mensual';

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: [{
          title,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: amount
        }],
        payer: { email: user.email },
        back_urls: {
          success: `${process.env.APP_URL}/?payment=success&user=${user.id}&plan=${plan}`,
          failure: `${process.env.APP_URL}/?payment=failure`,
          pending: `${process.env.APP_URL}/?payment=pending`
        },
        auto_return: 'approved',
        external_reference: `${user.id}|${plan}`
      })
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) return res.status(mpRes.status).json(mpData);

    return res.status(200).json({ init_point: mpData.init_point });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
