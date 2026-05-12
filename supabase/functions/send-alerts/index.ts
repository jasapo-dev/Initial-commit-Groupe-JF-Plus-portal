// supabase/functions/send-alerts/index.ts
// Triggered by cron schedule: */15 * * * *
// Checks alert rules and dispatches SMS (Twilio) + email (Resend)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_FROM  = Deno.env.get('TWILIO_FROM_NUMBER')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM  = Deno.env.get('RESEND_FROM_EMAIL') ?? 'alerts@groupejfplus.com'

const STATUS_LABELS: Record<string, string> = {
  in_transit: 'En transit', at_port: 'Au port', customs: 'En douane',
  delivered: 'Livré', delayed: 'Retardé', loading: 'Chargement',
}

serve(async (req) => {
  // Allow cron trigger (no auth header) and manual trigger (Bearer token)
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Get active rules
  const { data: rules, error: rulesErr } = await supabase
    .from('alert_rules')
    .select('*, container:containers(*)')
    .eq('is_active', true)

  if (rulesErr) return new Response(JSON.stringify({ error: rulesErr.message }), { status: 500 })

  const results: string[] = []

  for (const rule of rules ?? []) {
    // Find containers matching this rule
    let query = supabase.from('containers').select('*')
    if (rule.container_id) {
      query = query.eq('id', rule.container_id)
    }
    if (rule.trigger_status !== 'any') {
      query = query.eq('status', rule.trigger_status)
    }

    // Only alert on containers updated since last trigger
    if (rule.last_triggered) {
      query = query.gt('updated_at', rule.last_triggered)
    }

    const { data: containers } = await query
    if (!containers?.length) continue

    for (const container of containers) {
      const statusLabel = STATUS_LABELS[container.status] ?? container.status
      const message = `[Groupe JF Plus] Conteneur ${container.container_number} (${container.client_name}) : ${statusLabel} — ${container.last_location}`

      // SMS via Twilio
      if (rule.notify_sms) {
        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ To: rule.notify_sms, From: TWILIO_FROM, Body: message }),
            }
          )
          const ok = res.ok
          await supabase.from('alert_log').insert({
            rule_id: rule.id, container_id: container.id,
            channel: 'sms', recipient: rule.notify_sms, message,
            success: ok, error: ok ? null : await res.text(),
          })
          results.push(`SMS→${rule.notify_sms}: ${ok ? 'ok' : 'fail'}`)
        } catch (e) {
          results.push(`SMS error: ${e}`)
        }
      }

      // Email via Resend
      if (rule.notify_email) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: rule.notify_email,
              subject: `Alerte conteneur : ${container.container_number} — ${statusLabel}`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:#1e1b4b;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
                    <h2 style="margin:0;font-size:18px">Groupe JF Plus</h2>
                    <p style="margin:4px 0 0;opacity:.7;font-size:13px">Alerte de suivi conteneur</p>
                  </div>
                  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
                    <table style="width:100%;border-collapse:collapse;font-size:14px">
                      <tr><td style="padding:6px 0;color:#6b7280">Numéro</td><td style="font-weight:600;font-family:monospace">${container.container_number}</td></tr>
                      <tr><td style="padding:6px 0;color:#6b7280">Client</td><td>${container.client_name}</td></tr>
                      <tr><td style="padding:6px 0;color:#6b7280">Statut</td><td><strong>${statusLabel}</strong></td></tr>
                      <tr><td style="padding:6px 0;color:#6b7280">Localisation</td><td>${container.last_location}</td></tr>
                      <tr><td style="padding:6px 0;color:#6b7280">Trajet</td><td>${container.origin} → ${container.destination}</td></tr>
                      ${container.eta ? `<tr><td style="padding:6px 0;color:#6b7280">ETA</td><td>${new Date(container.eta).toLocaleDateString('fr-CA')}</td></tr>` : ''}
                    </table>
                    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">
                      Cet avis a été envoyé automatiquement par le système de suivi Groupe JF Plus.
                    </p>
                  </div>
                </div>
              `,
            }),
          })
          const ok = res.ok
          await supabase.from('alert_log').insert({
            rule_id: rule.id, container_id: container.id,
            channel: 'email', recipient: rule.notify_email, message,
            success: ok, error: ok ? null : await res.text(),
          })
          results.push(`Email→${rule.notify_email}: ${ok ? 'ok' : 'fail'}`)
        } catch (e) {
          results.push(`Email error: ${e}`)
        }
      }
    }

    // Update last_triggered
    await supabase.from('alert_rules').update({ last_triggered: new Date().toISOString() }).eq('id', rule.id)
  }

  return new Response(JSON.stringify({ dispatched: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
