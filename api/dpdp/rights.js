import { createSupabaseServerClient, json, methodNotAllowed, readJsonBody } from '../_supabase.js'

export default async function handler(req, res) {
  if (!['POST'].includes(req.method)) return methodNotAllowed(res, ['POST'])

  let body
  try { body = await readJsonBody(req) } catch { return json(res, 400, { error: 'Invalid JSON' }) }

  const { client: supabase, missing } = createSupabaseServerClient({ serviceRole: true })
  if (!supabase) return json(res, 501, { setupRequired: true, missing, error: 'Supabase not configured.' })

  try {
    const insert = {
      created_at: new Date().toISOString(),
      name: body.name || '',
      email: body.email || '',
      request_type: body.request_type || 'access',
      details: body.details || '',
      status: 'received',
      raw_payload: body,
    }

    const { data, error } = await supabase.from('dpdp_requests').insert(insert)
    if (error) return json(res, 500, { error: error.message || 'Could not save request. Ensure dpdp_requests table exists.' })

    return json(res, 201, { ok: true, data: data?.[0] || null })
  } catch (err) {
    return json(res, 500, { error: err.message || 'Could not record rights request.' })
  }
}
