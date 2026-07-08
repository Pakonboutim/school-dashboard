import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    role:       string
    sheetUrl:   string
    sheetId:    string
    grade:      string
    classroom:  string
    studentId:  string
    username:   string
    mustChangePassword?: boolean
    access_token?: string
    displayName?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role:       string
    sheetUrl:   string
    sheetId:    string
    grade:      string
    classroom:  string
    studentId:  string
    username:   string
    mustChangePassword?: boolean
    access_token?: string
    displayName?: string
  }
}
