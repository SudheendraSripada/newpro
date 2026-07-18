import Busboy from 'busboy'
import {
  createSupabaseServerClient,
  json,
  methodNotAllowed,
  publicStorageUrl,
  requireAdmin,
} from '../_supabase.js'

function safePart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {}
    let file = null
    const busboy = Busboy({ headers: req.headers })

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (name, stream, info) => {
      const chunks = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('limit', () => reject(new Error('Uploaded file is too large.')))
      stream.on('end', () => {
        file = {
          fieldName: name,
          fileName: info.filename,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks),
        }
      })
    })

    busboy.on('error', reject)
    busboy.on('finish', () => resolve({ fields, file }))
    req.pipe(busboy)
  })
}

function splitText(text, size = 6000) {
  const clean = String(text || '').trim()
  if (!clean) return []
  const chunks = []
  for (let index = 0; index < clean.length; index += size) {
    const textContent = clean.slice(index, index + size)
    chunks.push({
      chunk_index: chunks.length,
      text_content: textContent,
      token_count: Math.ceil(textContent.length / 4),
    })
  }
  return chunks
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
    const { fields, file } = await parseMultipart(req)
    if (!file) return json(res, 400, { error: 'No PDF file was uploaded.' })
    if (file.mimeType !== 'application/pdf') return json(res, 400, { error: 'Only PDF uploads are supported.' })

    const regulation = safePart(fields.regulation).toLowerCase()
    const academicYear = Number(fields.academicYear)
    const semester = Number(fields.semester)
    const departmentCode = safePart(fields.departmentCode).toLowerCase()
    const departmentName = String(fields.departmentName || departmentCode.toUpperCase())
    const subjectCode = safePart(fields.subjectCode).toUpperCase()
    const subjectName = String(fields.subjectName || subjectCode)
    const examKind = safePart(fields.examKind || 'semester')
    const paperYear = Number(fields.paperYear)
    const fileName = safePart(file.fileName || `${subjectCode}_${paperYear}.pdf`)

    if (!regulation || !academicYear || !semester || !departmentCode || !subjectCode || !paperYear) {
      return json(res, 400, { error: 'Missing required paper metadata.' })
    }
    if (!String(fields.extractedText || '').trim()) {
      return json(res, 400, { error: 'Missing extractedText. Paste extracted PDF text so AI Predictor can analyze this paper.' })
    }

    const storagePath =
      fields.storagePath ||
      `pyqs/${regulation}/year_${academicYear}/sem_${semester}/${departmentCode}/${subjectCode}/${examKind}_${paperYear}_${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('pyq-vault')
      .upload(storagePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (uploadError) throw new Error(uploadError.message)

    const { error: departmentError } = await supabase.from('departments').upsert(
      {
        code: departmentCode,
        name: departmentName,
      },
      { onConflict: 'code' }
    )
    if (departmentError) throw new Error(departmentError.message)

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .upsert(
        {
          regulation,
          academic_year: academicYear,
          semester,
          department_code: departmentCode,
          subject_code: subjectCode,
          subject_name: subjectName,
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
          exam_kind: examKind,
          paper_year: paperYear,
          exam_label: fields.examLabel || null,
          storage_bucket: 'pyq-vault',
          storage_path: storagePath,
          file_name: file.fileName || fileName,
          file_size_bytes: file.buffer.length,
          mime_type: 'application/pdf',
          is_published: true,
        },
        { onConflict: 'storage_path' }
      )
      .select('*')
      .single()
    if (paperError) throw new Error(paperError.message)

    const chunks = splitText(fields.extractedText)
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

    return json(res, 200, {
      ok: true,
      paper: {
        ...paper,
        publicUrl: publicStorageUrl(supabase, 'pyq-vault', storagePath),
      },
      chunksInserted: chunks.length,
    })
  } catch (error) {
    return json(res, 400, { error: error.message || 'Upload failed.' })
  }
}
