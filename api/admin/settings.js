import {
  createSupabaseServerClient,
  getPortalSetting,
  json,
  methodNotAllowed,
  readJsonBody,
  requireAdmin,
  upsertPortalSetting,
} from '../_supabase.js'

const DEFAULT_PROVIDER = {
  baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
  model: 'nvidia/nemotron-3-ultra-550b-a55b',
  maxTokens: 4096,
  temperature: 0.2,
  topP: 0.7,
  systemPrompt:
    'You are an expert academic analyst for R.V.R. & J.C. College of Engineering. Only use the supplied syllabus and previous question paper text. Return strict JSON with keys: trends, short_questions, long_questions, study_strategy, data_warnings.',
}

function sanitizeProvider(input = {}) {
  return {
    baseUrl: String(input.baseUrl || DEFAULT_PROVIDER.baseUrl).trim(),
    model: String(input.model || DEFAULT_PROVIDER.model).trim(),
    maxTokens: Math.min(12000, Math.max(512, Number(input.maxTokens || DEFAULT_PROVIDER.maxTokens))),
    temperature: Math.min(2, Math.max(0, Number(input.temperature ?? DEFAULT_PROVIDER.temperature))),
    topP: Math.min(1, Math.max(0.1, Number(input.topP ?? DEFAULT_PROVIDER.topP))),
    systemPrompt: String(input.systemPrompt || DEFAULT_PROVIDER.systemPrompt).trim(),
  }
}

function maskSecret(value) {
  if (!value) return { configured: false, preview: '' }
  return {
    configured: true,
    preview: `${String(value).slice(0, 6)}...${String(value).slice(-4)}`,
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST'])
  if (!requireAdmin(req, res)) return

  const { client: supabase, missing } = createSupabaseServerClient({ serviceRole: true })
  if (!supabase) {
    return json(res, 501, {
      setupRequired: true,
      missing,
      error: 'Supabase service credentials are not configured.',
    })
  }

  try {
    if (req.method === 'GET') {
      const provider = await getPortalSetting(supabase, 'nvidia_provider', DEFAULT_PROVIDER)
      const apiKey = await getPortalSetting(supabase, 'nvidia_api_key', null)
      return json(res, 200, {
        provider: { ...DEFAULT_PROVIDER, ...provider },
        apiKey: maskSecret(process.env.NVIDIA_API_KEY || apiKey?.value),
        envOverrides: {
          nvidiaApiKey: Boolean(process.env.NVIDIA_API_KEY),
          nvidiaBaseUrl: Boolean(process.env.NVIDIA_BASE_URL),
          nvidiaModel: Boolean(process.env.NVIDIA_MODEL),
        },
      })
    }

    const body = await readJsonBody(req)
    const provider = sanitizeProvider(body.provider || body)

    if (!provider.baseUrl.startsWith('https://')) {
      return json(res, 400, { error: 'NVIDIA base URL must start with https://.' })
    }

    await upsertPortalSetting(supabase, 'nvidia_provider', provider, false)

    const nextApiKey = String(body.apiKey || '').trim()
    let savedApiKey = null
    if (nextApiKey) {
      savedApiKey = await upsertPortalSetting(
        supabase,
        'nvidia_api_key',
        {
          value: nextApiKey,
          updatedAt: new Date().toISOString(),
        },
        true
      )
    } else {
      savedApiKey = await getPortalSetting(supabase, 'nvidia_api_key', null)
    }

    return json(res, 200, {
      ok: true,
      provider,
      apiKey: maskSecret(process.env.NVIDIA_API_KEY || nextApiKey || savedApiKey?.value),
    })
  } catch (error) {
    return json(res, 500, { error: error.message || 'Admin settings request failed.' })
  }
}
