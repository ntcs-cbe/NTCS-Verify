import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const [rotation, setRotation] = useState(0);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  const cropLeft = (CONTAINER_W - CROP_W_DISPLAY) / 2;
  const cropTop = (CONTAINER_H - CROP_H_DISPLAY) / 2;

  const clamp = useCallback((newPos, s, iw, ih, rot = 0) => {
    const dw = iw * s;
    const dh = ih * s;
    const rad = (rot * Math.PI) / 180;
    const cosVal = Math.cos(rad);
    const sinVal = Math.sin(rad);
    const absCos = Math.abs(cosVal);
    const absSin = Math.abs(sinVal);

    // Half size of the crop viewport
    const wch = CROP_W_DISPLAY / 2;
    const hch = CROP_H_DISPLAY / 2;

    // Center of the crop viewport in container coordinates
    const cropCX = cropLeft + wch;
    const cropCY = cropTop + hch;

    // Current proposed center of the image relative to crop viewport center
    const x_c = (newPos.x + dw / 2) - cropCX;
    const y_c = (newPos.y + dh / 2) - cropCY;

    // Rotate the image center displacement into the image's local coordinate system
    // (This aligns the image boundaries with the coordinate axes)
    const localX = x_c * cosVal + y_c * sinVal;
    const localY = -x_c * sinVal + y_c * cosVal;

    // Compute the half-width and half-height of the crop viewport projected onto the image's local axes
    const cropWLocalHalf = wch * absCos + hch * absSin;
    const cropHLocalHalf = wch * absSin + hch * absCos;

    // Clamp the local coordinates so the image covers the projected crop viewport
    const limitX = Math.max(0, dw / 2 - cropWLocalHalf);
    const limitY = Math.max(0, dh / 2 - cropHLocalHalf);

    const clampedLocalX = Math.min(limitX, Math.max(-limitX, localX));
    const clampedLocalY = Math.min(limitY, Math.max(-limitY, localY));

    // Rotate back to container space
    const clampedXCenterRel = clampedLocalX * cosVal - clampedLocalY * sinVal;
    const clampedYCenterRel = clampedLocalX * sinVal + clampedLocalY * cosVal;

    // Convert center back to top-left position
    const clampedX = clampedXCenterRel + cropCX - dw / 2;
    const clampedY = clampedYCenterRel + cropCY - dh / 2;

    return { x: clampedX, y: clampedY };
  }, [cropLeft, cropTop, CROP_W_DISPLAY, CROP_H_DISPLAY]);

  const getMinScaleForRotation = useCallback((rot) => {
    if (!imgNatural.w || !imgNatural.h) return 1;
    const rad = (rot * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));

    const wch = CROP_W_DISPLAY / 2;
    const hch = CROP_H_DISPLAY / 2;

    // Projected crop box half sizes in image local coordinate system
    const cropWLocalHalf = wch * absCos + hch * absSin;
    const cropHLocalHalf = wch * absSin + hch * absCos;

    const minScaleW = (cropWLocalHalf * 2) / imgNatural.w;
    const minScaleH = (cropHLocalHalf * 2) / imgNatural.h;

    return Math.max(minScaleW, minScaleH) * 1.05;
  }, [imgNatural, CROP_W_DISPLAY, CROP_H_DISPLAY]);

  useEffect(() => {
    setRotation(0);
  }, [imageSrc]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img;
      setImgNatural({ w: nw, h: nh });

      const baseScale = Math.max(CROP_W_DISPLAY / nw, CROP_H_DISPLAY / nh) * 1.05;
      setScale(baseScale);

      const dw = nw * baseScale;
      const dh = nh * baseScale;
      setPos(clamp({ x: (CONTAINER_W - dw) / 2, y: (CONTAINER_H - dh) / 2 }, baseScale, nw, nh, 0));
    };
    img.src = imageSrc;
  }, [imageSrc, clamp]);

  const dw = imgNatural.w * scale;
  const dh = imgNatural.h * scale;

  const onMouseDown = (e) => { e.preventDefault(); dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }; };
  const onMouseMove = (e) => { if (!dragRef.current.active) return; setPos(clamp({ x: dragRef.current.ox + e.clientX - dragRef.current.startX, y: dragRef.current.oy + e.clientY - dragRef.current.startY }, scale, imgNatural.w, imgNatural.h, rotation)); };
  const onMouseUp = () => { dragRef.current.active = false; };
  const onTouchStart = (e) => { const t = e.touches[0]; dragRef.current = { active: true, startX: t.clientX, startY: t.clientY, ox: pos.x, oy: pos.y }; };
  const onTouchMove = (e) => { if (!dragRef.current.active) return; const t = e.touches[0]; setPos(clamp({ x: dragRef.current.ox + t.clientX - dragRef.current.startX, y: dragRef.current.oy + t.clientY - dragRef.current.startY }, scale, imgNatural.w, imgNatural.h, rotation)); };
  const onTouchEnd = () => { dragRef.current.active = false; };

  const handleZoomChange = (e) => {
    const s = parseFloat(e.target.value);
    setScale(s);
    setPos(prev => clamp(prev, s, imgNatural.w, imgNatural.h, rotation));
  };

  const handleRotationChange = (e) => {
    const rot = parseInt(e.target.value);
    setRotation(rot);
    const newMinScale = getMinScaleForRotation(rot);
    let newScale = scale;
    if (scale < newMinScale) {
      newScale = newMinScale;
      setScale(newScale);
    }
    setPos(prev => clamp(prev, newScale, imgNatural.w, imgNatural.h, rot));
  };

  const handleConfirm = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 330;
      canvas.height = 390;
      const ctx = canvas.getContext('2d');
      
      const canvasScale = 330 / CROP_W_DISPLAY;
      const drawW = dw * canvasScale;
      const drawH = dh * canvasScale;

      const cropCX = CONTAINER_W / 2;
      const cropCY = CONTAINER_H / 2;
      const cx_rel = (pos.x + dw / 2) - cropCX;
      const cy_rel = (pos.y + dh / 2) - cropCY;

      ctx.translate(canvas.width / 2 + cx_rel * canvasScale, canvas.height / 2 + cy_rel * canvasScale);
      ctx.rotate((rotation * Math.PI) / 180);
      
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      onConfirm(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageSrc;
  };

  const currentMinScale = getMinScaleForRotation(rotation);
  const currentMaxScale = currentMinScale * 4;

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
          <img src={imageSrc} alt="crop-source" draggable={false} style={{ position: 'absolute', left: pos.x, top: pos.y, width: dw, height: dh, pointerEvents: 'none', transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }} />
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
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted,#94a3b8)', marginBottom: 6, fontWeight: 600 }}>
              <span>Zoom Matrix</span><span>{Math.round((scale / currentMinScale) * 100)}%</span>
            </div>
            <input type="range" min={currentMinScale} max={currentMaxScale} step={0.001} value={scale} onChange={handleZoomChange} style={{ width: '100%', accentColor: 'var(--cyan-500)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted,#94a3b8)', marginBottom: 6, fontWeight: 600 }}>
              <span>Rotation</span><span>{rotation}°</span>
            </div>
            <input type="range" min={0} max={360} step={1} value={rotation} onChange={handleRotationChange} style={{ width: '100%', accentColor: 'var(--cyan-500)' }} />
          </div>
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
  const [originalSrc, setOriginalSrc] = useState(null);
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
      reader.onload = (e) => {
        setOriginalSrc(e.target.result);
        setCropSrc(e.target.result);
      };
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
              <button type="button" onClick={() => setCropSrc(originalSrc || value)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✂️ Edit / Recrop</button>
              <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✏️ Replace</button>
              <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
              <button type="button" onClick={() => { onChange(null); setOriginalSrc(null); }} style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>🗑 Remove</button>
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
const DOMAIN_OPTIONS = [
  'Artificial Intelligence',
  'App Development',
  'Artificial Intelligence and Machine Learning',
  'Data Science',
  'Data Analytics',
  'Web Development',
  'Full Stack',
  'UI / UX',
  'Embedded System',
  'Internet of Things',
  'Raspberry Pi',
  'Arduino',
  'VLSI Design',
  'PCB Design',
  'Deep Learning',
  'Gen AI',
  'Machine Learning',
  'Cloud Computing',
  'Cyber Security',
  'Digital Marketing',
  'other (to enter)'
];

export default function RequestForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', show: false });

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [programType, setProgramType] = useState('Internship');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
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
    if (!photo) { showToast('❌ Profile photo is required.', 'err'); return; }
    if (!mobile || mobile.replace(/\D/g, '').length < 10) { showToast('❌ Enter a valid 10-digit mobile number.', 'err'); return; }
    if (!/^[a-zA-Z\s\.]+$/.test(name.trim())) { showToast('❌ Name contains invalid characters. Only letters are allowed.', 'err'); return; }

    const finalDomain = (selectedDomain === 'other (to enter)' ? customDomain : selectedDomain).trim();
    if (!finalDomain) { showToast('❌ Domain selection is required.', 'err'); return; }
    if (!/^[a-zA-Z0-9\s\.\-\(\)\/]+$/.test(finalDomain)) { showToast('❌ Domain contains invalid characters.', 'err'); return; }

    if (!collegeName.trim()) { showToast('❌ College Name is required.', 'err'); return; }
    if (!department.trim()) { showToast('❌ Department is required.', 'err'); return; }
    if (!collegeCity.trim()) { showToast('❌ College City is required.', 'err'); return; }
    if (new Date(startDate) > new Date(endDate)) { showToast('❌ Start date cannot be after end date.', 'err'); return; }

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
        domain: finalDomain,
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
        showToast('Submission failed. Please try again later.', 'err');
      } else {
        showToast('🎉 Application successfully submitted!', 'ok');
        setName(''); setMobile(''); setSelectedDomain(''); setCustomDomain(''); setStartDate(''); setEndDate(''); setPhoto(null);
        setCollegeName(''); setDepartment(''); setYear('I'); setCollegeCity('');
        if (onSuccess) {
          setTimeout(onSuccess, 1500);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Network error. Please try again.', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, animation: 'pageIn 0.3s ease' }}>
        <div className="verify-styled-card" style={{ width: '100%', maxWidth: '700px' }}>

          {/* Header Segment Matching Verify Portal */}
          <div className="verify-style-header">
            <h2>Submit <span>Application</span></h2>
            <p>Fill in your details below to submit your certificate application.</p>
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
              <label className="verify-style-label">Mobile Number</label>
              <input
                type="tel" maxLength="10" className="verify-style-input" placeholder="10-digit mobile number"
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
              <label className="verify-style-label">Program Type</label>
              <select className="verify-style-input verify-style-select" value={programType} onChange={e => setProgramType(e.target.value)}>
                <option value="Internship">Internship</option>
                <option value="Training">Training</option>
              </select>
            </div>

            <div className="igroup f-full">
              <label className="verify-style-label">Domain Field</label>
              <select
                className="verify-style-input verify-style-select"
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                required
              >
                <option value="" disabled>-- SELECT DOMAIN --</option>
                {DOMAIN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {selectedDomain === 'other (to enter)' && (
              <div className="igroup f-full">
                <label className="verify-style-label">Custom Domain Name</label>
                <input
                  type="text"
                  className="verify-style-input"
                  placeholder="Enter custom domain name (e.g., Quantum Computing)"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  required
                />
              </div>
            )}

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

            {/* PHOTO UPLOAD */}
            <PhotoUploader value={photo} onChange={setPhoto} notify={showToast} label="Upload Your Photo" />

            {/* SUBMIT BUTTON */}
            <div className="f-full" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '20px', marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit" className="btn-issue" disabled={loading}
                style={{ margin: 0, padding: '14px 40px', fontSize: '13px' }}
              >
                {loading ? 'Submitting...' : 'Submit Application 🚀'}
              </button>
            </div>

          </form>
        </div>
      </div>

      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>{toast.message}</div>
    </>
  );
}