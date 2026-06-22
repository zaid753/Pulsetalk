import React, { useState, useEffect, useRef } from 'react';
import { AuthUser, Appointment, SystemLog, Message, Sender, UserProfile } from '../types';
import { Button } from './Button';
import { 
  Users, Calendar, Activity, TrendingUp, Settings, 
  FileText, Bell, Search, AlertCircle, CheckCircle, Clock, Sun, Moon, Mic2, User, MessageSquare,
  Shield, Database, Server, Save, Mail, Lock, Download, Trash2, Globe, Menu, X, Plus, AlertTriangle,
  Heart, Thermometer, Footprints, Pill, Stethoscope, Check, ShieldAlert, BarChart3, CheckSquare, Sparkles, TrendingDown, Minus
} from 'lucide-react';
import { STORAGE_KEYS } from '../constants';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
  RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface ClinicianDashboardProps {
  user: AuthUser;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({ user, onLogout, theme, setTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'schedule' | 'reports' | 'prescriptions' | 'analytics'>('patients');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time patient telemetry
  const [liveVitals, setLiveVitals] = useState<any | null>(null);

  // Clinician Action Forms
  const [prescriptionForm, setPrescriptionForm] = useState({ medicationName: '', dosage: '', frequency: '' });
  const [prescriptionStatus, setPrescriptionStatus] = useState<string | null>(null);

  const [recommendationText, setRecommendationText] = useState('');
  const [recommendationStatus, setRecommendationStatus] = useState<string | null>(null);

  const mockPatients = [
    { id: '1', name: 'Alice Smith', symptom: 'Severe Migraine', urgency: 'High', time: '10:30 AM', details: 'Patient reports severe throbbing migraine behind the left eye. Accompanied by light sensitivity and nausea. Started 4 hours ago.' },
    { id: '2', name: 'Robert Johnson', symptom: 'Skin Rash', urgency: 'Low', time: '11:15 AM', details: 'Slightly raised, itchy red rash on the right forearm. Appears dry. User reports no new foods or soaps.' },
    { id: '3', name: 'Emily Davis', symptom: 'Fever & Cough', urgency: 'Medium', time: '02:00 PM', details: 'Fever of 100.8 F accompanied by dry hacking cough. Muscle aches and mild fatigue.' },
  ];

  // Helper to add system logs
  const addSystemLog = (
    type: 'symptom_analysis' | 'live_consultation' | 'appointment' | 'system',
    details: string,
    severity: 'low' | 'medium' | 'high' = 'low'
  ) => {
    try {
      const existingLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
      const newLog: SystemLog = {
        id: Date.now().toString(),
        type,
        userName: user.name,
        timestamp: new Date().toISOString(),
        details,
        severity
      };
      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
    } catch (e) {
      console.error("Failed to save log", e);
    }
  };

  const fetchData = () => {
    const storedAppts = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPOINTMENTS) || '[]');
    const storedLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    const storedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
    
    setAppointments(storedAppts);
    setLogs(storedLogs);

    // Build dynamic Patient queue from both symptom analysis logs, live logs, and all users
    const patientMap = new Map();
    
    // Process symptom checker and voice logs
    storedLogs.filter((l: SystemLog) => l.type === 'symptom_analysis' || l.type === 'live_consultation').forEach((l: SystemLog) => {
      const urgency = l.severity === 'high' ? 'High' : l.severity === 'medium' ? 'Medium' : 'Low';
      const key = `${l.userName}-${l.type}`;
      
      let displaySymptom = 'Consultation Session';
      if (l.type === 'live_consultation') {
        displaySymptom = 'Live Voice Triage Consultation';
      } else {
        const descMatch = l.details.match(/symptoms: "(.*?)"/i);
        if (descMatch && descMatch[1]) {
          displaySymptom = descMatch[1];
        } else {
          displaySymptom = l.details.length > 50 ? l.details.substring(0, 50) + '...' : l.details;
        }
      }

      if (!patientMap.has(key)) {
        patientMap.set(key, {
          id: l.id,
          name: l.userName,
          symptom: displaySymptom,
          urgency: urgency,
          time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(l.timestamp).toLocaleDateString(),
          details: l.details,
          type: l.type
        });
      }
    });

    // Make sure registered users with patient role are also displayed
    storedUsers.filter((u: any) => u.role === 'patient').forEach((u: any) => {
      const key = `${u.name}-general`;
      if (!patientMap.has(u.name) && !patientMap.has(key)) {
        patientMap.set(key, {
          id: u.id,
          name: u.name,
          symptom: 'No active symptom checker log',
          urgency: 'Low',
          time: 'N/A',
          date: 'N/A',
          details: 'Patient registered in system. No active diagnostic logs.',
          type: 'general'
        });
      }
    });

    const combined = Array.from(patientMap.values());
    setPatients(combined.length > 0 ? combined : mockPatients);

    // Fetch live streaming vitals
    const liveVitalsSaved = localStorage.getItem('pulsetalk_live_patient_vitals');
    if (liveVitalsSaved) {
      try {
        const parsed = JSON.parse(liveVitalsSaved);
        const age = Date.now() - new Date(parsed.timestamp).getTime();
        // Vital stream is fresh if updated in the last 12 seconds
        if (age < 12000) {
          setLiveVitals(parsed);
        } else {
          setLiveVitals(null);
        }
      } catch (e) {
        setLiveVitals(null);
      }
    } else {
      setLiveVitals(null);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // 2s poll for real-time synchronization
    return () => clearInterval(interval);
  }, []);

  const handleConfirmAppointment = (aptId: string) => {
    const storedAppts = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPOINTMENTS) || '[]');
    const updated = storedAppts.map((apt: Appointment) => {
      if (apt.id === aptId) {
        addSystemLog('appointment', `Clinician confirmed appointment for ${apt.patientName || 'Patient'} on ${apt.date} at ${apt.time}.`, 'low');
        return { ...apt, status: 'confirmed' };
      }
      return apt;
    });
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    fetchData();
  };

  const handleCancelAppointment = (aptId: string) => {
    const storedAppts = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPOINTMENTS) || '[]');
    const updated = storedAppts.map((apt: Appointment) => {
      if (apt.id === aptId) {
        addSystemLog('appointment', `Clinician rejected/cancelled appointment for ${apt.patientName || 'Patient'} on ${apt.date} at ${apt.time}.`, 'medium');
        return { ...apt, status: 'cancelled' };
      }
      return apt;
    });
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    fetchData();
  };

  // Helper to dynamically resolve patient profile from LocalStorage or mock data
  const getPatientProfile = (patientName: string): UserProfile => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.name && parsed.name.toLowerCase() === patientName.toLowerCase()) {
          return parsed;
        }
      } catch (e) {}
    }
    // Return detailed clinician-facing mock profile
    return {
      name: patientName,
      age: 29,
      gender: 'Female',
      bloodType: 'A+',
      height: "5'6\"",
      weight: '142 lbs',
      allergies: ['Sulfonamides', 'Shellfish'],
      currentMedications: ['Albuterol Inhaler as needed'],
      chronicConditions: ['Mild Asthma', 'Allergic Rhinitis'],
      emergencyContact: { name: 'Sarah Smith', phone: '555-0188', relation: 'Sister' },
      insuranceProvider: 'Aetna Health',
      insurancePolicyNumber: 'AET-774920'
    };
  };

  // Write Prescription pad back to Patient profile
  const handlePrescribe = (e: React.FormEvent, patientName: string) => {
    e.preventDefault();
    if (!prescriptionForm.medicationName) return;

    const medString = `${prescriptionForm.medicationName} (${prescriptionForm.dosage || 'N/A'}, ${prescriptionForm.frequency || 'N/A'})`;
    
    // Check if it's the main patient in localStorage
    const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        if (profile.name && profile.name.toLowerCase() === patientName.toLowerCase()) {
          const medications = profile.currentMedications || [];
          if (!medications.includes(medString)) {
            profile.currentMedications = [...medications, medString];
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
          }
        }
      } catch (err) {}
    }

    addSystemLog('system', `Clinician Dr. ${user.name} prescribed ${medString} to patient ${patientName}.`, 'medium');
    setPrescriptionStatus('Prescription successfully saved and synced to patient profile!');
    setPrescriptionForm({ medicationName: '', dosage: '', frequency: '' });
    
    setTimeout(() => setPrescriptionStatus(null), 4000);
    fetchData();
  };

  // Send Direct Recommendation into patient's active chat session in real-time
  const handleSendRecommendation = (e: React.FormEvent, patientName: string) => {
    e.preventDefault();
    if (!recommendationText.trim()) return;

    const savedConvs = localStorage.getItem('pulsetalk_conversations');
    if (savedConvs) {
      try {
        const conversations = JSON.parse(savedConvs);
        // Find the active conversation or default one
        const activeSession = conversations.find((c: any) => c.id === 'default' || c.id === 'legacy-default') || conversations[0];
        
        if (activeSession) {
          const newMsg: Message = {
            id: 'clinician-rec-' + Date.now(),
            text: recommendationText,
            sender: Sender.CLINICIAN,
            timestamp: new Date()
          };
          activeSession.messages.push(newMsg);
          activeSession.timestamp = new Date();
          localStorage.setItem('pulsetalk_conversations', JSON.stringify(conversations));

          addSystemLog('system', `Dr. ${user.name} posted clinical response to patient chat: "${recommendationText.substring(0, 40)}...".`, 'low');
          setRecommendationStatus('Message synced and posted to patient consultation chat!');
          setRecommendationText('');
          setTimeout(() => setRecommendationStatus(null), 4000);
        }
      } catch (err) {
        console.error("Failed to append clinician recommendation", err);
      }
    }
  };

  const TrendIndicator = ({ value, label }: { value: string, label?: string }) => {
    const isPositive = value.startsWith('+');
    const isNeutral = value === '0';
    return (
        <div className={`flex items-center gap-1 text-xs font-bold ${isNeutral ? 'text-slate-400' : isPositive ? 'text-green-500' : 'text-amber-500'}`}>
            {isPositive ? <TrendingUp size={14} /> : isNeutral ? <Minus size={14} /> : <TrendingDown size={14} />}
            <span>{value}</span>
            {label && <span className="text-slate-400 font-normal ml-1">{label}</span>}
        </div>
    );
  };

  // Resolve analytics metrics
  const getAnalyticsData = () => {
    const highUrgency = patients.filter(p => p.urgency === 'High').length;
    const medUrgency = patients.filter(p => p.urgency === 'Medium').length;
    const lowUrgency = patients.filter(p => p.urgency === 'Low').length;

    const urgencyData = [
      { name: 'High', value: highUrgency || 1, fill: '#ef4444' },
      { name: 'Medium', value: medUrgency || 2, fill: '#f59e0b' },
      { name: 'Low', value: lowUrgency || 3, fill: '#10b981' }
    ];

    const specialtyData = [
      { name: 'GP/Triage', appointments: appointments.filter(a => a.specialty?.toLowerCase().includes('general') || a.specialty?.toLowerCase().includes('triage')).length || 2 },
      { name: 'Dermatology', appointments: appointments.filter(a => a.specialty?.toLowerCase().includes('derm')).length || 1 },
      { name: 'Cardiology', appointments: appointments.filter(a => a.specialty?.toLowerCase().includes('cardio')).length || 1 },
      { name: 'Pediatrics', appointments: appointments.filter(a => a.specialty?.toLowerCase().includes('pediatric')).length || 0 },
    ];

    return { urgencyData, specialtyData };
  };

  const { urgencyData, specialtyData } = getAnalyticsData();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300 relative overflow-hidden font-sans">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/60 flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center">
            <div className="bg-indigo-600 p-1.5 rounded-lg mr-2 shadow-md shadow-indigo-500/20">
              <Activity className="text-white h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">PulseTalk <span className="text-indigo-500 text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 ml-1">CLINIC</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('patients'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'patients' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users size={18} /> Patients Queue
          </button>
          <button 
            onClick={() => { setActiveTab('schedule'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'schedule' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Calendar size={18} /> Booking Schedule
          </button>
          <button 
            onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileText size={18} /> Symptom Reports
          </button>
          <button 
            onClick={() => { setActiveTab('prescriptions'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'prescriptions' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Pill size={18} /> Prescriptions pad
          </button>
          <button 
            onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 size={18} /> Clinical Analytics
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/50 dark:border-slate-800/40"
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'light' ? 'Light Theme' : 'Dark Theme'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-indigo-650' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <div className="flex items-center gap-3">
            <img src={user.avatar || "https://ui-avatars.com/api/?name=Doctor"} alt="Profile" className="w-9 h-9 rounded-full bg-slate-200 border border-slate-200 dark:border-slate-750" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clinical Lead</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onLogout} className="w-full justify-center">Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800/80 flex items-center justify-between px-4 lg:hidden shrink-0">
           <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Activity className="text-white h-4 w-4" />
              </div>
              <span className="font-bold text-lg">PulseTalk Clinician</span>
           </div>
           <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-400">
             <Menu size={24} />
           </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {activeTab === 'patients' ? 'Patients Queue' :
                 activeTab === 'schedule' ? 'Booking Schedule' :
                 activeTab === 'reports' ? 'Symptom Triage Reports' :
                 activeTab === 'prescriptions' ? 'Prescription Pad' :
                 'Clinical Analytics'}
              </h1>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Real-time clinical management suite • {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search query..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                  />
               </div>
               <button onClick={fetchData} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center shadow-md shadow-indigo-500/10 whitespace-nowrap transition-colors">
                  <Clock className="mr-2 h-4 w-4" /> Sync Now
               </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
             <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Queue</p>
                   <h3 className="text-3xl font-extrabold mt-1.5">{patients.length}</h3>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl"><Users size={20}/></div>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Appointments</p>
                   <h3 className="text-3xl font-extrabold mt-1.5">{appointments.length}</h3>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl"><Calendar size={20}/></div>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Telemetry Stream</p>
                   <div className="flex items-center gap-2 mt-1.5">
                     <h3 className="text-3xl font-extrabold">{liveVitals ? '1 Active' : '0 Offline'}</h3>
                     {liveVitals && <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" />}
                   </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl"><Activity size={20}/></div>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reports Logged</p>
                   <h3 className="text-3xl font-extrabold mt-1.5">{logs.filter(l => l.type === 'symptom_analysis' || l.type === 'live_consultation').length}</h3>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl"><FileText size={20}/></div>
             </div>
          </div>

          {/* VIEW: Patients Queue */}
          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Queue List */}
              <div className="xl:col-span-2 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
                   <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500">Live Active Patients</h3>
                      <span className="text-xs font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">{patients.length} Cases</span>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                           <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-155 dark:border-slate-800 text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Patient</th>
                              <th className="px-6 py-4">Recent Complaint</th>
                              <th className="px-6 py-4">Urgency</th>
                              <th className="px-6 py-4 text-right">Preview</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {patients
                             .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.symptom.toLowerCase().includes(searchQuery.toLowerCase()))
                             .map(p => {
                               const isOnline = liveVitals && liveVitals.patientName.toLowerCase() === p.name.toLowerCase();
                               return (
                                 <tr key={p.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-850/40 transition-colors ${selectedPatient?.name === p.name ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {isOnline ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100/50 dark:border-emerald-900/20 animate-pulse">
                                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> Live Sync
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                                          Offline
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center text-xs font-black">
                                             {p.name.charAt(0)}
                                          </div>
                                          <span className="font-semibold text-sm">{p.name}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={p.symptom}>{p.symptom}</td>
                                    <td className="px-6 py-4">
                                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          p.urgency === 'High' ? 'bg-red-50 text-red-650 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30' :
                                          p.urgency === 'Medium' ? 'bg-amber-50 text-amber-650 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' :
                                          'bg-green-50 text-green-650 border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30'
                                       }`}>
                                          {p.urgency}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <Button size="xs" variant="secondary" className="text-[10px]" onClick={() => setSelectedPatient(p)}>Select</Button>
                                    </td>
                                 </tr>
                               );
                             })}
                        </tbody>
                     </table>
                   </div>
                </div>
              </div>

              {/* Detail Preview Panel */}
              <div className="xl:col-span-1">
                {selectedPatient ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-md p-6 space-y-6 animate-in slide-in-from-right-4 duration-350">
                     <div className="flex justify-between items-start">
                        <div>
                           <h3 className="text-xl font-bold tracking-tight">{selectedPatient.name}</h3>
                           <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Urgency: <span className="font-semibold text-indigo-500">{selectedPatient.urgency}</span></p>
                        </div>
                        <span className={`p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 rounded-xl`}><User size={18}/></span>
                     </div>

                     {/* Profile Summary */}
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">Patient Vitals Profile</h4>
                        {(() => {
                          const prof = getPatientProfile(selectedPatient.name);
                          return (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div><span className="text-slate-400">Age/Gender:</span> <p className="font-semibold">{prof.age} • {prof.gender || 'N/A'}</p></div>
                              <div><span className="text-slate-400">Blood Type:</span> <p className="font-semibold">{prof.bloodType || 'N/A'}</p></div>
                              <div><span className="text-slate-400">Height/Weight:</span> <p className="font-semibold">{prof.height || 'N/A'} / {prof.weight || 'N/A'}</p></div>
                              <div><span className="text-slate-400">Emergency Contact:</span> <p className="font-semibold">{prof.emergencyContact?.name || 'N/A'} ({prof.emergencyContact?.phone || 'N/A'})</p></div>
                              <div className="col-span-2"><span className="text-slate-400">Allergies:</span> <p className="font-bold text-red-500 dark:text-red-400">{prof.allergies.length > 0 ? prof.allergies.join(', ') : 'None Reported'}</p></div>
                              <div className="col-span-2"><span className="text-slate-400">Chronic Conditions:</span> <p className="font-semibold">{prof.chronicConditions?.join(', ') || 'None'}</p></div>
                              <div className="col-span-2"><span className="text-slate-400">Insurance Provider:</span> <p className="font-semibold">{prof.insuranceProvider || 'N/A'} • {prof.insurancePolicyNumber || 'N/A'}</p></div>
                            </div>
                          );
                        })()}
                     </div>

                     {/* Live Telemetry Display */}
                     <div className="space-y-3">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                         <span>Live Vitals Monitor</span>
                         {liveVitals && liveVitals.patientName.toLowerCase() === selectedPatient.name.toLowerCase() ? (
                           <span className="flex h-2 w-2 relative">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                           </span>
                         ) : (
                           <span className="text-[10px] text-slate-400 font-normal">Offline</span>
                         )}
                       </h4>
                       
                       {liveVitals && liveVitals.patientName.toLowerCase() === selectedPatient.name.toLowerCase() ? (
                         <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-3">
                             <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100/50 dark:border-rose-900/30">
                               <div className="flex items-center gap-1.5 text-xs text-rose-500 mb-1"><Heart size={14} className="fill-rose-500/10"/> Heart Rate</div>
                               <div className="text-lg font-bold tracking-tight">{liveVitals.vitals.heartRate.value} <span className="text-[10px] text-slate-400 font-normal">bpm</span></div>
                             </div>
                             <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                               <div className="flex items-center gap-1.5 text-xs text-blue-500 mb-1"><Activity size={14}/> BP</div>
                               <div className="text-lg font-bold tracking-tight">{liveVitals.vitals.bloodPressure.sys}/{liveVitals.vitals.bloodPressure.dia} <span className="text-[10px] text-slate-400 font-normal">mmHg</span></div>
                             </div>
                             <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/30">
                               <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1"><Footprints size={14}/> Steps</div>
                               <div className="text-lg font-bold tracking-tight">{liveVitals.vitals.steps.value.toLocaleString()}</div>
                             </div>
                             <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                               <div className="flex items-center gap-1.5 text-xs text-emerald-500 mb-1"><Thermometer size={14}/> Temp</div>
                               <div className="text-lg font-bold tracking-tight">{liveVitals.vitals.temperature.value} <span className="text-[10px] text-slate-400 font-normal">°F</span></div>
                             </div>
                           </div>

                           {/* Mini Heart Rate Chart */}
                           <div className="h-20 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                             <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={liveVitals.vitals.heartRate.history}>
                                 <Area type="monotone" dataKey="value" stroke="#f43f5e" fill="#ffe4e6" strokeWidth={1.5} dot={false} />
                               </AreaChart>
                             </ResponsiveContainer>
                           </div>
                         </div>
                       ) : (
                         <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                           No real-time telemetry streaming from this patient. Once the patient opens their health dashboard, their live feed will connect here.
                         </div>
                       )}
                     </div>

                     {/* Sync Recommendation Pad */}
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">Direct Chat Recommendation</h4>
                        <form onSubmit={(e) => handleSendRecommendation(e, selectedPatient.name)} className="space-y-2">
                           <textarea 
                             rows={2} 
                             value={recommendationText}
                             onChange={(e) => setRecommendationText(e.target.value)}
                             placeholder="Write recommendations/advice to post into patient's chat..." 
                             className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                           />
                           {recommendationStatus && <p className="text-[10px] font-semibold text-emerald-500">{recommendationStatus}</p>}
                           <Button size="xs" type="submit" className="w-full justify-center">Post to Consultation Chat</Button>
                        </form>
                     </div>

                     {/* AI Triage Details log */}
                     <div className="space-y-2 text-xs">
                        <h4 className="font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                           <ShieldAlert size={14} className="text-rose-500" /> Triage Report Analysis
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-150 dark:border-slate-800/80 font-mono text-[10.5px] leading-relaxed max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                           {selectedPatient.details}
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[350px]">
                     <Stethoscope size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
                     <p className="font-semibold text-sm">No Patient Selected</p>
                     <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] mx-auto">Select a patient from the queue to view their profile, live vitals, and issue recommendations.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: Booking Schedule */}
          {activeTab === 'schedule' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-sm animate-in fade-in duration-300">
               <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500">Patient Appointments</h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">{appointments.length} Bookings</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                       <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-155 dark:border-slate-800 text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Patient Name</th>
                          <th className="px-6 py-4">Specialty / Doctor</th>
                          <th className="px-6 py-4">Reason for Visit</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {appointments.length === 0 ? (
                         <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-semibold text-sm">No scheduled appointments found in the system.</td>
                         </tr>
                       ) : (
                         appointments
                           .filter(a => (a.patientName || 'Anonymous').toLowerCase().includes(searchQuery.toLowerCase()) || a.reason.toLowerCase().includes(searchQuery.toLowerCase()))
                           .map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/30 transition-colors">
                               <td className="px-6 py-4 text-sm whitespace-nowrap font-medium">
                                 <div className="font-bold">{a.date}</div>
                                 <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{a.time}</div>
                               </td>
                               <td className="px-6 py-4 text-sm font-semibold">
                                 {a.patientName || 'Anonymous Patient'}
                               </td>
                               <td className="px-6 py-4 text-sm">
                                 <div className="font-semibold">{a.specialty}</div>
                                 <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{a.doctorName}</div>
                               </td>
                               <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={a.reason}>
                                 {a.reason}
                               </td>
                               <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                     a.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30' :
                                     a.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' :
                                     'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800'
                                  }`}>
                                     {a.status}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                 {a.status === 'pending' ? (
                                   <div className="flex gap-2 justify-end">
                                     <button 
                                       onClick={() => handleConfirmAppointment(a.id)}
                                       className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm"
                                     >
                                       Confirm
                                     </button>
                                     <button 
                                       onClick={() => handleCancelAppointment(a.id)}
                                       className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm"
                                     >
                                       Reject
                                     </button>
                                   </div>
                                 ) : (
                                   <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">No Action Needed</span>
                                 )}
                               </td>
                            </tr>
                         ))
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* VIEW: Reports */}
          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-sm animate-in fade-in duration-300">
               <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500">Symptom Checker Archives</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">{logs.filter(l => l.type === 'symptom_analysis' || l.type === 'live_consultation').length} Total</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                       <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-155 dark:border-slate-800 text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Patient</th>
                          <th className="px-6 py-4">Report Type</th>
                          <th className="px-6 py-4">AI Urgency</th>
                          <th className="px-6 py-4 text-right">Details</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {logs.filter(l => l.type === 'symptom_analysis' || l.type === 'live_consultation').length === 0 ? (
                         <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-semibold text-sm">No diagnostic reports logged.</td>
                         </tr>
                       ) : (
                         logs
                           .filter(l => l.type === 'symptom_analysis' || l.type === 'live_consultation')
                           .filter(l => l.userName.toLowerCase().includes(searchQuery.toLowerCase()) || l.details.toLowerCase().includes(searchQuery.toLowerCase()))
                           .map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/30 transition-colors">
                               <td className="px-6 py-4 text-xs text-slate-450 font-medium whitespace-nowrap">
                                 {new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </td>
                               <td className="px-6 py-4 text-sm font-semibold">{l.userName}</td>
                               <td className="px-6 py-4 text-xs capitalize">{l.type.replace('_', ' ')}</td>
                               <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                     l.severity === 'high' ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-400' :
                                     l.severity === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400' :
                                     'bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/30 dark:text-green-400'
                                  }`}>
                                     {l.severity || 'low'}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <Button size="xs" variant="secondary" className="text-[10px]" onClick={() => setSelectedPatient({
                                    name: l.userName,
                                    time: new Date(l.timestamp).toLocaleTimeString(),
                                    date: new Date(l.timestamp).toLocaleDateString(),
                                    urgency: l.severity === 'high' ? 'High' : l.severity === 'medium' ? 'Medium' : 'Low',
                                    details: l.details,
                                    type: l.type
                                  })}>View Preview</Button>
                               </td>
                            </tr>
                         ))
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* VIEW: Prescription Pad */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm p-6 max-w-2xl mx-auto animate-in fade-in duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl text-indigo-650 dark:text-indigo-400"><Pill size={24} /></div>
                <div>
                   <h3 className="text-xl font-bold tracking-tight">Prescription Writer Pad</h3>
                   <p className="text-xs text-slate-400 dark:text-slate-500">Authorize medication prescription synced directly with patient profiles.</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Active Patient</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => {
                      const pt = patients.find(p => p.name === e.target.value);
                      if (pt) setSelectedPatient(pt);
                    }}
                    value={selectedPatient?.name || ''}
                  >
                    <option value="" disabled>-- Choose a patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {selectedPatient ? (
                  <form onSubmit={(e) => handlePrescribe(e, selectedPatient.name)} className="space-y-4">
                     <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-xl space-y-2 text-xs">
                        <div className="font-bold text-slate-650 dark:text-indigo-400 uppercase tracking-wider text-[10px]">Patient Diagnostics Summary</div>
                        <p><span className="text-slate-400">Name:</span> <strong>{selectedPatient.name}</strong></p>
                        <p><span className="text-slate-400">Allergies:</span> <strong className="text-red-500">{getPatientProfile(selectedPatient.name).allergies.join(', ') || 'None'}</strong></p>
                        <p><span className="text-slate-400">Medications:</span> <strong>{getPatientProfile(selectedPatient.name).currentMedications.join(', ') || 'None'}</strong></p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Medication Name</label>
                         <input 
                           type="text" 
                           placeholder="e.g. Amoxicillin, Cetirizine"
                           required
                           value={prescriptionForm.medicationName}
                           onChange={(e) => setPrescriptionForm(prev => ({ ...prev, medicationName: e.target.value }))}
                           className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                         />
                       </div>
                       <div>
                         <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dosage</label>
                         <input 
                           type="text" 
                           placeholder="e.g. 500mg, 10mg"
                           value={prescriptionForm.dosage}
                           onChange={(e) => setPrescriptionForm(prev => ({ ...prev, dosage: e.target.value }))}
                           className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                         />
                       </div>
                     </div>

                     <div>
                       <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Frequency & Instructions</label>
                       <input 
                         type="text" 
                         placeholder="e.g. Once daily after meals, Twice a day for 7 days"
                         value={prescriptionForm.frequency}
                         onChange={(e) => setPrescriptionForm(prev => ({ ...prev, frequency: e.target.value }))}
                         className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                       />
                     </div>

                     {prescriptionStatus && (
                       <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 border border-emerald-100 rounded-xl text-xs font-semibold">
                         {prescriptionStatus}
                       </div>
                     )}

                     <Button type="submit" className="w-full justify-center py-3">Prescribe & Authorize Sync</Button>
                  </form>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Please select a patient from the dropdown list above to authorize a new prescription.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Urgency Distribution */}
                 <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
                    <div>
                       <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 mb-4">Patient Urgency breakdown</h3>
                    </div>
                    <div className="h-60 w-full flex items-center justify-center">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={urgencyData}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                            <Tooltip cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={35}>
                               {urgencyData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                               ))}
                            </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Specialty Bookings */}
                 <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
                    <div>
                       <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 mb-4">Appointments by Specialty</h3>
                    </div>
                    <div className="h-60 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={specialtyData}>
                            <defs>
                              <linearGradient id="colorSpec" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.06} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="appointments" stroke="#6366f1" fillOpacity={1} fill="url(#colorSpec)" strokeWidth={2.5} />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
