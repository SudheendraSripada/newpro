import { createSupabaseServerClient, json, methodNotAllowed, readJsonBody } from '../_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  let body
  try { body = await readJsonBody(req) } catch { return json(res, 400, { error: 'Invalid JSON' }) }

  const { client: supabase, missing } = createSupabaseServerClient({ serviceRole: true })
  if (!supabase) return json(res, 501, { setupRequired: true, missing, error: 'Supabase not configured.' })

  // Best-effort insert into `dpdp_consents` table. If table missing, return helpful message.
  try {
    const { data, error } = await supabase.from('dpdp_consents').insert({
      created_at: new Date().toISOString(),
      user_agent: body.user_agent || (req.headers['user-agent'] || ''),
      ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
      purposes: body.purposes || {},
      consented: body.consented === true,
      raw_payload: body,
    })

    if (error) {
      // Likely missing table or permissions
      return json(res, 500, { error: error.message || 'Could not save consent. Ensure dpdp_consents table exists.' })
    }

    return json(res, 201, { ok: true, data: data?.[0] || null })
  } catch (err) {
    return json(res, 500, { error: err.message || 'Consent recording failed.' })
  }
}
