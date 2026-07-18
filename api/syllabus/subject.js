import { createSupabaseServerClient, json, methodNotAllowed, publicStorageUrl } from '../_supabase.js'

function getQuery(req) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
  return Object.fromEntries(url.searchParams.entries())
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const { client: supabase, missing } = createSupabaseServerClient()
  if (!supabase) {
    return json(res, 200, {
      setupRequired: true,
      missing,
      subject: null,
      syllabus: null,
      units: [],
      message: 'Supabase environment variables are not configured yet.',
    })
  }

  const params = getQuery(req)
  let subjectQuery = supabase.from('subjects').select('*').limit(1)

  if (params.subjectId) {
    subjectQuery = subjectQuery.eq('id', params.subjectId)
  } else {
    const required = ['regulation', 'academicYear', 'semester', 'departmentCode', 'subjectCode']
    const missingParams = required.filter((key) => !params[key])
    if (missingParams.length) {
      return json(res, 400, { error: `Missing query params: ${missingParams.join(', ')}` })
    }

    subjectQuery = subjectQuery
      .eq('regulation', params.regulation)
      .eq('academic_year', Number(params.academicYear))
      .eq('semester', Number(params.semester))
      .eq('department_code', String(params.departmentCode).toLowerCase())
      .eq('subject_code', String(params.subjectCode).toUpperCase())
  }

  const { data: subjects, error: subjectError } = await subjectQuery
  if (subjectError) return json(res, 500, { error: subjectError.message })

  const subject = subjects?.[0]
  if (!subject) return json(res, 404, { error: 'Subject not found.' })

  const { data: syllabi, error: syllabusError } = await supabase
    .from('subject_syllabi')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (syllabusError) return json(res, 500, { error: syllabusError.message })

  const syllabus = syllabi?.[0] || null
  if (!syllabus) {
    return json(res, 200, { subject, syllabus: null, units: [] })
  }

  const { data: units, error: unitsError } = await supabase
    .from('syllabus_units')
    .select('*')
    .eq('syllabus_id', syllabus.id)
    .order('unit_number', { ascending: true })

  if (unitsError) return json(res, 500, { error: unitsError.message })

  return json(res, 200, {
    subject,
    syllabus: {
      ...syllabus,
      fileUrl: publicStorageUrl(supabase, syllabus.storage_bucket, syllabus.storage_path),
    },
    units: units || [],
  })
}
