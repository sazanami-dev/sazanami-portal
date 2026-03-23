import { LogoutButton } from '@/app/(auth)/components/signout-button'

export default function JoinLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <header className="bg-gray-800 text-white p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">
                        Sazanami Portal
                    </h1>
                    <LogoutButton />
                </div>
            </header>
            {children}
        </>
    )
}