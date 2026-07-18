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
    const files = []
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 100,
        fileSize: 25 * 1024 * 1024,
      },
    })

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (name, stream, info) => {
      const chunks = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('limit', () => reject(new Error('Uploaded file is too large.')))
      stream.on('end', () => {
        files.push({
          fieldName: name,
          fileName: info.filename,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks),
        })
      })
    })

    busboy.on('error', reject)
    busboy.on('finish', () => resolve({ fields, file: files[0] || null, files }))
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

function normalizeUploadMetadata(input, file) {
  const regulation = safePart(input.regulation).toLowerCase()
  const academicYear = Number(input.academicYear)
  const semester = Number(input.semester)
  const departmentCode = safePart(input.departmentCode).toLowerCase()
  const departmentName = String(input.departmentName || departmentCode.toUpperCase())
  const subjectCode = safePart(input.subjectCode).toUpperCase()
  const subjectName = String(input.subjectName || subjectCode)
  const examKind = safePart(input.examKind || 'semester').toLowerCase()
  const paperYear = Number(input.paperYear)
  const fileName = safePart(input.fileName || file?.fileName || `${subjectCode}_${paperYear}.pdf`)
  const storagePath = String(input.storagePath || '').trim()

  if (!regulation || !academicYear || !semester || !departmentCode || !subjectCode || !paperYear) {
    throw new Error('Missing required paper metadata.')
  }

  return {
    regulation,
    academicYear,
    semester,
    departmentCode,
    departmentName,
    subjectCode,
    subjectName,
    examKind,
    paperYear,
    examLabel: input.examLabel || null,
    fileName,
    storagePath,
  }
}

async function uploadAndIndexPaper(supabase, metadataInput, file, extractedTextInput) {
  if (!file) throw new Error('No PDF file was uploaded.')

  const isPdf =
    file.mimeType === 'application/pdf' ||
    String(file.fileName || '').toLowerCase().endsWith('.pdf')
  if (!isPdf) throw new Error(`Only PDF uploads are supported: ${file.fileName || 'unknown file'}.`)

  const extractedText = String(extractedTextInput || metadataInput.extractedText || '').trim()
  if (!extractedText) {
    throw new Error(`Missing extractedText for ${file.fileName || metadataInput.fileName || 'uploaded PDF'}.`)
  }

  const metadata = normalizeUploadMetadata(metadataInput, file)
  const storagePath =
    metadata.storagePath ||
    `pyqs/${metadata.regulation}/year_${metadata.academicYear}/sem_${metadata.semester}/${metadata.departmentCode}/${metadata.subjectCode}/${metadata.examKind}_${metadata.paperYear}_${metadata.fileName}`

  const { error: uploadError } = await supabase.storage
    .from('pyq-vault')
    .upload(storagePath, file.buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (uploadError) throw new Error(uploadError.message)

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
        storage_bucket: 'pyq-vault',
        storage_path: storagePath,
        file_name: file.fileName || metadata.fileName,
        file_size_bytes: file.buffer.length,
        mime_type: 'application/pdf',
        is_published: true,
      },
      { onConflict: 'storage_path' }
    )
    .select('*')
    .single()
  if (paperError) throw new Error(paperError.message)

  const chunks = splitText(extractedText)
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
      publicUrl: publicStorageUrl(supabase, 'pyq-vault', storagePath),
    },
    chunksInserted: chunks.length,
  }
}

function parseManifest(value) {
  const parsed = JSON.parse(value)
  const papers = Array.isArray(parsed) ? parsed : parsed.papers
  if (!Array.isArray(papers)) throw new Error('Manifest must be an array or an object with a papers array.')
  return papers
}

function findManifestFile(files, entry, index) {
  const metadata = entry.metadata || entry
  const requestedName = String(
    entry.fileName ||
      entry.uploadFileName ||
      entry.clientFileName ||
      metadata.fileName ||
      ''
  ).toLowerCase()

  if (requestedName) {
    const exact = files.find((file) => String(file.fileName || '').toLowerCase() === requestedName)
    if (exact) return exact
  }

  return files[index] || null
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
    const { fields, file, files } = await parseMultipart(req)

    if (String(fields.manifest || '').trim()) {
      const manifest = parseManifest(fields.manifest)
      const results = []
      for (const [index, entry] of manifest.entries()) {
        const metadata = entry.metadata || entry
        const matchedFile = findManifestFile(files, entry, index)
        if (!matchedFile) {
          throw new Error(`No selected PDF matched manifest entry ${index + 1}.`)
        }
        results.push(await uploadAndIndexPaper(supabase, metadata, matchedFile, entry.extractedText || metadata.extractedText))
      }
      return json(res, 200, { ok: true, results })
    }

    const result = await uploadAndIndexPaper(supabase, fields, file, fields.extractedText)
    return json(res, 200, { ok: true, ...result })
  } catch (error) {
    return json(res, 400, { error: error.message || 'Upload failed.' })
  }
}
