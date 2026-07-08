import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path  = req.nextUrl.pathname

    if (token?.mustChangePassword && path !== '/change-password')
      return NextResponse.redirect(new URL('/change-password', req.url))

    // admin เข้า /teacher หรือ /student ไม่ได้
    if (token?.role === 'admin' && (path.startsWith('/teacher') || path.startsWith('/student')))
      return NextResponse.redirect(new URL('/admin', req.url))

    // teacher เข้า /admin หรือ /student ไม่ได้
    if (token?.role === 'teacher' && (path.startsWith('/admin') || path.startsWith('/student')))
      return NextResponse.redirect(new URL('/teacher', req.url))

    // student เข้า /admin หรือ /teacher ไม่ได้
    if (token?.role === 'student' && (path.startsWith('/admin') || path.startsWith('/teacher')))
      return NextResponse.redirect(new URL('/student', req.url))

    return NextResponse.next()
  },
  { callbacks: { authorized: ({ token }) => !!token } }
)

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/change-password'],
}
