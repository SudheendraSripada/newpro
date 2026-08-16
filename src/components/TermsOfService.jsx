import React from 'react';

const TermsOfService = () => {
  return (
    <div className="content-wrapper">
      <div className="top-header">
        <h1>Terms of Service</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="panel-card shadow-sm" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>1. Acceptance of Terms</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>2. Data Protection & Privacy</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Your privacy is important to us. We collect and process your personal data in accordance with the Digital Personal Data Protection (DPDP) Act, India.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
