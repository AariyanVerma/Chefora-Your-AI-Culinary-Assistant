'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline').then((mod) => mod.default), {
  ssr: false,
  loading: () => null, 
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const splineRef = useRef<HTMLDivElement>(null);
  const splineAppRef = useRef<any>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'If an account with that email exists, a reset code has been sent to your email.');
        setStep('verify');
        
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Error sending code:', error);
      setError('Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetToken(data.resetToken);
        setMessage('Code verified! Enter your new password.');
        setStep('reset');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      {}
      <div className="auth-bg-animated">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="auth-layout">
        {}
        <div 
          className={`auth-3d-panel ${splineLoaded ? 'spline-loaded' : 'spline-loading'}`} 
          ref={splineRef}
        >
          <Spline
            scene="https://prod.spline.design/REr-djaDUZ9Wm2hB/scene.splinecode"
            onLoad={(app: any) => {
              splineAppRef.current = app;
              console.log('Spline scene loaded, app:', app);
              setSplineLoaded(true);
            }}
          />
        </div>

        {}
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <div className="auth-logo-wrapper">
                <Link href="/">
                  <img
                    src="/assets/chefora-logo.svg"
                    alt="Chefora Logo"
                    className="auth-logo-image"
                  />
                </Link>
              </div>
              <h1 className="auth-form-title">
                {step === 'email' && 'Reset Password'}
                {step === 'verify' && 'Verify Code'}
                {step === 'reset' && 'New Password'}
              </h1>
              <p className="auth-form-subtitle">
                {step === 'email' && 'Enter your email address and we\'ll send you a verification code'}
                {step === 'verify' && 'Enter the 6-digit code sent to your email'}
                {step === 'reset' && 'Enter your new password'}
              </p>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '16px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                color: '#4ade80',
                fontSize: '14px',
              }}>
                {message}
              </div>
            )}

            {}
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="email" className="auth-label">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your.email@example.com"
                    className="auth-input"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link href="/login" className="auth-link">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            )}

            {}
            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="code" className="auth-label">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="000000"
                    className="auth-input"
                    maxLength={6}
                    disabled={loading}
                    style={{
                      textAlign: 'center',
                      fontSize: '24px',
                      letterSpacing: '8px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Check your email for the verification code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="auth-submit-btn"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                    setMessage(null);
                  }}
                  className="auth-link"
                  style={{ marginTop: '16px', textAlign: 'center', display: 'block' }}
                >
                  ← Back to Email
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setCode('');
                    setError(null);
                    setMessage(null);
                    await handleSendCode({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  className="auth-link"
                  style={{ marginTop: '8px', textAlign: 'center', display: 'block' }}
                >
                  Resend Code
                </button>
              </form>
            )}

            {}
            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="newPassword" className="auth-label">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="auth-input"
                    minLength={6}
                    disabled={loading}
                  />
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Must be at least 6 characters
                  </p>
                </div>

                <div className="auth-field">
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    className="auth-input"
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="auth-submit-btn"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link href="/login" className="auth-link">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
