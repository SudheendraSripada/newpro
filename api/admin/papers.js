import {
  createSupabaseServerClient,
  json,
  methodNotAllowed,
  publicStorageUrl,
  readJsonBody,
  requireAdmin,
} from '../_supabase.js'

function chunksFromText(text, size = 6000) {
  const clean = String(text || '').trim()
  if (!clean) return []
  const chunks = []
  for (let index = 0; index < clean.length; index += size) {
    chunks.push({
      chunk_index: chunks.length,
      text_content: clean.slice(index, index + size),
      token_count: Math.ceil(clean.slice(index, index + size).length / 4),
    })
  }
  return chunks
}

function normalizePayload(body) {
  const metadata = body.metadata || body
  const required = [
    'regulation',
    'academicYear',
    'semester',
    'departmentCode',
    'departmentName',
    'subjectCode',
    'subjectName',
    'examKind',
    'paperYear',
    'storagePath',
    'fileName',
  ]
  const missing = required.filter((key) => !metadata[key])
  if (missing.length) throw new Error(`Missing fields: ${missing.join(', ')}`)
  if (!String(body.extractedText || metadata.extractedText || '').trim()) {
    throw new Error('Missing extractedText. Paste extracted PDF text so AI Predictor can analyze this paper.')
  }

  return {
    metadata: {
      regulation: String(metadata.regulation).toLowerCase(),
      academicYear: Number(metadata.academicYear),
      semester: Number(metadata.semester),
      departmentCode: String(metadata.departmentCode).toLowerCase(),
      departmentName: String(metadata.departmentName),
      subjectCode: String(metadata.subjectCode).toUpperCase(),
      subjectName: String(metadata.subjectName),
      examKind: String(metadata.examKind),
      paperYear: Number(metadata.paperYear),
      examLabel: metadata.examLabel ? String(metadata.examLabel) : null,
      storageBucket: metadata.storageBucket || 'pyq-vault',
      storagePath: String(metadata.storagePath),
      fileName: String(metadata.fileName),
      fileSizeBytes: metadata.fileSizeBytes ? Number(metadata.fileSizeBytes) : null,
      mimeType: metadata.mimeType || 'application/pdf',
      pageCount: metadata.pageCount ? Number(metadata.pageCount) : null,
    },
    extractedText: body.extractedText || metadata.extractedText || '',
  }
}

async function upsertPaper(supabase, payload) {
  const { metadata, extractedText } = normalizePayload(payload)

  const { error: departmentError } = await supabase.from('departments').upsert(
    {
      code: metadata.departmentCode,
      name: metadata.departmentName,
    },
    { onConflict: 'code' }
  )
  if (departmentError) throw new Error(departmentError.message)

  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .upsert(
      {
        regulation: metadata.regulation,
        academic_year: metadata.academicYear,
        semester: metadata.semester,
        department_code: metadata.departmentCode,
        subject_code: metadata.subjectCode,
        subject_name: metadata.subjectName,
      },
      { onConflict: 'regulation,academic_year,semester,department_code,subject_code' }
    )
    .select('id')
    .single()
  if (subjectError) throw new Error(subjectError.message)

  const { data: paper, error: paperError } = await supabase
    .from('exam_papers')
    .upsert(
      {
        subject_id: subject.id,
        exam_kind: metadata.examKind,
        paper_year: metadata.paperYear,
        exam_label: metadata.examLabel,
        storage_bucket: metadata.storageBucket,
        storage_path: metadata.storagePath,
        file_name: metadata.fileName,
        file_size_bytes: metadata.fileSizeBytes,
        mime_type: metadata.mimeType,
        page_count: metadata.pageCount,
        is_published: true,
      },
      { onConflict: 'storage_path' }
    )
    .select('*')
    .single()
  if (paperError) throw new Error(paperError.message)

  const chunks = chunksFromText(extractedText)
  if (chunks.length) {
    await supabase.from('paper_text_chunks').delete().eq('paper_id', paper.id)
    const { error: chunkError } = await supabase.from('paper_text_chunks').insert(
      chunks.map((chunk) => ({
        paper_id: paper.id,
        ...chunk,
      }))
    )
    if (chunkError) throw new Error(chunkError.message)
  }

  return {
    paper: {
      ...paper,
      publicUrl: publicStorageUrl(supabase, paper.storage_bucket, paper.storage_path),
    },
    chunksInserted: chunks.length,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
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
    const body = await readJsonBody(req)
    if (Array.isArray(body.papers)) {
      const results = []
      for (const paper of body.papers) {
        results.push(await upsertPaper(supabase, paper))
      }
      return json(res, 200, { ok: true, results })
    }

    const result = await upsertPaper(supabase, body)
    return json(res, 200, { ok: true, ...result })
  } catch (error) {
    return json(res, 400, { error: error.message || 'Paper indexing failed.' })
  }
}
