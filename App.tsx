import React, { useState, useEffect } from 'react';
import { AuthUser } from './types';
import { STORAGE_KEYS } from './constants';
import { AuthScreens } from './components/AuthScreens';
import { PatientDashboard } from './components/PatientDashboard';
import { AdminDashboard } from './components/RoleDashboards';
import { ClinicianDashboard } from './components/ClinicianDashboard';

const App: React.FC = () => {
  // Theme State with System Preference Fallback
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') return saved;
      // Fallback to system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session
    const savedUser = localStorage.getItem('pulsetalk_auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse auth user", e);
      }
    }
    setLoading(false);
  }, []);

  // Apply theme class to HTML and body elements
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system-wide theme changes in real time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleLogin = (authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    localStorage.setItem('pulsetalk_auth_user', JSON.stringify(authenticatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pulsetalk_auth_user');
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900 transition-colors"><div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full"></div></div>;
  }

  if (!user) {
    return (
      <AuthScreens 
        onLogin={handleLogin} 
        theme={theme} 
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
      />
    );
  }

  // Role-Based Routing
  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />;
  }

  if (user.role === 'clinician') {
    return <ClinicianDashboard user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />;
  }

  // Default to Patient Dashboard
  return (
    <PatientDashboard 
      user={user} 
      onLogout={handleLogout} 
      theme={theme}
      setTheme={setTheme}
    />
  );
};

export default App;