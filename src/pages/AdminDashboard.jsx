import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const MAX_PHOTO_SIZE   = 5 * 1024 * 1024;
const MAX_BULK_SIZE    = 5 * 1024 * 1024;
const MAX_BULK_RECORDS = 1000;

const formatDate = (ds) => {
  if (!ds) return '—';
  const d = new Date(ds);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/* ─── CropModal ───────────────────────────────────────────────────────── */
function CropModal({ imageSrc, onConfirm, onCancel }) {
  const CONTAINER_W    = 320;
  const CONTAINER_H    = 320;
  const CROP_W_DISPLAY = 170;
  const CROP_H_DISPLAY = Math.round(170 * (195 / 165));

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [scale,      setScale]      = useState(1);
  const [pos,        setPos]        = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  const cropLeft = (CONTAINER_W - CROP_W_DISPLAY) / 2;
  const cropTop  = (CONTAINER_H - CROP_H_DISPLAY) / 2;

  const clamp = useCallback((newPos, s, iw, ih) => {
    const dw = iw * s;
    const dh = ih * s;
    return {
      x: Math.min(cropLeft, Math.max(cropLeft + CROP_W_DISPLAY - dw, newPos.x)),
      y: Math.min(cropTop,  Math.max(cropTop  + CROP_H_DISPLAY - dh, newPos.y)),
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

  const onMouseDown  = (e) => { e.preventDefault(); dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }; };
  const onMouseMove  = (e) => { if (!dragRef.current.active) return; setPos(clamp({ x: dragRef.current.ox + e.clientX - dragRef.current.startX, y: dragRef.current.oy + e.clientY - dragRef.current.startY }, scale, imgNatural.w, imgNatural.h)); };
  const onMouseUp    = () => { dragRef.current.active = false; };
  const onTouchStart = (e) => { const t = e.touches[0]; dragRef.current = { active: true, startX: t.clientX, startY: t.clientY, ox: pos.x, oy: pos.y }; };
  const onTouchMove  = (e) => { if (!dragRef.current.active) return; const t = e.touches[0]; setPos(clamp({ x: dragRef.current.ox + t.clientX - dragRef.current.startX, y: dragRef.current.oy + t.clientY - dragRef.current.startY }, scale, imgNatural.w, imgNatural.h)); };
  const onTouchEnd   = () => { dragRef.current.active = false; };

  const handleZoomChange = (e) => { const s = parseFloat(e.target.value); setScale(s); setPos(prev => clamp(prev, s, imgNatural.w, imgNatural.h)); };

  const handleConfirm = () => {
    const img = new Image();
    img.onload = () => {
      const ratio = imgNatural.w / dw;
      const canvas = document.createElement('canvas');
      canvas.width  = 330;
      canvas.height = 390;
      canvas.getContext('2d').drawImage(img, (cropLeft - pos.x) * ratio, (cropTop - pos.y) * ratio, CROP_W_DISPLAY * ratio, CROP_H_DISPLAY * ratio, 0, 0, 330, 390);
      onConfirm(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageSrc;
  };

  const minScale = Math.max(CROP_W_DISPLAY / (imgNatural.w || 1), CROP_H_DISPLAY / (imgNatural.h || 1)) * 1.05;
  const maxScale = minScale * 4;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(4,8,20,0.90)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
      <div style={{ background:'var(--white,#fff)', borderRadius:16, padding:24, width:Math.min(CONTAINER_W+48, window.innerWidth-24), boxShadow:'0 32px 80px rgba(0,0,0,0.45)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-display,sans-serif)', fontWeight:800, fontSize:15 }}>✂️ Crop Photo</div>
          <div style={{ fontSize:11, color:'var(--muted,#888)', fontWeight:600 }}>Drag image · scroll to zoom</div>
        </div>
        <div style={{ width:CONTAINER_W, height:CONTAINER_H, position:'relative', overflow:'hidden', background:'#0d1117', borderRadius:10, cursor:'grab', touchAction:'none', margin:'0 auto', userSelect:'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <img src={imageSrc} alt="crop-source" draggable={false} style={{ position:'absolute', left:pos.x, top:pos.y, width:dw, height:dh, pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:cropTop, background:'rgba(0,0,0,0.60)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:CONTAINER_H-cropTop-CROP_H_DISPLAY, background:'rgba(0,0,0,0.60)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:cropTop, left:0, width:cropLeft, height:CROP_H_DISPLAY, background:'rgba(0,0,0,0.60)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:cropTop, right:0, width:CONTAINER_W-cropLeft-CROP_W_DISPLAY, height:CROP_H_DISPLAY, background:'rgba(0,0,0,0.60)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:cropTop, left:cropLeft, width:CROP_W_DISPLAY, height:CROP_H_DISPLAY, border:'2px solid #06b6d4', borderRadius:4, pointerEvents:'none' }}>
            {[1,2].map(n => (<React.Fragment key={n}><div style={{ position:'absolute', left:`${n*33.33}%`, top:0, bottom:0, width:1, background:'rgba(6,182,212,0.25)' }} /><div style={{ position:'absolute', top:`${n*33.33}%`, left:0, right:0, height:1, background:'rgba(6,182,212,0.25)' }} /></React.Fragment>))}
          </div>
          {[{top:cropTop-4,left:cropLeft-4},{top:cropTop-4,left:cropLeft+CROP_W_DISPLAY-8},{top:cropTop+CROP_H_DISPLAY-8,left:cropLeft-4},{top:cropTop+CROP_H_DISPLAY-8,left:cropLeft+CROP_W_DISPLAY-8}].map((s,i)=>(
            <div key={i} style={{ position:'absolute', ...s, width:12, height:12, background:'#06b6d4', borderRadius:2, pointerEvents:'none' }} />
          ))}
          <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.45)', pointerEvents:'none', fontWeight:600, letterSpacing:'0.5px', textTransform:'uppercase' }}>Drag to reposition</div>
        </div>
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted,#888)', marginBottom:6, fontWeight:600 }}>
            <span>Zoom</span><span>{Math.round((scale/minScale-1)*100+100)}%</span>
          </div>
          <input type="range" min={minScale} max={maxScale} step={0.001} value={scale} onChange={handleZoomChange} style={{ width:'100%', accentColor:'#06b6d4' }} />
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button type="button" onClick={onCancel} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--border,#e2e8f0)', background:'transparent', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--slate-700)' }}>Cancel</button>
          <button type="button" onClick={handleConfirm} style={{ padding:'9px 22px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#06b6d4,#0891b2)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>✂️ Crop & Use</button>
        </div>
      </div>
    </div>
  );
}

/* ─── PhotoUploader ───────────────────────────────────────────────────── */
function PhotoUploader({ value, existingUrl, onChange, notify, label = 'Passport Photo' }) {
  const [dragOver, setDragOver] = useState(false);
  const [cropSrc,  setCropSrc]  = useState(null);
  const fileRef = useRef(null);

  const validateAndOpenCrop = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify('❌ Only image files are allowed.', 'err'); return; }
    if (file.size > MAX_PHOTO_SIZE)       { notify('❌ Photo source too large. Max 5 MB.', 'err'); return; }

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

  const previewSrc = value || existingUrl || null;

  return (
    <div className="igroup f-full">
      <label>{label}</label>
      {previewSrc ? (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'var(--cyan-50,#ecfeff)', borderRadius:10, border:'1px solid var(--cyan-200,#a5f3fc)' }}>
          <img src={previewSrc} alt="Preview" style={{ width:50, height:60, borderRadius:6, objectFit:'cover', border:'2px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--slate-700,#334155)', marginBottom:4 }}>
              {value ? '✅ Cropped photo ready' : '📁 Existing photo'}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize:11, fontWeight:700, color:'#0891b2', background:'none', border:'none', cursor:'pointer', padding:0 }}>✏️ Replace</button>
              <span style={{ color:'#cbd5e1', fontSize:11 }}>|</span>
              <button type="button" onClick={() => onChange(null)} style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'none', border:'none', cursor:'pointer', padding:0 }}>🗑 Remove</button>
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
          style={{ border:`2px dashed ${dragOver?'#06b6d4':'var(--border,#e2e8f0)'}`, borderRadius:10, padding:'22px 16px', textAlign:'center', cursor:'pointer', background:dragOver?'var(--cyan-50,#ecfeff)':'var(--slate-50,#f8fafc)', transition:'all 0.18s ease' }}
        >
          <div style={{ fontSize:28, marginBottom:8 }}>{dragOver ? '📂' : '📸'}</div>
          <div style={{ fontSize:13, fontWeight:700, color:dragOver?'#0891b2':'var(--slate-600,#475569)', marginBottom:4 }}>{dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}</div>
          <div style={{ fontSize:11, color:'var(--muted,#94a3b8)' }}>JPG, PNG, WEBP · Crop tool opens after selection</div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={(e) => { validateAndOpenCrop(e.target.files[0]); e.target.value=''; }} />
      {cropSrc && (
        <CropModal imageSrc={cropSrc} onConfirm={(dataUrl) => { onChange(dataUrl); setCropSrc(null); }} onCancel={() => setCropSrc(null)} />
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [activeTab, setActiveTab]       = useState('all');
  const [certs, setCerts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [toast, setToast]               = useState({ message: '', type: '', show: false });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [selected, setSelected]         = useState(new Set());

  /* Functional Layout Filters State Keys */
  const [filterProgram, setFilterProgram]       = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');

  /* Issue form */
  const [iCertNo, setICertNo] = useState('');
  const [iMobile, setIMobile] = useState('');
  const [iName,   setIName]   = useState('');
  const [iType,   setIType]   = useState('Internship');
  const [iDomain, setIDomain] = useState('');
  const [iStart,  setIStart]  = useState('');
  const [iEnd,    setIEnd]    = useState('');
  const [iPhoto,  setIPhoto]  = useState(null);

  /* Edit modal */
  const [isEditOpen,  setIsEditOpen]  = useState(false);
  const [editRecord,  setEditRecord]  = useState(null);   
  const [editFields,  setEditFields]  = useState({});     
  const [ePhoto,      setEPhoto]      = useState(undefined); 

  /* Bulk import */
  const [dragActive,    setDragActive]    = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  /* Request tab state */
  const [requestActionRecord, setRequestActionRecord] = useState(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);

  const showToast = (message, type = 'ok') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast({ message:'', type:'', show:false }), 3400);
  };

  /* ── Load Data Hook Sorted By Cert No Descending ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('cert_no', { ascending: false }); 
    if (!error && data) setCerts(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Separate master certificates from pending requests based on tracking template prefixes
  const approvedCerts = certs.filter(c => !c.cert_no?.startsWith('PENDING/'));
  const pendingRequests = certs.filter(c => c.cert_no?.startsWith('PENDING/'));

  /* Multi-Tier Cascade Filter Evaluator Core Pipeline Engine */
  const filteredCerts = approvedCerts.filter(c => {
    const matchesSearch = (c.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.cert_no      || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.domain       || '').toLowerCase().includes(search.toLowerCase());
                          
    const matchesProgram = filterProgram === 'all' || c.program_type === filterProgram;
    
    const isHidden = c.is_hidden === null || c.is_hidden === undefined
      ? (c.end_date && c.end_date > todayStr)
      : c.is_hidden;
    const matchesVisibility = filterVisibility === 'all' ||
                              (filterVisibility === 'hidden' && isHidden) ||
                              (filterVisibility === 'visible' && !isHidden);

    return matchesSearch && matchesProgram && matchesVisibility;
  });

  const filteredRequests = pendingRequests.filter(c =>
    (c.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.domain       || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile       || '').includes(search)
  );

  /* ── Selection ── */
  const toggleSelect    = (id) => setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleSelectAll = () => selected.size===filteredCerts.length ? setSelected(new Set()) : setSelected(new Set(filteredCerts.map(c=>c.id)));

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Permanently delete ${selected.size} selected certificate(s)?`)) return;
    const ids = [...selected];
    const { error } = await supabase.from('certificates').delete().in('id', ids);
    if (error) showToast('❌ Bulk delete failed.', 'err');
    else { showToast(`🗑️ ${ids.length} certificate(s) deleted.`, 'ok'); setSelected(new Set()); loadData(); }
  };

  /* ── Auto cert no ── */
  const calculateNextCertNo = (programType) => {
    const yr = String(new Date().getFullYear()).slice(-2);
    const pfx = programType === 'Internship' ? 'I' : 'T';
    const prefix = `NTCS${yr}${pfx}/T`;
    let max = 0;
    certs.forEach(c => {
      if (c.cert_no && c.cert_no.startsWith(prefix)) {
        const suffix = c.cert_no.substring(prefix.length);
        if (/^\d+$/.test(suffix)) {
          max = Math.max(max, parseInt(suffix, 10));
        }
      }
    });
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  };

  /* ── Issue ── */
  const handleIssue = async (e) => {
    e.preventDefault();
    if (!iCertNo || !/^NTCS/.test(iCertNo))                   { showToast('❌ Invalid certificate number.', 'err'); return; }
    if (!iMobile || iMobile.replace(/\D/g,'').length < 10)    { showToast('❌ Enter a valid 10-digit mobile number.', 'err'); return; }
    if (!/^[a-zA-Z\s\.]+$/.test(iName.trim()))                { showToast('❌ Name contains invalid characters. Only letters are allowed.', 'err'); return; }
    if (!/^[a-zA-Z0-9\s\.\-\(\)]+$/.test(iDomain.trim()))     { showToast('❌ Domain contains invalid characters.', 'err'); return; }
    if (new Date(iStart) > new Date(iEnd))                     { showToast('❌ Start date cannot be after end date.', 'err'); return; }
    const photoUrl = iPhoto || '';
    if (photoUrl && photoUrl.length > 600_000)                 { showToast('❌ Cropped photo too large.', 'err'); return; }

    const { error } = await supabase.from('certificates').insert([{
      cert_no: iCertNo, mobile: iMobile, student_name: iName,
      program_type: iType, domain: iDomain,
      start_date: iStart, end_date: iEnd, photo_url: photoUrl,
      is_hidden: null,
    }]);
    if (error) showToast('❌ Issue failed — serial conflict detected.', 'err');
    else {
      showToast('✅ Certificate issued successfully.', 'ok');
      setIName(''); setIMobile(''); setIDomain(''); setIStart(''); setIEnd(''); setIPhoto(null); setICertNo('');
      loadData(); setActiveTab('all');
    }
  };

  /* ── Open edit ── */
  const openEdit = (cert) => {
    setEditRecord(cert);                         
    setEditFields({                              
      cert_no:      cert.cert_no      ?? '',
      mobile:       cert.mobile       ?? '',
      student_name: cert.student_name ?? '',
      program_type: cert.program_type ?? 'Internship',
      domain:       cert.domain       ?? '',
      start_date:   cert.start_date   ?? '',
      end_date:     cert.end_date     ?? '',
    });
    setEPhoto(undefined);                        
    setIsEditOpen(true);
  };

  const closeEdit = () => { setIsEditOpen(false); setEditRecord(null); setEditFields({}); setEPhoto(undefined); };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editRecord) { showToast('❌ No record loaded.', 'err'); return; }
    if (!editFields.cert_no || (!/^NTCS/.test(editFields.cert_no) && !editFields.cert_no.startsWith('PENDING/'))) { showToast('❌ Invalid certificate configuration structure.', 'err'); return; }
    if (!editFields.mobile || editFields.mobile.replace(/\D/g,'').length < 10) { showToast('❌ Enter a valid 10-digit mobile number.', 'err'); return; }
    if (!/^[a-zA-Z\s\.]+$/.test(editFields.student_name.trim())) { showToast('❌ Name contains invalid characters. Only letters are allowed.', 'err'); return; }
    if (!/^[a-zA-Z0-9\s\.\-\(\)]+$/.test(editFields.domain.trim())) { showToast('❌ Domain contains invalid characters.', 'err'); return; }

    const resolvedPhoto =
      ePhoto === undefined ? (editRecord.photo_url ?? '')
      : ePhoto === null    ? ''
      :                      ePhoto;

    const payload = {
      ...editFields,
      photo_url: resolvedPhoto,
      is_hidden: editRecord.end_date === editFields.end_date ? editRecord.is_hidden : null,
    };

    const { data, error } = await supabase
      .from('certificates')
      .update(payload)
      .eq('id', editRecord.id)
      .select();

    if (error) {
      showToast(`❌ Update failed: ${error.message}`, 'err');
    } else if (!data || data.length === 0) {
      showToast('❌ Update matched no active rows.', 'err');
    } else {
      showToast('✅ Certificate registry parameters synchronized.', 'ok');
      closeEdit();
      loadData();
    }
  };

  /* ── Delete single ── */
  const handleDelete = async (certNo) => {
    if (!window.confirm(`Permanently delete certificate ${certNo}?`)) return;
    const { error } = await supabase.from('certificates').delete().eq('cert_no', certNo);
    if (error) showToast('❌ Delete failed.', 'err');
    else { showToast(`🗑️ ${certNo} deleted.`, 'ok'); loadData(); }
  };

  /* ── Toggle Hide / Unhide Visibility ── */
  const handleToggleVisibility = async (cert) => {
    const currentEffective = cert.is_hidden === null || cert.is_hidden === undefined
      ? (cert.end_date && cert.end_date > todayStr)
      : cert.is_hidden;
    const nextStatus = !currentEffective;
    const { error } = await supabase
      .from('certificates')
      .update({ is_hidden: nextStatus })
      .eq('id', cert.id);

    if (error) {
      showToast('❌ Failed to override record visibility parameter state.', 'err');
    } else {
      showToast(nextStatus ? '🔒 Certificate manually hidden.' : '🔓 Certificate manually unhidden.', 'ok');
      loadData();
    }
  };

  /* ── Request tab actions ── */
  const openAcceptModal = (record) => {
    const generatedNo = calculateNextCertNo(record.program_type);
    setICertNo(generatedNo);
    setEditFields({
      cert_no: generatedNo,
      mobile: record.mobile ?? '',
      student_name: record.student_name ?? '',
      program_type: record.program_type ?? 'Internship',
      domain: record.domain ?? '',
      start_date: record.start_date ?? '',
      end_date: record.end_date ?? '',
    });
    setEPhoto(undefined);
    setRequestActionRecord(record);
    setIsAcceptModalOpen(true);
  };

  const handleAcceptRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestActionRecord) return;
    if (!editFields.cert_no || !/^NTCS/.test(editFields.cert_no)) { showToast('❌ Invalid certificate layout token.', 'err'); return; }
    if (!/^[a-zA-Z\s\.]+$/.test(editFields.student_name.trim())) { showToast('❌ Name contains invalid characters. Only letters are allowed.', 'err'); return; }
    if (!/^[a-zA-Z0-9\s\.\-\(\)]+$/.test(editFields.domain.trim())) { showToast('❌ Domain contains invalid characters.', 'err'); return; }

    const finalPhoto = ePhoto === undefined ? (requestActionRecord.photo_url ?? '') : (ePhoto ?? '');

    const payload = {
      cert_no: editFields.cert_no,
      mobile: editFields.mobile,
      student_name: editFields.student_name,
      program_type: editFields.program_type,
      domain: editFields.domain,
      start_date: editFields.start_date,
      end_date: editFields.end_date,
      photo_url: finalPhoto,
      is_hidden: null,
    };

    const { error } = await supabase
      .from('certificates')
      .update(payload)
      .eq('id', requestActionRecord.id);

    if (error) {
      showToast('❌ Failed to approve and promote request.', 'err');
    } else {
      showToast('🎉 Request approved! Certificate is now live.', 'ok');
      setIsAcceptModalOpen(false);
      setRequestActionRecord(null);
      loadData();
    }
  };

  const handleRejectRequest = async (record) => {
    if (!window.confirm(`Are you sure you want to decline and drop the application filed by ${record.student_name}?`)) return;
    const { error } = await supabase.from('certificates').delete().eq('id', record.id);
    if (error) showToast('❌ Operation failure structural exception context.', 'err');
    else { showToast('🗑️ Request dropped successfully from active validation grids.', 'ok'); loadData(); }
  };

  /* ── Bulk import helpers ── */
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Cert No':'NTCS26I/T001','Mobile':'9876543210','Student Name':'DHAANSRI','Program Type':'Internship','Domain':'Bio Medical Calibration','Start Date':'2026-05-10','End Date':'2026-06-01' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'NTCS_Ingest_Template.xlsx');
  };

  const parseExcelDate = (v) => {
    if (!v) return '';
    if (typeof v === 'number') return new Date(Math.round((v-25569)*86400*1000)).toISOString().split('T')[0];
    const d = new Date(v);
    return isNaN(d) ? '' : d.toISOString().split('T')[0];
  };

  const processBulkFile = (file) => {
    if (!file) return;
    if (file.size > MAX_BULK_SIZE) { showToast('❌ File too large. Max 5 MB.', 'err'); return; }
    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type:'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!data?.length) throw new Error('No rows found');
        if (data.length > MAX_BULK_RECORDS) throw new Error('Too many rows');
        const rows = data
          .filter(r => r['Cert No'])
          .map(r => ({
            cert_no:      String(r['Cert No']||'').toUpperCase().trim(),
            mobile:       String(r['Mobile']||'').replace(/\D/g,''),
            student_name: String(r['Student Name']||'').toUpperCase().trim(),
            program_type: r['Program Type'] || 'Internship',
            domain:       String(r['Domain']||'').trim(),
            start_date:   parseExcelDate(r['Start Date']),
            end_date:     parseExcelDate(r['End Date']),
            is_hidden:    null
          }))
          .filter(r => r.cert_no && r.student_name && r.mobile.length >= 10);
        if (!rows.length) throw new Error('No valid data found.');
        const { error } = await supabase.from('certificates').insert(rows);
        if (error) throw error;
        showToast(`✅ ${rows.length} records imported!`, 'ok');
        loadData();
      } catch (err) {
        console.error('Ingest Error: [Hidden for security]');
        showToast('❌ Import failed — check template headers.', 'err');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const allSelected  = filteredCerts.length > 0 && selected.size === filteredCerts.length;
  const someSelected = selected.size > 0 && selected.size < filteredCerts.length;

  return (
    <div className="admin-layout-root">
      {isMobileOpen && (
        <div onClick={() => setIsMobileOpen(false)} style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(4,8,15,0.55)', backdropFilter:'blur(4px)' }} />
      )}

      <div className="dash-split">
        {/* ── SIDEBAR ── */}
        <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
          <div className="sb-profile">
            <div className="sb-avatar">A</div>
            <div className="sb-name">Admin Portal</div>
            <div className="sb-role">Certificate Management</div>
          </div>
          <div className="sb-section"><div className="sb-section-lbl">Navigation</div></div>
          <ul className="sb-menu">
            <li><button className={`sb-link ${activeTab==='all'?'active':''}`} onClick={() => { setActiveTab('all'); setIsMobileOpen(false); setSelected(new Set()); }}><span>📋</span> All Certificates</button></li>
            <li><button className={`sb-link ${activeTab==='issue'?'active':''}`} onClick={() => { setActiveTab('issue'); setIsMobileOpen(false); }}><span>✨</span> Issue Certificate</button></li>
            <li><button className={`sb-link ${activeTab==='requests'?'active':''}`} onClick={() => { setActiveTab('requests'); setIsMobileOpen(false); }}><span>📥</span> Pending Requests ({pendingRequests.length})</button></li>
          </ul>
          <div className="sb-footer">
            <button className="sb-link" style={{ color:'#f87171' }} onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}>
              <span>🚪</span> Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="admin-content">
          <div className="content-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                type="button" 
                className="drawer-toggle-btn"
                onClick={() => setIsMobileOpen(true)}
              >
                ☰
              </button>
              <div>
                <h1 style={{ margin: 0 }}>
                  {activeTab==='all' && 'Certificate Registry'}
                  {activeTab==='issue' && 'Issue Certificate'}
                  {activeTab==='requests' && 'Pending Requests Submissions'}
                </h1>
                <p style={{ margin: '4px 0 0' }}>
                  {activeTab==='all' && `${approvedCerts.length} total records · Manage and track all issued credentials`}
                  {activeTab==='issue' && 'Create and deploy a new credential directly to the registry'}
                  {activeTab==='requests' && `${pendingRequests.length} pending requests require administrator attention`}
                </p>
              </div>
            </div>
            {activeTab==='all' && (
              <button className="nav-btn solid" style={{ fontSize:'12px', padding:'10px 18px', margin: 0 }} onClick={() => setActiveTab('issue')}><span>+</span> Issue New</button>
            )}
          </div>

          {/* ── ALL REGISTER TAB ── */}
          {activeTab === 'all' && (<>
            {/* ── STATS ROW (FIXED MOUNT SYNTAX OBJECTS) ── */}
            <div className="stats-row">
              <div className="stat" style={{ animationDelay:'0ms' }}>
                <div className="s-label">Total Volume</div>
                <div className="s-val">{approvedCerts.length}</div>
                <div className="s-sub">All active credentials</div>
              </div>
              <div className="stat" style={{ animationDelay:'80ms' }}>
                <div className="s-label" style={{ color:'var(--cyan-600)' }}>Internships</div>
                <div className="s-val" style={{ color: 'var(--cyan-600)' }}>{approvedCerts.filter(c=>c.program_type==='Internship').length}</div>
                <div className="s-sub">Internship schemes</div>
              </div>
              <div className="stat" style={{ animationDelay:'160ms' }}>
                <div className="s-label" style={{ color:'var(--emerald-600)' }}>Trainings</div>
                <div className="s-val" style={{ color:'var(--emerald-600)' }}>{approvedCerts.filter(c=>c.program_type==='Training').length}</div>
                <div className="s-sub">Training records</div>
              </div>
            </div>

            <div className="t-card" style={{ padding:'22px', marginBottom:'20px' }}>
              <div className="bulk-import-header">
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:800 }}>📥 Bulk Import</h3>
                  <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'2px' }}>Upload an Excel file to import multiple records at once.</p>
                </div>
                <button type="button" className="nav-btn solid" style={{ padding:'9px 16px', fontSize:'11.5px' }} onClick={handleDownloadTemplate}>⬇ Download Template</button>
              </div>
              <div className={`drop-zone ${dragActive?'active':''}`}
                onDragOver={(e)=>{e.preventDefault();e.stopPropagation();setDragActive(true);}}
                onDragEnter={(e)=>{e.preventDefault();e.stopPropagation();setDragActive(true);}}
                onDragLeave={(e)=>{e.preventDefault();e.stopPropagation();setDragActive(false);}}
                onDrop={(e)=>{e.preventDefault();e.stopPropagation();setDragActive(false);const f=e.dataTransfer.files[0];if(f&&(f.name.endsWith('.xlsx')||f.name.endsWith('.xls')))processBulkFile(f);else showToast('❌ Please upload an Excel (.xlsx) file.','err');}}>
                <input type="file" accept=".xlsx,.xls" className="file-overlay" onChange={e=>processBulkFile(e.target.files[0])} disabled={importLoading} />
                <span className="drop-zone-icon">{importLoading?'⏳':'📂'}</span>
                <p>{importLoading?'Importing records...':'Drag & drop your Excel file, or click to browse'}</p>
                {!importLoading && <p style={{ fontSize:'11px', marginTop:'3px', color:'var(--cyan-500)' }}>Supports .xlsx and .xls</p>}
              </div>
            </div>

            <div className="t-card">
              <div className="t-toolbar">
                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                  <h3>All Records</h3>
                  {selected.size > 0 && (
                    <button className="ab ab-del" style={{ padding:'6px 14px', fontSize:'12px', fontWeight:700, borderRadius:'6px', cursor:'pointer' }} onClick={handleBulkDelete}>
                      🗑 Delete Selected ({selected.size})
                    </button>
                  )}
                </div>
                
                <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                  <select 
                    className="s-input" 
                    style={{ width:'160px', padding:'9px 12px', cursor:'pointer' }}
                    value={filterProgram} 
                    onChange={e => { setFilterProgram(e.target.value); setSelected(new Set()); }}
                  >
                    <option value="all">All Programs</option>
                    <option value="Internship">Internships Only</option>
                    <option value="Training">Trainings Only</option>
                  </select>

                  <select 
                    className="s-input" 
                    style={{ width:'160px', padding:'9px 12px', cursor:'pointer' }}
                    value={filterVisibility} 
                    onChange={e => { setFilterVisibility(e.target.value); setSelected(new Set()); }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="visible">Visible Only</option>
                    <option value="hidden">Hidden Only</option>
                  </select>

                  <input type="text" className="s-input" placeholder="🔍  Search registry cards..." value={search} onChange={e=>{setSearch(e.target.value);setSelected(new Set());}} />
                </div>
              </div>

              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width:'44px', textAlign:'center', paddingLeft:'16px' }}>
                        <input type="checkbox" checked={allSelected} ref={el=>{if(el)el.indeterminate=someSelected;}} onChange={toggleSelectAll} style={{ cursor:'pointer', width:'15px', height:'15px', accentColor:'var(--cyan-600)' }} />
                      </th>
                      <th>Certificate No.</th>
                      <th>Student Name</th>
                      <th>Program</th>
                      <th>Domain</th>
                      <th>Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({length:5}).map((_,i)=>(
                        <tr key={i} className="skeleton-row">
                          {Array.from({length:7}).map((__,j)=><td key={j}><div className="skeleton-box short" /></td>)}
                        </tr>
                      ))
                    ) : filteredCerts.length === 0 ? (
                      <tr><td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-state-icon">🔍</div>
                          <div className="empty-state-title">No certificates found</div>
                          <div className="empty-state-text">
                            {search || filterProgram !== 'all' || filterVisibility !== 'all' 
                              ? 'No records match your active filtering parameters.' 
                              : 'Issue your first certificate to get started.'
                            }
                          </div>
                        </div>
                      </td></tr>
                    ) : (
                      filteredCerts.map(c => (
                        <tr key={c.id} style={{ background:selected.has(c.id)?'var(--cyan-50)':'', transition:'background 0.15s ease' }}>
                          <td style={{ textAlign:'center', paddingLeft:'16px' }}>
                            <input type="checkbox" checked={selected.has(c.id)} onChange={()=>toggleSelect(c.id)} style={{ cursor:'pointer', width:'15px', height:'15px', accentColor:'var(--cyan-600)' }} />
                          </td>
                          <td>
                            <span className="mono" style={{ opacity: (c.is_hidden === null || c.is_hidden === undefined ? (c.end_date && c.end_date > todayStr) : c.is_hidden) ? 0.45 : 1 }}>{c.cert_no}</span>
                            {(c.is_hidden === null || c.is_hidden === undefined ? (c.end_date && c.end_date > todayStr) : c.is_hidden) && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>HIDDEN</span>}
                          </td>
                          <td><strong style={{ fontSize:'13.5px', opacity: (c.is_hidden === null || c.is_hidden === undefined ? (c.end_date && c.end_date > todayStr) : c.is_hidden) ? 0.6 : 1 }}>{c.student_name}</strong></td>
                          <td><span className={`badge ${c.program_type==='Internship'?'b-intern':'b-training'}`}>{c.program_type}</span></td>
                          <td style={{ color:'var(--slate-700)', fontWeight:600 }}>{c.domain}</td>
                          <td style={{ fontSize:'12px', color:'var(--muted)', whiteSpace:'nowrap' }}>{formatDate(c.start_date)} – {formatDate(c.end_date)}</td>
                          <td>
                            <div className="act-btns">
                              <button className="ab ab-view" onClick={()=>navigate('/result',{state:{certificate:c}})}>👁 View</button>
                              <button className="ab ab-edit" onClick={()=>openEdit(c)}>✏️ Edit</button>
                              
                              {(c.is_hidden === null || c.is_hidden === undefined ? (c.end_date && c.end_date > todayStr) : c.is_hidden) ? (
                                <button type="button" className="ab ab-dl" onClick={() => handleToggleVisibility(c)}>🔓 Unhide</button>
                              ) : (
                                <button type="button" className="ab ab-edit" onClick={() => handleToggleVisibility(c)}>🔒 Hide</button>
                              )}

                              <button className="ab ab-del" onClick={()=>handleDelete(c.cert_no)}>🗑 Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {!loading && filteredCerts.length > 0 && (
                <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', fontSize:'12px', color:'var(--muted)', fontFamily:'var(--font-display)', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'6px' }}>
                  <span>Showing {filteredCerts.length} of {approvedCerts.length} entries</span>
                  {selected.size > 0 && <span style={{ color:'var(--cyan-600)' }}>{selected.size} row{selected.size>1?'s':''} selected</span>}
                </div>
              )}
            </div>
          </>)}

          {/* ── ISSUE TAB ── */}
          {activeTab === 'issue' && (
            <div className="f-card">
              <div className="f-card-header">
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div className="fch-icon">📜</div>
                  <div>
                    <h3>Issue New Certificate</h3>
                    <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'2px' }}>Fill in the details to create a new certificate.</p>
                  </div>
                </div>
                <button type="button" className="btn-back" onClick={()=>setActiveTab('all')}>← Back to Registry</button>
              </div>
              <form onSubmit={handleIssue} className="f-grid">
                <div className="igroup">
                  <label>Certificate Number</label>
                  <div className="cert-no-wrap">
                    <input type="text" placeholder="e.g., NTCS261502" value={iCertNo} onChange={e=>setICertNo(e.target.value.toUpperCase())} required />
                    <button type="button" className="auto-tag" onClick={()=>setICertNo(calculateNextCertNo(iType))}>Auto</button>
                  </div>
                </div>
                <div className="igroup">
                  <label>Mobile Number</label>
                  <input type="tel" placeholder="10-digit mobile number" maxLength={10} value={iMobile} onChange={e=>setIMobile(e.target.value.replace(/\D/g,''))} required />
                </div>
                <div className="igroup f-full">
                  <label>Student Full Name</label>
                  <input type="text" placeholder="Enter full name in capitals" value={iName} onChange={e=>setIName(e.target.value.toUpperCase())} required style={{ fontWeight:700 }} />
                </div>
                <div className="igroup">
                  <label>Program Type</label>
                  <select value={iType} onChange={e=>{setIType(e.target.value);setICertNo('');}}>
                    <option value="Internship">Internship</option>
                    <option value="Training">Training</option>
                  </select>
                </div>
                <div className="igroup">
                  <label>Domain / Specialization</label>
                  <input type="text" placeholder="e.g., Web Development" value={iDomain} onChange={e=>setIDomain(e.target.value)} required />
                </div>
                <div className="igroup">
                  <label>Start Date</label>
                  <input type="date" value={iStart} onChange={e=>setIStart(e.target.value)} required />
                </div>
                <div className="igroup">
                  <label>End Date</label>
                  <input type="date" value={iEnd} onChange={e=>setIEnd(e.target.value)} required />
                </div>
                <PhotoUploader value={iPhoto} onChange={setIPhoto} notify={showToast} label="Passport Photo" />
                <div className="f-full">
                  <button type="submit" className="btn-issue">🚀 Issue Certificate</button>
                </div>
              </form>
            </div>
          )}

          {/* ── PENDING REQUESTS MANAGEMENT TAB ── */}
          {activeTab === 'requests' && (
            <div className="t-card">
              <div className="t-toolbar">
                <h3>Pending Filings Queue</h3>
                <input type="text" className="s-input" placeholder="🔍 Filter pending list..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Assignee Reference</th>
                      <th>Contact (Mobile)</th>
                      <th>Scheme Module</th>
                      <th>Specialization Field</th>
                      <th>Duration Windows</th>
                      <th>Evaluation Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({length:3}).map((_,i)=>(
                        <tr key={i} className="skeleton-row">
                          {Array.from({length:6}).map((__,j)=><td key={j}><div className="skeleton-box short" /></td>)}
                        </tr>
                      ))
                    ) : filteredRequests.length === 0 ? (
                      <tr><td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📥</div>
                          <div className="empty-state-title">No pending requests</div>
                          <div className="empty-state-text">Incoming filings from the Request portal will register here.</div>
                        </div>
                      </td></tr>
                    ) : (
                      filteredRequests.map(r => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                              {r.photo_url ? (
                                <img src={r.photo_url} alt="portrait" style={{ width:'36px', height:'42px', borderRadius:'4px', objectFit:'cover', border:'1px solid var(--border)' }} />
                              ) : (
                                <div style={{ width:'36px', height:'42px', borderRadius:'4px', background:'var(--slate-100)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>👤</div>
                              )}
                              <strong style={{ fontSize:'13.5px', color:'var(--slate-900)' }}>{r.student_name}</strong>
                            </div>
                          </td>
                          <td><span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{r.mobile}</span></td>
                          <td><span className={`badge ${r.program_type==='Internship'?'b-intern':'b-training'}`}>{r.program_type}</span></td>
                          <td style={{ color:'var(--slate-700)', fontWeight:600 }}>{r.domain}</td>
                          <td style={{ fontSize:'12px', color:'var(--muted)', whiteSpace:'nowrap' }}>{formatDate(r.start_date)} - {formatDate(r.end_date)}</td>
                          <td>
                            <div className="act-btns">
                              <button className="ab ab-dl" onClick={() => openAcceptModal(r)}>✅ Approve</button>
                              <button className="ab ab-del" onClick={() => handleRejectRequest(r)}>✕ Decline</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── RUNTIME MODAL CORRECTION SUITE OVERLAY ── */}
      <div className={`overlay ${isEditOpen?'open':''}`} onClick={(e)=>{if(e.target.classList.contains('overlay'))closeEdit();}}>
        <div className="modal">
          <div className="modal-header">
            <h3>✏️ Edit Certificate Configuration Parameters</h3>
            <button type="button" className="modal-close" onClick={closeEdit}>✕</button>
          </div>
          <form onSubmit={handleEditSave} className="f-grid" style={{ padding:'26px' }}>
            <div className="igroup">
              <label>Certificate Number</label>
              <input type="text" value={editFields.cert_no ?? ''} onChange={e=>setEditFields(p=>({...p,cert_no:e.target.value.toUpperCase()}))} required />
            </div>
            <div className="igroup">
              <label>Mobile Number</label>
              <input type="tel" maxLength={10} value={editFields.mobile ?? ''} onChange={e=>setEditFields(p=>({...p,mobile:e.target.value.replace(/\D/g,'')}))} required />
            </div>
            <div className="igroup f-full">
              <label>Student Full Name</label>
              <input type="text" value={editFields.student_name ?? ''} onChange={e=>setEditFields(p=>({...p,student_name:e.target.value.toUpperCase()}))} required style={{ fontWeight:700 }} />
            </div>
            <div className="igroup">
              <label>Program Type</label>
              <select value={editFields.program_type ?? 'Internship'} onChange={e=>setEditFields(p=>({...p,program_type:e.target.value}))}>
                <option value="Internship">Internship</option>
                <option value="Training">Training</option>
              </select>
            </div>
            <div className="igroup">
              <label>Domain / Specialization</label>
              <input type="text" value={editFields.domain ?? ''} onChange={e=>setEditFields(p=>({...p,domain:e.target.value}))} required />
            </div>
            <div className="igroup">
              <label>Start Date</label>
              <input type="date" value={editFields.start_date ?? ''} onChange={e=>setEditFields(p=>({...p,start_date:e.target.value}))} required />
            </div>
            <div className="igroup">
              <label>End Date</label>
              <input type="date" value={editFields.end_date ?? ''} onChange={e=>setEditFields(p=>({...p,end_date:e.target.value}))} required />
            </div>
            <PhotoUploader
              value={ePhoto === undefined ? null : ePhoto}
              existingUrl={ePhoto === undefined ? (editRecord?.photo_url ?? null) : undefined}
              onChange={setEPhoto} notify={showToast} label="Replace Passport Photo"
            />
            <div className="f-full" style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'6px', borderTop:'1px solid var(--border)', paddingTop:'18px' }}>
              <button type="button" className="btn-back" onClick={closeEdit}>Cancel</button>
              <button type="submit" className="btn-issue">💾 Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      {/* ── APPROVE FILING CONFIGURATION MODAL OVERLAY ── */}
      <div className={`overlay ${isAcceptModalOpen?'open':''}`} onClick={(e)=>{if(e.target.classList.contains('overlay')) { setIsAcceptModalOpen(false); setRequestActionRecord(null); }}}>
        <div className="modal">
          <div className="modal-header">
            <h3>🎓 Approve Filing & Mint Certificate</h3>
            <button type="button" className="modal-close" onClick={() => { setIsAcceptModalOpen(false); setRequestActionRecord(null); }}>✕</button>
          </div>
          <form onSubmit={handleAcceptRequestSubmit} className="f-grid" style={{ padding:'26px' }}>
            <div className="igroup">
              <label>Assign Serial Registry Key</label>
              <div className="cert-no-wrap">
                <input type="text" value={editFields.cert_no ?? ''} onChange={e=>setEditFields(p=>({...p,cert_no:e.target.value.toUpperCase()}))} required />
                <button type="button" className="auto-tag" onClick={() => setEditFields(p => ({...p, cert_no: calculateNextCertNo(editFields.program_type)}))}>Auto</button>
              </div>
            </div>
            <div className="igroup">
              <label>Mobile Number</label>
              <input type="tel" maxLength={10} value={editFields.mobile ?? ''} onChange={e=>setEditFields(p=>({...p,mobile:e.target.value.replace(/\D/g,'')}))} required />
            </div>
            <div className="igroup f-full">
              <label>Student Full Name</label>
              <input type="text" value={editFields.student_name ?? ''} onChange={e=>setEditFields(p=>({...p,student_name:e.target.value.toUpperCase()}))} required style={{ fontWeight:700 }} />
            </div>
            <div className="igroup">
              <label>Program Type</label>
              <select value={editFields.program_type ?? 'Internship'} onChange={e=>{ const t = e.target.value; setEditFields(p=>({...p,program_type:t, cert_no: calculateNextCertNo(t)})); }}>
                <option value="Internship">Internship</option>
                <option value="Training">Training</option>
              </select>
            </div>
            <div className="igroup">
              <label>Domain / Specialization</label>
              <input type="text" value={editFields.domain ?? ''} onChange={e=>setEditFields(p=>({...p,domain:e.target.value}))} required />
            </div>
            <div className="igroup">
              <label>Start Date</label>
              <input type="date" value={editFields.start_date ?? ''} onChange={e=>setEditFields(p=>({...p,start_date:e.target.value}))} required />
            </div>
            <div className="igroup">
              <label>End Date</label>
              <input type="date" value={editFields.end_date ?? ''} onChange={e=>setEditFields(p=>({...p,end_date:e.target.value}))} required />
            </div>
            <PhotoUploader
              value={ePhoto === undefined ? null : ePhoto}
              existingUrl={ePhoto === undefined ? (requestActionRecord?.photo_url ?? null) : undefined}
              onChange={setEPhoto} notify={showToast} label="Verify Portrait Frame"
            />
            <div className="f-full" style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'6px', borderTop:'1px solid var(--border)', paddingTop:'18px' }}>
              <button type="button" className="btn-back" onClick={() => { setIsAcceptModalOpen(false); setRequestActionRecord(null); }}>Abort</button>
              <button type="submit" className="btn-issue">🚀 Deploy Certificate to Registry</button>
            </div>
          </form>
        </div>
      </div>

      {/* ── TOAST HUD ── */}
      <div className={`toast ${toast.type} ${toast.show?'show':''}`}>{toast.message}</div>
    </div>
  );
}