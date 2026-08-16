import React, { useState } from 'react';

const DataRightsForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', requestType: 'access', details: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for backend API call
    console.log('Data rights request submitted:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="content-wrapper">
        <div className="top-header">
          <h1>Request Submitted</h1>
        </div>
        <div className="panel-card shadow-sm" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: '1rem' }}>✅ Request Successfully Received</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Your data rights request has been received. Our Grievance Officer will process it within the statutory timeframe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="top-header">
        <h1>Data Rights Request Form</h1>
        <p>Submit a request to exercise your rights under the DPDP Act.</p>
      </div>
      
      <div className="panel-card form-section shadow-sm" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} className="input-group" style={{ gap: '1.25rem' }}>
          <div className="input-group">
            <label>Name</label>
            <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" required className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Request Type</label>
            <select className="input-field" value={formData.requestType} onChange={e => setFormData({...formData, requestType: e.target.value})}>
              <option value="access">Access my data</option>
              <option value="correct">Correct inaccurate data</option>
              <option value="erase">Erase my data</option>
              <option value="withdraw">Withdraw consent</option>
            </select>
          </div>
          <div className="input-group">
            <label>Additional Details</label>
            <textarea rows="4" className="input-field" style={{ resize: 'vertical' }} value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', marginTop: '0.5rem', width: '100%' }}>Submit Request</button>
        </form>
      </div>
    </div>
  );
};

export default DataRightsForm;
