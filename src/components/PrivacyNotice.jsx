import React from 'react';

const PrivacyNotice = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto text-left">
      <h1 className="text-3xl font-bold mb-6">Privacy Notice</h1>
      <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">1. What Personal Data We Collect</h2>
          <p>We may collect personal data such as your name, email address, and usage data when you use our services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">2. Purpose of Collection</h2>
          <p>Your data is collected solely for the purpose of providing and improving the Engineering Study Planner services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">3. Data Retention</h2>
          <p>We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Notice, or as required by law.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">4. Third-Party Sharing</h2>
          <p>We do not sell your personal data. We may share data with trusted third-party service providers strictly for operating our services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">5. Your Data Rights</h2>
          <p>Under the DPDP Act, you have the right to:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate or incomplete data.</li>
            <li>Request erasure of your personal data.</li>
            <li>Withdraw your consent at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">6. Grievance Redressal</h2>
          <p>If you have any grievances or questions regarding your privacy, please contact our Grievance Officer:</p>
          <p className="font-medium mt-2">Grievance Officer: [Name Placeholder]</p>
          <p>Email: privacy@engineeringstudyplanner.com</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyNotice;
