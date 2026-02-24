import { useState, useEffect } from 'react'
import './App.css'
import DashboardOverview from './components/DashboardOverview'
import AttendanceTracker from './components/AttendanceTracker'
import GPACalculator from './components/GPACalculator'

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('study_theme') === 'dark'
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Planner State (Keep in App for Analytics/Progress interaction)
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('study_subjects_v3')
    if (saved) return JSON.parse(saved)
    return [{ name: '', difficulty: 'Medium' }]
  })
  const [examDate, setExamDate] = useState(() => localStorage.getItem('study_examDate') || '')
  const [studyHours, setStudyHours] = useState(() => localStorage.getItem('study_hours') || '')
  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem('study_schedule_v3')
    return saved ? JSON.parse(saved) : null
  })
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    localStorage.setItem('study_theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('study_subjects_v3', JSON.stringify(subjects))
    localStorage.setItem('study_examDate', examDate)
    localStorage.setItem('study_hours', studyHours)
  }, [subjects, examDate, studyHours])

  useEffect(() => {
    if (schedule) {
      localStorage.setItem('study_schedule_v3', JSON.stringify(schedule))
    }
  }, [schedule])

  // Helper to calculate summary for DashboardOverview
  const getDashboardStats = () => {
    // GPA (RVR & JC Weighting)
    const gpaSaved = localStorage.getItem('study_gpa_v4');
    const gpaArr = gpaSaved ? JSON.parse(gpaSaved) : [];
    const gradePoints = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0 };
    let tPoints = 0, tCredits = 0;
    gpaArr.forEach(s => {
      const cr = parseFloat(s.credits);
      if (!isNaN(cr) && cr > 0) {
        tPoints += (gradePoints[s.grade] || 0) * cr;
        tCredits += cr;
      }
    });
    const gpa = tCredits > 0 ? (tPoints / tCredits).toFixed(2) : "0.00";

    // Attendance (Aggregate Formula: Total Attended / Total Conducted)
    const attSaved = localStorage.getItem('study_attendance_v5');
    const attArr = attSaved ? JSON.parse(attSaved) : [];
    let totalAttended = 0, totalConducted = 0;
    attArr.forEach(r => {
      const a = parseFloat(r.attended), t = parseFloat(r.total);
      if (!isNaN(a) && !isNaN(t) && t > 0) {
        totalAttended += a;
        totalConducted += t;
      }
    });
    const avgAttendance = totalConducted > 0 ? ((totalAttended / totalConducted) * 100).toFixed(1) : "0.0";

    // Subjects
    const plannerCount = subjects.filter(s => s.name.trim() !== '').length;
    const totalSubjects = plannerCount + attArr.length;

    return { gpa, avgAttendance, totalSubjects };
  };

  const handleAddSubject = () => {
    setSubjects([...subjects, { name: '', difficulty: 'Medium' }])
  }

  const handleUpdateSubject = (index, field, value) => {
    const updated = [...subjects]
    updated[index][field] = value
    setSubjects(updated)
  }

  const handleRemoveSubject = (index) => {
    if (subjects.length === 1) return;
    const updated = subjects.filter((_, i) => i !== index)
    setSubjects(updated)
  }

  const handleGeneratePlan = () => {
    setErrorMsg('');
    const validSubjects = subjects.filter(s => s.name.trim() !== '')
    // ... validation and logic (already implemented)
    if (validSubjects.length === 0) { setErrorMsg("Please enter at least one subject."); return; }
    if (!examDate) { setErrorMsg("Please select an exam date."); return; }
    const parsedHours = parseFloat(studyHours);
    if (!studyHours || isNaN(parsedHours) || parsedHours <= 0) { setErrorMsg("Please enter a valid number of study hours."); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const targetDate = new Date(examDate + 'T00:00:00');
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (daysRemaining <= 0) { setErrorMsg("Exam date must be in the future."); return; }

    const difficultyWeights = { 'Hard': 3, 'Medium': 2, 'Easy': 1 };
    const totalWeight = validSubjects.reduce((acc, sub) => acc + difficultyWeights[sub.difficulty], 0);
    const dailyPlan = [];
    let currentDay = 1;

    validSubjects.forEach((sub) => {
      const weight = difficultyWeights[sub.difficulty];
      const daysForSubject = Math.max(1, Math.round((weight / totalWeight) * daysRemaining));
      for (let i = 0; i < daysForSubject && currentDay <= daysRemaining; i++) {
        dailyPlan.push({ dayIndex: currentDay, subject: sub.name, hours: parsedHours.toFixed(1), completed: false });
        currentDay++;
      }
    });
    let fallbackIndex = 0;
    while (currentDay <= daysRemaining) {
      dailyPlan.push({ dayIndex: currentDay, subject: validSubjects[fallbackIndex % validSubjects.length].name, hours: parsedHours.toFixed(1), completed: false });
      currentDay++; fallbackIndex++;
    }
    setSchedule({ items: dailyPlan.sort((a, b) => a.dayIndex - b.dayIndex), days: daysRemaining, totalHours: daysRemaining * parsedHours, numSubjects: validSubjects.length, estimatedHoursPerSubject: ((daysRemaining * parsedHours) / validSubjects.length).toFixed(1) });
    setCurrentTab('progress');
  };

  const renderSidebar = () => (
    <>
      <div className={`mobile-backdrop ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.5rem' }}>✨</span> Study Board
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>
        <div className="sidebar-nav">
          <div className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setCurrentTab('dashboard'); setIsSidebarOpen(false); }}>
            🏠 Dashboard
          </div>
          <div className={`nav-item ${currentTab === 'planner' ? 'active' : ''}`} onClick={() => { setCurrentTab('planner'); setIsSidebarOpen(false); }}>
            📅 Planner
          </div>
          <div className={`nav-item ${currentTab === 'progress' ? 'active' : ''}`} onClick={() => { setCurrentTab('progress'); setIsSidebarOpen(false); }}>
            ✅ Progress
          </div>
          <div className={`nav-item ${currentTab === 'analytics' ? 'active' : ''}`} onClick={() => { setCurrentTab('analytics'); setIsSidebarOpen(false); }}>
            📊 Analytics
          </div>
          <div className={`nav-item ${currentTab === 'attendance' ? 'active' : ''}`} onClick={() => { setCurrentTab('attendance'); setIsSidebarOpen(false); }}>
            📝 Attendance
          </div>
          <div className={`nav-item ${currentTab === 'gpa' ? 'active' : ''}`} onClick={() => { setCurrentTab('gpa'); setIsSidebarOpen(false); }}>
            🎓 GPA Calculator
          </div>
        </div>

        <div
          className="nav-item theme-item"
          style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
          onClick={() => setIsDarkMode(!isDarkMode)}
        >
          <span style={{ fontSize: '0.9rem' }}>{isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          <div style={{ width: '32px', height: '18px', backgroundColor: isDarkMode ? 'var(--accent-color)' : '#cbd5e1', borderRadius: '10px', position: 'relative' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isDarkMode ? '16px' : '2px', transition: 'left 0.2s' }}></div>
          </div>
        </div>

        <div className="sidebar-footer" style={{ padding: '0', fontSize: '0.75rem', opacity: 0.7 }}>
          Built by Sudheendra Sripada<br />Engineering Study Planner
        </div>
      </div>
    </>
  );

  const renderPlanner = () => (
    <div className="content-wrapper">
      <div className="top-header">
        <h1>Study Configuration</h1>
        <p>Set up your subjects, dates, and hours.</p>
      </div>
      <div className="panel-card form-section shadow-sm">
        {errorMsg && (
          <div style={{ color: 'var(--warning)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}
        <div className="input-group">
          <label>Subjects & Difficulty</label>
          {subjects.map((sub, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="text" className="input-field" placeholder="e.g. Calculus" value={sub.name} onChange={(e) => handleUpdateSubject(idx, 'name', e.target.value)} />
              <select className="input-field" style={{ width: '120px' }} value={sub.difficulty} onChange={(e) => handleUpdateSubject(idx, 'difficulty', e.target.value)}>
                <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
              </select>
              <button onClick={() => handleRemoveSubject(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '1.2rem' }} disabled={subjects.length === 1}>×</button>
            </div>
          ))}
          <button onClick={handleAddSubject} className="btn-secondary" style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--accent-hover)', color: 'var(--accent-hover)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Add Subject</button>
        </div>
        <div className="input-group">
          <label htmlFor="examDate">Target Exam Date</label>
          <input type="date" id="examDate" className="input-field" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div className="input-group">
          <label htmlFor="studyHours">Study Hours Per Day</label>
          <input type="number" id="studyHours" className="input-field" placeholder="e.g. 4" value={studyHours} onChange={(e) => setStudyHours(e.target.value)} />
        </div>
        <button className="generate-btn" onClick={handleGeneratePlan}>Generate Schedule Output</button>
      </div>
    </div>
  );

  const downloadTimetable = () => {
    if (!schedule) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Day,Subject,Study Hours,Status\n";
    schedule.items.forEach(item => {
      csvContent += `${item.dayIndex},${item.subject},${item.hours},${item.completed ? 'Completed' : 'Pending'}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `StudyPlan_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderProgress = () => {
    if (!schedule) return (
      <div className="content-wrapper">
        <div className="top-header">
          <h1>Progress Tracker</h1>
          <p>Please generate a plan first.</p>
        </div>
      </div>
    );

    const completedDays = schedule.items.filter(d => d.completed).length;
    const progressPercent = Math.round((completedDays / schedule.days) * 100);

    const toggleComplete = (dayIndex) => {
      setSchedule({
        ...schedule,
        items: schedule.items.map(d => d.dayIndex === dayIndex ? { ...d, completed: !d.completed } : d)
      });
    };

    return (
      <div className="content-wrapper">
        <div className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Daily Study Timeline</h1>
            <p>Overall Progress: {progressPercent}% Completed</p>
          </div>
          <button
            onClick={downloadTimetable}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            📥 Download Timetable (CSV)
          </button>
        </div>

        <div className="stats-strip shadow-sm">
          {[
            { label: 'Days Total', val: schedule.days, icon: '📅' },
            { label: 'Study Hours', val: schedule.totalHours, icon: '⏱️' },
            { label: 'Subjects', val: schedule.numSubjects, icon: '📚' },
            { label: 'Avg Hrs/Sub', val: schedule.estimatedHoursPerSubject, icon: '🎯' }
          ].map((stat, i) => (
            <div key={i} className="stat-pill">
              <span style={{ fontSize: '1.2rem' }}>{stat.icon}</span>
              <div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-val">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="timeline-container">
          {schedule.items.map((day, idx) => (
            <div key={day.dayIndex} className={`timeline-item ${day.completed ? 'completed' : ''}`}>
              <div className="timeline-marker">
                <div className="marker-line"></div>
                <div className="marker-dot"></div>
              </div>
              <div className="timeline-content card-hover">
                <div className="day-meta">
                  <span className="day-badge">Day {day.dayIndex}</span>
                  <div className="custom-checkbox" onClick={() => toggleComplete(day.dayIndex)}>
                    <div className={`checkbox-box ${day.completed ? 'checked' : ''}`}>
                      {day.completed && '✓'}
                    </div>
                    <span className="checkbox-text">{day.completed ? 'Completed' : 'Mark as done'}</span>
                  </div>
                </div>
                <div className="subject-info">
                  <h3 className="subject-title">{day.subject}</h3>
                  <div className="hour-pill">⏱️ {day.hours} Hours Session</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (!schedule) return <div className="content-wrapper"><div className="top-header"><h1>Analytics</h1><p>Please generate a plan first.</p></div></div>;
    const stats = {}; schedule.items.forEach(d => { if (!stats[d.subject]) stats[d.subject] = { t: 0, c: 0 }; stats[d.subject].t++; if (d.completed) stats[d.subject].c++; });
    const weak = Object.keys(stats).filter(s => (stats[s].c / stats[s].t) < 0.5);
    return (
      <div className="content-wrapper">
        <div className="top-header"><h1>Analytics & Insights</h1><p>Review performance breakdown.</p></div>
        <div className="panel-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Weak Subject Detection</h2>
          {weak.length > 0 ? (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--warning)', borderRadius: '12px', color: 'var(--warning)' }}><strong>⚠️ Attention Needed</strong>: Dedicated more time to {weak.join(', ')}.</div>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)' }}><strong>✅ Keep it up!</strong> You are on track in all subjects.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-layout ${isDarkMode ? 'dark-theme' : ''}`}>
      <button className="mobile-hamburger" onClick={() => setIsSidebarOpen(true)}>☰</button>
      {renderSidebar()}
      <main className="main-content">
        {currentTab === 'dashboard' && <DashboardOverview stats={getDashboardStats()} />}
        {currentTab === 'planner' && renderPlanner()}
        {currentTab === 'progress' && renderProgress()}
        {currentTab === 'analytics' && renderAnalytics()}
        {currentTab === 'attendance' && <AttendanceTracker />}
        {currentTab === 'gpa' && <GPACalculator />}
      </main>
    </div>
  );
}

export default App
