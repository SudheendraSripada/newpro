import { useEffect, useMemo, useState } from 'react'
import {
    Brain,
    ChevronDown,
    Download,
    ExternalLink,
    FileText,
    Folder,
    RefreshCcw,
    Search,
    Sparkles,
    X,
} from 'lucide-react'

const EMPTY_RESULT = { tree: {}, papers: [], count: 0 }

const examKindLabels = {
    mid1: 'Mid 1',
    mid2: 'Mid 2',
    semester: 'Semester',
    other: 'Other',
}

function formatBytes(value) {
    if (!value) return ''
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
    return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function flattenSubjects(tree) {
    const subjects = []
    Object.values(tree || {}).forEach((regulation) => {
        Object.values(regulation.years || {}).forEach((year) => {
            Object.values(year.semesters || {}).forEach((semester) => {
                Object.values(semester.departments || {}).forEach((department) => {
                    Object.values(department.subjects || {}).forEach((subject) => {
                        subjects.push({
                            regulation: regulation.regulation,
                            academicYear: year.academicYear,
                            semester: semester.semester,
                            departmentCode: department.code,
                            departmentName: department.name,
                            subjectCode: subject.code,
                            subjectName: subject.name,
                            papers: subject.papers || [],
                        })
                    })
                })
            })
        })
    })
    return subjects
}

function TreeButton({ depth = 0, children, active, onClick, icon }) {
    return (
        <button
            className={`vault-tree-button ${active ? 'active' : ''}`}
            style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
            onClick={onClick}
            type="button"
        >
            {icon}
            <span>{children}</span>
        </button>
    )
}

function PredictionList({ title, items }) {
    if (!items?.length) return null
    return (
        <section className="prediction-section">
            <h3>{title}</h3>
            <div className="prediction-grid">
                {items.map((item, index) => (
                    <article className="prediction-card" key={`${title}-${index}`}>
                        <div className="prediction-card-title">{item.question || item.topic || item.title || `Item ${index + 1}`}</div>
                        {item.frequency && <div className="prediction-badge">Repeated {item.frequency}x</div>}
                        {item.unit && <div className="prediction-meta">Unit {item.unit}</div>}
                        {item.appearances && <p>{Array.isArray(item.appearances) ? item.appearances.join(', ') : item.appearances}</p>}
                        {item.reason && <p>{item.reason}</p>}
                    </article>
                ))}
            </div>
        </section>
    )
}

export default function ExamVault() {
    const [data, setData] = useState(EMPTY_RESULT)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedPaper, setSelectedPaper] = useState(null)
    const [search, setSearch] = useState('')
    const [aiOpen, setAiOpen] = useState(false)
    const [syllabusOpen, setSyllabusOpen] = useState(false)
    const [syllabusState, setSyllabusState] = useState({ loading: false, subject: null, units: [], error: '' })
    const [predictionState, setPredictionState] = useState({ loading: false, result: null, error: '' })
    const [form, setForm] = useState({
        regulation: '',
        academicYear: '1',
        semester: '1',
        departmentCode: 'cse',
        subjectCode: '',
        examKind: 'semester',
    })

    const subjects = useMemo(() => flattenSubjects(data.tree), [data.tree])
    const filteredSubjects = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return subjects
        return subjects.filter((subject) =>
            [subject.regulation, subject.departmentName, subject.subjectCode, subject.subjectName]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term)
        )
    }, [subjects, search])

    const loadStructure = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await fetch('/api/papers/structure')
            if (!response.ok) throw new Error(`Backend returned ${response.status}.`)
            const payload = await response.json()
            setData(payload)
            if (payload.papers?.[0]) setSelectedPaper(payload.papers[0])
            if (payload.setupRequired) setError(payload.message || 'Supabase is not configured yet.')
        } catch (err) {
            setData(EMPTY_RESULT)
            setError(
                err.message.includes('Unexpected token')
                    ? 'API routes are not available in plain Vite dev mode. Use Vercel deployment or vercel dev for backend testing.'
                    : err.message
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStructure()
    }, [])

    const selectPaper = (paper) => {
        setSelectedPaper(paper)
        setForm({
            regulation: paper.subject.regulation,
            academicYear: String(paper.subject.academicYear),
            semester: String(paper.subject.semester),
            departmentCode: paper.subject.departmentCode,
            subjectCode: paper.subject.subjectCode,
            examKind: paper.examKind,
        })
    }

    const openSyllabus = async (subject) => {
        setSyllabusOpen(true)
        setSyllabusState({ loading: true, subject, units: [], error: '' })
        try {
            const params = new URLSearchParams({
                regulation: subject.regulation,
                academicYear: String(subject.academicYear),
                semester: String(subject.semester),
                departmentCode: subject.departmentCode,
                subjectCode: subject.subjectCode,
            })
            const response = await fetch(`/api/syllabus/subject?${params}`)
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Could not load syllabus.')
            setSyllabusState({ loading: false, subject: payload.subject || subject, units: payload.units || [], error: '' })
        } catch (err) {
            setSyllabusState({ loading: false, subject, units: [], error: err.message })
        }
    }

    const runPrediction = async (event) => {
        event.preventDefault()
        setPredictionState({ loading: true, result: null, error: '' })
        try {
            const response = await fetch('/api/nemotron-predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    academicYear: Number(form.academicYear),
                    semester: Number(form.semester),
                }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Prediction failed.')
            if (payload.setupRequired) throw new Error(payload.error)
            setPredictionState({ loading: false, result: payload, error: '' })
        } catch (err) {
            setPredictionState({ loading: false, result: null, error: err.message })
        }
    }

    const prediction = predictionState.result?.prediction || null

    return (
        <div className="vault-page">
            <aside className="vault-browser">
                <div className="vault-browser-header">
                    <div>
                        <h2>PYQ Vault</h2>
                        <p>{loading ? 'Loading papers...' : `${data.count || 0} papers indexed`}</p>
                    </div>
                    <button className="icon-button" onClick={loadStructure} type="button" title="Refresh papers">
                        <RefreshCcw size={18} />
                    </button>
                </div>

                <label className="vault-search">
                    <Search size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject or code" />
                </label>

                {error && <div className="vault-alert">{error}</div>}

                <div className="vault-tree">
                    {filteredSubjects.length === 0 && !loading && (
                        <div className="vault-empty">
                            <Folder size={28} />
                            <strong>No PYQs indexed yet.</strong>
                            <span>Upload PDFs to Supabase Storage and insert metadata into the exam_papers table.</span>
                        </div>
                    )}

                    {filteredSubjects.map((subject) => (
                        <div className="vault-subject" key={`${subject.regulation}-${subject.departmentCode}-${subject.subjectCode}`}>
                            <TreeButton depth={0} icon={<ChevronDown size={16} />}>
                                {subject.regulation.toUpperCase()} · Year {subject.academicYear} · Sem {subject.semester}
                            </TreeButton>
                            <TreeButton depth={1} icon={<Folder size={16} />}>
                                {subject.departmentName}
                            </TreeButton>
                            <div className="vault-subject-row">
                                <TreeButton depth={2} icon={<FileText size={16} />}>
                                    {subject.subjectCode} · {subject.subjectName}
                                </TreeButton>
                                <button className="link-button" onClick={() => openSyllabus(subject)} type="button">
                                    Syllabus
                                </button>
                            </div>
                            {subject.papers.map((paper) => (
                                <TreeButton
                                    depth={3}
                                    active={selectedPaper?.id === paper.id}
                                    icon={<FileText size={15} />}
                                    key={paper.id}
                                    onClick={() => selectPaper(paper)}
                                >
                                    {paper.label}
                                </TreeButton>
                            ))}
                        </div>
                    ))}
                </div>
            </aside>

            <main className="vault-main">
                <div className="vault-toolbar">
                    <div>
                        <h1>{selectedPaper ? selectedPaper.fileName : 'Previous Year Papers'}</h1>
                        <p>
                            {selectedPaper
                                ? `${selectedPaper.subject.subjectName} · ${examKindLabels[selectedPaper.examKind] || selectedPaper.examKind}`
                                : 'Browse, preview, download, and analyze college papers.'}
                        </p>
                    </div>
                    <div className="vault-actions">
                        <button className="btn-secondary vault-action" onClick={() => setAiOpen(true)} type="button">
                            <Brain size={18} />
                            AI Predictor
                        </button>
                        {selectedPaper?.downloadUrl && (
                            <a className="btn-secondary vault-action" href={selectedPaper.downloadUrl} download target="_blank" rel="noreferrer">
                                <Download size={18} />
                                Download
                            </a>
                        )}
                    </div>
                </div>

                <div className="pdf-stage">
                    {selectedPaper?.url ? (
                        <iframe title={selectedPaper.fileName} src={selectedPaper.url} />
                    ) : (
                        <div className="pdf-empty">
                            <FileText size={48} />
                            <h2>Select a paper to preview</h2>
                            <p>PDFs open inside the browser when their Supabase Storage URLs are indexed.</p>
                        </div>
                    )}
                </div>

                {selectedPaper && (
                    <div className="paper-details">
                        <span>{selectedPaper.subject.regulation.toUpperCase()}</span>
                        <span>Year {selectedPaper.subject.academicYear}</span>
                        <span>Sem {selectedPaper.subject.semester}</span>
                        <span>{selectedPaper.paperYear}</span>
                        {selectedPaper.fileSizeBytes && <span>{formatBytes(selectedPaper.fileSizeBytes)}</span>}
                        {selectedPaper.url && (
                            <a href={selectedPaper.url} target="_blank" rel="noreferrer">
                                Open PDF <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                )}
            </main>

            {aiOpen && (
                <div className="modal-backdrop">
                    <section className="vault-modal">
                        <button className="modal-close" onClick={() => setAiOpen(false)} type="button" title="Close">
                            <X size={18} />
                        </button>
                        <div className="modal-heading">
                            <Sparkles size={22} />
                            <div>
                                <h2>AI Predictor Mode</h2>
                                <p>Uses regulation fallback, syllabus units, and extracted PYQ text.</p>
                            </div>
                        </div>

                        <form className="predictor-form" onSubmit={runPrediction}>
                            <select value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })}>
                                {[1, 2, 3, 4].map((year) => (
                                    <option key={year} value={year}>
                                        {year} Year
                                    </option>
                                ))}
                            </select>
                            <select value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}>
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                            </select>
                            <select value={form.departmentCode} onChange={(event) => setForm({ ...form, departmentCode: event.target.value })}>
                                {['cse', 'it', 'ece', 'eee', 'mech', 'civil', 'chemical', 'csm', 'cso', 'csbs', 'csd'].map((dept) => (
                                    <option key={dept} value={dept}>
                                        {dept.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <select value={form.examKind} onChange={(event) => setForm({ ...form, examKind: event.target.value })}>
                                <option value="mid1">Mid 1</option>
                                <option value="mid2">Mid 2</option>
                                <option value="semester">Semester</option>
                            </select>
                            <input
                                value={form.subjectCode}
                                onChange={(event) => setForm({ ...form, subjectCode: event.target.value })}
                                placeholder="Subject code, e.g. CS111"
                                required
                            />
                            <button className="generate-btn" disabled={predictionState.loading} type="submit">
                                {predictionState.loading ? 'Analyzing...' : 'Generate Predictions'}
                            </button>
                        </form>

                        {predictionState.error && <div className="vault-alert">{predictionState.error}</div>}

                        {prediction && (
                            <div className="prediction-output">
                                <div className="prediction-summary">
                                    <span>{predictionState.result.currentRegulation.toUpperCase()}</span>
                                    <span>{predictionState.result.papersUsed} papers used</span>
                                    <span>{predictionState.result.syllabusUnits} syllabus units</span>
                                </div>
                                <PredictionList title="Trend Map" items={prediction.trends} />
                                <PredictionList title="Short Questions" items={prediction.short_questions} />
                                <PredictionList title="Long Questions" items={prediction.long_questions} />
                                {prediction.study_strategy && <p className="study-strategy">{prediction.study_strategy}</p>}
                                {prediction.data_warnings?.length > 0 && (
                                    <div className="vault-alert">{prediction.data_warnings.join(' ')}</div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {syllabusOpen && (
                <div className="drawer-backdrop" onClick={() => setSyllabusOpen(false)}>
                    <aside className="syllabus-drawer" onClick={(event) => event.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSyllabusOpen(false)} type="button" title="Close">
                            <X size={18} />
                        </button>
                        <h2>Syllabus Quick View</h2>
                        {syllabusState.subject && (
                            <p>
                                {syllabusState.subject.subject_code || syllabusState.subject.subjectCode} ·{' '}
                                {syllabusState.subject.subject_name || syllabusState.subject.subjectName}
                            </p>
                        )}
                        {syllabusState.loading && <div className="vault-alert">Loading syllabus...</div>}
                        {syllabusState.error && <div className="vault-alert">{syllabusState.error}</div>}
                        {!syllabusState.loading && !syllabusState.error && syllabusState.units.length === 0 && (
                            <div className="vault-empty">
                                <FileText size={28} />
                                <strong>No parsed units yet.</strong>
                                <span>Run the syllabus ingestion script after scraping rvrjc.ac.in.</span>
                            </div>
                        )}
                        <div className="syllabus-unit-list">
                            {syllabusState.units.map((unit) => (
                                <article className="syllabus-unit" key={unit.id}>
                                    <h3>Unit {unit.unit_number}: {unit.title || 'Untitled'}</h3>
                                    <p>{unit.content}</p>
                                </article>
                            ))}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    )
}
