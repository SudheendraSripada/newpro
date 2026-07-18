import { useEffect, useMemo, useState } from 'react'
import { Database, FileText, KeyRound, Save, Settings, UploadCloud } from 'lucide-react'

const DEFAULT_PROVIDER = {
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'nvidia/nemotron-3-ultra-550b-a55b',
    maxTokens: 4096,
    temperature: 0.2,
    topP: 0.7,
    systemPrompt:
        'You are an expert academic analyst for R.V.R. & J.C. College of Engineering. Only use the supplied syllabus and previous question paper text. Return strict JSON with keys: trends, short_questions, long_questions, study_strategy, data_warnings.',
}

const DEFAULT_PAPER = {
    regulation: 'r24',
    academicYear: '1',
    semester: '1',
    departmentCode: 'cse',
    departmentName: 'Computer Science and Engineering',
    subjectCode: '',
    subjectName: '',
    examKind: 'semester',
    paperYear: new Date().getFullYear().toString(),
    examLabel: '',
    storagePath: '',
    fileName: '',
    extractedText: '',
}

function adminHeaders(adminKey) {
    return {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
    }
}

export default function AdminDashboard() {
    const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('newpro_admin_key') || '')
    const [provider, setProvider] = useState(DEFAULT_PROVIDER)
    const [apiKey, setApiKey] = useState('')
    const [apiKeyStatus, setApiKeyStatus] = useState({ configured: false, preview: '' })
    const [envOverrides, setEnvOverrides] = useState({})
    const [paper, setPaper] = useState(DEFAULT_PAPER)
    const [uploadFile, setUploadFile] = useState(null)
    const [manifest, setManifest] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const canSubmit = useMemo(() => adminKey.trim().length > 0, [adminKey])

    useEffect(() => {
        if (adminKey) sessionStorage.setItem('newpro_admin_key', adminKey)
    }, [adminKey])

    const loadSettings = async () => {
        if (!canSubmit) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const response = await fetch('/api/admin/settings', {
                headers: { 'X-Admin-Key': adminKey },
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Could not load settings.')
            setProvider({ ...DEFAULT_PROVIDER, ...payload.provider })
            setApiKeyStatus(payload.apiKey || { configured: false, preview: '' })
            setEnvOverrides(payload.envOverrides || {})
            setMessage('Admin settings loaded.')
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const saveSettings = async (event) => {
        event.preventDefault()
        if (!canSubmit) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: adminHeaders(adminKey),
                body: JSON.stringify({ provider, apiKey }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Could not save settings.')
            setApiKey('')
            setApiKeyStatus(payload.apiKey || apiKeyStatus)
            setMessage('Nemotron settings saved.')
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const indexPaper = async (event) => {
        event.preventDefault()
        if (!canSubmit) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const response = await fetch('/api/admin/papers', {
                method: 'POST',
                headers: adminHeaders(adminKey),
                body: JSON.stringify({
                    metadata: {
                        ...paper,
                        academicYear: Number(paper.academicYear),
                        semester: Number(paper.semester),
                        paperYear: Number(paper.paperYear),
                    },
                    extractedText: paper.extractedText,
                }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Could not index paper.')
            setMessage(`Paper indexed. ${payload.chunksInserted || 0} text chunks stored.`)
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const uploadPaper = async (event) => {
        event.preventDefault()
        if (!canSubmit || !uploadFile) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const body = new FormData()
            Object.entries(paper).forEach(([key, value]) => body.append(key, value))
            body.append('file', uploadFile)

            const response = await fetch('/api/admin/upload-paper', {
                method: 'POST',
                headers: { 'X-Admin-Key': adminKey },
                body,
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Could not upload paper.')
            setMessage(`PDF uploaded and indexed. ${payload.chunksInserted || 0} text chunks stored.`)
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const importManifest = async (event) => {
        event.preventDefault()
        if (!canSubmit) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const parsed = JSON.parse(manifest)
            const papers = Array.isArray(parsed) ? parsed : parsed.papers
            if (!Array.isArray(papers)) throw new Error('Manifest must be an array or an object with a papers array.')

            const response = await fetch('/api/admin/papers', {
                method: 'POST',
                headers: adminHeaders(adminKey),
                body: JSON.stringify({ papers }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Manifest import failed.')
            setMessage(`${payload.results?.length || 0} papers imported from manifest.`)
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const setPaperField = (key, value) => setPaper((prev) => ({ ...prev, [key]: value }))

    return (
        <div className="admin-page">
            <div className="top-header admin-top">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Manage AI provider settings, paper uploads, and searchable PYQ metadata.</p>
                </div>
                <button className="btn-secondary admin-load" onClick={loadSettings} disabled={!canSubmit || busy} type="button">
                    <Settings size={18} />
                    Load Settings
                </button>
            </div>

            <div className="admin-grid">
                <section className="admin-panel admin-access">
                    <div className="admin-panel-title">
                        <KeyRound size={20} />
                        <h2>Admin Access</h2>
                    </div>
                    <p>The access key is checked by serverless API routes and is not stored permanently in the app.</p>
                    <input
                        className="input-field"
                        type="password"
                        value={adminKey}
                        onChange={(event) => setAdminKey(event.target.value)}
                        placeholder="Enter ADMIN_ACCESS_KEY"
                    />
                    {apiKeyStatus.configured && (
                        <div className="status-pill good">NVIDIA key configured: {apiKeyStatus.preview}</div>
                    )}
                    {envOverrides.nvidiaApiKey && <div className="status-pill">Deployment env overrides saved API key.</div>}
                </section>

                <section className="admin-panel">
                    <div className="admin-panel-title">
                        <Settings size={20} />
                        <h2>Nemotron Settings</h2>
                    </div>
                    <form className="admin-form" onSubmit={saveSettings}>
                        <label>
                            NVIDIA API key
                            <input
                                className="input-field"
                                type="password"
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                                placeholder={apiKeyStatus.configured ? 'Leave blank to keep current key' : 'Paste key here'}
                            />
                        </label>
                        <label>
                            Chat completions URL
                            <input
                                className="input-field"
                                value={provider.baseUrl}
                                onChange={(event) => setProvider({ ...provider, baseUrl: event.target.value })}
                            />
                        </label>
                        <label>
                            Model
                            <input
                                className="input-field"
                                value={provider.model}
                                onChange={(event) => setProvider({ ...provider, model: event.target.value })}
                            />
                        </label>
                        <div className="admin-form-row">
                            <label>
                                Max tokens
                                <input
                                    className="input-field"
                                    type="number"
                                    value={provider.maxTokens}
                                    onChange={(event) => setProvider({ ...provider, maxTokens: Number(event.target.value) })}
                                />
                            </label>
                            <label>
                                Temperature
                                <input
                                    className="input-field"
                                    type="number"
                                    step="0.1"
                                    value={provider.temperature}
                                    onChange={(event) => setProvider({ ...provider, temperature: Number(event.target.value) })}
                                />
                            </label>
                            <label>
                                Top P
                                <input
                                    className="input-field"
                                    type="number"
                                    step="0.1"
                                    value={provider.topP}
                                    onChange={(event) => setProvider({ ...provider, topP: Number(event.target.value) })}
                                />
                            </label>
                        </div>
                        <label>
                            System prompt
                            <textarea
                                className="input-field admin-textarea"
                                value={provider.systemPrompt}
                                onChange={(event) => setProvider({ ...provider, systemPrompt: event.target.value })}
                            />
                        </label>
                        <button className="generate-btn admin-submit" disabled={!canSubmit || busy} type="submit">
                            <Save size={18} />
                            Save AI Settings
                        </button>
                    </form>
                </section>

                <section className="admin-panel">
                    <div className="admin-panel-title">
                        <UploadCloud size={20} />
                        <h2>Upload / Index Paper</h2>
                    </div>
                    <form className="admin-form" onSubmit={uploadFile ? uploadPaper : indexPaper}>
                        <div className="admin-form-row">
                            <label>
                                Regulation
                                <input className="input-field" value={paper.regulation} onChange={(e) => setPaperField('regulation', e.target.value)} />
                            </label>
                            <label>
                                Year
                                <select className="input-field" value={paper.academicYear} onChange={(e) => setPaperField('academicYear', e.target.value)}>
                                    {[1, 2, 3, 4].map((year) => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </label>
                            <label>
                                Sem
                                <select className="input-field" value={paper.semester} onChange={(e) => setPaperField('semester', e.target.value)}>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                </select>
                            </label>
                        </div>
                        <div className="admin-form-row">
                            <label>
                                Department code
                                <input className="input-field" value={paper.departmentCode} onChange={(e) => setPaperField('departmentCode', e.target.value)} />
                            </label>
                            <label>
                                Department name
                                <input className="input-field" value={paper.departmentName} onChange={(e) => setPaperField('departmentName', e.target.value)} />
                            </label>
                        </div>
                        <div className="admin-form-row">
                            <label>
                                Subject code
                                <input className="input-field" value={paper.subjectCode} onChange={(e) => setPaperField('subjectCode', e.target.value)} required />
                            </label>
                            <label>
                                Subject name
                                <input className="input-field" value={paper.subjectName} onChange={(e) => setPaperField('subjectName', e.target.value)} required />
                            </label>
                        </div>
                        <div className="admin-form-row">
                            <label>
                                Exam type
                                <select className="input-field" value={paper.examKind} onChange={(e) => setPaperField('examKind', e.target.value)}>
                                    <option value="mid1">Mid 1</option>
                                    <option value="mid2">Mid 2</option>
                                    <option value="semester">Semester</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>
                            <label>
                                Paper year
                                <input className="input-field" type="number" value={paper.paperYear} onChange={(e) => setPaperField('paperYear', e.target.value)} />
                            </label>
                            <label>
                                Label
                                <input className="input-field" value={paper.examLabel} onChange={(e) => setPaperField('examLabel', e.target.value)} />
                            </label>
                        </div>
                        <label>
                            Upload PDF
                            <input className="input-field" type="file" accept="application/pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                        </label>
                        <label>
                            Existing storage path
                            <input
                                className="input-field"
                                value={paper.storagePath}
                                onChange={(e) => setPaperField('storagePath', e.target.value)}
                                placeholder="Required only when indexing an already uploaded file"
                                required={!uploadFile}
                            />
                        </label>
                        <label>
                            File name
                            <input
                                className="input-field"
                                value={paper.fileName}
                                onChange={(e) => setPaperField('fileName', e.target.value)}
                                placeholder="Required when indexing existing storage path"
                                required={!uploadFile}
                            />
                        </label>
                        <label>
                            Extracted text
                            <textarea
                                className="input-field admin-textarea"
                                value={paper.extractedText}
                                onChange={(e) => setPaperField('extractedText', e.target.value)}
                                placeholder="Required: paste extracted PDF text so AI Predictor can analyze this paper."
                                required
                            />
                        </label>
                        <button className="generate-btn admin-submit" disabled={!canSubmit || busy} type="submit">
                            <UploadCloud size={18} />
                            {uploadFile ? 'Upload and Index PDF' : 'Index Existing File'}
                        </button>
                    </form>
                </section>

                <section className="admin-panel">
                    <div className="admin-panel-title">
                        <Database size={20} />
                        <h2>Batch Manifest Import</h2>
                    </div>
                    <p>Use this for yearly folder updates after PDFs are already in `pyq-vault`.</p>
                    <form className="admin-form" onSubmit={importManifest}>
                        <textarea
                            className="input-field manifest-textarea"
                            value={manifest}
                            onChange={(event) => setManifest(event.target.value)}
                            placeholder='[{"metadata":{"regulation":"r24","academicYear":1,"semester":1,"departmentCode":"cse","departmentName":"CSE","subjectCode":"CS111","subjectName":"Physics","examKind":"semester","paperYear":2025,"storagePath":"pyqs/r24/year_1/sem_1/cse/CS111/semester_2025.pdf","fileName":"semester_2025.pdf"},"extractedText":"..."}]'
                        />
                        <button className="generate-btn admin-submit" disabled={!canSubmit || busy} type="submit">
                            <FileText size={18} />
                            Import Manifest
                        </button>
                    </form>
                </section>
            </div>

            {(message || error) && (
                <div className={`admin-toast ${error ? 'error' : 'success'}`}>
                    {error || message}
                </div>
            )}
        </div>
    )
}
