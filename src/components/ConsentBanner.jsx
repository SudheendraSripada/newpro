import React, { useState, useEffect } from 'react';

const ConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('dpdp_consent');
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('dpdp_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 shadow-lg z-50 flex flex-col sm:flex-row items-center justify-between">
      <div className="mb-4 sm:mb-0 max-w-3xl">
        <h3 className="text-lg font-semibold">We Value Your Privacy</h3>
        <p className="text-sm text-gray-300">We use cookies and similar trackers to improve your experience. By clicking "Accept", you consent to our use of these trackers in accordance with our Privacy Notice.</p>
      </div>
      <div className="flex gap-4">
        <button onClick={() => setIsVisible(false)} className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded">Decline Optional</button>
        <button onClick={handleAccept} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Accept All</button>
      </div>
    </div>
  );
};

export default ConsentBanner;
