import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Verify() {
  const [certNo,  setCertNo]  = useState('');
  const [mobile,  setMobile]  = useState('');
  const [loading, setLoading] = useState(false);
  const [popup,   setPopup]   = useState({ show: false, type: '', message: '' });
  const navigate = useNavigate();

  /* ── Popup helper ── */
  const triggerPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: '', message: '' }), 3400);
  };

  /* ── Verify handler ── */
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .ilike('cert_no', certNo.trim())
        .eq('mobile', mobile.trim())
        .maybeSingle();

      const todayStr = new Date().toLocaleDateString('en-CA');
      const isAutoHidden = data && data.end_date && data.end_date > todayStr;
      const isHidden = data && (data.is_hidden || isAutoHidden);

      if (error || !data) {
        triggerPopup('error', 'No matching certificate found. Please check your details.');
        setLoading(false);
      } else if (isHidden) {
        if (isAutoHidden) {
          const [yyyy, mm, dd] = data.end_date.split('-');
          triggerPopup('error', `Certificate is locked. It will be available to download on ${dd}/${mm}/${yyyy}.`);
        } else {
          triggerPopup('error', 'Certificate is currently locked. Please contact support.');
        }
        setLoading(false);
      } else {
        triggerPopup('success', 'Certificate verified! Redirecting...');
        setTimeout(() => navigate('/result', { state: { certificate: data } }), 1600);
      }
    } catch {
      triggerPopup('error', 'Network error. Please check your connection.');
      setLoading(false);
    }
  };

  /* ── Build animated line data ── */
  const lines = Array.from({ length: 14 }, (_, i) => ({
    left:     `${(i * 7) + Math.random() * 4}%`,
    duration: `${6 + Math.random() * 10}s`,
    delay:    `${Math.random() * 8}s`,
    opacity:  0.3 + Math.random() * 0.5,
  }));

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── POPUP ── */}
      <div className={`verify-popup ${popup.type} ${popup.show ? 'show' : ''}`}>
        <span className="vp-icon">{popup.type === 'success' ? '✅' : '⚠️'}</span>
        <span>{popup.message}</span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="verify-wrap">

        {/* Animated Background */}
        <div className="verify-bg" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Rising Lines */}
        <div className="verify-lines">
          {lines.map((l, i) => (
            <div key={i} className="vline" style={{
              left:            l.left,
              animationDuration: l.duration,
              animationDelay:  l.delay,
              opacity:         l.opacity,
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, position: 'relative', zIndex: 10 }}>

          {/* Hero Text */}
          <div style={{ textAlign: 'center', animation: 'cardEnter 0.5s var(--ease-spring)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 99, padding: '5px 15px', marginBottom: 18,
              fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
              color: 'var(--cyan-300)', letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              <span>🔒</span> Secure Credential Verification
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 5vw, 46px)',
              fontWeight: 800, color: '#fff', letterSpacing: '-1.5px',
              lineHeight: 1.1, marginBottom: 14,
            }}>
              Verify Your Certificate
            </h1>

            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 420,
              margin: '0 auto', lineHeight: 1.75, fontWeight: 400,
            }}>
              Enter your certificate number and registered mobile to authenticate your NTCS credential instantly.
            </p>
          </div>

          {/* Card */}
          <div className="verify-card">

            <div className="vc-top">
              <div className="vc-icon">🔍</div>
              <h2>Certificate Lookup</h2>
              <p>Your certificate number is on the top-right of your document.</p>
            </div>

            <form onSubmit={handleVerify} className="vc-body">

              {/* Cert No */}
              <div className="igroup">
                <label>Certificate Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="e.g., NTCS261502"
                    value={certNo}
                    onChange={e => setCertNo(e.target.value.toUpperCase())}
                    required
                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', paddingLeft: 44 }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--cyan-400)', pointerEvents: 'none' }}>🏷</span>
                </div>
                {certNo && (
                  <div style={{ fontSize: 11, color: 'var(--cyan-600)', marginTop: 5, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {certNo}
                  </div>
                )}
              </div>

              {/* Mobile */}
              <div className="igroup">
                <label>Registered Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    required
                    style={{ paddingLeft: 44 }}
                  />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--cyan-400)', pointerEvents: 'none' }}>📱</span>
                </div>
                {mobile && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                    {mobile.length}/10 digits
                    {mobile.length === 10 && <span style={{ color: 'var(--success)', marginLeft: 6, fontWeight: 700 }}>✔ Ready</span>}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-verify"
                disabled={loading || certNo.length < 5 || mobile.length < 10}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Verifying...
                  </span>
                ) : 'Verify Certificate →'}
              </button>

              {/* Trust Indicators */}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                {[{ icon: '🔒', label: 'SSL Encrypted' }, { icon: '✅', label: 'Official Records' }, { icon: '⚡', label: 'Instant Results' }].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </div>
                ))}
              </div>

            </form>
          </div>

          {/* Footer */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
            For verification issues, contact your program coordinator or{' '}
            <span style={{ color: 'var(--cyan-400)', fontWeight: 700 }}>NTCS Support</span>.
          </p>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}