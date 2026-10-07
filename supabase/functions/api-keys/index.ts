import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

async function getUser(request: Request) {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.replace(/^Bearer\\s+/i, '')
  if (!token) return null
  const { data } = await admin().auth.getUser(token)
  return data.user || null
}

async function hashKey(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomKey() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '')
  return 'bn_live_' + encoded
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const user = await getUser(request)
  if (!user) return json({ error: 'Authentication required.' }, 401)
  const client = admin()

  if (request.method === 'GET') {
    const { data, error } = await client.from('user_api_keys').select('id, name, key_prefix, last_used_at, revoked_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) return json({ error: error.message }, 500)
    return json({ keys: data || [] })
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    if (!name || name.length > 80) return json({ error: 'A key name between 1 and 80 characters is required.' }, 400)
    const rawKey = randomKey()
    const { data, error } = await client.from('user_api_keys').insert({ user_id: user.id, name, key_prefix: rawKey.slice(0, 16), key_hash: await hashKey(rawKey) }).select('id, name, key_prefix, created_at').single()
    if (error) return json({ error: error.message }, 500)
    return json({ key: rawKey, record: data }, 201)
  }

  if (request.method === 'PATCH') {
    const body = await request.json().catch(() => ({}))
    const { data, error } = await client.from('user_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', body.id).eq('user_id', user.id).select('id, revoked_at').single()
    if (error) return json({ error: error.message }, 500)
    return json({ key: data })
  }

  return json({ error: 'Method not allowed.' }, 405)
})
