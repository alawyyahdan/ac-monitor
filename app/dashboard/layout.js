'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify', { method: 'GET' });
        if (!res.ok) {
          router.push('/');
        }
      } catch {
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}
