import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Status() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [application, setApplication] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '', show: false });

  const showToast = (message, type = 'ok') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast({ message: '', type: '', show: false }), 3500);
  };

  const handleStatusQuery = async (e) => {
    e.preventDefault();
    if (!mobile || mobile.replace(/\D/g, '').length < 10) {
      showToast('❌ Enter a valid 10-digit smartphone routing line.', 'err');
      return;
    }

    setLoading(true);
    setHasSearched(false);
    setApplication(null);

    try {
      // Pull the latest filing submission mapping directly to this mobile phone context record
    const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('mobile', mobile.trim())
    .order('cert_no', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setApplication(data[0]); // Target the newest sequence node index layout array
      } else {
        setApplication(null); // No structural registry indices found matching this pipeline key
      }
      setHasSearched(true);
    } catch (err) {
      console.error('Workflow thread status trace fault: [Hidden for security]');
      showToast('Ecosystem routing runtime connection error.', 'err');
    } finally {
      setLoading(false);
    }
  };

  // Helper routine to resolve current state trajectory steps
  const getFilingPhase = (certNo) => {
    if (!certNo) return 'REJECTED';
    if (certNo.startsWith('PENDING/')) return 'SUBMITTED';
    if (certNo.startsWith('REJECTED/')) return 'REJECTED';
    if (certNo.startsWith('NTCS')) return 'APPROVED';
    return 'SUBMITTED';
  };

  const phase = application ? getFilingPhase(application.cert_no) : 'REJECTED';

  return (
    <div className="page active" style={{ background: 'var(--ink-950)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Background Animated Decorator Matrix Canvas */}
      <div className="verify-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="verify-lines">
          <div className="vline" style={{ left: '15%', animationDuration: '5s' }}></div>
          <div className="vline" style={{ left: '50%', animationDuration: '4s', animationDelay: '0.2s' }}></div>
          <div className="vline" style={{ left: '80%', animationDuration: '6s', animationDelay: '1s' }}></div>
        </div>
      </div>



      <div style={{ padding: '80px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--topnav-h))', position: 'relative', zIndex: 10 }}>
        <div className="status-styled-card">
          
          {/* Obsidian Gradient Layout Header Node */}
          <div className="status-style-header">
            <h2>Track <span>Application Status</span></h2>
            <p>Enter your registered contact line sequence below to determine pipeline trajectory evaluation positions.</p>
          </div>

          <div style={{ padding: '36px 38px' }}>
            {/* SEARCH BINDING CONSOLE FORM */}
            <form onSubmit={handleStatusQuery} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div className="igroup" style={{ flex: '1', minWidth: '260px', marginBottom: 0 }}>
                <label className="status-style-label">Registered Mobile Link</label>
                <input 
                  type="tel" 
                  maxLength="10" 
                  className="status-style-input" 
                  placeholder="Enter 10-digit contact line" 
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="btn-verify" 
                disabled={loading}
                style={{ width: 'auto', padding: '13px 28px', whiteSpace: 'nowrap', margin: 0, height: '47px' }}
              >
                {loading ? 'Polling Records...' : 'Fetch Live Status 🔍'}
              </button>
            </form>

            {/* LIVE VERIFICATION EVALUATION RENDER TRACK */}
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

                    {/* DYNAMIC METRIC PROGRESS CHART ENGINE SLIDER LINK */}
                    <div className="timeline-container">
                      {/* Responsive horizontal connector mapping wire rule */}
                      <div className="timeline-line-back"></div>
                      <div 
                        className="timeline-line-progress" 
                        style={{ 
                          width: window.innerWidth > 568 
                            ? (phase === 'SUBMITTED' ? '40%' : '100%') 
                            : '3px' 
                        }}
                      ></div>

                      {/* STEP 1: SUBMITTED GATE */}
                      <div className="timeline-node completed">
                        <div className="timeline-circle">📩</div>
                        <div className="timeline-lbl">Submitted</div>
                      </div>

                      {/* STEP 2: REVIEW AUDIT INDEX NODE */}
                      <div className={`timeline-node ${phase === 'SUBMITTED' ? 'active' : 'completed'}`}>
                        <div className="timeline-circle">⏳</div>
                        <div className="timeline-lbl">Evaluation</div>
                      </div>

                      {/* STEP 3: CLOSURE DECISION TRAJECTORY TERMINUS BLOCK */}
                      <div className={`timeline-node ${phase === 'APPROVED' ? 'completed' : (phase === 'REJECTED' ? 'failed' : '')}`}>
                        <div className="timeline-circle">
                          {phase === 'APPROVED' ? '🏆' : (phase === 'REJECTED' ? '✕' : '⚙️')}
                        </div>
                        <div className="timeline-lbl">
                          {phase === 'APPROVED' ? 'Approved' : (phase === 'REJECTED' ? 'Rejected' : 'Pending')}
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC WORKFLOW TEXT SUMMARY HUD BLOCKS */}
                    <div style={{ marginTop: '28px', padding: '16px 20px', borderRadius: 'var(--radius-md)', background: phase === 'APPROVED' ? 'var(--emerald-50)' : 'rgba(6,182,212,0.04)', border: phase === 'APPROVED' ? '1px solid var(--emerald-400)' : '1px solid rgba(6,182,212,0.15)' }}>
                      {phase === 'SUBMITTED' && (
                        <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--cyan-700)', lineHeight: '1.6' }}>
                          ⚡ <strong>Filing Pending Approval:</strong> Your application bundle has indexed into active validation registries safely. Your tracking key string references are currently being audited by system coordinators. Check back shortly.
                        </p>
                      )}
                      {phase === 'APPROVED' && (
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--emerald-600)', lineHeight: '1.6' }}>
                          🎉 <strong>Approved!</strong> Your Certificate number is <span className="mono" style={{ fontSize: '12px', verticalAlign: 'middle', marginLeft: '4px' }}>{application.cert_no}</span>. You can now use your credentials securely on public search arrays.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  /* EXPLICIT DESTRUCTION / REJECTION PARSER NOTIFICATION */
                  <div>
                    <div style={{ marginTop: '28px', padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid #fca5a5' }}>
                      <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--danger)', lineHeight: '1.6' }}>
                        ❌ <strong>Not Found.</strong> No application exists for this mobile number. Please check the number or submit a new request.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </div>

      {/* GLOBAL CENTRALIZED HUD DIALOG SYSTEM MESSAGE CHANNEL */}
      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>{toast.message}</div>
    </div>
  );
}