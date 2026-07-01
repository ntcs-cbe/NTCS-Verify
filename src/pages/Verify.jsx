import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import RequestForm from '../components/RequestForm';

export default function Verify() {
  const [activeTab, setActiveTab] = useState('verify'); // 'verify' or 'status'
  
  // Verify states
  const [certNo,  setCertNo]  = useState('');
  const [mobile,  setMobile]  = useState('');
  const [loading, setLoading] = useState(false);
  const [popup,   setPopup]   = useState({ show: false, type: '', message: '' });
  
  // Status states
  const [statusMobile, setStatusMobile] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [application, setApplication] = useState(null);
  
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

  /* ── Status handler ── */
  const handleStatusQuery = async (e) => {
    e.preventDefault();
    if (!statusMobile || statusMobile.replace(/\D/g, '').length < 10) {
      triggerPopup('error', 'Enter a valid 10-digit smartphone routing line.');
      return;
    }

    setStatusLoading(true);
    setHasSearched(false);
    setApplication(null);

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('mobile', statusMobile.trim())
        .order('cert_no', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setApplication(data[0]);
      } else {
        setApplication(null);
      }
      setHasSearched(true);
    } catch (err) {
      console.error('Status check error:', err);
      triggerPopup('error', 'Network error. Please try again.');
    } finally {
      setStatusLoading(false);
    }
  };

  const getFilingPhase = (certNoStr) => {
    if (!certNoStr) return 'REJECTED';
    if (certNoStr.startsWith('PENDING/')) return 'SUBMITTED';
    if (certNoStr.startsWith('REJECTED/')) return 'REJECTED';
    if (certNoStr.startsWith('NTCS')) return 'APPROVED';
    return 'SUBMITTED';
  };

  const phase = application ? getFilingPhase(application.cert_no) : 'REJECTED';

  /* ── Build animated line data ── */
  const lines = Array.from({ length: 14 }, (_, i) => ({
    left:     `${(i * 7) + Math.random() * 4}%`,
    duration: `${6 + Math.random() * 10}s`,
    delay:    `${Math.random() * 8}s`,
    opacity:  0.3 + Math.random() * 0.5,
  }));

  return (
    <div className="page active" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── POPUP ── */}
      <div className={`verify-popup ${popup.type === 'error' ? 'err' : popup.type} ${popup.show ? 'show' : ''}`}>
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
        <div style={{ width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, position: 'relative', zIndex: 10, paddingBottom: 40 }}>

          {/* Hero Text */}
          <div style={{ textAlign: 'center', animation: 'cardEnter 0.5s var(--ease-spring)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 99, padding: '5px 15px', marginBottom: 18,
              fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
              color: 'var(--cyan-300)', letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              <span>🔒</span> Secure Certificate Check
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 5vw, 46px)',
              fontWeight: 800, color: '#fff', letterSpacing: '-1.5px',
              lineHeight: 1.1, marginBottom: 14,
            }}>
              {activeTab === 'verify' ? 'Verify Your Certificate' : 'Track Application Status'}
            </h1>

            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 420,
              margin: '0 auto', lineHeight: 1.75, fontWeight: 400,
            }}>
              {activeTab === 'verify' 
                ? 'Enter your certificate number and registered mobile to verify your NTCS certificate instantly.' 
                : activeTab === 'status'
                  ? 'Enter your registered mobile number below to check the status of your application.'
                  : 'Submit a new application for your internship or training certificate.'}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '4px', 
            borderRadius: '99px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button 
              onClick={() => { setActiveTab('verify'); setHasSearched(false); }} 
              style={{
                padding: '8px 24px', 
                borderRadius: '99px', 
                background: activeTab === 'verify' ? 'var(--cyan-500)' : 'transparent',
                color: activeTab === 'verify' ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.3s'
              }}
            >
              Verify Certificate
            </button>
            <button 
              onClick={() => setActiveTab('status')} 
              style={{
                padding: '8px 24px', 
                borderRadius: '99px', 
                background: activeTab === 'status' ? 'var(--cyan-500)' : 'transparent',
                color: activeTab === 'status' ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.3s'
              }}
            >
              Track Status
            </button>
            <button 
              onClick={() => setActiveTab('request')} 
              style={{
                padding: '8px 24px', 
                borderRadius: '99px', 
                background: activeTab === 'request' ? 'var(--cyan-500)' : 'transparent',
                color: activeTab === 'request' ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.3s'
              }}
            >
              Apply for Certificate
            </button>
          </div>

          {/* Render Card based on activeTab */}
          {activeTab === 'verify' ? (
            <div className="verify-card" style={{ animation: 'pageIn 0.3s ease' }}>
              <div className="vc-top">
                <div className="vc-icon">🔍</div>
                <h2>Certificate Lookup</h2>
                <p>Your certificate number is on the top-right of your document.</p>
              </div>

              <form onSubmit={handleVerify} className="vc-body">
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

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                  {[{ icon: '🔒', label: 'SSL Encrypted' }, { icon: '✅', label: 'Official Records' }, { icon: '⚡', label: 'Instant Results' }].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      <span>{item.icon}</span><span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </form>
            </div>
          ) : activeTab === 'status' ? (
            <div className="status-styled-card" style={{ animation: 'pageIn 0.3s ease', maxWidth: '100%', width: '100%' }}>
              <div className="status-style-header">
                <h2>Track <span>Application Status</span></h2>
                <p>Enter your registered mobile number below to check the status of your application.</p>
              </div>

              <div style={{ padding: '36px 38px' }}>
                <form onSubmit={handleStatusQuery} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <div className="igroup" style={{ flex: '1', minWidth: '260px', marginBottom: 0 }}>
                    <label className="status-style-label" style={{ color: 'var(--slate-600)', marginBottom: '8px' }}>Registered Mobile Number</label>
                    <input 
                      type="tel" 
                      maxLength="10" 
                      className="status-style-input" 
                      placeholder="Enter 10-digit mobile number" 
                      value={statusMobile}
                      onChange={e => setStatusMobile(e.target.value.replace(/\D/g, ''))}
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn-verify" 
                    disabled={statusLoading}
                    style={{ width: 'auto', padding: '13px 28px', whiteSpace: 'nowrap', margin: 0, height: '47px' }}
                  >
                    {statusLoading ? 'Checking...' : 'Check Status 🔍'}
                  </button>
                </form>

                {hasSearched && (
                  <div style={{ marginTop: '36px', borderTop: '1px solid var(--slate-100)', paddingTop: '32px', animation: 'pageIn 0.3s ease forwards' }}>
                    {application ? (
                      <>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '6px' }}>
                          Candidate: <span style={{ color: '#1338a0' }}>{application.student_name}</span>
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500 }}>
                          Track: <strong>{application.program_type}</strong> · Specialization: <strong>{application.domain}</strong>
                        </p>

                        <div className="timeline-container">
                          <div className="timeline-line-back"></div>
                          <div 
                            className="timeline-line-progress" 
                            style={{ 
                              width: window.innerWidth > 568 
                                ? (phase === 'SUBMITTED' ? '40%' : '100%') 
                                : '3px' 
                            }}
                          ></div>
                          <div className="timeline-node completed">
                            <div className="timeline-circle">📩</div>
                            <div className="timeline-lbl">Submitted</div>
                          </div>
                          <div className={`timeline-node ${phase === 'SUBMITTED' ? 'active' : 'completed'}`}>
                            <div className="timeline-circle">⏳</div>
                            <div className="timeline-lbl">Evaluation</div>
                          </div>
                          <div className={`timeline-node ${phase === 'APPROVED' ? 'completed' : (phase === 'REJECTED' ? 'failed' : '')}`}>
                            <div className="timeline-circle">
                              {phase === 'APPROVED' ? '🏆' : (phase === 'REJECTED' ? '✕' : '⚙️')}
                            </div>
                            <div className="timeline-lbl">
                              {phase === 'APPROVED' ? 'Approved' : (phase === 'REJECTED' ? 'Rejected' : 'Pending')}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '28px', padding: '16px 20px', borderRadius: 'var(--radius-md)', background: phase === 'APPROVED' ? 'var(--emerald-50)' : 'rgba(6,182,212,0.04)', border: phase === 'APPROVED' ? '1px solid var(--emerald-400)' : '1px solid rgba(6,182,212,0.15)' }}>
                          {phase === 'SUBMITTED' && (
                            <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--cyan-700)', lineHeight: '1.6' }}>
                              ⚡ <strong>Pending Approval:</strong> Your application has been submitted and is currently under review. Please check back later.
                            </p>
                          )}
                          {phase === 'APPROVED' && (
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--emerald-600)', lineHeight: '1.6' }}>
                              🎉 <strong>Approved!</strong> Your Certificate number is <span className="mono" style={{ fontSize: '12px', verticalAlign: 'middle', marginLeft: '4px' }}>{application.cert_no}</span>. You can now use your certificate.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: '28px', padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid #fca5a5' }}>
                        <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--danger)', lineHeight: '1.6' }}>
                          ❌ <strong>Not Found.</strong> No application exists for this mobile number. Please check the number or submit a new request.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'request' ? (
            <div style={{ width: '100%' }}>
              <RequestForm onSuccess={() => {
                setActiveTab('verify');
                setHasSearched(false);
              }} />
            </div>
          ) : null}

          {/* Footer */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
            For verification issues, contact your program coordinator or{' '}
            <span style={{ color: 'var(--cyan-400)', fontWeight: 700 }}>NTCS Support</span>.
          </p>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .page.active { opacity: 1; pointer-events: auto; }
      `}</style>
    </div>
  );
}