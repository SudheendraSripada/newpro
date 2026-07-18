import { next } from '@vercel/functions'

const REALM = 'NewPro Admin'

function unauthorized() {
  return new Response('Admin authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  })
}

function readBasicPassword(header) {
  if (!header?.startsWith('Basic ')) return ''

  try {
    const decoded = atob(header.slice('Basic '.length))
    const separator = decoded.indexOf(':')
    return separator >= 0 ? decoded.slice(separator + 1) : decoded
  } catch {
    return ''
  }
}

export default function middleware(request) {
  const expected = process.env.ADMIN_ACCESS_KEY
  if (!expected) {
    return new Response('ADMIN_ACCESS_KEY is not configured.', { status: 503 })
  }

  const password = readBasicPassword(request.headers.get('authorization'))
  if (password !== expected) return unauthorized()

  return next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
}
