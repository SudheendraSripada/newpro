import React, { useState, useEffect } from 'react';

const InternalCalculator = () => {
    const [marks, setMarks] = useState(() => {
        const saved = localStorage.getItem('study_internals_v9');
        if (saved) return JSON.parse(saved);
        return {
            sm1: '', sm2: '',
            as1: '', as2: '',
            q1: '', q2: '',
            at: ''
        };
    });

    const [result, setResult] = useState(null);

    useEffect(() => {
        localStorage.setItem('study_internals_v9', JSON.stringify(marks));
    }, [marks]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setMarks(prev => ({ ...prev, [id]: value }));
    };

    const calculateAttendanceMarks = (a) => {
        if (a >= 90) return 5;
        if (a >= 80) return 4;
        if (a >= 70) return 3;
        if (a >= 60) return 2;
        if (a >= 50) return 1;
        return 0;
    };

    const performInternalCalculation = (e) => {
        e.preventDefault();
        const { sm1, sm2, as1, as2, q1, q2, at } = marks;

        const s1 = parseFloat(sm1) || 0;
        const s2 = parseFloat(sm2) || 0;
        const a1 = parseFloat(as1) || 0;
        const a2 = parseFloat(as2) || 0;
        const qz1 = parseFloat(q1) || 0;
        const qz2 = parseFloat(q2) || 0;
        const attPercent = parseFloat(at) || 0;

        const attendanceMarks = calculateAttendanceMarks(attPercent);

        // Sessionals (18 max): 80% of best, 20% of least
        let finalSm = 0;
        if (s1 >= s2) {
            finalSm = (s1 * 0.8) + (s2 * 0.2);
        } else {
            finalSm = (s1 * 0.2) + (s2 * 0.8);
        }

        // Assignments Labs (12 max -> weighted to 3.5 total)
        // Best: (Mark/12)*2.8, Least: (Mark/12)*0.7
        let finalAs = 0;
        if (a1 >= a2) {
            finalAs = ((a1 / 12) * 2.8) + ((a2 / 12) * 0.7);
        } else {
            finalAs = ((a1 / 12) * 0.7) + ((a2 / 12) * 2.8);
        }

        // Quizzes (12 max -> weighted to 3.5 total)
        let finalQ = 0;
        if (qz1 >= qz2) {
            finalQ = ((qz1 / 12) * 2.8) + ((qz2 / 12) * 0.7);
        } else {
            finalQ = ((qz1 / 12) * 0.7) + ((qz2 / 12) * 2.8);
        }

        const total = finalSm + finalAs + finalQ + attendanceMarks;
        setResult(total.toFixed(2));
    };

    return (
        <div className="content-wrapper">
            <div className="top-header">
                <h1>Internal Marks</h1>
                <p>RVR & JC Weightage: Best (80%) + Worst (20%)</p>
            </div>

            <div className="panel-card form-section shadow-sm">
                <form onSubmit={performInternalCalculation} className="input-group">
                    <div className="overview-grid" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Sessionals */}
                        <div className="input-group" style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px' }}>
                            <label style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Sessionals (Max 18)</label>
                            <input type="number" id="sm1" placeholder="Sessional 1" max="18" step="0.5" className="input-field" value={marks.sm1} onChange={handleChange} required />
                            <input type="number" id="sm2" placeholder="Sessional 2" max="18" step="0.5" className="input-field" value={marks.sm2} onChange={handleChange} required />
                        </div>

                        {/* Assignments */}
                        <div className="input-group" style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px' }}>
                            <label style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Assignments (Max 12)</label>
                            <input type="number" id="as1" placeholder="Assignment 1" max="12" step="0.5" className="input-field" value={marks.as1} onChange={handleChange} required />
                            <input type="number" id="as2" placeholder="Assignment 2" max="12" step="0.5" className="input-field" value={marks.as2} onChange={handleChange} required />
                        </div>

                        {/* Quizzes */}
                        <div className="input-group" style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px' }}>
                            <label style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Quizzes (Max 12)</label>
                            <input type="number" id="q1" placeholder="Quiz 1" max="12" step="1" className="input-field" value={marks.q1} onChange={handleChange} required />
                            <input type="number" id="q2" placeholder="Quiz 2" max="12" step="1" className="input-field" value={marks.q2} onChange={handleChange} required />
                        </div>

                        {/* Attendance */}
                        <div className="input-group" style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', justifyContent: 'center' }}>
                            <label style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Attendance (%)</label>
                            <input type="number" id="at" placeholder="e.g. 85" max="100" step="0.1" className="input-field" value={marks.at} onChange={handleChange} required />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                        Calculate Total Internals
                    </button>
                </form>

                {result && (
                    <div style={{ marginTop: '2rem', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem' }}>Final Internal Marks</div>
                        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--accent-color)', fontFamily: 'var(--font-logo)' }}>
                            {result} <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>/ 30</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternalCalculator;
