import { createClient } from '@supabase/supabase-js'

export function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function methodNotAllowed(res, methods = ['GET']) {
  res.setHeader('Allow', methods.join(', '))
  return json(res, 405, { error: `Method not allowed. Use ${methods.join(' or ')}.` })
}

export function createSupabaseServerClient({ serviceRole = false } = {}) {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL

  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return {
      client: null,
      missing: [
        !url ? 'SUPABASE_URL' : null,
        !key ? (serviceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY') : null,
      ].filter(Boolean),
    }
  }

  return {
    client: createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    missing: [],
  }
}

export function publicStorageUrl(supabase, bucket, path) {
  if (!bucket || !path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || null
}

function adminSecretFromAuthorization(header = '') {
  if (!header) return ''
  if (/^Bearer\s+/i.test(header)) return header.replace(/^Bearer\s+/i, '')

  if (/^Basic\s+/i.test(header)) {
    try {
      const decoded = Buffer.from(header.replace(/^Basic\s+/i, ''), 'base64').toString('utf8')
      const separator = decoded.indexOf(':')
      return separator >= 0 ? decoded.slice(separator + 1) : decoded
    } catch {
      return ''
    }
  }

  return header
}

export function requireAdmin(req, res) {
  const expected = process.env.ADMIN_ACCESS_KEY
  if (!expected) {
    json(res, 501, {
      setupRequired: true,
      error: 'ADMIN_ACCESS_KEY is not configured in the deployment environment.',
    })
    return false
  }

  const provided =
    req.headers['x-admin-key'] ||
    req.headers['X-Admin-Key'] ||
    adminSecretFromAuthorization(req.headers.authorization)

  if (!provided || provided !== expected) {
    json(res, 401, { error: 'Admin access key is missing or invalid.' })
    return false
  }

  return true
}

export async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

export async function getPortalSetting(supabase, key, fallback = null) {
  const { data, error } = await supabase
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.value ?? fallback
}

export async function upsertPortalSetting(supabase, key, value, isSecret = false) {
  const { data, error } = await supabase
    .from('portal_settings')
    .upsert(
      {
        key,
        value,
        is_secret: isSecret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('key, value, is_secret, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return data
}
