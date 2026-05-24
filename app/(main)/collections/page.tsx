import { listCollectionLinks } from '@/lib/links/service'
import { OFFICIAL_LINK_NAMESPACE } from '@/lib/links/permissions'

export default async function CollectionsPage() {
  const links = await listCollectionLinks()

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">リンク集</h1>

      {links.length === 0 ? (
        <p className="text-gray-400 text-sm">掲載中のリンクはありません。</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => {
            const shortPath = `/s/${link.slug}`
            return (
              <li
                key={link.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <a
                  href={shortPath}
                  className="text-base font-medium text-gray-800 hover:underline"
                >
                  {link.title ?? link.slug}
                </a>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{shortPath}</p>
                <a
                  href={link.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline truncate block mt-0.5"
                >
                  {link.targetUrl}
                </a>
                {link.hasPassword && (
                  <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    PW保護
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
