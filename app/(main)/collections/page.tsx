import { listCollectionLinks } from '@/lib/links/service'

export default async function CollectionsPage() {
  const links = await listCollectionLinks()

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">リンク集</h1>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">掲載中のリンクはありません。</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => {
            const shortPath = `/s/${link.slug}`
            return (
              <li key={link.id} className="rounded border bg-background p-4">
                <a
                  href={shortPath}
                  className="text-base font-medium hover:underline"
                >
                  {link.title ?? link.slug}
                </a>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{shortPath}</p>
                <a
                  href={link.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-xs text-blue-600 hover:underline"
                >
                  {link.targetUrl}
                </a>
                {link.hasPassword && (
                  <span className="mt-1.5 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
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
