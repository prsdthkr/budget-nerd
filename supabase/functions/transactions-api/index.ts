import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key' }
const TYPES = new Set(['subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback', 'car', 'rent', 'supplies', 'utilities'])
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)
const log = (event: string, details: Record<string, unknown> = {}) => console.log(JSON.stringify({ service: 'transactions-api', event, at: new Date().toISOString(), ...details }))

async function hashKey(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function monthForDate(value: string) { return value.slice(0, 7) + '-01' }
function validDate(value: unknown) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  log('request', { method: request.method })
  if (request.method !== 'POST') { log('request_rejected', { reason: 'method_not_allowed' }); return json({ error: 'POST required.' }, 405) }
  const rawKey = request.headers.get('X-API-Key') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!rawKey.startsWith('bn_live_')) { log('request_rejected', { reason: 'invalid_key_format' }); return json({ error: 'A valid API key is required.' }, 401) }
  const client = admin()
  const { data: keyRecord } = await client.from('user_api_keys').select('id, user_id').eq('key_hash', await hashKey(rawKey)).is('revoked_at', null).maybeSingle()
  if (!keyRecord) { log('request_rejected', { reason: 'invalid_or_revoked_key', key_prefix: rawKey.slice(0, 16) }); return json({ error: 'Invalid or revoked API key.' }, 401) }

  const body = await request.json().catch(() => null)
  const entries = Array.isArray(body) ? body : Array.isArray(body?.transactions) ? body.transactions : [body]
  if (!entries.length || entries.length > 1000) { log('request_rejected', { user_id: keyRecord.user_id, reason: 'invalid_batch_size', count: entries.length }); return json({ error: 'Send between 1 and 1000 transactions.' }, 400) }
  const rows = []
  for (const [index, entry] of entries.entries()) {
    const name = String(entry?.name || '').trim()
    const type = String(entry?.type || '').toLowerCase()
    const transactionDate = entry?.transaction_date || entry?.date
    const amount = Number(entry?.amount)
    if (!name || name.length > 120) { log('validation_failed', { user_id: keyRecord.user_id, index, reason: 'invalid_name' }); return json({ error: 'Each transaction needs a name between 1 and 120 characters.' }, 400) }
    if (!TYPES.has(type)) { log('validation_failed', { user_id: keyRecord.user_id, index, reason: 'unsupported_type', type }); return json({ error: 'Unsupported transaction type: ' + type }, 400) }
    if (!validDate(transactionDate)) { log('validation_failed', { user_id: keyRecord.user_id, index, reason: 'invalid_date' }); return json({ error: 'Each transaction needs transaction_date in YYYY-MM-DD format.' }, 400) }
    if (!Number.isFinite(amount)) { log('validation_failed', { user_id: keyRecord.user_id, index, reason: 'invalid_amount' }); return json({ error: 'Each transaction needs a numeric amount.' }, 400) }
    const statementMonth = entry?.statement_month || monthForDate(transactionDate)
    const cashflowMonth = entry?.cashflow_month === null ? null : (entry?.cashflow_month || monthForDate(transactionDate))
    if (cashflowMonth && !/^\d{4}-\d{2}-01$/.test(cashflowMonth)) return json({ error: 'cashflow_month must be YYYY-MM-01 or null.' }, 400)
    if (!/^\d{4}-\d{2}-01$/.test(statementMonth)) return json({ error: 'statement_month must be YYYY-MM-01.' }, 400)
    let cardId = entry?.card_id
    if (!cardId && entry?.card_name) {
      const { data: cards } = await client.from('credit_cards').select('id, name').eq('user_id', keyRecord.user_id).ilike('name', String(entry.card_name))
      if (cards?.length !== 1) return json({ error: 'card_name must match exactly one card.' }, 400)
      cardId = cards[0].id
    }
    if (!cardId) { log('validation_failed', { user_id: keyRecord.user_id, index, reason: 'missing_card' }); return json({ error: 'Each transaction needs card_id or card_name.' }, 400) }
    const { data: card } = await client.from('credit_cards').select('id').eq('id', cardId).eq('user_id', keyRecord.user_id).maybeSingle()
    if (!card) { log('validation_failed', { user_id: keyRecord.user_id, index, reason: 'card_not_owned' }); return json({ error: 'Card not found for this API key owner.' }, 400) }
    rows.push({ user_id: keyRecord.user_id, card_id: cardId, type, name, transaction_date: transactionDate, amount, statement_month: statementMonth, cashflow_month: cashflowMonth })
  }

  const duplicateKey = (name, date, amount) => name.trim().toLowerCase() + '|' + date + '|' + Number(amount).toFixed(2)
  const dates = [...new Set(rows.map((row) => row.transaction_date))]
  const { data: existingRows, error: existingError } = dates.length ? await client.from('card_transactions').select('name, transaction_date, amount').eq('user_id', keyRecord.user_id).in('transaction_date', dates) : { data: [], error: null }
  if (existingError) { log('duplicate_check_failed', { user_id: keyRecord.user_id, error: existingError.message }); return json({ error: existingError.message }, 500) }
  const existingKeys = new Set((existingRows || []).map((row) => duplicateKey(row.name, row.transaction_date, row.amount)))
  const seenKeys = new Set()
  const rowsToInsert = rows.filter((row) => { const key = duplicateKey(row.name, row.transaction_date, row.amount); if (existingKeys.has(key) || seenKeys.has(key)) return false; seenKeys.add(key); return true })
  const skipped = rows.length - rowsToInsert.length
  if (!rowsToInsert.length) {
    await client.from('user_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)
    log('transactions_skipped_as_duplicates', { user_id: keyRecord.user_id, skipped })
    return json({ inserted: 0, skipped, transactions: [] }, 200)
  }
  const { data, error } = await client.from('card_transactions').insert(rowsToInsert).select('id, card_id, type, name, transaction_date, amount, statement_month, cashflow_month, created_at')
  if (error) { log('insert_failed', { user_id: keyRecord.user_id, count: rowsToInsert.length, error: error.message }); return json({ error: error.message }, 500) }
  log('transactions_inserted', { user_id: keyRecord.user_id, inserted: data?.length || 0, skipped })
  await client.from('user_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)
  return json({ inserted: data?.length || 0, transactions: data || [] }, 201)
})
