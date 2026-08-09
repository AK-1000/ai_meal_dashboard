'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Successfully logged in!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Decorative Globs */}
      <div style={styles.decor1}></div>
      <div style={styles.decor2}></div>
      <div style={styles.decor3}></div>
      
      {/* Subtle Grid overlay */}
      <div style={styles.gridOverlay}></div>
      
      <div style={styles.loginCard} className="animate-fade-in">
        <div style={styles.header}>
          {/* Logo container with float styling */}
          <div style={styles.logoWrapper}>
            <img 
              src="/logo.png" 
              alt="AI Meal Logo" 
              style={styles.logoImage} 
            />
          </div>
          
          {/* Branding Title with ambient Glow behind it */}
          <div style={styles.brandTitleContainer}>
            <div style={styles.glowBehindBrand}></div>
            <h1 style={styles.brandTitle}>
              <span style={styles.brandTitleFirst}>AI MEAL</span>
              <span style={styles.brandTitleSecond}>ADMIN</span>
            </h1>
          </div>
          
          <h2 style={styles.subtitle}>Super Admin Panel</h2>
          <p style={styles.description}>Sign in with your administrator credentials</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group" style={styles.formGroup}>
            <label className="form-label" htmlFor="email" style={styles.formLabel}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@aimeal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.inputField,
                ...(focusedField === 'email' ? styles.inputFieldFocus : {})
              }}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group" style={styles.formGroup}>
            <label className="form-label" htmlFor="password" style={styles.formLabel}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.inputField,
                ...(focusedField === 'password' ? styles.inputFieldFocus : {})
              }}
              disabled={submitting}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              ...(isHovered ? styles.submitBtnHover : {}),
              ...(submitting ? styles.submitBtnDisabled : {})
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={submitting}
          >
            {submitting ? (
              <span style={styles.loadingSpinnerContainer}>
                <span style={styles.miniSpinner}></span>
                <span>Authenticating...</span>
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0B0F19', // Deep dark theme background
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.007) 1px, transparent 1px), 
                      linear-gradient(90deg, rgba(255, 255, 255, 0.007) 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
    pointerEvents: 'none',
  },
  decor1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(38, 166, 154, 0.02) 70%)',
    top: '-10%',
    right: '-10%',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  decor2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 188, 212, 0.12) 0%, rgba(33, 150, 243, 0.01) 70%)',
    bottom: '-10%',
    left: '-10%',
    filter: 'blur(50px)',
    pointerEvents: 'none',
  },
  decor3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(38, 166, 154, 0.08) 0%, transparent 80%)',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  },
  loginCard: {
    width: '100%',
    maxWidth: '430px',
    padding: '3rem 2.5rem',
    borderRadius: '24px',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 50px rgba(76, 175, 80, 0.03)',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
    position: 'relative',
  },
  logoWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 0 12px rgba(255, 255, 255, 0.05)',
    marginBottom: '1.25rem',
    padding: '10px',
    transition: 'transform 0.3s ease',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  brandTitleContainer: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '0.5rem',
    width: '100%',
  },
  glowBehindBrand: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '50px',
    background: 'radial-gradient(circle, rgba(76, 175, 80, 0.25) 0%, rgba(38, 166, 154, 0) 70%)',
    filter: 'blur(16px)',
    zIndex: -1,
    pointerEvents: 'none',
  },
  brandTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    letterSpacing: '0.075em',
    margin: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.35rem',
  },
  brandTitleFirst: {
    color: '#FFFFFF',
    textShadow: '0 0 20px rgba(255,255,255,0.1)',
  },
  brandTitleSecond: {
    color: '#4CAF50',
    textShadow: '0 0 20px rgba(76, 175, 80, 0.4)',
  },
  subtitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#94A3B8',
    marginBottom: '0.25rem',
  },
  description: {
    fontSize: '0.825rem',
    color: '#64748B',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGroup: {
    marginBottom: 0,
  },
  formLabel: {
    color: '#94A3B8',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '0.5rem',
    display: 'block',
    textAlign: 'left',
  },
  inputField: {
    padding: '0.8rem 1rem',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  inputFieldFocus: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    boxShadow: '0 0 0 3px rgba(76, 175, 80, 0.15), 0 0 15px rgba(76, 175, 80, 0.1)',
  },
  submitBtn: {
    marginTop: '1rem',
    padding: '0.875rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#FFFFFF',
    background: 'linear-gradient(135deg, #4CAF50 0%, #26A69A 100%)',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.35)',
    filter: 'brightness(1.05)',
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none',
  },
  loadingSpinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  miniSpinner: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#FFFFFF',
    animation: 'spin 0.8s linear infinite',
  },
};

