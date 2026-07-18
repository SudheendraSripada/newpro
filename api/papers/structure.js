import { createSupabaseServerClient, json, methodNotAllowed, publicStorageUrl } from '../_supabase.js'

function ensure(container, key, valueFactory) {
  if (!container[key]) container[key] = valueFactory()
  return container[key]
}

function buildTree(rows, supabase) {
  const tree = {}
  const flatPapers = []

  for (const row of rows || []) {
    const regulationKey = row.regulation
    const yearKey = String(row.academic_year)
    const semesterKey = String(row.semester)
    const departmentKey = row.department_code
    const subjectKey = row.subject_code
    const fileUrl = publicStorageUrl(supabase, row.storage_bucket, row.storage_path)

    const regulation = ensure(tree, regulationKey, () => ({
      regulation: regulationKey,
      label: regulationKey.toUpperCase(),
      years: {},
    }))
    const year = ensure(regulation.years, yearKey, () => ({
      academicYear: row.academic_year,
      label: `${row.academic_year}${row.academic_year === 1 ? 'st' : row.academic_year === 2 ? 'nd' : row.academic_year === 3 ? 'rd' : 'th'} Year`,
      semesters: {},
    }))
    const semester = ensure(year.semesters, semesterKey, () => ({
      semester: row.semester,
      label: `Semester ${row.semester}`,
      departments: {},
    }))
    const department = ensure(semester.departments, departmentKey, () => ({
      code: row.department_code,
      name: row.department_name,
      subjects: {},
    }))
    const subject = ensure(department.subjects, subjectKey, () => ({
      code: row.subject_code,
      name: row.subject_name,
      papers: [],
    }))

    const paper = {
      id: row.paper_id,
      examKind: row.exam_kind,
      paperYear: row.paper_year,
      label: row.exam_label || `${row.exam_kind.toUpperCase()} ${row.paper_year}`,
      fileName: row.file_name,
      fileSizeBytes: row.file_size_bytes,
      mimeType: row.mime_type,
      pageCount: row.page_count,
      storagePath: row.storage_path,
      url: fileUrl,
      downloadUrl: fileUrl,
      subject: {
        regulation: row.regulation,
        academicYear: row.academic_year,
        semester: row.semester,
        departmentCode: row.department_code,
        departmentName: row.department_name,
        subjectCode: row.subject_code,
        subjectName: row.subject_name,
      },
    }

    subject.papers.push(paper)
    flatPapers.push(paper)
  }

  return { tree, papers: flatPapers }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const { client: supabase, missing } = createSupabaseServerClient()
  if (!supabase) {
    return json(res, 200, {
      setupRequired: true,
      missing,
      tree: {},
      papers: [],
      message: 'Supabase environment variables are not configured yet.',
    })
  }

  const { data, error } = await supabase
    .from('paper_browser_items')
    .select('*')
    .order('regulation', { ascending: false })
    .order('academic_year', { ascending: true })
    .order('semester', { ascending: true })
    .order('department_code', { ascending: true })
    .order('subject_code', { ascending: true })
    .order('paper_year', { ascending: false })

  if (error) {
    return json(res, 500, { error: error.message })
  }

  const { tree, papers } = buildTree(data, supabase)
  return json(res, 200, {
    setupRequired: false,
    tree,
    papers,
    count: papers.length,
  })
}
