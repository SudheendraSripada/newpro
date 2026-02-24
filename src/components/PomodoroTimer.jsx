import React, { useState, useEffect } from 'react';

const PomodoroTimer = ({ addXp }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // 'focus' or 'break'

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            clearInterval(interval);
            handleTimerComplete();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const handleTimerComplete = () => {
        setIsActive(false);
        if (mode === 'focus') {
            alert('Focus session complete! Take a 5 minute break. (+10 XP)');
            addXp(10);
            setMode('break');
            setTimeLeft(5 * 60);
        } else {
            alert('Break is over! Ready to focus again?');
            setMode('focus');
            setTimeLeft(25 * 60);
        }
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setMode('focus');
        setTimeLeft(25 * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            minWidth: '250px'
        }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {mode === 'focus' ? '🎯 Focus Session' : '☕ Break Time'}
            </h3>
            
            <div style={{
                fontSize: '3.5rem',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                color: mode === 'focus' ? 'var(--accent-color)' : 'var(--success)',
                marginBottom: '1rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                {formatTime(timeLeft)}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button 
                    onClick={toggleTimer} 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', fontSize: '1rem', background: isActive ? 'var(--warning)' : 'var(--accent-color)' }}
                >
                    {isActive ? 'Pause' : 'Start'}
                </button>
                <button 
                    onClick={resetTimer} 
                    className="btn-secondary" 
                    style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)' }}
                >
                    ↻
                </button>
            </div>
            
            {mode === 'focus' && (
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Complete session to earn +10 XP
                </div>
            )}
        </div>
    );
};

export default PomodoroTimer;
