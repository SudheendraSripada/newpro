import { useState, useEffect } from 'react'
import './App.css'
import DashboardOverview from './components/DashboardOverview'
import AttendanceTracker from './components/AttendanceTracker'
import GPACalculator from './components/GPACalculator'
import InternalCalculator from './components/InternalCalculator'

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('study_theme') === 'dark'
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Advanced Planner State (Shovel-like Timeboxing)
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('study_tasks_v4')
    if (saved) return JSON.parse(saved)
    return [{ name: '', estimatedHours: '' }]
  })
  const [examDate, setExamDate] = useState(() => localStorage.getItem('study_examDate') || '')
  const [studyHours, setStudyHours] = useState(() => localStorage.getItem('study_hours') || '')
  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem('study_schedule_v4')
    return saved ? JSON.parse(saved) : null
  })
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    localStorage.setItem('study_theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('study_tasks_v4', JSON.stringify(tasks))
    localStorage.setItem('study_examDate', examDate)
    localStorage.setItem('study_hours', studyHours)
  }, [tasks, examDate, studyHours])

  useEffect(() => {
    if (schedule) {
      localStorage.setItem('study_schedule_v4', JSON.stringify(schedule))
    }
  }, [schedule])

  // Helper to calculate summary for DashboardOverview
  const getDashboardStats = () => {
    // GPA (RVR & JC Weighting)
    const gpaSaved = localStorage.getItem('study_gpa_v4');
    const gpaArr = gpaSaved ? JSON.parse(gpaSaved) : [];
    const gradePoints = { 'A+': 10, 'A': 9, 'B': 8, 'C': 7, 'D': 6, 'E': 5, 'F': 0 };
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
    const plannerCount = tasks.filter(t => t.name.trim() !== '').length;
    const totalSubjects = plannerCount + attArr.length;

    return { gpa, avgAttendance, totalSubjects };
  };

  const handleAddTask = () => {
    setTasks([...tasks, { name: '', estimatedHours: '' }])
  }

  const handleUpdateTask = (index, field, value) => {
    const updated = [...tasks]
    updated[index][field] = value
    setTasks(updated)
  }

  const handleRemoveTask = (index) => {
    if (tasks.length === 1) return;
    const updated = tasks.filter((_, i) => i !== index)
    setTasks(updated)
  }

  const handleGeneratePlan = () => {
    setErrorMsg('');
    const validTasks = tasks.filter(t => t.name.trim() !== '')
    if (validTasks.length === 0) { setErrorMsg("Please enter at least one study task."); return; }

    let totalRequiredHours = 0;
    for (const t of validTasks) {
      const hours = parseFloat(t.estimatedHours);
      if (isNaN(hours) || hours <= 0) {
        setErrorMsg("Please enter valid estimated hours for all tasks.");
        return;
      }
      totalRequiredHours += hours;
    }

    if (!examDate) { setErrorMsg("Please select an exam date."); return; }
    const parsedDailyHours = parseFloat(studyHours);
    if (!studyHours || isNaN(parsedDailyHours) || parsedDailyHours <= 0) { setErrorMsg("Please enter realistic study hours per day."); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const targetDate = new Date(examDate + 'T00:00:00');
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysRemaining <= 0) { setErrorMsg("Exam date must be in the future."); return; }

    const totalAvailableHours = daysRemaining * parsedDailyHours;
    const cushion = totalAvailableHours - totalRequiredHours;

    // Timeboxing Algorithm Setup
    const dailyPlan = [];
    let currentDay = 1;
    let dayHoursRemaining = parsedDailyHours;
    let currentDayTasks = [];

    // Create deep copy of tasks to deplete iteratively
    let remainingTasks = validTasks.map((t, idx) => ({ ...t, id: idx, hoursLeft: parseFloat(t.estimatedHours) }));

    while (remainingTasks.length > 0 && currentDay <= daysRemaining) {
      let currentTask = remainingTasks[0];

      if (currentTask.hoursLeft <= dayHoursRemaining) {
        // Can finish this task today
        currentDayTasks.push({
          taskId: currentTask.id,
          name: currentTask.name,
          hoursSpent: currentTask.hoursLeft,
          completedTaskPartially: false
        });
        dayHoursRemaining -= currentTask.hoursLeft;
        remainingTasks.shift(); // Remove finished task
      } else {
        // Task takes longer than remaining time today
        currentDayTasks.push({
          taskId: currentTask.id,
          name: currentTask.name,
          hoursSpent: dayHoursRemaining,
          completedTaskPartially: true
        });
        currentTask.hoursLeft -= dayHoursRemaining;
        dayHoursRemaining = 0;
      }

      // If day is full or no tasks left, close the day
      if (dayHoursRemaining === 0 || remainingTasks.length === 0) {
        dailyPlan.push({
          dayIndex: currentDay,
          date: new Date(today.getTime() + (currentDay - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          assignments: currentDayTasks,
          completed: false
        });
        currentDay++;
        dayHoursRemaining = parsedDailyHours;
        currentDayTasks = [];
      }
    }

    setSchedule({
      tasks: validTasks,
      items: dailyPlan,
      days: daysRemaining,
      totalAvailable: totalAvailableHours,
      totalRequired: totalRequiredHours,
      cushion: cushion,
      dailyHours: parsedDailyHours
    });
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
          <div className={`nav-item ${currentTab === 'internals' ? 'active' : ''}`} onClick={() => { setCurrentTab('internals'); setIsSidebarOpen(false); }}>
            🧮 Internals
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

  const renderPlanner = () => {
    // Calculate current cushion based on current inputs
    let currentTotalRequired = 0;
    tasks.forEach(t => {
      const h = parseFloat(t.estimatedHours);
      if (!isNaN(h) && h > 0) currentTotalRequired += h;
    });

    let currentCushion = null;
    let currentTotalAvailable = 0;
    if (examDate && studyHours) {
      const parsedHours = parseFloat(studyHours);
      if (!isNaN(parsedHours) && parsedHours > 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const targetDate = new Date(examDate + 'T00:00:00');
        const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (daysRemaining > 0) {
          currentTotalAvailable = daysRemaining * parsedHours;
          currentCushion = currentTotalAvailable - currentTotalRequired;
        }
      }
    }

    return (
      <div className="content-wrapper">
        <div className="top-header">
          <h1>Advanced Study Planner</h1>
          <p>Timebox your tasks exactly and know your Time Cushion.</p>
        </div>
        <div className="panel-card form-section shadow-sm">
          {errorMsg && (
            <div style={{ color: 'var(--warning)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          {currentCushion !== null && (
            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              backgroundColor: currentCushion >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${currentCushion >= 0 ? 'var(--success)' : 'var(--warning)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>The Time Cushion</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'var(--font-logo)', color: currentCushion >= 0 ? 'var(--success)' : 'var(--warning)' }}>
                {currentCushion > 0 ? '+' : ''}{currentCushion} <span style={{ fontSize: '1.5rem' }}>hrs</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {currentTotalAvailable} hrs available vs {currentTotalRequired} hrs required
              </div>
              {currentCushion < 0 && (
                <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                  You don't have enough time! Add more daily hours or change the exam date.
                </div>
              )}
              {currentCushion >= 0 && (
                <div style={{ marginTop: '0.5rem', color: 'var(--success)' }}>
                  You have enough time. Great job!
                </div>
              )}
            </div>
          )}

          <div className="input-group">
            <label>Specific Study Tasks</label>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Enter specific tasks (e.g., "Read Chapter 1", "Math Assignment") and precisely estimate the hours they'll take.</div>
            {tasks.map((task, idx) => (
              <div key={idx} className="input-row" style={{ backgroundColor: 'var(--input-bg)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="input-field" placeholder="e.g. Read Physics Ch 1-3" value={task.name} onChange={(e) => handleUpdateTask(idx, 'name', e.target.value)} style={{ flex: 2 }} />
                <input type="number" className="input-field" placeholder="Est. Hours" step="0.5" value={task.estimatedHours} onChange={(e) => handleUpdateTask(idx, 'estimatedHours', e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => handleRemoveTask(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }} disabled={tasks.length === 1}>×</button>
              </div>
            ))}
            <button onClick={handleAddTask} className="btn-secondary" style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--accent-hover)', color: 'var(--accent-hover)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>+ Add Study Task</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="input-group">
              <label htmlFor="examDate">Target Exam Date</label>
              <input type="date" id="examDate" className="input-field" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label htmlFor="studyHours">Available Study Hours (Per Day)</label>
              <input type="number" id="studyHours" className="input-field" placeholder="e.g. 4" step="0.5" value={studyHours} onChange={(e) => setStudyHours(e.target.value)} />
            </div>
          </div>

          <button className="generate-btn" onClick={handleGeneratePlan} disabled={currentCushion !== null && currentCushion < 0} style={{ opacity: (currentCushion !== null && currentCushion < 0) ? 0.5 : 1 }}>
            Generate Precise Timebox Schedule
          </button>
        </div>
      </div>
    );
  };

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

    let completedTasksCount = 0;
    let totalAssignmentsCount = 0;
    schedule.items.forEach(d => {
      d.assignments.forEach(a => {
        totalAssignmentsCount++;
        if (a.completed) completedTasksCount++;
      });
    });

    const progressPercent = totalAssignmentsCount > 0 ? Math.round((completedTasksCount / totalAssignmentsCount) * 100) : 0;

    const toggleComplete = (dayIndex, assignmentIndex) => {
      setSchedule(prev => {
        const newSchedule = { ...prev };
        newSchedule.items = newSchedule.items.map(d => {
          if (d.dayIndex === dayIndex) {
            const newAssignments = [...d.assignments];
            newAssignments[assignmentIndex] = { ...newAssignments[assignmentIndex], completed: !newAssignments[assignmentIndex].completed };
            const allDayComplete = newAssignments.every(a => a.completed);
            return { ...d, assignments: newAssignments, completed: allDayComplete };
          }
          return d;
        });
        return newSchedule;
      });
    };

    return (
      <div className="content-wrapper">
        <div className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Daily Timeboxed Timeline</h1>
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
            { label: 'Total Available Time', val: `${schedule.totalAvailable} hrs`, icon: '⏱️' },
            { label: 'Time Required', val: `${schedule.totalRequired} hrs`, icon: '🎯' },
            { label: 'The Cushion', val: `${schedule.cushion > 0 ? '+' : ''}${schedule.cushion} hrs`, icon: schedule.cushion >= 0 ? '✅' : '⚠️' },
            { label: 'Tasks', val: schedule.tasks.length, icon: '📋' }
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
                  <span className="day-badge">Day {day.dayIndex} ({day.date})</span>
                  {day.completed && <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.9rem' }}>✓ All Day Complete</span>}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {day.assignments.map((assignment, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--input-bg)', borderRadius: '8px', border: assignment.completed ? '1px solid var(--success)' : '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="custom-checkbox" onClick={() => toggleComplete(day.dayIndex, aIdx)} style={{ margin: 0 }}>
                          <div className={`checkbox-box ${assignment.completed ? 'checked' : ''}`}>
                            {assignment.completed && '✓'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', color: assignment.completed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: assignment.completed ? 'line-through' : 'none' }}>{assignment.name}</div>
                          {assignment.completedTaskPartially && <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>Partial Completion</div>}
                        </div>
                      </div>
                      <div className="hour-pill" style={{ opacity: assignment.completed ? 0.6 : 1 }}>⏱️ {assignment.hoursSpent} hrs</div>
                    </div>
                  ))}
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

    // Analyze task progression
    const stats = {};
    schedule.items.forEach(d => {
      d.assignments.forEach(a => {
        if (!stats[a.taskId]) stats[a.taskId] = { name: a.name, t: 0, c: 0 };
        stats[a.taskId].t++;
        if (a.completed) stats[a.taskId].c++;
      })
    });

    const weakTasks = Object.values(stats).filter(s => (s.c / s.t) < 0.5 && s.t > 0);

    return (
      <div className="content-wrapper">
        <div className="top-header"><h1>Analytics & Insights</h1><p>Review performance breakdown based on actual task completion.</p></div>
        <div className="panel-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Task Fall-Behind Warning</h2>
          {weakTasks.length > 0 ? (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--warning)', borderRadius: '12px', color: 'var(--warning)' }}>
              <strong>⚠️ Attention Needed</strong>: You are falling behind on these tasks: {weakTasks.map(w => w.name).join(', ')}. Your Time Cushion will be impacted.
            </div>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)' }}>
              <strong>✅ On Track!</strong> You are completing your scheduled task components successfully.
            </div>
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
        {currentTab === 'internals' && <InternalCalculator />}
        {currentTab === 'gpa' && <GPACalculator />}
      </main>
    </div>
  );
}

export default App
