import Header from '@/app/(auth)/components/Header'

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header/>
      <main className='bg-zinc-50 px-4 py-12 dark:bg-black pt-20 min-h-screen'>{children}</main>
    </>
  )
}