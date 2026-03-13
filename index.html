// api/webhook-mp.js
// Recibe notificaciones de MercadoPago y activa el plan Pro en Supabase

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body;

  // Solo nos importan pagos aprobados
  if (type !== 'payment') return res.status(200).json({ received: true });

  try {
    // Consultar el pago en MercadoPago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    const payment = await mpRes.json();

    if (payment.status !== 'approved') return res.status(200).json({ received: true });

    // Extraer user_id del external_reference (formato: "user_id|plan")
    const [userId, plan] = (payment.external_reference || '').split('|');
    if (!userId) return res.status(400).json({ error: 'external_reference inválido' });

    // Activar Pro por 30 días (o 365 si es anual)
    await sb.rpc('upgrade_to_pro', {
      user_id: userId,
      sub_id: String(payment.id)
    });

    console.log(`✓ Usuario ${userId} activado a Pro (plan: ${plan})`);
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
