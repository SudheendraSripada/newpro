import { subjectNamesData } from '../data/subjectNames';
import React, { useState, useEffect } from 'react';
import { creditsData } from '../data/creditsData';

const GPACalculator = () => {
    const [gpaSubjects, setGpaSubjects] = useState(() => {
        const saved = localStorage.getItem('study_gpa_v4');
        if (saved) return JSON.parse(saved);
        return [{ name: '', credits: '', grade: 'A+' }];
    });

    const [branchConfig, setBranchConfig] = useState({
        branch: 'cse',
        year: '1',
        sem: '1'
    });

    useEffect(() => {
        localStorage.setItem('study_gpa_v4', JSON.stringify(gpaSubjects));
    }, [gpaSubjects]);

    const handleLoadBranchSubjects = () => {
        const key = `${branchConfig.year}.${branchConfig.sem}`;
        const branchCredits = creditsData[branchConfig.branch] && creditsData[branchConfig.branch][key];
        const branchNames = subjectNamesData[branchConfig.branch] && subjectNamesData[branchConfig.branch][key];

        if (branchCredits) {
            let subs = [];
            let labs = [];
            let others = [];

            if (branchNames) {
                subs = branchCredits[0].map((cr, i) => ({ name: branchNames[0][i] || `Subject ${i + 1}`, credits: cr, grade: 'A+' }));
                if (branchCredits.length > 1) {
                    labs = branchCredits[1].map((cr, i) => ({ name: branchNames[1]?.[i] || `Lab ${i + 1}`, credits: cr, grade: 'A+' }));
                }
                if (branchCredits.length > 2) {
                    others = branchCredits[2].map((cr, i) => ({ name: branchNames[2]?.[i] || `Other ${i + 1}`, credits: cr, grade: 'A+' }));
                }
            } else {
                subs = branchCredits[0].map((cr, i) => ({ name: `Subject ${i + 1}`, credits: cr, grade: 'A+' }));
                if (branchCredits.length > 1) {
                    labs = branchCredits[1].map((cr, i) => ({ name: `Lab ${i + 1}`, credits: cr, grade: 'A+' }));
                }
                if (branchCredits.length > 2) {
                    others = branchCredits[2].map((cr, i) => ({ name: `Other ${i + 1}`, credits: cr, grade: 'A+' }));
                }
            }

            setGpaSubjects([...subs, ...labs, ...others]);
        } else {
            alert("No data available for this selection.");
        }
    };

    const handleAddGpaSubject = () => {
        setGpaSubjects([...gpaSubjects, { name: '', credits: '', grade: 'A+' }]);
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
        'A+': 10,
        'A': 9,
        'B': 8,
        'C': 7,
        'D': 6,
        'E': 5,
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
            <div className="panel-card shadow-sm" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Branch</label>
                        <select
                            className="input-field"
                            value={branchConfig.branch}
                            onChange={(e) => setBranchConfig({ ...branchConfig, branch: e.target.value })}
                        >
                            <option value="cse">CSE</option>
                            <option value="ece">ECE</option>
                            <option value="eee">EEE</option>
                            <option value="it">IT</option>
                            <option value="mech">MECH</option>
                            <option value="civil">CIVIL</option>
                            <option value="chemical">CHEMICAL</option>
                            <option value="csm">CSM</option>
                            <option value="cso">CSO</option>
                            <option value="csbs">CSBS</option>
                            <option value="csd">CSD</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Year</label>
                        <select
                            className="input-field"
                            value={branchConfig.year}
                            onChange={(e) => setBranchConfig({ ...branchConfig, year: e.target.value })}
                        >
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Semester</label>
                        <select
                            className="input-field"
                            value={branchConfig.sem}
                            onChange={(e) => setBranchConfig({ ...branchConfig, sem: e.target.value })}
                        >
                            <option value="1">1st Semester</option>
                            <option value="2">2nd Semester</option>
                        </select>
                    </div>
                    <button onClick={handleLoadBranchSubjects} className="btn-primary" style={{ padding: '0.75rem' }}>
                        Load Subjects
                    </button>
                </div>
            </div>

            <div className="panel-card form-section shadow-sm">
                <div className="input-group">
                    <label>Academic Subjects (CBCS Scheme)</label>
                    {gpaSubjects.map((sub, idx) => (
                        <div key={idx} className="input-row">
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
                                <option value="A+">A+ (10)</option>
                                <option value="A">A (9)</option>
                                <option value="B">B (8)</option>
                                <option value="C">C (7)</option>
                                <option value="D">D (6)</option>
                                <option value="E">E (5)</option>
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
