import { createSupabaseServerClient, getPortalSetting, json, methodNotAllowed, readJsonBody } from './_supabase.js'

const REGULATION_STARTS = [
  { admissionYear: 2024, regulation: 'r24' },
  { admissionYear: 2023, regulation: 'r23' },
  { admissionYear: 2022, regulation: 'r22' },
  { admissionYear: 2021, regulation: 'r21' },
  { admissionYear: 2020, regulation: 'r20' },
]

function resolveCurrentRegulation(academicYear, now = new Date()) {
  const calendarYear = now.getFullYear()
  const academicStartYear = now.getMonth() >= 5 ? calendarYear : calendarYear - 1
  const admissionYear = academicStartYear - (Number(academicYear) - 1)
  const match = REGULATION_STARTS.find((item) => admissionYear >= item.admissionYear)
  return match?.regulation || 'r20'
}

function fallbackRegulations(currentRegulation, examKind, currentPaperCount) {
  const all = REGULATION_STARTS.map((item) => item.regulation)
  const currentIndex = all.indexOf(currentRegulation)
  const ordered = currentIndex >= 0 ? all.slice(currentIndex) : [currentRegulation, ...all]

  if (examKind === 'semester') return ordered.slice(0, 4)
  if (currentPaperCount < 3) return ordered.slice(0, 4)
  return [currentRegulation]
}

const DEFAULT_PROVIDER = {
  baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
  model: 'nvidia/nemotron-3-ultra-550b-a55b',
  maxTokens: 4096,
  temperature: 0.2,
  topP: 0.7,
  systemPrompt:
    'You are an expert academic analyst for R.V.R. & J.C. College of Engineering. Only use the supplied syllabus and previous question paper text. Return strict JSON with keys: trends, short_questions, long_questions, study_strategy, data_warnings.',
}

function safeJsonParse(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

async function loadSubject(supabase, payload, regulation) {
  if (payload.subjectId) {
    const { data, error } = await supabase.from('subjects').select('*').eq('id', payload.subjectId).limit(1)
    if (error) throw new Error(error.message)
    return data?.[0] || null
  }

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('regulation', regulation)
    .eq('academic_year', Number(payload.academicYear))
    .eq('semester', Number(payload.semester))
    .eq('department_code', String(payload.departmentCode).toLowerCase())
    .eq('subject_code', String(payload.subjectCode).toUpperCase())
    .limit(1)

  if (error) throw new Error(error.message)
  return data?.[0] || null
}

async function loadContext(supabase, subject, payload, regulation) {
  const examKind = payload.examKind
  const baseSubjectQuery = supabase
    .from('subjects')
    .select('id, regulation, subject_code, subject_name')
    .eq('academic_year', subject.academic_year)
    .eq('semester', subject.semester)
    .eq('department_code', subject.department_code)
    .eq('subject_code', subject.subject_code)

  const { data: currentSubjects, error: currentSubjectsError } = await baseSubjectQuery.eq('regulation', regulation)
  if (currentSubjectsError) throw new Error(currentSubjectsError.message)

  const currentSubjectIds = (currentSubjects || []).map((item) => item.id)
  let currentPaperCount = 0
  if (currentSubjectIds.length) {
    const { count, error } = await supabase
      .from('exam_papers')
      .select('id', { count: 'exact', head: true })
      .in('subject_id', currentSubjectIds)
      .eq('exam_kind', examKind)
      .eq('is_published', true)
    if (error) throw new Error(error.message)
    currentPaperCount = count || 0
  }

  const regulations = fallbackRegulations(regulation, examKind, currentPaperCount)
  const { data: matchingSubjects, error: matchingSubjectsError } = await supabase
    .from('subjects')
    .select('id, regulation, subject_code, subject_name')
    .eq('academic_year', subject.academic_year)
    .eq('semester', subject.semester)
    .eq('department_code', subject.department_code)
    .eq('subject_code', subject.subject_code)
    .in('regulation', regulations)

  if (matchingSubjectsError) throw new Error(matchingSubjectsError.message)

  const subjectIds = (matchingSubjects || []).map((item) => item.id)
  const { data: papers, error: papersError } = await supabase
    .from('exam_papers')
    .select('id, exam_kind, paper_year, exam_label, subject_id')
    .in('subject_id', subjectIds)
    .eq('exam_kind', examKind)
    .eq('is_published', true)
    .order('paper_year', { ascending: false })

  if (papersError) throw new Error(papersError.message)

  const paperIds = (papers || []).map((paper) => paper.id)
  const { data: paperChunks, error: paperChunksError } = paperIds.length
    ? await supabase
        .from('paper_text_chunks')
        .select('paper_id, chunk_index, text_content, token_count')
        .in('paper_id', paperIds)
        .order('paper_id', { ascending: true })
        .order('chunk_index', { ascending: true })
    : { data: [], error: null }

  if (paperChunksError) throw new Error(paperChunksError.message)

  const { data: syllabi, error: syllabiError } = await supabase
    .from('subject_syllabi')
    .select('id, source_url')
    .eq('subject_id', subject.id)
    .eq('is_active', true)
    .limit(1)

  if (syllabiError) throw new Error(syllabiError.message)

  const syllabus = syllabi?.[0] || null
  const { data: units, error: unitsError } = syllabus
    ? await supabase
        .from('syllabus_units')
        .select('unit_number, title, content, outcomes')
        .eq('syllabus_id', syllabus.id)
        .order('unit_number', { ascending: true })
    : { data: [], error: null }

  if (unitsError) throw new Error(unitsError.message)

  return {
    regulations,
    papers: papers || [],
    paperChunks: paperChunks || [],
    syllabus,
    units: units || [],
  }
}

function buildPrompt(subject, payload, context, provider) {
  const syllabusText = context.units
    .map((unit) => `Unit ${unit.unit_number}: ${unit.title || 'Untitled'}\n${unit.content}`)
    .join('\n\n')

  const paperLookup = new Map(context.papers.map((paper) => [paper.id, paper]))
  const pyqText = context.paperChunks
    .map((chunk) => {
      const paper = paperLookup.get(chunk.paper_id)
      const label = paper ? `${paper.paper_year} ${paper.exam_label || paper.exam_kind}` : chunk.paper_id
      return `[${label} | chunk ${chunk.chunk_index}]\n${chunk.text_content}`
    })
    .join('\n\n')

  return [
    {
      role: 'system',
      content: provider.systemPrompt || DEFAULT_PROVIDER.systemPrompt,
    },
    {
      role: 'user',
      content: `Student target:
- Department: ${subject.department_code}
- Subject: ${subject.subject_code} - ${subject.subject_name}
- Academic year: ${subject.academic_year}
- Semester: ${subject.semester}
- Exam type: ${payload.examKind}
- Regulations analyzed: ${context.regulations.join(', ')}

Official syllabus:
${syllabusText || 'No syllabus units were found.'}

Previous papers:
${pyqText || 'No extracted previous paper text was found.'}

Generate:
1. Topic trend map with frequency and exact paper appearances.
2. High-yield short questions.
3. High-yield long questions grouped by syllabus unit.
4. Brief study strategy.
5. Data warnings if the dataset is weak or incomplete.`,
    },
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const { client: supabase, missing } = createSupabaseServerClient({ serviceRole: true })
  if (!supabase) {
    return json(res, 501, {
      setupRequired: true,
      missing,
      error: 'Supabase server credentials are not configured.',
    })
  }

  let payload
  try {
    payload = await readJsonBody(req)
  } catch {
    return json(res, 400, { error: 'Invalid JSON request body.' })
  }

  const examKind = payload.examKind || payload.target_exam
  payload.examKind = examKind
  if (payload.departmentCode) payload.departmentCode = String(payload.departmentCode).toLowerCase()
  if (payload.subjectCode) payload.subjectCode = String(payload.subjectCode).toUpperCase()
  const required = ['academicYear', 'semester', 'departmentCode', 'subjectCode', 'examKind']
  const missingFields = required.filter((key) => !payload[key] && !payload.subjectId)
  if (!payload.subjectId && missingFields.length) {
    return json(res, 400, { error: `Missing fields: ${missingFields.join(', ')}` })
  }

  const currentRegulation = payload.regulation || resolveCurrentRegulation(payload.academicYear)

  try {
    const subject = await loadSubject(supabase, payload, currentRegulation)
    if (!subject) return json(res, 404, { error: 'Subject was not found for the selected regulation.' })

    const context = await loadContext(supabase, subject, payload, currentRegulation)
    if (!context.paperChunks.length && !context.units.length) {
      return json(res, 422, {
        error: 'No extracted PYQ or syllabus text is available yet for this subject.',
        currentRegulation,
        fallbackRegulations: context.regulations,
      })
    }

    const savedProvider = await getPortalSetting(supabase, 'nvidia_provider', DEFAULT_PROVIDER)
    const savedApiKey = await getPortalSetting(supabase, 'nvidia_api_key', null)
    const provider = {
      ...DEFAULT_PROVIDER,
      ...savedProvider,
      baseUrl: process.env.NVIDIA_BASE_URL || savedProvider?.baseUrl || DEFAULT_PROVIDER.baseUrl,
      model: process.env.NVIDIA_MODEL || savedProvider?.model || DEFAULT_PROVIDER.model,
    }
    const nvidiaApiKey = process.env.NVIDIA_API_KEY || savedApiKey?.value

    const runPayload = {
      subject_id: subject.id,
      exam_kind: payload.examKind,
      student_academic_year: Number(payload.academicYear || subject.academic_year),
      student_semester: Number(payload.semester || subject.semester),
      current_regulation: currentRegulation,
      fallback_regulations: context.regulations.filter((item) => item !== currentRegulation),
      input_paper_ids: context.papers.map((paper) => paper.id),
      model_provider: 'nvidia',
      model_name: provider.model,
      prompt_version: 'v1',
      status: 'processing',
    }

    const { data: run } = await supabase.from('ai_prediction_runs').insert(runPayload).select('id').single()

    if (!nvidiaApiKey) {
      return json(res, 501, {
        setupRequired: true,
        error: 'NVIDIA API key is not configured. Add it in the Admin dashboard or deployment environment.',
        runId: run?.id,
        currentRegulation,
        fallbackRegulations: context.regulations,
        papersUsed: context.papers.length,
        syllabusUnits: context.units.length,
      })
    }

    const response = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nvidiaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: buildPrompt(subject, payload, context, provider),
        temperature: provider.temperature,
        top_p: provider.topP,
        max_tokens: provider.maxTokens,
        response_format: { type: 'json_object' },
      }),
    })

    const raw = await response.json()
    if (!response.ok) {
      const message = raw?.error?.message || raw?.message || 'NVIDIA API request failed.'
      if (run?.id) {
        await supabase.from('ai_prediction_runs').update({ status: 'failed', error_message: message }).eq('id', run.id)
      }
      return json(res, response.status, { error: message, details: raw })
    }

    const content = raw?.choices?.[0]?.message?.content
    const parsed = safeJsonParse(content) || { raw: content }

    if (run?.id) {
      await supabase
        .from('ai_prediction_runs')
        .update({ status: 'ready', result: parsed, completed_at: new Date().toISOString() })
        .eq('id', run.id)
    }

    return json(res, 200, {
      runId: run?.id,
      currentRegulation,
      fallbackRegulations: context.regulations.filter((item) => item !== currentRegulation),
      papersUsed: context.papers.length,
      syllabusUnits: context.units.length,
      prediction: parsed,
    })
  } catch (error) {
    return json(res, 500, { error: error.message || 'Prediction failed.' })
  }
}
