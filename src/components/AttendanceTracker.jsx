import React, { useState, useEffect } from 'react';

const rvrjcSubjects = {
    '1': ["Mathematics - I", "Engineering Physics", "BEEE", "Programming for Problem Solving", "Engineering Graphics"],
    '2': ["Mathematics - II", "Engineering Chemistry", "Digital Electronics", "English for Communication", "Python Programming"],
    '3': ["Discrete Mathematics", "Data Structures", "Computer Organization", "Object Oriented Programming", "Professional Ethics"],
    '4': ["Operating Systems", "Database Management Systems", "Software Engineering", "FLAT", "Web Technologies"],
    '5': ["Computer Networks", "Artificial Intelligence", "Design & Analysis of Algorithms", "Compiler Design", "Microprocessors"],
    '6': ["Machine Learning", "Cloud Computing", "Big Data Analytics", "Information Security", "Agile Methodologies"],
    '7': ["Deep Learning", "Internet of Things", "Cyber Security", "Distributed Systems", "General Elective"],
    '8': ["Project Work", "Technical Seminar", "Internship", "Comprehensive Viva"]
};

const AttendanceTracker = () => {
    const [selectedSem, setSelectedSem] = useState(() => {
        return localStorage.getItem('study_selected_sem_v5') || '1';
    });
    const [attendanceData, setAttendanceData] = useState(() => {
        const saved = localStorage.getItem('study_attendance_v5');
        if (saved) return JSON.parse(saved);
        return [];
    });

    useEffect(() => {
        localStorage.setItem('study_selected_sem_v5', selectedSem);
        localStorage.setItem('study_attendance_v5', JSON.stringify(attendanceData));
    }, [selectedSem, attendanceData]);

    const handleLoadSemester = () => {
        const subjects = rvrjcSubjects[selectedSem].map(name => ({
            subject: name,
            attended: '',
            total: ''
        }));
        setAttendanceData(subjects);
    };

    const handleAddAttendanceRow = () => {
        setAttendanceData([...attendanceData, { subject: 'Custom Subject', attended: '', total: '' }]);
    };

    const handleUpdateAttendance = (index, field, value) => {
        const updated = [...attendanceData];
        updated[index][field] = value;
        setAttendanceData(updated);
    };

    const handleRemoveAttendance = (index) => {
        if (attendanceData.length === 1) return;
        const updated = attendanceData.filter((_, i) => i !== index);
        setAttendanceData(updated);
    };

    // Calculate Aggregate Attendance
    let totalAtt = 0, totalCond = 0;
    attendanceData.forEach(r => {
        const a = parseFloat(r.attended), t = parseFloat(r.total);
        if (!isNaN(a) && !isNaN(t) && t > 0) {
            totalAtt += a;
            totalCond += t;
        }
    });
    const aggregatePerc = totalCond > 0 ? ((totalAtt / totalCond) * 100).toFixed(1) : "0.0";
    const isAggBelow = parseFloat(aggregatePerc) < 75;

    return (
        <div className="content-wrapper">
            <div className="top-header">
                <h1>Attendance Tracker</h1>
                <p>Aggregate Attendance Requirement: 75% (Condonation up to 65% on medical grounds)</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="panel-card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Aggregate Attendance</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: isAggBelow ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-logo)' }}>
                        {aggregatePerc}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isAggBelow ? 'var(--warning)' : 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {isAggBelow ? '⚠️ Below 75% target threshold' : '✅ Maintaining aggregate requirement'}
                    </div>
                </div>

                <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Semester</label>
                    <select
                        className="input-field"
                        value={selectedSem}
                        onChange={(e) => setSelectedSem(e.target.value)}
                        style={{ margin: '0.5rem 0' }}
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <option key={num} value={num.toString()}>Semester {num}</option>
                        ))}
                    </select>
                    <button onClick={handleLoadSemester} className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.85rem' }}>Reload Subjects</button>
                </div>
            </div>

            <div className="panel-card form-section shadow-sm">
                <div className="input-group">
                    <label>Subject-wise breakdown</label>
                    {attendanceData.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No records yet.</p>
                    ) : (
                        attendanceData.map((record, idx) => {
                            const attended = parseFloat(record.attended);
                            const total = parseFloat(record.total);
                            const percentage = (!isNaN(attended) && !isNaN(total) && total > 0)
                                ? ((attended / total) * 100).toFixed(1)
                                : "0.0";
                            const isBelowThreshold = parseFloat(percentage) < 75;

                            return (
                                <div key={idx} className="input-row" style={{ backgroundColor: 'var(--input-bg)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ flex: 2 }}>
                                        <input type="text" className="input-field" value={record.subject} onChange={(e) => handleUpdateAttendance(idx, 'subject', e.target.value)} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                        <input type="number" className="input-field" placeholder="Att" value={record.attended} onChange={(e) => handleUpdateAttendance(idx, 'attended', e.target.value)} />
                                        <input type="number" className="input-field" placeholder="Total" value={record.total} onChange={(e) => handleUpdateAttendance(idx, 'total', e.target.value)} />
                                    </div>
                                    <div style={{ width: '60px', textAlign: 'center', fontSize: '1rem', fontWeight: '700', color: isBelowThreshold && total > 0 ? 'var(--warning)' : 'var(--success)' }}>
                                        {percentage}%
                                    </div>
                                    <button onClick={() => handleRemoveAttendance(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                                </div>
                            );
                        })
                    )}
                    <button onClick={handleAddAttendanceRow} className="btn-secondary" style={{ border: '1px dashed var(--accent-hover)', color: 'var(--accent-hover)', background: 'transparent', alignSelf: 'flex-start', padding: '0.5rem 1rem' }}>+ Add Subject</button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTracker;
