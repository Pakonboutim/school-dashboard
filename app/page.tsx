import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.role === 'student') redirect('/student')
  if (session.role === 'teacher') redirect('/teacher')
  redirect('/admin')
}
