import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function withAuth<ComponentProps>(Component: React.FC<ComponentProps>) {
  return function ProtectedComponent(props: ComponentProps) {
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
