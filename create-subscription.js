// api/create-subscription.js
// Crea una suscripción en MercadoPago y devuelve la URL de pago

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Planes disponibles
const PLANS = {
  monthly: {
    reason: 'CopyOS Pro — Mensual',
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 8990,  // ARS
    currency_id: 'ARS'
  },
  yearly: {
    reason: 'CopyOS Pro — Anual',
    frequency: 12,
    frequency_type: 'months',
    transaction_amount: 71880, // ARS (5990 x 12)
    currency_id: 'ARS'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificar sesión
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'No autorizado' });

  const { plan = 'monthly' } = req.body;
  const planConfig = PLANS[plan];
  if (!planConfig) return res.status(400).json({ error: 'Plan inválido' });

  try {
    // Crear suscripción en MercadoPago
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        reason: planConfig.reason,
        auto_recurring: {
          frequency: planConfig.frequency,
          frequency_type: planConfig.frequency_type,
          transaction_amount: planConfig.transaction_amount,
          currency_id: planConfig.currency_id
        },
        payer_email: user.email,
        back_url: `${process.env.APP_URL}/?payment=success`,
        external_reference: `${user.id}|${plan}` // para identificar en el webhook
      })
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) return res.status(mpRes.status).json(mpData);

    // Devolver URL de pago de MercadoPago
    return res.status(200).json({
      init_point: mpData.init_point,
      subscription_id: mpData.id
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
