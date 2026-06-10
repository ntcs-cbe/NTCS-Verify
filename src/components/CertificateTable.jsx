import React from 'react';
import { useNavigate } from 'react-router-dom';

const formatDate = (ds) => {
  if (!ds) return '';
  const d = new Date(ds);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function CertificateTable({ certs, search, loading, handleAdminPDF, openEdit, handleDelete }) {
  const navigate = useNavigate();

  const filteredCerts = certs.filter(c =>
    (c.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cert_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.domain || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="t-card">
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Cert No.</th><th>Student Name</th><th>Type</th><th>Domain</th>
              <th>Duration</th><th>Mobile</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton UI
              [...Array(4)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton-box"></div></td>
                  <td><div className="skeleton-box short"></div></td>
                  <td><div className="skeleton-box badge"></div></td>
                  <td><div className="skeleton-box"></div></td>
                  <td><div className="skeleton-box short"></div></td>
                  <td><div className="skeleton-box"></div></td>
                  <td><div className="skeleton-box short"></div></td>
                </tr>
              ))
            ) : filteredCerts.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty">
                    <span>📭</span>
                    <strong>No records found</strong>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCerts.map(c => (
                <tr key={c.id}>
                  <td><span className="mono">{c.cert_no}</span></td>
                  <td><strong>{c.student_name}</strong></td>
                  <td><span className={`badge ${c.program_type === 'Internship' ? 'b-intern' : 'b-training'}`}>{c.program_type}</span></td>
                  <td>{c.domain}</td>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                    {formatDate(c.start_date)} – {formatDate(c.end_date)}
                  </td>
                  <td className="mono">{c.mobile}</td>
                  <td>
                    <div className="act-btns">
                      <button className="ab ab-view" onClick={() => navigate('/result', { state: { certificate: c } })}>👁 View</button>
                      <button className="ab ab-dl" onClick={() => handleAdminPDF(c)}>⬇ PDF</button>
                      <button className="ab ab-edit" onClick={() => openEdit(c)}>✏️ Edit</button>
                      <button className="ab ab-del" onClick={() => handleDelete(c.cert_no)}>🗑 Del</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}