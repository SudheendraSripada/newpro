import React, { useState, useEffect } from 'react';

const GPACalculator = () => {
    const [gpaSubjects, setGpaSubjects] = useState(() => {
        const saved = localStorage.getItem('study_gpa_v4');
        if (saved) return JSON.parse(saved);
        return [{ name: '', credits: '', grade: 'O' }];
    });

    useEffect(() => {
        localStorage.setItem('study_gpa_v4', JSON.stringify(gpaSubjects));
    }, [gpaSubjects]);

    const handleAddGpaSubject = () => {
        setGpaSubjects([...gpaSubjects, { name: '', credits: '', grade: 'O' }]);
    };

    const handleUpdateGpaSubject = (index, field, value) => {
        const updated = [...gpaSubjects];
        updated[index][field] = value;
        setGpaSubjects(updated);
    };

    const handleRemoveGpaSubject = (index) => {
        if (gpaSubjects.length === 1) return;
        const updated = gpaSubjects.filter((_, i) => i !== index);
        setGpaSubjects(updated);
    };

    // RVR & JC Regulation Grade Points
    const gradePoints = {
        'O': 10,
        'A+': 9,
        'A': 8,
        'B+': 7,
        'B': 6,
        'C': 5,
        'F': 0
    };

    let totalPoints = 0;
    let totalCredits = 0;
    gpaSubjects.forEach(s => {
        const credits = parseFloat(s.credits);
        if (!isNaN(credits) && credits > 0) {
            totalPoints += (gradePoints[s.grade] || 0) * credits;
            totalCredits += credits;
        }
    });
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";

    return (
        <div className="content-wrapper">
            <div className="top-header">
                <h1>GPA Calculator</h1>
                <p>RVR & JC Regulations: Σ(Credits × GP) / Σ(Credits)</p>
            </div>
            <div className="panel-card form-section shadow-sm">
                <div className="input-group">
                    <label>Academic Subjects (CBCS Scheme)</label>
                    {gpaSubjects.map((sub, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Data Structures"
                                value={sub.name}
                                onChange={(e) => handleUpdateGpaSubject(idx, 'name', e.target.value)}
                                style={{ flex: 2 }}
                            />
                            <input
                                type="number"
                                className="input-field"
                                placeholder="Credits"
                                value={sub.credits}
                                onChange={(e) => handleUpdateGpaSubject(idx, 'credits', e.target.value)}
                                style={{ flex: 1 }}
                                min="0.5"
                                step="0.5"
                            />
                            <select
                                className="input-field"
                                style={{ width: '90px' }}
                                value={sub.grade}
                                onChange={(e) => handleUpdateGpaSubject(idx, 'grade', e.target.value)}
                            >
                                <option value="O">O (10)</option>
                                <option value="A+">A+ (9)</option>
                                <option value="A">A (8)</option>
                                <option value="B+">B+ (7)</option>
                                <option value="B">B (6)</option>
                                <option value="C">C (5)</option>
                                <option value="F">F (0)</option>
                            </select>
                            <button
                                onClick={() => handleRemoveGpaSubject(idx)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '0 0.5rem', fontSize: '1.2rem' }}
                                disabled={gpaSubjects.length === 1}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={handleAddGpaSubject}
                        className="btn-secondary"
                        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--accent-hover)', color: 'var(--accent-hover)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        + Add Subject
                    </button>
                </div>
                <div style={{ marginTop: '1rem', padding: '2rem', backgroundColor: 'var(--input-bg)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem' }}>Calculated SGPA</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--accent-color)', fontFamily: 'var(--font-logo)' }}>{gpa}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>As per RVR & JC 10-point scale</div>
                </div>
            </div>
        </div>
    );
};

export default GPACalculator;
