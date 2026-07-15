'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (admin) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [admin, loading, router]);

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p style={styles.text}>Redirecting...</p>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-app)',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #E2E8F0',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
  text: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
};
