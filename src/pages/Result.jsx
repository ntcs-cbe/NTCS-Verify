import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const formatDate = (ds) => {
  if (!ds) return '—';
  const d = new Date(ds);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Load a URL → HTMLImageElement (resolves when decoded) */
const loadImage = (url) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });

/** Fetch any URL → base64 data-URL (avoids CORS taint on canvas) */
const toDataURL = (url) =>
  fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload  = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(blob);
        })
    );

/* ─── Canvas drawing ──────────────────────────────────────────────────── */
async function drawCertificate(cert, templateDataURL, photoDataURL) {
  const W = 1000;
  const H = 1414;

  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(W * 2, H * 2);
  } else {
    canvas = document.createElement('canvas');
    canvas.width  = W * 2;
    canvas.height = H * 2;
  }

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  /* 1. Template background */
  const templateImg = await loadImage(templateDataURL);
  ctx.drawImage(templateImg, 0, 0, W, H);

  /* ── Helpers ── */
  const text = (str, x, y, opts = {}) => {
    ctx.save();
    ctx.font         = opts.font        ?? '18px sans-serif';
    ctx.fillStyle    = opts.color       ?? '#333';
    ctx.textAlign    = opts.align       ?? 'left';
    ctx.textBaseline = opts.baseline    ?? 'top';
    if (opts.maxWidth) {
      ctx.fillText(str, x, y, opts.maxWidth);
    } else {
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  };

  /**
   * Wrap + render a paragraph of mixed-style "runs".
   */
  const paragraph = (runs, startX, startY, maxWidth, lineHeight, baseFontSize) => {
    const words = [];
    for (const run of runs) {
      // Split by spaces but preserve them as individual tokens
      const parts = run.str.split(/(\s+)/);
      for (const part of parts) {
        if (part === '') continue;
        words.push({ str: part, bold: run.bold, color: run.color ?? '#333' });
      }
    }

    let lineWords  = [];
    let lineWidth  = 0;
    let y          = startY;

    const getFont = (w) => `${w.bold ? 'bold' : 'normal'} ${baseFontSize}px "DM Sans", sans-serif`;

    const measureWord = (w) => {
      ctx.save();
      ctx.font = getFont(w);
      const m = ctx.measureText(w.str);
      ctx.restore();
      return m.width;
    };

    // Calculate space character dimensions dynamically based on normal style settings
    const defaultSpaceWidth = (() => {
      ctx.save();
      ctx.font = `normal ${baseFontSize}px "DM Sans", sans-serif`;
      const width = ctx.measureText(' ').width;
      ctx.restore();
      return width;
    })();

    const flushLine = (isLast = false) => {
      if (lineWords.length === 0) {
        y += lineHeight;
        return;
      }

      // Filter out pure whitespace tokens for justification calculation
      const visible = lineWords.filter(w => w.str.trim() !== '');

      if (visible.length === 0) {
        y += lineHeight;
        lineWords = [];
        lineWidth = 0;
        return;
      }

      // Calculate the combined width of all words containing actual text characters
      let inkWidth = 0;
      const inkWidths = visible.map(w => {
        const ww = measureWord(w);
        inkWidth += ww;
        return ww;
      });

      const gaps = visible.length - 1;
      const extraSpace = maxWidth - inkWidth;

      // Handle Spacing Mode switch based on line layout condition
      let wordSpacing = defaultSpaceWidth;
      let useJustification = false;

      if (!isLast && gaps > 0) {
        wordSpacing = extraSpace / gaps;
        useJustification = true;
      }

      let x = startX;
      visible.forEach((w, i) => {
        ctx.save();
        ctx.font         = getFont(w);
        ctx.fillStyle    = w.color;
        ctx.textBaseline = 'top';
        ctx.fillText(w.str, x, y);
        ctx.restore();
        
        // Advance X coordinate by current word dimensions plus tailored track padding
        x += inkWidths[i] + (i < gaps ? wordSpacing : 0);
      });

      y += lineHeight;
      lineWords = [];
      lineWidth = 0;
    };

    for (const word of words) {
      if (word.str === '\n') {
        flushLine(true);
        y += lineHeight * 0.25; // Minor layout padding adjustments
        continue;
      }
      
      const ww = measureWord(word);

      // Prevent trailing floating spaces from prematurely triggering text wraps
      if (lineWords.length > 0 && lineWidth + ww > maxWidth && word.str.trim() !== '') {
        flushLine(false);
      }

      // Skip rendering plain space tokens at the start of a completely fresh line
      if (word.str.trim() === '' && lineWords.length === 0) continue;

      lineWords.push(word);
      lineWidth += ww;
    }
    
    if (lineWords.length) flushLine(true);

    return y;
  };

  /* 2. Certificate number — top-right area */
  text(`Certificate: ${cert.cert_no}`, 770, 215, {
    font: 'bold 16px "DM Sans", monospace',
    color: '#444',
  });

  /* 3. Heading */
  text('To Whomsoever It May Concern', 90, 495, {
    font: 'bold 32px "Syne", serif',
    color: '#1a1a2e',
  });

  /* 4. Body paragraph */
  const bodyRuns = [
    { str: 'This is to certify that ' },
    { str: cert.student_name,         bold: true, color: '#0303b4' },
    { str: ' has successfully completed the ' },
    { str: cert.program_type,         bold: true, color: '#0303b4' },
    { str: ' Programme at ' },
    { str: 'NEW TECHNOLOGY CAREER SOLUTIONS', bold: true, color: '#0303b4' },
    { str: ', in the domain of ' },
    { str: cert.domain,               bold: true, color: '#0303b4' },
    { str: ', for the duration from ' },
    { str: formatDate(cert.start_date), bold: true, color: '#0303b4' },
    { str: ' to ' },
    { str: formatDate(cert.end_date),   bold: true, color: '#0303b4' },
    { str: '.' },
    { str: '\n' },
    { str: `During the ${cert.program_type.toLowerCase()} period, the student has demonstrated sincere effort, willingness to learn, and professional behaviour throughout the programme.` },
    { str: '\n' },
    { str: "We hereby acknowledge and appreciate the student's contribution and wish them continued success in all future endeavours." },
  ];

  paragraph(bodyRuns, 90, 575, 820, 42, 19);

  /* 5. Verified stamp */
  {
    const label    = '✔ Digitally Verified';
    const fontSize = 14;
    const padX     = 14;
    const padY     = 8;
    const rx       = 6;

    ctx.save();
    ctx.font = `bold ${fontSize}px "DM Sans", sans-serif`;
    const labelW = ctx.measureText(label).width;
    ctx.restore();

    const rectX = 40;
    const rectY = 1270;
    const rectW = labelW + padX * 2;
    const rectH = fontSize + padY * 2;

    ctx.save();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(rectX + rx, rectY);
    ctx.lineTo(rectX + rectW - rx, rectY);
    ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + rx);
    ctx.lineTo(rectX + rectW, rectY + rectH - rx);
    ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - rx, rectY + rectH);
    ctx.lineTo(rectX + rx, rectY + rectH);
    ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - rx);
    ctx.lineTo(rectX, rectY + rx);
    ctx.quadraticCurveTo(rectX, rectY, rectX + rx, rectY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    text(label, rectX + padX, rectY + padY, {
      font: `bold ${fontSize}px "DM Sans", sans-serif`,
      color: '#ffffff',
      baseline: 'top',
    });
  }

  /* 6. Issue date section has been completely removed from PDF render vector layers */

  /* 7. Photo */
  if (photoDataURL) {
    try {
      const photoImg = await loadImage(photoDataURL);
      const px = W - 55 - 165;
      const py = 335;
      const pw = 165;
      const ph = 195;

      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.shadowColor   = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur    = 24;
      ctx.shadowOffsetY = 8;
      ctx.fillRect(px - 4, py - 4, pw + 8, ph + 8);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.drawImage(photoImg, px, py, pw, ph);
      ctx.restore();
    } catch {
      ctx.save();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(W - 55 - 165, 335, 165, 195);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Photo', W - 55 - 165 + 82, 335 + 97);
      ctx.restore();
    }
  }

  return canvas;
}

/* ─── PhotoSlot (preview only) ───────────────────────────────────────── */
function PhotoSlot({ src, alt }) {
  const [visible, setVisible]   = useState(false);
  const [errored, setErrored]   = useState(false);

  const imgRef = useCallback((node) => {
    if (node?.complete) setVisible(true);
  }, []);

  if (!src || errored) {
    return (
      <div style={{
        width:'100%', height:'100%', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#e2e8f0', color:'#94a3b8', fontSize:11, fontWeight:600, gap:6,
      }}>
        <span style={{ fontSize:28 }}>👤</span>
        <span>No Photo</span>
      </div>
    );
  }

  return (
    <>
      {!visible && (
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          background:'#e2e8f0', color:'#94a3b8', fontSize:11, fontWeight:600, gap:6,
        }}>
          <span style={{ fontSize:20 }}>⏳</span>
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setVisible(true)}
        onError={() => setErrored(true)}
        style={{
          width:'100%', height:'100%', objectFit:'cover',
          opacity: visible ? 1 : 0, transition:'opacity 0.2s ease',
        }}
      />
    </>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */
export default function Result() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const cert      = location.state?.certificate;
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom]               = useState(0.70);

  useEffect(() => {
    if (!cert) { navigate(-1); return; }
    const w = window.innerWidth;
    if      (w < 480) setZoom(0.30);
    else if (w < 640) setZoom(0.38);
    else if (w < 992) setZoom(0.55);
    else              setZoom(0.70);
  }, [cert, navigate]);

  if (!cert) return null;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const [templateDataURL, photoDataURL] = await Promise.all([
        toDataURL('/Template.jpg'),
        cert.photo_url ? toDataURL(cert.photo_url).catch(() => null) : Promise.resolve(null),
      ]);

      const canvas = await drawCertificate(cert, templateDataURL, photoDataURL);

      let imgData;
      if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 1.0 });
        imgData = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload  = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
      } else {
        imgData = canvas.toDataURL('image/jpeg', 1.0);
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1000, 1414] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 1000, 1414);
      pdf.save(`Certificate_${cert.cert_no}.pdf`);
    } catch (err) {
      console.error('PDF export error: [Hidden for security]');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page" style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <div className="result-wrap">
        <div className="grid-vault-split">

          {/* ── LEFT: Info & Controls ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Status Badge */}
            <div style={{
              background:'var(--white)', border:'1px solid var(--slate-200)',
              borderRadius:'var(--radius-lg)', padding:'16px 20px',
              boxShadow:'var(--shadow-sm)', display:'flex', alignItems:'center', gap:12,
            }}>
              <div style={{
                width:40, height:40, borderRadius:'var(--radius-md)',
                background:'var(--emerald-100)', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:18, flexShrink:0,
              }}>✅</div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:800, color:'var(--slate-900)' }}>
                  Certificate Verified
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                  Authentic record confirmed
                </div>
              </div>
              <span className="badge-ok" style={{ marginLeft:'auto' }}>✔ AUTHENTIC</span>
            </div>

            {/* Certificate Info */}
            <div className="info-panel">
              <div className="info-panel-title">📋 Certificate Details</div>

              <div className="info-row">
                <div className="info-row-label">Certificate No.</div>
                <div className="info-row-mono">{cert.cert_no}</div>
              </div>
              <div className="divider" />

              <div className="info-row">
                <div className="info-row-label">Student Name</div>
                <div className="info-row-value">{cert.student_name}</div>
              </div>
              <div className="divider" />

              <div className="info-row">
                <div className="info-row-label">Program</div>
                <div>
                  <span className={`badge ${cert.program_type === 'Internship' ? 'b-intern' : 'b-training'}`}>
                    {cert.program_type}
                  </span>
                </div>
              </div>
              <div className="divider" />

              <div className="info-row">
                <div className="info-row-label">Domain</div>
                <div className="info-row-value" style={{ fontSize:13 }}>{cert.domain}</div>
              </div>
              <div className="divider" />

              <div className="info-row" style={{ marginBottom:0 }}>
                <div className="info-row-label">Duration</div>
                <div className="info-row-value" style={{ fontSize:13 }}>
                  {formatDate(cert.start_date)} — {formatDate(cert.end_date)}
                </div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="info-panel">
              <div className="info-panel-title">🔎 Preview Zoom</div>
              <div className="zoom-control">
                <div className="zoom-header">
                  <span className="zoom-label">Scale</span>
                  <span className="zoom-val">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range" min="0.25" max="1.20" step="0.01"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                />
                <div className="zoom-btns">
                  <button type="button" className="zoom-btn"
                    onClick={() => setZoom(window.innerWidth < 640 ? 0.35 : 0.65)}>Fit View</button>
                  <button type="button" className="zoom-btn primary"
                    onClick={() => setZoom(1.0)}>100%</button>
                </div>
              </div>
            </div>

            {/* Download Panel */}
            <div className="info-panel" style={{ background:'linear-gradient(135deg, var(--ink-900), var(--ink-700))', border:'none' }}>
              <div style={{ fontSize:26, marginBottom:10 }}>📥</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'#fff', marginBottom:5 }}>
                Download Certificate
              </div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.65, marginBottom:16 }}>
                Save as a high-resolution PDF document.
              </p>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                style={{
                  width:'100%', padding:'10px 0', border:'1px solid rgba(255,255,255,0.15)',
                  background: downloading ? 'rgba(255,255,255,0.10)' : 'rgba(6,182,212,0.25)',
                  borderRadius:'var(--radius-sm)', color:'#fff',
                  fontFamily:'var(--font-display)', fontSize:12, fontWeight:700,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  transition:'all var(--t-base)', letterSpacing:'0.3px',
                }}
              >
                {downloading ? '⏳ Generating PDF...' : '⬇ Export as PDF'}
              </button>
            </div>

          </div>

          {/* ── RIGHT: Certificate Preview ── */}
          <div className="preview-scroll-engine">
            <div style={{
              width:'100%', display:'flex', justifyContent:'center',
              height:`${1414 * zoom + 40}px`, transition:'height 0.15s ease-out',
            }}>
              <div style={{
                width:1000, height:1414,
                transform:`scale(${zoom})`, transformOrigin:'top center',
                flexShrink:0, position:'relative',
              }}>
                <div
                  id="certificate"
                  style={{
                    width:1000, height:1414,
                    backgroundImage:"url('/Template.jpg')",
                    backgroundSize:'100% 100%', backgroundRepeat:'no-repeat',
                    position:'absolute', boxShadow:'var(--shadow-xl)', overflow:'hidden',
                  }}
                >
                  <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none' }}>

                    <div className="cert-number" style={{ top:215, left:650 }}>
                      Certificate: {cert.cert_no}
                    </div>

                    <div className="cert-heading" style={{ top:495, left:90 }}>
                      To Whomsoever It May Concern
                    </div>

                    <div
                      className="cert-body"
                      style={{ top:575, left:90, lineHeight:'45px', fontFamily:"'DM Sans', sans-serif" }}
                    >
                      This is to certify that{' '}
                      <span className="cert-dynamic">{cert.student_name}</span>{' '}
                      has successfully completed the{' '}
                      <span className="cert-dynamic">{cert.program_type}</span>{' '}
                      Programme at{' '}
                      <span className="cert-dynamic">NEW TECHNOLOGY CAREER SOLUTIONS</span>,
                      in the domain of{' '}
                      <span className="cert-dynamic">{cert.domain}</span>,
                      for the duration from{' '}
                      <span className="cert-dynamic">{formatDate(cert.start_date)}</span>{' '}
                      to{' '}
                      <span className="cert-dynamic">{formatDate(cert.end_date)}</span>.
                      <br /><br />
                      During the{' '}
                      <span className="cert-dynamic">{cert.program_type.toLowerCase()}</span>{' '}
                      period, the student has demonstrated sincere effort, willingness to learn,
                      and professional behaviour throughout the programme.
                      <br /><br />
                      We hereby acknowledge and appreciate the student's contribution and wish
                      them continued success in all future endeavours.
                    </div>

                    <div
                      className="cert-verified"
                      style={{
                        top: 1280, left: 40,
                        display: 'inline-flex', alignItems: 'center',
                        background: '#16a34a',
                        color: '#ffffff',
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        padding: '8px 14px',
                        borderRadius: 6,
                        lineHeight: 1,
                      }}
                    >
                      ✔ Digitally Verified
                    </div>

                    {/* Visual entry wrapper section for certificate generation date has been permanently purged from preview interface */}

                    <div
                      className="cert-photo"
                      style={{
                        position:'absolute', top:335, right:55,
                        width:165, height:195,
                        border:'4px solid #fff',
                        boxShadow:'0 8px 24px rgba(0,0,0,0.18)',
                        borderRadius:4, overflow:'hidden',
                      }}
                    >
                      <PhotoSlot
                        key={cert.id}
                        src={cert.photo_url || null}
                        alt={cert.student_name}
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}