import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getLinkByNamespaceSlug } from '@/lib/links/service'
import PasswordForm from './password-form'

type Props = { params: Promise<{ studentId: string; slug: string }> }

export default async function UserLinkPage({ params }: Props) {
  const { studentId, slug } = await params
  const link = await getLinkByNamespaceSlug(studentId, slug)

  if (!link) notFound()

  if (!link.passwordHash) {
    redirect(link.targetUrl)
  }

  const cookieStore = await cookies()
  const verified = cookieStore.get(`lv_${link.id}`)?.value === '1'
  if (verified) {
    redirect(link.targetUrl)
  }

  return <PasswordForm linkId={link.id} />
}
