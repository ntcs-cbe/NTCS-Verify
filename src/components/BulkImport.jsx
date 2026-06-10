import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { certificateService } from '../lib/certificateService';

export default function BulkImport({ onImportSuccess, showToast }) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const downloadTemplate = () => {
    const templateData = [
      {
        "Cert No": "NTCS26I/T001",
        "Mobile": "9876543210",
        "Student Name": "JOHN DOE",
        "Program Type": "Internship",
        "Domain": "Artificial Intelligence",
        "Start Date": "2026-01-01",
        "End Date": "2026-01-31"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "NTCS_Import_Template.xlsx");
  };

  const processFile = (file) => {
    if (!file) return;
    // Security: limit upload size to prevent abuse
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      showToast('❌ File too large. Maximum allowed is 5 MB.', 'err');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        // Basic validation and sanitization
        const MAX_RECORDS = 1000;
        if (data.length === 0) throw new Error('No rows found');
        if (data.length > MAX_RECORDS) throw new Error('Too many rows in file');

        const formattedData = data
          .map(row => {
            const certNo = String(row['Cert No'] || '').toUpperCase().trim();
            const mobile = String(row['Mobile'] || '').replace(/\D/g, '');
            const studentName = String(row['Student Name'] || '').toUpperCase().trim();
            const start = row['Start Date'];
            const end = row['End Date'];
            const startDate = start ? new Date(start) : null;
            const endDate = end ? new Date(end) : null;

            return {
              cert_no: certNo,
              mobile,
              student_name: studentName,
              program_type: row['Program Type'] || 'Internship',
              domain: row['Domain'] || '',
              start_date: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString().split('T')[0] : null,
              end_date: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : null,
            };
          })
          .filter(r => r.cert_no && r.student_name && r.mobile && r.mobile.length >= 10);

        if (formattedData.length === 0) throw new Error('No valid records found after validation');
        await certificateService.create(formattedData);
        showToast(`✅ Imported ${formattedData.length} records!`, 'ok');
        if (onImportSuccess) onImportSuccess();
      } catch (error) {
        showToast("❌ Import failed. Check your file headers.", 'err');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="f-card" style={{ marginBottom: '24px', width: '100%' }}>
      {/* EXPLICIT LAYOUT CONTAINER: Bypasses .f-card-header CSS */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="fch-icon">📊</div>
          <div>
            <h3 style={{ margin: 0 }}>Bulk Import Matrix</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Drag and drop your .xlsx or .csv roster here.</p>
          </div>
        </div>
        
        {/* BUTTON: Explicitly styled to ensure visibility */}
        <button 
          onClick={downloadTemplate}
          type="button"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--blue-600)', 
            backgroundColor: 'var(--blue-50)', 
            border: '1px solid var(--blue-200)',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            borderRadius: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          ⬇ Download Template
        </button>
      </div>
      
      {/* DROP ZONE */}
      <div 
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={() => setDragActive(true)} 
        onDragLeave={() => setDragActive(false)} 
        onDrop={() => setDragActive(false)}
        style={{ border: '2px dashed var(--blue-200)', borderRadius: '12px', padding: '32px', textAlign: 'center', background: 'var(--blue-25)', position: 'relative' }}
      >
        <input 
          type="file" accept=".xlsx, .xls, .csv" 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          onChange={(e) => processFile(e.target.files[0])} disabled={loading} 
        />
        <div style={{ fontSize: '28px', color: 'var(--blue-500)' }}>📁</div>
        <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
          {loading ? 'Processing ledger...' : 'Drop spreadsheet here or click to browse'}
        </p>
      </div>
    </div>
  );
}