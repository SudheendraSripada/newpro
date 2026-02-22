import React from 'react';

const DashboardOverview = ({ stats }) => {
    const { gpa, avgAttendance, totalSubjects } = stats;

    return (
        <div className="content-wrapper">
            <div className="top-header">
                <h1>Dashboard Overview</h1>
                <p>Your academic performance at a glance.</p>
            </div>

            <div className="overview-grid">
                <div className="overview-card">
                    <div className="overview-label">Current GPA</div>
                    <div className="overview-value" style={{ color: 'var(--accent-color)' }}>{gpa}</div>
                    <div className="overview-trend trend-up">Excellent progress!</div>
                </div>

                <div className="overview-card">
                    <div className="overview-label">Overall Attendance</div>
                    <div className="overview-value" style={{ color: parseFloat(avgAttendance) < 75 ? 'var(--warning)' : 'var(--success)' }}>
                        {avgAttendance}%
                    </div>
                    <div className={`overview-trend ${parseFloat(avgAttendance) < 75 ? 'trend-down' : 'trend-up'}`}>
                        {parseFloat(avgAttendance) < 75 ? 'Below 75% threshold' : 'On track'}
                    </div>
                </div>

                <div className="overview-card">
                    <div className="overview-label">Total Subjects</div>
                    <div className="overview-value">{totalSubjects}</div>
                    <div className="overview-trend" style={{ color: 'var(--text-secondary)' }}>Across all modules</div>
                </div>
            </div>

            <div className="panel-card" style={{ marginTop: '2.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Welcome back, Student!</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Your academic summary is synchronized. You have {totalSubjects} subjects currently tracked.
                    Make sure to keep your attendance above 75% to stay compliant with RVR & JC regulations.
                </p>
            </div>
        </div>
    );
};

export default DashboardOverview;
