import Header from "@/components/layout/Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="bg-zinc-50 px-4 py-12 dark:bg-black pt-32">{children}</main>
    </>
  );
}