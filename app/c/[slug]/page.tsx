import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getLinkByNamespaceSlug } from '@/lib/links/service'
import { CAREER_LINK_NAMESPACE } from '@/lib/links/permissions'
import PasswordForm from './password-form'

type Props = { params: Promise<{ slug: string }> }

export default async function CareerLinkPage({ params }: Props) {
  const { slug } = await params
  const link = await getLinkByNamespaceSlug(CAREER_LINK_NAMESPACE, slug)

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
