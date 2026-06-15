import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/* ─── CropModal Module ────────────────────────────────────────────────── */
function CropModal({ imageSrc, onConfirm, onCancel }) {
  const CONTAINER_W = 320;
  const CONTAINER_H = 320;
  const CROP_W_DISPLAY = 170;
  const CROP_H_DISPLAY = Math.round(170 * (195 / 165));

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  const cropLeft = (CONTAINER_W - CROP_W_DISPLAY) / 2;
  const cropTop = (CONTAINER_H - CROP_H_DISPLAY) / 2;

  const clamp = useCallback((newPos, s, iw, ih) => {
    const dw = iw * s;
    const dh = ih * s;
    return {
      x: Math.min(cropLeft, Math.max(cropLeft + CROP_W_DISPLAY - dw, newPos.x)),
      y: Math.min(cropTop, Math.max(cropTop + CROP_H_DISPLAY - dh, newPos.y)),
    };
  }, [cropLeft, cropTop, CROP_W_DISPLAY, CROP_H_DISPLAY]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img;
      const baseScale = Math.max(CROP_W_DISPLAY / nw, CROP_H_DISPLAY / nh) * 1.05;
      setImgNatural({ w: nw, h: nh });
      setScale(baseScale);
      const dw = nw * baseScale;
      const dh = nh * baseScale;
      setPos(clamp({ x: (CONTAINER_W - dw) / 2, y: (CONTAINER_H - dh) / 2 }, baseScale, nw, nh));
    };
    img.src = imageSrc;
  }, [imageSrc, clamp]);

  const dw = imgNatural.w * scale;
  const dh = imgNatural.h * scale;

  const onMouseDown = (e) => { e.preventDefault(); dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }; };
  const onMouseMove = (e) => { if (!dragRef.current.active) return; setPos(clamp({ x: dragRef.current.ox + e.clientX - dragRef.current.startX, y: dragRef.current.oy + e.clientY - dragRef.current.startY }, scale, imgNatural.w, imgNatural.h)); };
  const onMouseUp = () => { dragRef.current.active = false; };
  const onTouchStart = (e) => { const t = e.touches[0]; dragRef.current = { active: true, startX: t.clientX, startY: t.clientY, ox: pos.x, oy: pos.y }; };
  const onTouchMove = (e) => { if (!dragRef.current.active) return; const t = e.touches[0]; setPos(clamp({ x: dragRef.current.ox + t.clientX - dragRef.current.startX, y: dragRef.current.oy + t.clientY - dragRef.current.startY }, scale, imgNatural.w, imgNatural.h)); };
  const onTouchEnd = () => { dragRef.current.active = false; };

  const handleZoomChange = (e) => { const s = parseFloat(e.target.value); setScale(s); setPos(prev => clamp(prev, s, imgNatural.w, imgNatural.h)); };

  const handleConfirm = () => {
    const img = new Image();
    img.onload = () => {
      const ratio = imgNatural.w / dw;
      const canvas = document.createElement('canvas');
      canvas.width = 330;
      canvas.height = 390;
      canvas.getContext('2d').drawImage(img, (cropLeft - pos.x) * ratio, (cropTop - pos.y) * ratio, CROP_W_DISPLAY * ratio, CROP_H_DISPLAY * ratio, 0, 0, 330, 390);
      onConfirm(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageSrc;
  };

  const minScale = Math.max(CROP_W_DISPLAY / (imgNatural.w || 1), CROP_H_DISPLAY / (imgNatural.h || 1)) * 1.05;
  const maxScale = minScale * 4;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,8,15,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '16px' }}>
      <div style={{ background: 'var(--ink-900,#080f1e)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 20, padding: 24, width: Math.min(CONTAINER_W + 48, window.innerWidth - 24), boxShadow: 'var(--shadow-2xl), var(--shadow-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display,sans-serif)', fontWeight: 800, fontSize: 15, color: '#fff' }}>✂️ Crop Photo</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted,#94a3b8)', fontWeight: 600 }}>Drag image · scroll to zoom</div>
        </div>
        <div style={{ width: CONTAINER_W, height: CONTAINER_H, position: 'relative', overflow: 'hidden', background: '#05080f', borderRadius: 12, cursor: 'grab', touchAction: 'none', margin: '0 auto', userSelect: 'none', border: '1px solid rgba(255,255,255,0.05)' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <img src={imageSrc} alt="crop-source" draggable={false} style={{ position: 'absolute', left: pos.x, top: pos.y, width: dw, height: dh, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cropTop, background: 'rgba(4,8,15,0.70)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CONTAINER_H - cropTop - CROP_H_DISPLAY, background: 'rgba(4,8,15,0.70)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: cropTop, left: 0, width: cropLeft, height: CROP_H_DISPLAY, background: 'rgba(4,8,15,0.70)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: cropTop, right: 0, width: CONTAINER_W - cropLeft - CROP_W_DISPLAY, height: CROP_H_DISPLAY, background: 'rgba(4,8,15,0.70)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: cropTop, left: cropLeft, width: CROP_W_DISPLAY, height: CROP_H_DISPLAY, border: '2px solid var(--cyan-400,#22d3ee)', borderRadius: 4, pointerEvents: 'none', boxShadow: '0 0 15px rgba(6,182,212,0.3)' }}>
            {[1, 2].map(n => (<React.Fragment key={n}><div style={{ position: 'absolute', left: `${n * 33.33}%`, top: 0, bottom: 0, width: 1, background: 'rgba(6,182,212,0.2)' }} /><div style={{ position: 'absolute', top: `${n * 33.33}%`, left: 0, right: 0, height: 1, background: 'rgba(6,182,212,0.2)' }} /></React.Fragment>))}
          </div>
          {[{ top: cropTop - 4, left: cropLeft - 4 }, { top: cropTop - 4, left: cropLeft + CROP_W_DISPLAY - 8 }, { top: cropTop + CROP_H_DISPLAY - 8, left: cropLeft - 4 }, { top: cropTop + CROP_H_DISPLAY - 8, left: cropLeft + CROP_W_DISPLAY - 8 }].map((s, i) => (
            <div key={i} style={{ position: 'absolute', ...s, width: 10, height: 10, background: 'var(--cyan-400,#22d3ee)', borderRadius: 2, pointerEvents: 'none' }} />
          ))}
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Drag to reposition</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted,#94a3b8)', marginBottom: 6, fontWeight: 600 }}>
            <span>Zoom Matrix</span><span>{Math.round((scale / minScale - 1) * 100 + 100)}%</span>
          </div>
          <input type="range" min={minScale} max={maxScale} step={0.001} value={scale} onChange={handleZoomChange} style={{ width: '100%', accentColor: 'var(--cyan-500)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-line,#1e293b)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button type="button" onClick={handleConfirm} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--grad-button, linear-gradient(135deg, #0891b2, #06b6d4))', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 4px 14px rgba(6,182,212,0.3)' }}>✂️ Crop & Use</button>
        </div>
      </div>
    </div>
  );
}

/* ─── PhotoUploader ───────────────────────────────────────────────────── */
function PhotoUploader({ value, onChange, notify, label = 'Passport Photo' }) {
  const [dragOver, setDragOver] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const fileRef = useRef(null);

  const validateAndOpenCrop = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify('❌ Only image files are allowed.', 'err'); return; }
    if (file.size > MAX_PHOTO_SIZE) { notify('❌ Photo source too large. Max 5 MB.', 'err'); return; }

    try {
      const buffer = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const header = bytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '').toUpperCase();
      
      let valid = false;
      if (header.startsWith('FFD8FF')) valid = true; // JPG
      else if (header === '89504E47') valid = true; // PNG
      else if (header === '52494646') valid = true; // WEBP (RIFF)
      
      if (!valid) {
        notify('❌ Security validation failed: Invalid file signature.', 'err');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => setCropSrc(e.target.result);
      reader.readAsDataURL(file);
    } catch (err) {
      notify('❌ Failed to validate file signature.', 'err');
    }
  };

  return (
    <div className="igroup f-full">
      <label className="verify-style-label">{label}</label>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--cyan-50)', borderRadius: 8, border: '1px solid var(--cyan-200)' }}>
          <img src={value} alt="Preview" style={{ width: 50, height: 60, borderRadius: 6, objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700)', marginBottom: 3 }}>✅ Passport crop generated</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✏️ Replace</button>
              <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
              {/* Fixed Syntax: Cleared out broken token typo configurations */}
              <button type="button" onClick={() => onChange(null)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>🗑 Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); validateAndOpenCrop(e.dataTransfer.files[0]); }}
          style={{ border: `1px dashed ${dragOver ? 'var(--cyan-500)' : 'var(--slate-300)'}`, borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--cyan-50)' : 'var(--slate-50)', transition: 'all 0.18s var(--ease-smooth)' }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>{dragOver ? '📂' : '📷'}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: dragOver ? 'var(--cyan-600)' : 'var(--slate-600)', marginBottom: 4 }}>{dragOver ? 'Drop profile image' : 'Drag & drop image, or click to browse'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>JPG, PNG, WEBP · Crop window launches instantly</div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { validateAndOpenCrop(e.target.files[0]); e.target.value = ''; }} />
      {cropSrc && (
        <CropModal imageSrc={cropSrc} onConfirm={(dataUrl) => { onChange(dataUrl); setCropSrc(null); }} onCancel={() => setCropSrc(null)} />
      )}
    </div>
  );
}

/* ─── Main Request Component ───────────────────────────────────────────── */
export default function Request() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', show: false });

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [programType, setProgramType] = useState('Internship');
  const [domain, setDomain] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [photo, setPhoto] = useState(null);
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('I');
  const [collegeCity, setCollegeCity] = useState('');

  const showToast = (message, type = 'ok') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast({ message: '', type: '', show: false }), 3500);
  };

  const handleFormDispatch = async (e) => {
    e.preventDefault();
    if (!photo) { showToast('❌ Identity portrait verification photo is required.', 'err'); return; }
    if (!mobile || mobile.replace(/\D/g, '').length < 10) { showToast('❌ Enter a valid 10-digit mobile number.', 'err'); return; }
    if (!/^[a-zA-Z\s\.]+$/.test(name.trim())) { showToast('❌ Name contains invalid characters. Only letters are allowed.', 'err'); return; }
    if (!/^[a-zA-Z0-9\s\.\-\(\)]+$/.test(domain.trim())) { showToast('❌ Domain contains invalid characters.', 'err'); return; }
    if (!collegeName.trim()) { showToast('❌ College Name is required.', 'err'); return; }
    if (!department.trim()) { showToast('❌ Department is required.', 'err'); return; }
    if (!collegeCity.trim()) { showToast('❌ College City is required.', 'err'); return; }
    if (new Date(startDate) > new Date(endDate)) { showToast('❌ Epoch timeline bounds parameters are reversed.', 'err'); return; }

    setLoading(true);

    try {
      /* ─── PRE-SUBMISSION VERIFICATION LAYER ─── */
      const { data: duplicateRecords, error: verifyError } = await supabase
        .from('certificates')
        .select('id')
        .eq('mobile', mobile.trim())
        .eq('program_type', programType);

      if (verifyError) throw verifyError;

      if (duplicateRecords && duplicateRecords.length > 0) {
        showToast(`You have already submitted an application for the ${programType} program.`, 'err');
        setLoading(false);
        return;
      }

      /* ─── DISPATCH PATHWAY VALIDATION PASSED ─── */
      const requestPayload = {
        student_name: name.toUpperCase().trim(),
        mobile: mobile.trim(),
        program_type: programType,
        domain: domain.trim(),
        start_date: startDate,
        end_date: endDate,
        photo_url: photo,
        cert_no: `PENDING/${String(Date.now()).slice(-5)}`,
        college_name: collegeName.trim(),
        department: department.trim(),
        year: year,
        college_city: collegeCity.trim()
      };

      const { error: insertError } = await supabase.from('certificates').insert([requestPayload]);

      if (insertError) {
        showToast('Submission rejected. Cloud schema deployment fault.', 'err');
      } else {
        showToast('🎉 Application successfully submitted to active logs!', 'ok');
        setName(''); setMobile(''); setDomain(''); setStartDate(''); setEndDate(''); setPhoto(null);
        setCollegeName(''); setDepartment(''); setYear('I'); setCollegeCity('');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Thread fault context exception: [Hidden for security]');
      showToast('Ecosystem thread context runtime failure.', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page active" style={{ background: 'var(--ink-950)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>

      {/* Background Animated Decorator Canvas */}
      <div className="verify-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="verify-lines">
          <div className="vline" style={{ left: '12%', animationDuration: '6s' }}></div>
          <div className="vline" style={{ left: '48%', animationDuration: '5s', animationDelay: '0.3s' }}></div>
          <div className="vline" style={{ left: '82%', animationDuration: '7s', animationDelay: '1.2s' }}></div>
        </div>
      </div>



      <div style={{ padding: '60px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--topnav-h))', position: 'relative', zIndex: 10 }}>
        <div className="verify-styled-card" style={{ width: '100%', maxWidth: '700px' }}>

          {/* Header Segment Matching Verify Portal */}
          <div className="verify-style-header">
            <h2>Request <span>Deployment Token</span></h2>
            <p>Submit application metadata parameters directly into the active authentication ledger.</p>
          </div>

          <form onSubmit={handleFormDispatch} className="f-grid" style={{ padding: '32px 38px' }}>

            <div className="igroup f-full">
              <label className="verify-style-label">Full Candidate Name</label>
              <input
                type="text" className="verify-style-input" placeholder="ENTER YOUR LEGAL NAME"
                value={name} onChange={e => setName(e.target.value.toUpperCase())} required
              />
            </div>

            <div className="igroup">
              <label className="verify-style-label">Contact Reference (Mobile)</label>
              <input
                type="tel" maxLength="10" className="verify-style-input" placeholder="10-digit primary contact"
                value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} required
              />
            </div>

            <div className="igroup f-full">
              <label className="verify-style-label">College Name</label>
              <input
                type="text" className="verify-style-input" placeholder="Enter College Name"
                value={collegeName} onChange={e => setCollegeName(e.target.value)} required
              />
            </div>

            <div className="igroup">
              <label className="verify-style-label">Department</label>
              <input
                type="text" className="verify-style-input" placeholder="e.g. Computer Science"
                value={department} onChange={e => setDepartment(e.target.value)} required
              />
            </div>

            <div className="igroup">
              <label className="verify-style-label">Year</label>
              <select className="verify-style-input verify-style-select" value={year} onChange={e => setYear(e.target.value)}>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            <div className="igroup f-full">
              <label className="verify-style-label">College City</label>
              <input
                type="text" className="verify-style-input" placeholder="Enter College City"
                value={collegeCity} onChange={e => setCollegeCity(e.target.value)} required
              />
            </div>

            <div className="igroup">
              <label className="verify-style-label">Classification Schema Path</label>
              <select className="verify-style-input verify-style-select" value={programType} onChange={e => setProgramType(e.target.value)}>
                <option value="Internship">Internship Certification Track</option>
                <option value="Training">Training Module Framework</option>
              </select>
            </div>

            <div className="igroup f-full">
              <label className="verify-style-label">Domain Field</label>
              <input
                type="text" className="verify-style-input" placeholder="e.g., Deep Learning / Embedded Systems"
                value={domain} onChange={e => setDomain(e.target.value)} required
              />
            </div>

            <div className="igroup">
              <label className="verify-style-label">Start Date</label>
              <input
                type="date" className="verify-style-input"
                value={startDate} onChange={e => setStartDate(e.target.value)} required
              />
            </div>

            <div className="igroup">
              <label className="verify-style-label">End Date</label>
              <input
                type="date" className="verify-style-input"
                value={endDate} onChange={e => setEndDate(e.target.value)} required
              />
            </div>

            {/* INTEGRATED PORTRAIT PHOTOGRAPH CLIP ENGINE MATRIX */}
            <PhotoUploader value={photo} onChange={setPhoto} notify={showToast} label="Upload Your Photo" />

            {/* DISPATCH ACTION CONTROL */}
            <div className="f-full" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '20px', marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit" className="btn-issue" disabled={loading}
                style={{ margin: 0, padding: '14px 40px', fontSize: '13px' }}
              >
                {loading ? 'Processing Ledger Strings...' : 'Submit Entry Request 🚀'}
              </button>
            </div>

          </form>
        </div>
      </div>

      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>{toast.message}</div>
    </div>
  );
}