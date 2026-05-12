// supabase/functions/generate-report/index.ts
// Runs daily at 06:00 UTC via cron: 0 6 * * *
// Fetches all containers, generates a summary, emails to owner

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM  = Deno.env.get('RESEND_FROM_EMAIL') ?? 'rapports@groupejfplus.com'
const OWNER_EMAIL  = Deno.env.get('OWNER_EMAIL') ?? 'info@groupejfplus.com'

const STATUS_LABELS: Record<string, string> = {
  in_transit: 'En transit', at_port: 'Au port', customs: 'En douane',
  delivered: 'Livré', delayed: 'Retardé', loading: 'Chargement',
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: containers, error } = await supabase
    .from('containers')
    .select('*')
    .order('status', { ascending: true })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const stats = {
    total: containers?.length ?? 0,
    in_transit: containers?.filter(c => c.status === 'in_transit').length ?? 0,
    at_port: containers?.filter(c => c.status === 'at_port').length ?? 0,
    customs: containers?.filter(c => c.status === 'customs').length ?? 0,
    delayed: containers?.filter(c => c.status === 'delayed').length ?? 0,
    delivered: containers?.filter(c => c.status === 'delivered').length ?? 0,
    loading: containers?.filter(c => c.status === 'loading').length ?? 0,
  }

  const today = new Date().toLocaleDateString('fr-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const rows = (containers ?? []).map(c => `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 10px;font-family:monospace;font-weight:600;color:#4f46e5">${c.container_number}</td>
      <td style="padding:8px 10px">${c.client_name}</td>
      <td style="padding:8px 10px;color:#6b7280">${c.origin} → ${c.destination}</td>
      <td style="padding:8px 10px"><strong>${STATUS_LABELS[c.status] ?? c.status}</strong></td>
      <td style="padding:8px 10px;color:#6b7280">${c.last_location}</td>
      <td style="padding:8px 10px;color:#6b7280">${c.eta ? new Date(c.eta).toLocaleDateString('fr-CA') : '—'}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto">
      <div style="background:#1e1b4b;color:white;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">Groupe JF Plus</h1>
        <p style="margin:6px 0 0;opacity:.7">Rapport journalier — ${today}</p>
      </div>

      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px">
        <h2 style="font-size:16px;color:#1f2937;margin:0 0 16px">Résumé</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">
          ${Object.entries(stats).map(([k, v]) => `
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 18px;min-width:80px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:${k === 'delayed' ? '#dc2626' : k === 'delivered' ? '#16a34a' : '#1e1b4b'}">${v}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px">${k === 'total' ? 'Total' : STATUS_LABELS[k] ?? k}</div>
            </div>
          `).join('')}
        </div>

        <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">Détail des conteneurs</h2>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">N°</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Client</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Trajet</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Statut</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Localisation</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">ETA</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px">
          Rapport généré automatiquement à 06h00 UTC · Groupe JF Plus · info@groupejfplus.com
        </p>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: OWNER_EMAIL,
      subject: `Rapport journalier conteneurs — ${new Date().toLocaleDateString('fr-CA')}`,
      html,
    }),
  })

  return new Response(JSON.stringify({
    ok: res.ok,
    containers: stats.total,
    delayed: stats.delayed,
  }), { headers: { 'Content-Type': 'application/json' } })
})
