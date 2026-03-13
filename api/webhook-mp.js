// api/webhook-mp.js
// Recibe notificaciones de MercadoPago y actualiza el plan en Supabase

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body;

  // Solo nos importan los eventos de suscripción
  if (type !== 'subscription_preapproval') {
    return res.status(200).json({ received: true });
  }

  try {
    // Consultar el estado de la suscripción en MercadoPago
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    const subscription = await mpRes.json();

    // Extraer user_id del external_reference (formato: "user_id|plan")
    const [userId, plan] = (subscription.external_reference || '').split('|');
    if (!userId) return res.status(400).json({ error: 'external_reference inválido' });

    const status = subscription.status;

    if (status === 'authorized') {
      // Pago confirmado → activar Pro
      await sb.rpc('upgrade_to_pro', {
        user_id: userId,
        sub_id: subscription.id
      });
      console.log(`✓ Usuario ${userId} actualizado a Pro`);

    } else if (status === 'cancelled' || status === 'paused') {
      // Suscripción cancelada → volver a Free
      await sb.rpc('downgrade_to_free', { user_id: userId });
      console.log(`↓ Usuario ${userId} volvió a Free`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
