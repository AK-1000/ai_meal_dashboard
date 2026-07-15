'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Key, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SettingsPage() {
  const { admin } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setUpdating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        toast.success('Your administrator password has been updated.');
        setPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to change password.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error changing password.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={styles.container}>
      <div>
        <h1 className="title-large">Settings</h1>
        <p style={styles.subtitle}>Manage your administrator account security credentials</p>
      </div>

      <div style={styles.grid}>
        {/* Profile Details */}
        <div className="card" style={{ flexGrow: 1 }}>
          <h3 className="title-medium" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} style={{ color: 'var(--primary)' }} />
            <span>Administrator Profile</span>
          </h3>

          <div style={styles.detailsList}>
            <div style={styles.detailRow}>
              <span style={styles.label}>Email Address</span>
              <span style={styles.val}>{admin?.email}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Access Role</span>
              <span className="badge badge-error" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {admin?.role.replace('_', ' ')}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Unique Admin ID</span>
              <span style={{ ...styles.val, fontFamily: 'monospace', fontSize: '0.8rem' }}>{admin?.id}</span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card" style={{ flexGrow: 1.5 }}>
          <h3 className="title-medium" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} style={{ color: 'var(--secondary)' }} />
            <span>Update Credentials</span>
          </h3>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-new-password">New Password</label>
              <input
                id="admin-new-password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-confirm-password">Confirm Password</label>
              <input
                id="admin-confirm-password"
                type="password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
                disabled={updating}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', gap: '8px' }} disabled={updating}>
              <Save size={16} />
              <span>{updating ? 'Saving...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.25fr',
    gap: '1.5rem',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #F1F5F9',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  val: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-dark)',
  },
};
