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
    return <div className="p-8 max-w-2xl mx-auto text-center"><h2 className="text-2xl font-bold text-green-600 mb-2">Request Submitted</h2><p>Your data rights request has been received. Our Grievance Officer will process it within the statutory timeframe.</p></div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Data Rights Request Form</h1>
      <p className="mb-6 text-gray-600">Submit a request to exercise your rights under the DPDP Act.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" required className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Request Type</label>
          <select className="w-full p-2 border rounded" value={formData.requestType} onChange={e => setFormData({...formData, requestType: e.target.value})}>
            <option value="access">Access my data</option>
            <option value="correct">Correct inaccurate data</option>
            <option value="erase">Erase my data</option>
            <option value="withdraw">Withdraw consent</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Additional Details</label>
          <textarea rows="4" className="w-full p-2 border rounded" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium">Submit Request</button>
      </form>
    </div>
  );
};

export default DataRightsForm;
