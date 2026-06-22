import React, { useEffect, useState } from 'react';
import { AuthUser, Appointment, SystemLog, ContactSubmission } from '../types';
import { Button } from './Button';
import { 
  Users, Calendar, Activity, TrendingUp, Settings, 
  FileText, Bell, Search, AlertCircle, CheckCircle, Clock, Sun, Moon, Mic2, User, MessageSquare,
  Shield, Database, Server, Save, Mail, Lock, Download, Trash2, Globe, Menu, X
} from 'lucide-react';
import { STORAGE_KEYS } from '../constants';

interface DashboardProps {
  user: AuthUser;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

// --- Admin Dashboard ---
export const AdminDashboard: React.FC<DashboardProps> = ({ user, onLogout, theme, setTheme }) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'inquiries' | 'users' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Settings State
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    systemEmail: 'admin@pulsetalk.ai',
    sessionTimeout: '30',
    mfaEnforcement: false
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Poll for logs to simulate real-time updates without complexity
    const fetchData = () => {
      const storedLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
      const storedAppts = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPOINTMENTS) || '[]');
      const storedContacts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTACT_SUBMISSIONS) || '[]');
      const storedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
      
      setLogs(storedLogs);
      setAppointments(storedAppts);
      setContactSubmissions(storedContacts);
      setAllUsers(storedUsers);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const activeSessions = 85; // Mock active sessions for now

  const getLogIcon = (type: string) => {
    switch(type) {
        case 'symptom_analysis': return <FileText size={16} className="text-teal-500" />;
        case 'live_consultation': return <Mic2 size={16} className="text-rose-500" />;
        case 'appointment': return <Calendar size={16} className="text-indigo-500" />;
        default: return <Activity size={16} className="text-slate-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
      switch(severity) {
          case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
          case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
          default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      }
  };

  const getTabTitle = () => {
      switch(activeTab) {
          case 'overview': return 'System Overview';
          case 'inquiries': return 'Patient Inquiries';
          case 'users': return 'User Management';
          case 'settings': return 'System Configuration';
          default: return 'Dashboard';
      }
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
        setIsSaving(false);
        // Toast logic could go here
    }, 1000);
  };

  const toggleSetting = (key: keyof typeof systemSettings) => {
      setSystemSettings(prev => ({...prev, [key]: !prev[key]}));
  };

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex transition-colors duration-300 relative overflow-hidden">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center">
            <div className="bg-teal-600 p-1.5 rounded-lg mr-2">
              <Activity className="text-white h-5 w-5" />
            </div>
            <span className="font-bold text-xl text-white">PulseTalk <span className="text-slate-500 text-xs">ADMIN</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => handleNavClick('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
          >
            <TrendingUp size={18} /> Overview
          </button>
          <button 
            onClick={() => handleNavClick('users')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
          >
            <Users size={18} /> User Management
          </button>
          <button 
            onClick={() => handleNavClick('inquiries')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inquiries' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
          >
            <MessageSquare size={18} /> Inquiries
            {contactSubmissions.length > 0 && <span className="ml-auto bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">{contactSubmissions.length}</span>}
          </button>
          <button 
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
          >
            <Settings size={18} /> System Settings
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-4">
           <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-teal-600' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

           <div className="flex items-center gap-3">
             <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full bg-slate-700" />
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-white truncate">{user.name}</p>
               <p className="text-xs text-slate-500 truncate">System Admin</p>
             </div>
           </div>
           <Button variant="danger" size="sm" onClick={onLogout} className="w-full">Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
         {/* Mobile Header */}
         <header className="h-16 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between px-4 lg:hidden shrink-0">
             <div className="flex items-center gap-2">
                <Activity className="text-teal-500 h-5 w-5" />
                <span className="font-bold">Admin Portal</span>
             </div>
             <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-300 hover:text-white">
               <Menu size={24} />
             </button>
         </header>

         <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6 md:mb-8">{getTabTitle()}</h1>
         
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h3 className="text-slate-500 text-sm font-medium mb-2">Total Users</h3>
                      <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{allUsers.length > 0 ? allUsers.length.toLocaleString() : '0'}</span>
                          <span className="text-green-500 text-sm font-medium">Registered</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h3 className="text-slate-500 text-sm font-medium mb-2">Active Sessions</h3>
                      <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{activeSessions}</span>
                          <span className="text-green-500 text-sm font-medium">+5%</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h3 className="text-slate-500 text-sm font-medium mb-2">Symptom Checks (Today)</h3>
                      <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{logs.filter(l => l.type === 'symptom_analysis').length}</span>
                          <span className="text-blue-500 text-sm font-medium">Live</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h3 className="text-slate-500 text-sm font-medium mb-2">Pending Appointments</h3>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-3xl font-bold">{appointments.length}</span>
                          <span className="text-amber-500 text-sm font-medium">Need Review</span>
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                    {/* Live Activity Feed */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-[500px]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Activity className="text-teal-500" size={20} /> System Activity Log
                            </h3>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full animate-pulse">Live</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm min-w-[600px]">
                                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 sticky top-0">
                                      <tr>
                                          <th className="px-6 py-3 font-medium">Timestamp</th>
                                          <th className="px-6 py-3 font-medium">Type</th>
                                          <th className="px-6 py-3 font-medium">User</th>
                                          <th className="px-6 py-3 font-medium">Details</th>
                                          <th className="px-6 py-3 font-medium">Severity</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {logs.length === 0 ? (
                                          <tr>
                                              <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No activity logs found.</td>
                                          </tr>
                                      ) : (
                                          logs.map(log => (
                                              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                                                      {new Date(log.timestamp).toLocaleTimeString()}
                                                  </td>
                                                  <td className="px-6 py-3">
                                                      <div className="flex items-center gap-2 capitalize">
                                                          {getLogIcon(log.type)}
                                                          {log.type.replace('_', ' ')}
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-3 font-medium">{log.userName}</td>
                                                  <td className="px-6 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.details}>
                                                      {log.details}
                                                  </td>
                                                  <td className="px-6 py-3">
                                                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getSeverityColor(log.severity || 'low')}`}>
                                                          {log.severity || 'low'}
                                                      </span>
                                                  </td>
                                              </tr>
                                          ))
                                      )}
                                  </tbody>
                              </table>
                            </div>
                        </div>
                    </div>

                    {/* Recent Appointments */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-[500px]">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                          <Clock className="text-slate-500" size={20} /> Latest Bookings
                        </h3>
                        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                          {appointments.length === 0 ? (
                              <p className="text-sm text-slate-500 italic">No appointments scheduled.</p>
                          ) : (
                              appointments.slice().reverse().map(apt => (
                                <div key={apt.id} className="flex flex-col gap-2 p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                            <User size={14} />
                                          </div>
                                          <div>
                                              <span className="text-sm font-bold block">{apt.specialty}</span>
                                              <span className="text-xs text-slate-500">{apt.doctorName}</span>
                                          </div>
                                      </div>
                                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{apt.time}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                                        Reason: {apt.reason}
                                    </div>
                                </div>
                              ))
                          )}
                        </div>
                        <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700">
                            <Button size="sm" variant="secondary" className="w-full">View All Bookings</Button>
                        </div>
                    </div>
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-2 justify-between items-center">
                      <h3 className="font-bold text-slate-700 dark:text-slate-200">Registered Users Directory</h3>
                      <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded-full font-bold">Total: {allUsers.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-slate-500">
                            <tr>
                                <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">User</th>
                                <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Email</th>
                                <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Role</th>
                                <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {allUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={32} className="opacity-20" />
                                            <p>No users found in the system record.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                allUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                <span className="font-medium text-slate-900 dark:text-white">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                u.role === 'admin' 
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                                                : u.role === 'clinician'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                Active
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
            )}

            {activeTab === 'inquiries' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Date</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Name</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Email</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Message</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {contactSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <MessageSquare size={32} className="opacity-20" />
                                            <p>No inquiries received yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                contactSubmissions.slice().reverse().map((sub) => (
                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {new Date(sub.timestamp).toLocaleDateString()} <span className="text-xs opacity-70">{new Date(sub.timestamp).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {sub.firstName} {sub.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-teal-600 dark:text-teal-400">
                                            <a href={`mailto:${sub.email}`} className="hover:underline">{sub.email}</a>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-md truncate" title={sub.message}>
                                            {sub.message}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold uppercase">
                                                {sub.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* System Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">System Status</p>
                              <div className="flex items-center gap-2">
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                  </span>
                                  <span className="text-lg font-bold text-slate-900 dark:text-white">Operational</span>
                              </div>
                          </div>
                          <Server size={32} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Database</p>
                              <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-slate-900 dark:text-white">Connected</span>
                              </div>
                          </div>
                          <Database size={32} className="text-indigo-300 dark:text-indigo-900/50" />
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Version</p>
                              <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-slate-900 dark:text-white">v2.4.0</span>
                              </div>
                          </div>
                          <Activity size={32} className="text-teal-300 dark:text-teal-900/50" />
                      </div>
                  </div>

                  {/* Configuration Sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                      {/* General Settings */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                              <Settings size={18} className="text-slate-500" />
                              <h3 className="font-bold text-slate-700 dark:text-slate-200">General Configuration</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <p className="font-medium text-slate-900 dark:text-white">Maintenance Mode</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Temporarily disable access for non-admins</p>
                                  </div>
                                  <button 
                                      onClick={() => toggleSetting('maintenanceMode')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${systemSettings.maintenanceMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                  >
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${systemSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                  <div>
                                      <p className="font-medium text-slate-900 dark:text-white">New User Registration</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Allow new patients to sign up</p>
                                  </div>
                                  <button 
                                      onClick={() => toggleSetting('registrationEnabled')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${systemSettings.registrationEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                  >
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${systemSettings.registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                              </div>

                              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                                  <div className="relative">
                                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                      <input 
                                          type="email" 
                                          value={systemSettings.systemEmail}
                                          onChange={(e) => setSystemSettings({...systemSettings, systemEmail: e.target.value})}
                                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Security Settings */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                              <Shield size={18} className="text-slate-500" />
                              <h3 className="font-bold text-slate-700 dark:text-slate-200">Security & Access</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <p className="font-medium text-slate-900 dark:text-white">Enforce MFA</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Require 2FA for all admin accounts</p>
                                  </div>
                                  <button 
                                      onClick={() => toggleSetting('mfaEnforcement')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${systemSettings.mfaEnforcement ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                  >
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${systemSettings.mfaEnforcement ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                              </div>

                              <div>
                                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Session Timeout (Minutes)</label>
                                  <div className="relative">
                                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                      <select 
                                          value={systemSettings.sessionTimeout}
                                          onChange={(e) => setSystemSettings({...systemSettings, sessionTimeout: e.target.value})}
                                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                                      >
                                          <option value="15">15 Minutes</option>
                                          <option value="30">30 Minutes</option>
                                          <option value="60">1 Hour</option>
                                          <option value="120">2 Hours</option>
                                      </select>
                                  </div>
                              </div>

                              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                  <Button variant="secondary" className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20">
                                      <Lock size={16} className="mr-2" /> Reset All Admin Passwords
                                  </Button>
                              </div>
                          </div>
                      </div>

                      {/* Data Management */}
                      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                              <Database size={18} className="text-slate-500" />
                              <h3 className="font-bold text-slate-700 dark:text-slate-200">Data Management</h3>
                          </div>
                          <div className="p-6 flex flex-col sm:flex-row gap-4 items-center justify-between text-center sm:text-left">
                              <div>
                                  <h4 className="font-medium text-slate-900 dark:text-white">System Logs</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">Export activity logs for auditing or clear old records.</p>
                              </div>
                              <div className="flex gap-3 w-full sm:w-auto justify-center">
                                  <Button variant="secondary" className="flex items-center gap-2">
                                      <Download size={16} /> Export CSV
                                  </Button>
                                  <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-2">
                                      <Trash2 size={16} /> Purge Old Logs
                                  </Button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Sticky Save Bar */}
                  <div className="sticky bottom-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row justify-between items-center max-w-2xl mx-auto border border-slate-800 gap-3">
                      <span className="text-sm font-medium pl-2">You have unsaved changes</span>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Discard</Button>
                          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 border-none text-white" onClick={handleSaveSettings} isLoading={isSaving}>
                              <Save size={16} className="mr-2" /> Save Changes
                          </Button>
                      </div>
                  </div>
              </div>
            )}
         </div>
      </main>
    </div>
  );
};