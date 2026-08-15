import { useEffect, useState } from 'react'

export default function ConsentBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem('dpdp_consent_v1'))
  const [purposes, setPurposes] = useState({ analytics: false, marketing: false, research: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // expose consent state for gating trackers
    const saved = localStorage.getItem('dpdp_consent_v1')
    if (saved) {
      try { window.__dpdpConsent = JSON.parse(saved) } catch { window.__dpdpConsent = null }
      setVisible(false)
    } else {
      window.__dpdpConsent = null
    }
  }, [])

  const toggle = (k) => setPurposes((p) => ({ ...p, [k]: !p[k] }))

  const accept = async (event) => {
    event.preventDefault()
    setSaving(true)
    const record = {
      created_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      purposes: purposes,
      consented: true,
    }

    try {
      localStorage.setItem('dpdp_consent_v1', JSON.stringify(record))
      window.__dpdpConsent = record
      // Best-effort server record
      await fetch('/api/dpdp/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
    } catch (e) {
      // swallow; progress file will show DB migration requirement
    } finally {
      setSaving(false)
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div style={{position:'fixed',right:20,bottom:20,width:360,background:'#fff',boxShadow:'0 6px 24px rgba(0,0,0,0.12)',borderRadius:10,padding:16,zIndex:9999}}>
      <h3 style={{margin:'0 0 8px 0'}}>Privacy & Consent</h3>
      <p style={{margin:'0 0 8px 0',fontSize:13}}>We use personal data to run the app. Choose which non-essential purposes you consent to:</p>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
        <label><input type="checkbox" checked={purposes.analytics} onChange={() => toggle('analytics')} /> Analytics (usage improvement)</label>
        <label><input type="checkbox" checked={purposes.marketing} onChange={() => toggle('marketing')} /> Marketing</label>
        <label><input type="checkbox" checked={purposes.research} onChange={() => toggle('research')} /> Research and feature testing</label>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <a href="/privacy.html" style={{fontSize:13,color:'#0366d6'}}>Privacy Notice</a>
        <div>
          <button onClick={() => { localStorage.setItem('dpdp_consent_v1', JSON.stringify({ created_at:new Date().toISOString(), user_agent:navigator.userAgent, purposes:{}, consented:false })); window.__dpdpConsent = { consents:false }; setVisible(false); }} style={{marginRight:8}}>Decline</button>
          <button onClick={accept} disabled={saving}>{saving ? 'Saving...' : 'Save choices'}</button>
        </div>
      </div>
    </div>
  )
}
