'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-xs text-red-300 border border-red-400/40 px-3 py-1 rounded-full hover:bg-red-500/10 transition"
    >
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
