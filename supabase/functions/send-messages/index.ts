// Supabase Edge Function: sends queued WhatsApp / SMS messages.
//
// The app only ever QUEUES messages (public.records, collection "messages",
// status "queued") – and only for patients who gave consent. This function runs
// on the server with the service-role key, sends them through the provider the
// hospital configured, and marks them sent / failed. Provider secrets never
// reach the app.
//
// Deploy:   supabase functions deploy send-messages
// Secrets:  supabase secrets set WA_TOKEN=... WA_PHONE_ID=... MSG91_AUTH_KEY=... MSG91_TEMPLATE_ID=...
// Schedule: Supabase Dashboard → Integrations → Cron → every minute, POST to this function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

async function sendWhatsApp(to: string, text: string) {
  // Meta WhatsApp Cloud API. Messages outside a 24-hour customer window must
  // use pre-approved templates – configure template names per message type.
  const r = await fetch(`https://graph.facebook.com/v20.0/${Deno.env.get('WA_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('WA_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: `91${to}`, type: 'text', text: { body: text } })
  })
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${await r.text()}`)
}

async function sendSms(to: string, text: string, senderId: string) {
  // MSG91 (DLT-registered sender ID and template required in India)
  const r = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: Deno.env.get('MSG91_AUTH_KEY')!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: Deno.env.get('MSG91_TEMPLATE_ID'), sender: senderId, short_url: '0', recipients: [{ mobiles: `91${to}`, message: text }] })
  })
  if (!r.ok) throw new Error(`SMS ${r.status}: ${await r.text()}`)
}

Deno.serve(async () => {
  const { data: rows, error } = await sb.from('records').select('hospital_id, id, data').eq('collection', 'messages').eq('data->>status', 'queued').limit(100)
  if (error) return new Response(error.message, { status: 500 })
  let sent = 0, failed = 0
  for (const row of rows ?? []) {
    const m = row.data
    const { data: cfgRow } = await sb.from('records').select('data').eq('hospital_id', row.hospital_id).eq('collection', 'settings').eq('id', 'messaging').maybeSingle()
    const cfg = cfgRow?.data?.value ?? {}
    let status = 'sent', errorText = ''
    try {
      if (m.channel === 'whatsapp' && cfg.whatsappProvider === 'api') await sendWhatsApp(m.phone, m.text)
      else if (m.channel === 'sms' && ['msg91'].includes(cfg.smsProvider)) await sendSms(m.phone, m.text, cfg.senderId || 'JEEVOH')
      else status = 'skipped'
      if (status === 'sent') sent++
    } catch (e) { status = 'failed'; errorText = String(e).slice(0, 300); failed++ }
    await sb.from('records').update({ data: { ...m, status, error: errorText, sentAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
      .eq('hospital_id', row.hospital_id).eq('collection', 'messages').eq('id', row.id)
    await sb.from('changes').insert({ hospital_id: row.hospital_id, collection: 'messages', id: row.id, op: 'upsert' })
  }
  return Response.json({ sent, failed })
})
