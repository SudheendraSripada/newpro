# NewPro Exam Platform

Vite + React student study portal with a Supabase-backed PYQ vault, syllabus lookup, Nemotron prediction backend, and a protected admin dashboard.

## Deployment

The app is designed for Vercel:

- Static Vite frontend from `src/`
- Serverless API routes from `api/`
- Vercel Routing Middleware from `middleware.js`
- SPA rewrite for `/admin` from `vercel.json`

Required Vercel environment variables:

```bash
SUPABASE_URL=https://jkqseezqhktfhubxiuqd.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ACCESS_KEY=...
```

Optional environment overrides:

```bash
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
```

If `NVIDIA_API_KEY` is not set in Vercel, enter it from the Admin Dashboard after deployment.

## Admin Access

Open `/admin` directly:

```text
https://newpro-khaki.vercel.app/admin
```

The browser will show a native username/password prompt. Use:

- Username: `admin`
- Password: your `ADMIN_ACCESS_KEY`

The normal student sidebar does not expose Admin. Admin APIs under `/api/admin/*` are protected by the same middleware and by server-side key checks.

## Uploading PYQ Files

There are three admin ingestion paths.

1. Upload one PDF:

- Open `/admin`
- Fill Regulation, Year, Sem, Department, Subject, Exam type, Paper year
- Choose one PDF
- Paste extracted PDF text
- Click `Upload and Index PDF`

2. Upload many PDFs:

- Open `/admin`
- Use `Bulk PDF Upload`
- Select all PDFs together
- Paste a manifest JSON array
- Click `Upload Selected PDFs`

Bulk manifest example:

```json
[
  {
    "fileName": "semester_2025.pdf",
    "metadata": {
      "regulation": "r24",
      "academicYear": 1,
      "semester": 1,
      "departmentCode": "cse",
      "departmentName": "Computer Science and Engineering",
      "subjectCode": "CS111",
      "subjectName": "Physics",
      "examKind": "semester",
      "paperYear": 2025
    },
    "extractedText": "Paste the full extracted PDF text here..."
  }
]
```

For each manifest entry, `fileName` must match one selected PDF. If no filename match is found, the API falls back to the selected file order.

3. Index already uploaded PDFs:

- Upload PDFs manually to the Supabase Storage bucket `pyq-vault`
- Open `/admin`
- Use `Batch Manifest Import`
- Include each file's `storagePath`, `fileName`, metadata, and `extractedText`

Existing-file manifest example:

```json
[
  {
    "metadata": {
      "regulation": "r24",
      "academicYear": 1,
      "semester": 1,
      "departmentCode": "cse",
      "departmentName": "Computer Science and Engineering",
      "subjectCode": "CS111",
      "subjectName": "Physics",
      "examKind": "semester",
      "paperYear": 2025,
      "storagePath": "pyqs/r24/year_1/sem_1/cse/CS111/semester_2025.pdf",
      "fileName": "semester_2025.pdf"
    },
    "extractedText": "Paste the full extracted PDF text here..."
  }
]
```

PDF text extraction is admin-provided in this version. The AI predictor needs `paper_text_chunks`, so uploads without extracted text are rejected.

## Local Checks

```bash
npm install
npm run lint
npm run build
```

Plain `npm run dev` serves the Vite frontend only. Use the deployed Vercel site, or a Vercel-compatible local flow, to exercise `/api/*` and middleware behavior.
