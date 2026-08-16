import React from 'react';

const TermsOfService = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto text-left">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">2. Data Protection & Privacy</h2>
          <p>Your privacy is important to us. We collect and process your personal data in accordance with the Digital Personal Data Protection (DPDP) Act, India.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
