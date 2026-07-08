import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { verifyUser } from './users'

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth — สำหรับ admin เพื่อเขียน Sheet
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),

    // Credentials — สำหรับทุก role
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        sheetUrl: { label: 'Sheet URL', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const user = await verifyUser(
          credentials.sheetUrl || '',
          credentials.username,
          credentials.password,
        )
        return user || null
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // เรียกจาก client ผ่าน useSession().update() — ใช้ตอนเปลี่ยนรหัสผ่านสำเร็จ
      if (trigger === 'update' && session?.mustChangePassword === false) {
        token.mustChangePassword = false
        return token
      }
      // Google OAuth login — ทำงานแค่ครั้งแรก
      if (account?.provider === 'google') {
        const defaultUrl = process.env.DEFAULT_SHEET_URL || ''
        const m          = defaultUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
        const sid        = m ? m[1] : ''
        token.access_token       = account.access_token
        token.role               = 'admin'
        token.username           = token.email as string
        token.sheetUrl           = defaultUrl
        token.sheetId            = sid
        token.grade              = ''
        token.classroom          = ''
        token.studentId          = ''
        token.mustChangePassword = false
      }
      // Credentials login — ทำงานแค่ครั้งแรก
      else if (user) {
        token.role               = (user as any).role
        token.sheetUrl           = (user as any).sheetUrl
        token.sheetId            = (user as any).sheetId
        token.grade              = (user as any).grade
        token.classroom          = (user as any).classroom
        token.studentId          = (user as any).studentId
        token.username           = (user as any).username
        token.mustChangePassword = (user as any).mustChangePassword
        token.displayName = (user as any).name || ''
      }
      // ครั้งถัดไป — token ถูก persist อัตโนมัติ ไม่ต้องทำอะไร
      return token
    },
    async session({ session, token }) {
      session.role       = token.role       as string
      session.sheetUrl   = token.sheetUrl   as string
      session.sheetId    = token.sheetId    as string
      session.grade      = token.grade      as string
      session.classroom  = token.classroom  as string
      session.studentId  = token.studentId  as string
      session.username   = token.username   as string
      session.mustChangePassword = token.mustChangePassword as boolean
      session.access_token = token.access_token as string
      session.displayName = (token.displayName as string) || ''
      return session
    },
  },

  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}

function extractSheetId(url: string): string {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return m ? m[1] : ''
}
