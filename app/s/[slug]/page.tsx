import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getLinkByNamespaceSlug } from '@/lib/links/service'
import { isLinkUnlocked, linkUnlockCookieName } from '@/lib/links/unlock-cookie'
import { OFFICIAL_LINK_NAMESPACE } from '@/lib/links/permissions'
import PasswordForm from './password-form'

type Props = { params: Promise<{ slug: string }> }

export default async function OfficialLinkPage({ params }: Props) {
  const { slug } = await params
  const link = await getLinkByNamespaceSlug(OFFICIAL_LINK_NAMESPACE, slug)

  if (!link) notFound()

  if (!link.passwordHash) {
    redirect(link.targetUrl)
  }

  const cookieStore = await cookies()
  const verified = await isLinkUnlocked(
    cookieStore.get(linkUnlockCookieName(link.id))?.value,
    link.id
  )
  if (verified) {
    redirect(link.targetUrl)
  }

  return <PasswordForm linkId={link.id} />
}
