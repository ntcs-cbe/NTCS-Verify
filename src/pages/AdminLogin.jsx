import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: sbError } = await supabase.auth.signInWithPassword({ email, password });
    if (sbError) { setError(sbError.message); setLoading(false); }
    else { setLoading(false); navigate('/admin'); }
  };

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── SPLIT LAYOUT ── */}
      <div className="login-wrap">

        {/* ── LEFT: HERO ── */}
        <div className="login-hero">
          <div className="login-hero-grid" />

          <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: 340, textAlign: 'center' }}>

            <div className="hero-emblem">⚙️</div>

            <div className="hero-content">
              <h2>Admin Portal</h2>
              <p>Manage and issue institutional certificates securely.</p>
            </div>

            {/* Stats */}
            <div className="hero-stats">
              <div className="hs">
                <div className="hs-val">V3.0</div>
                <div className="hs-lbl">Version</div>
              </div>
              <div className="hs">
                <div className="hs-val" style={{ color: '#34d399' }}>● Live</div>
                <div className="hs-lbl">TLS Secured</div>
              </div>
              <div className="hs">
                <div className="hs-val">256</div>
                <div className="hs-lbl">AES Encrypt</div>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', position: 'relative', zIndex: 5 }}>
              {[
                { icon: '📋', label: 'Manage all certificate records' },
                { icon: '✨', label: 'Issue new certificates instantly' },
                { icon: '📥', label: 'Bulk import via Excel upload' },
                { icon: '🔒', label: 'Supabase-secured authentication' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '11px 14px',
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── RIGHT: FORM ── */}
        <div className="login-form-side">
          <div className="login-card">

            <div className="lc-eyebrow">Administrator Access</div>
            <h3>Sign In</h3>
            <p className="sub">Enter your credentials to access the dashboard.</p>

            <form onSubmit={handleLogin}>

              {/* Email */}
              <div className="igroup">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--slate-400)', pointerEvents: 'none' }}>✉️</span>
                  <input
                    type="email"
                    placeholder="admin@ntcs.in"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: 40 }}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="igroup" style={{ marginBottom: 28 }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--slate-400)', pointerEvents: 'none' }}>🔐</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 40, paddingRight: 42 }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--slate-400)', padding: 4, lineHeight: 1 }}
                    title={showPass ? 'Hide' : 'Show'}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Authenticating...
                  </span>
                ) : 'Sign In to Admin Portal'}
              </button>

              {error && (
                <div className="login-err">
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

            </form>

            <div style={{ marginTop: 26, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--cyan-600)', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.2px', padding: 4 }}
              >
                🔍 Go to Certificate Verification
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}