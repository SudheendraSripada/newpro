import React from 'react';

const PrivacyNotice = () => {
  return (
    <div className="content-wrapper">
      <div className="top-header">
        <h1>Privacy Notice</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="panel-card shadow-sm" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>1. What Personal Data We Collect</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>We may collect personal data such as your name, email address, and usage data when you use our services.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>2. Purpose of Collection</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Your data is collected solely for the purpose of providing and improving the Engineering Study Planner services.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>3. Data Retention</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Notice, or as required by law.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>4. Third-Party Sharing</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>We do not sell your personal data. We may share data with trusted third-party service providers strictly for operating our services.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>5. Your Data Rights</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Under the DPDP Act, you have the right to:</p>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '1.5rem', marginTop: '0.5rem', listStyleType: 'disc' }}>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate or incomplete data.</li>
            <li>Request erasure of your personal data.</li>
            <li>Withdraw your consent at any time.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>6. Grievance Redressal</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>If you have any grievances or questions regarding your privacy, please contact our Grievance Officer:</p>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Grievance Officer: [Name Placeholder]</p>
            <p style={{ color: 'var(--text-secondary)' }}>Email: privacy@engineeringstudyplanner.com</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyNotice;
