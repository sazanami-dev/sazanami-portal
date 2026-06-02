import { listCollectionLinks } from '@/lib/links/service'
import { OFFICIAL_LINK_NAMESPACE, CAREER_LINK_NAMESPACE } from '@/lib/links/permissions'
import CollectionsClient from './collections-client'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage() {
  const links = await listCollectionLinks()

  const officialLinks = links.filter((l) => l.namespace === OFFICIAL_LINK_NAMESPACE)
  const careerLinks = links.filter((l) => l.namespace === CAREER_LINK_NAMESPACE)

  return (
    <CollectionsClient
      officialLinks={officialLinks}
      careerLinks={careerLinks}
      officialNamespace={OFFICIAL_LINK_NAMESPACE}
      careerNamespace={CAREER_LINK_NAMESPACE}
    />
  )
}
