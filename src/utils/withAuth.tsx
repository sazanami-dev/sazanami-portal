import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';

export function withAuth<P>(Component: React.FC<P>) {
  return function ProtectedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === 'unauthenticated') {
        router.push('/');
      }
    }, [status, router]);

    if (status === 'loading') {
      return <p>Loading...</p>;
    }

    if (!session) {
      return null;
    }

    return <Component {...props} />;
  };
}
