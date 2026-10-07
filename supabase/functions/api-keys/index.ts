import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)
const log = (event: string, details: Record<string, unknown> = {}) => console.log(JSON.stringify({ service: 'api-keys', event, at: new Date().toISOString(), ...details }))

async function getUser(request: Request) {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) { log('auth_missing_token'); return null }
  const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: 'Bearer ' + token } } })
  const { data, error } = await authClient.auth.getUser()
  if (error || !data.user) log('auth_failed', { reason: error?.message || 'no_user' })
  return data.user || null
}

async function hashKey(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomKey() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return 'bn_live_' + encoded
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  log('request', { method: request.method })
  const user = await getUser(request)
  if (!user) { log('request_rejected', { reason: 'authentication_required' }); return json({ error: 'Authentication required.' }, 401) }
  const client = admin()

  if (request.method === 'GET') {
    const { data, error } = await client.from('user_api_keys').select('id, name, key_prefix, last_used_at, revoked_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) { log('list_failed', { user_id: user.id, error: error.message }); return json({ error: error.message }, 500) }
    log('keys_listed', { user_id: user.id, count: data?.length || 0 })
    return json({ keys: data || [] })
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    if (!name || name.length > 80) { log('create_rejected', { user_id: user.id, reason: 'invalid_name' }); return json({ error: 'A key name between 1 and 80 characters is required.' }, 400) }
    const rawKey = randomKey()
    const { data, error } = await client.from('user_api_keys').insert({ user_id: user.id, name, key_prefix: rawKey.slice(0, 16), key_hash: await hashKey(rawKey) }).select('id, name, key_prefix, created_at').single()
    if (error) { log('create_failed', { user_id: user.id, error: error.message }); return json({ error: error.message }, 500) }
    log('key_created', { user_id: user.id, key_id: data.id, key_prefix: rawKey.slice(0, 16) })
    return json({ key: rawKey, record: data }, 201)
  }

  if (request.method === 'PATCH') {
    const body = await request.json().catch(() => ({}))
    const { data, error } = await client.from('user_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', body.id).eq('user_id', user.id).select('id, revoked_at').single()
    if (error) { log('revoke_failed', { user_id: user.id, error: error.message }); return json({ error: error.message }, 500) }
    log('key_revoked', { user_id: user.id, key_id: data.id })
    return json({ key: data })
  }

  return json({ error: 'Method not allowed.' }, 405)
})
