import { supabase } from './supabase';
// Basic sanitization & validation helpers to reduce malformed input risk
const sanitizeRecord = (r) => ({
  cert_no: String(r.cert_no || '').toUpperCase().trim(),
  student_name: String(r.student_name || '').trim(),
  mobile: String(r.mobile || '').replace(/\D/g, ''),
  program_type: r.program_type || 'Internship',
  domain: String(r.domain || '').trim(),
  start_date: r.start_date || null,
  end_date: r.end_date || null,
  photo_url: r.photo_url || null,
});

const isValidRecord = (r) => {
  return r.cert_no && r.student_name && r.mobile && r.mobile.length >= 10;
};

export const certificateService = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('issued_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(payload) {
    // Accept either a single record or an array
    const records = Array.isArray(payload) ? payload : [payload];
    const sanitized = records.map(sanitizeRecord).filter(isValidRecord);
    if (sanitized.length === 0) throw new Error('No valid records to insert');
    const { data, error } = await supabase.from('certificates').insert(sanitized);
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const sanitized = sanitizeRecord(payload);
    if (!isValidRecord(sanitized)) throw new Error('Invalid update payload');
    const { data, error } = await supabase.from('certificates').update(sanitized).eq('id', id);
    if (error) throw error;
    return data;
  },

  async delete(certNo) {
    const { error } = await supabase.from('certificates').delete().eq('cert_no', certNo);
    if (error) throw error;
    return true;
  }
};