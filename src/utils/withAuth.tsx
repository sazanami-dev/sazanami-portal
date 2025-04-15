import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ComponentType, JSX } from 'react';

export function withAuth<P>(Component: ComponentType<P>) {
  const ProtectedComponent = (props: JSX.LibraryManagedAttributes<typeof Component, P>) => {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === 'unauthenticated') {
        router.push('/');
      }
    }, [status, router]);

    if (status === 'loading') return <p>Loading...</p>;
    if (!session) return null;

    return <Component {...props} />;
  };

  return ProtectedComponent;
}
