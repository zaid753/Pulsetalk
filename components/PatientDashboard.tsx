import React, { useState, useEffect, useRef } from 'react';
import { Sender, Message, Appointment, BookAppointmentArgs, UserProfile, AuthUser, SystemLog, ChatSession } from '../types';
import { sendMessageToGemini, startChatSession, generateSymptomAnalysis } from '../services/geminiService';
import { fetchNearbyFacilities, getLocationName, type NearbyClinic, type NearbyPharmacy } from '../services/locationService';
import { ChatInterface } from './ChatInterface';
import { AppointmentCard } from './AppointmentCard';
import { Button } from './Button';
import { LiveAssistantModal } from './LiveAssistantModal';
import { 
  Activity, Calendar, MessageSquare, Menu, X, Plus, Save, Stethoscope, 
  UserCircle, Sun, Moon, Check, ShieldCheck, Mic2, LogOut, Pill, 
  AlertTriangle, Sparkles, Heart, Thermometer, Footprints, Upload, 
  Camera, FileText, ChevronRight, TrendingUp, TrendingDown, Minus, Edit, Languages,
  Droplet, Ruler, Scale, Phone, CreditCard, User, Users, FileBadge,
  Zap, Clock, MapPin, Bell, BellOff, Navigation, RefreshCw, Star, Building2, Loader2
} from 'lucide-react';
import { STORAGE_KEYS, RECEIVE_SOUND_DATA } from '../constants';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
  RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar
} from 'recharts';

interface PatientDashboardProps {
  user: AuthUser;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

// Static Mock Data for Health Dashboard
const STATIC_METRICS = {
  wellnessScore: 88,
  heartRate: { 
    value: 72, 
    unit: 'bpm', 
    status: 'Normal', 
    trend: '+2',
    history: [
      { day: 'Mon', value: 68 }, { day: 'Tue', value: 70 }, { day: 'Wed', value: 72 }, 
      { day: 'Thu', value: 75 }, { day: 'Fri', value: 71 }, { day: 'Sat', value: 69 }, { day: 'Sun', value: 72 }
    ]
  },
  bloodPressure: { 
    sys: 118,
    dia: 78,
    unit: 'mmHg', 
    status: 'Optimal',
    trend: '-1',
    history: [
      { day: 'Mon', sys: 121, dia: 80 }, { day: 'Tue', sys: 119, dia: 79 }, { day: 'Wed', sys: 122, dia: 82 },
      { day: 'Thu', sys: 117, dia: 76 }, { day: 'Fri', sys: 120, dia: 78 }, { day: 'Sat', sys: 116, dia: 77 }, { day: 'Sun', sys: 118, dia: 78 }
    ]
  },
  temperature: { 
    value: 98.4, 
    unit: '°F', 
    status: 'Normal',
    trend: '0',
    history: [
      { day: 'Mon', value: 98.2 }, { day: 'Tue', value: 98.5 }, { day: 'Wed', value: 98.1 }, 
      { day: 'Thu', value: 98.6 }, { day: 'Fri', value: 98.3 }, { day: 'Sat', value: 98.4 }, { day: 'Sun', value: 98.4 }
    ]
  },
  sleep: { 
    value: 7.5, 
    unit: 'hrs', 
    status: 'Good',
    trend: '+0.5',
    history: [
      { day: 'Mon', value: 6.5 }, { day: 'Tue', value: 7.0 }, { day: 'Wed', value: 8.2 }, 
      { day: 'Thu', value: 6.8 }, { day: 'Fri', value: 7.5 }, { day: 'Sat', value: 8.0 }, { day: 'Sun', value: 7.5 }
    ]
  },
  steps: { 
    value: 8432, 
    unit: 'steps', 
    goal: 10000,
    trend: '+12%',
    history: [
      { day: 'Mon', value: 6500 }, { day: 'Tue', value: 8200 }, { day: 'Wed', value: 10500 }, 
      { day: 'Thu', value: 7800 }, { day: 'Fri', value: 9200 }, { day: 'Sat', value: 11200 }, { day: 'Sun', value: 8432 }
    ]
  },
};

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, onLogout, theme, setTheme }) => {
  // State initialization with LocalStorage for Conversations
  const [conversations, setConversations] = useState<ChatSession[]>(() => {
    const savedConversations = localStorage.getItem('pulsetalk_conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        return parsed.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp),
          messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      } catch (e) {
        console.error("Failed to parse conversations", e);
      }
    }

    // Migration from old flat pulsetalk_messages
    const savedLegacy = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedLegacy) {
      try {
        const parsedLegacy = JSON.parse(savedLegacy);
        if (parsedLegacy && parsedLegacy.length > 0) {
          const messages = parsedLegacy.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
          return [{
            id: 'legacy-default',
            title: 'Previous Consultation',
            messages,
            timestamp: new Date()
          }];
        }
      } catch (e) {
        console.error("Failed to parse legacy messages", e);
      }
    }

    // Default to a single empty chat
    return [{
      id: 'default',
      title: 'New Consultation',
      messages: [],
      timestamp: new Date()
    }];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const savedActive = localStorage.getItem('pulsetalk_active_chat_id');
    return savedActive || 'default';
  });

  const activeChat = conversations.find(c => c.id === activeChatId) || conversations[0];
  const messages = activeChat ? activeChat.messages : [];

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    const defaultProfile: UserProfile = { 
        name: user.name || '', 
        age: 0, 
        gender: '',
        bloodType: '',
        height: '',
        weight: '',
        allergies: [], 
        currentMedications: [],
        chronicConditions: [],
        emergencyContact: { name: '', phone: '', relation: '' },
        insuranceProvider: '',
        insurancePolicyNumber: ''
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultProfile, ...parsed };
      } catch (e) {
        return defaultProfile;
      }
    }
    return defaultProfile;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  
  // App view state
  const [activeTab, setActiveTab] = useState<'chat' | 'appointments' | 'profile' | 'symptom-checker' | 'health-metrics'>('health-metrics');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  // Manual Appointment Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    doctorName: '',
    specialty: '',
    date: '',
    time: '',
    reason: ''
  });

  // Geolocation & Nearby Facilities State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [nearbyClinics, setNearbyClinics] = useState<NearbyClinic[]>([]);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<NearbyPharmacy[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<NearbyClinic | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<NearbyPharmacy | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingFacilities, setIsFetchingFacilities] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const appointmentsSyncRef = useRef<string>(JSON.stringify([]));
  const reminderTimersRef = useRef<Map<string, number>>(new Map());

  // Profile Form & Edit State
  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || 'https://ui-avatars.com/api/?name=User');
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const [isProfileCameraOpen, setIsProfileCameraOpen] = useState(false);
  const profileVideoRef = useRef<HTMLVideoElement>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement>(null);

  // Symptom Checker State
  const [symptomText, setSymptomText] = useState('');
  const [symptomImage, setSymptomImage] = useState<string | null>(null);
  const [symptomResult, setSymptomResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [includeHindi, setIncludeHindi] = useState(false);
  const [chatLanguage, setChatLanguage] = useState('English');
  const symptomFileInputRef = useRef<HTMLInputElement>(null);

  const [metrics, setMetrics] = useState(STATIC_METRICS);

  useEffect(() => {
    if (activeTab !== 'health-metrics') return;

    const interval = setInterval(() => {
      setMetrics(prev => {
        const hrDiff = Math.random() > 0.5 ? 1 : -1;
        const newHrVal = Math.min(Math.max(prev.heartRate.value + (Math.random() > 0.7 ? hrDiff : 0), 65), 85);
        const hrHistory = [...prev.heartRate.history];
        if (hrHistory.length > 0) {
          hrHistory[hrHistory.length - 1] = { ...hrHistory[hrHistory.length - 1], value: newHrVal };
        }

        const sysDiff = Math.random() > 0.5 ? 1 : -1;
        const diaDiff = Math.random() > 0.5 ? 1 : -1;
        const newSys = Math.min(Math.max(prev.bloodPressure.sys + (Math.random() > 0.8 ? sysDiff : 0), 112), 125);
        const newDia = Math.min(Math.max(prev.bloodPressure.dia + (Math.random() > 0.8 ? diaDiff : 0), 74), 84);
        const bpHistory = [...prev.bloodPressure.history];
        if (bpHistory.length > 0) {
          bpHistory[bpHistory.length - 1] = { ...bpHistory[bpHistory.length - 1], sys: newSys, dia: newDia };
        }

        const tempDiff = Math.random() > 0.5 ? 0.1 : -0.1;
        const newTemp = Math.min(Math.max(parseFloat((prev.temperature.value + (Math.random() > 0.7 ? tempDiff : 0)).toFixed(1)), 97.8), 99.2);
        const tempHistory = [...prev.temperature.history];
        if (tempHistory.length > 0) {
          tempHistory[tempHistory.length - 1] = { ...tempHistory[tempHistory.length - 1], value: newTemp };
        }

        const stepsAdd = Math.floor(Math.random() * 3);
        const newSteps = prev.steps.value + stepsAdd;
        const stepsHistory = [...prev.steps.history];
        if (stepsHistory.length > 0) {
          stepsHistory[stepsHistory.length - 1] = { ...stepsHistory[stepsHistory.length - 1], value: newSteps };
        }

        const wellnessDiff = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const newWellness = Math.min(Math.max(prev.wellnessScore + wellnessDiff, 85), 92);

        return {
          ...prev,
          wellnessScore: newWellness,
          heartRate: { ...prev.heartRate, value: newHrVal, history: hrHistory },
          bloodPressure: { ...prev.bloodPressure, sys: newSys, dia: newDia, history: bpHistory },
          temperature: { ...prev.temperature, value: newTemp, history: tempHistory },
          steps: { ...prev.steps, value: newSteps, history: stepsHistory }
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Stream live patient vitals to LocalStorage for the clinician view
  useEffect(() => {
    localStorage.setItem('pulsetalk_live_patient_vitals', JSON.stringify({
      patientName: user.name,
      patientId: user.id || 'default_patient',
      timestamp: new Date().toISOString(),
      vitals: metrics
    }));
  }, [metrics, user.name, user.id]);

  // Camera State (Symptom Checker)
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sound Refs
  const receiveAudioRef = useRef<HTMLAudioElement | null>(null);

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
      // Keep only last 100 logs
      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
    } catch (e) {
      console.error("Failed to save log", e);
    }
  };

  // Log Live Session End
  useEffect(() => {
    if (!isLiveModalOpen) return;
    // When modal opens (effect triggers), return cleanup function for close
    return () => {
        addSystemLog('live_consultation', 'Voice Consultation Session ended.', 'medium');
    };
  }, [isLiveModalOpen]);

  // Initialize Audio
  useEffect(() => {
    receiveAudioRef.current = new Audio(RECEIVE_SOUND_DATA);
    receiveAudioRef.current.volume = 0.5;
  }, []);

  // Initialize Chat & Persistence
  useEffect(() => {
    startChatSession();
  }, []);

  useEffect(() => {
    let updated = false;
    const nextConvs = conversations.map(c => {
      if (c.messages.length === 0) {
        updated = true;
        return {
          ...c,
          messages: [{
            id: 'welcome-' + c.id,
            text: `Hello ${user.name || 'there'}, I'm PulseTalk. I can help you check symptoms, suggest OTC remedies, or schedule an appointment with a specialist. How are you feeling today?`,
            sender: Sender.BOT,
            timestamp: new Date()
          }]
        };
      }
      return c;
    });

    if (updated) {
      setConversations(nextConvs);
    }
  }, [conversations, user.name]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('pulsetalk_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('pulsetalk_active_chat_id', activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
    setProfileForm(userProfile);
  }, [userProfile]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (profileVideoRef.current && profileVideoRef.current.srcObject) {
         const stream = profileVideoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
      // Clean up reminder timers
      reminderTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  // ─── Real-time Appointment Polling (syncs with Clinician dashboard) ───
  useEffect(() => {
    appointmentsSyncRef.current = JSON.stringify(appointments);
  }, [appointments]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
        if (stored && stored !== appointmentsSyncRef.current) {
          const parsed = JSON.parse(stored);
          setAppointments(parsed);
          appointmentsSyncRef.current = stored;
        }
      } catch (e) {
        // silent
      }
    }, 2000);
    return () => clearInterval(pollInterval);
  }, []);

  // ─── Real-time Conversations Polling (syncs with Clinician dashboard) ───
  const conversationsSyncRef = useRef<string>(JSON.stringify([]));
  
  useEffect(() => {
    conversationsSyncRef.current = JSON.stringify(conversations);
  }, [conversations]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem('pulsetalk_conversations');
        if (stored && stored !== conversationsSyncRef.current) {
          const parsed = JSON.parse(stored).map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
            messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
          }));
          setConversations(parsed);
          conversationsSyncRef.current = stored;
        }
      } catch (e) {
        // silent
      }
    }, 2000);
    return () => clearInterval(pollInterval);
  }, []);

  // Manual sync handler
  const handleManualSync = () => {
    setIsSyncing(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAppointments(parsed);
        appointmentsSyncRef.current = stored;
      }
    } catch(e) { /* silent */ }
    setTimeout(() => setIsSyncing(false), 800);
    showNotification('Appointments synced!');
  };

  // ─── Geolocation & Nearby Facilities (Real-Time via Gemini) ───
  const fetchFacilitiesForCoords = async (lat: number, lng: number) => {
    setIsFetchingFacilities(true);
    setLocationError(null);
    try {
      const userMeds = userProfile.currentMedications || [];
      const [facilities, locName] = await Promise.all([
        fetchNearbyFacilities(lat, lng, userMeds),
        getLocationName(lat, lng),
      ]);
      setNearbyClinics(facilities.clinics);
      setNearbyPharmacies(facilities.pharmacies);
      setLocationName(locName);
      showNotification(`Found facilities near ${locName}!`);
    } catch (err) {
      console.error('Facility fetch error:', err);
      setLocationError('Failed to fetch nearby facilities. Please try again.');
    } finally {
      setIsFetchingFacilities(false);
    }
  };

  const locateNearbyFacilities = () => {
    setIsLocating(true);
    setLocationError(null);
    setNearbyClinics([]);
    setNearbyPharmacies([]);
    setLocationName(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);
        // Fetch real facilities via Gemini
        fetchFacilitiesForCoords(latitude, longitude);
      },
      (error) => {
        let msg = 'Unable to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location access and try again.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // ─── Notification Reminder Scheduler ───
  useEffect(() => {
    // Schedule notification reminders for appointments that have reminderEnabled
    const scheduleReminders = () => {
      appointments.forEach(apt => {
        if (!apt.reminderEnabled || apt.status === 'cancelled') return;
        if (reminderTimersRef.current.has(apt.id)) return; // Already scheduled

        const aptDateTime = new Date(`${apt.date}T${apt.time}`);
        const reminderTime = aptDateTime.getTime() - 10 * 60 * 1000; // 10 minutes before
        const now = Date.now();
        const delay = reminderTime - now;

        if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Only schedule if within 24 hours
          const timerId = window.setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('PulseTalk - Appointment Reminder', {
                body: `Your appointment with ${apt.doctorName} (${apt.specialty}) is in 10 minutes!${apt.clinicName ? `\nAt: ${apt.clinicName}` : ''}`,
                icon: '🏥',
                tag: `apt-${apt.id}`,
              });
            }
            // Also show in-app notification
            showNotification(`⏰ Reminder: Appointment with ${apt.doctorName} in 10 minutes!`);
            reminderTimersRef.current.delete(apt.id);
          }, delay);
          reminderTimersRef.current.set(apt.id, timerId);
        }
      });
    };

    scheduleReminders();

    // Re-check every 30 seconds for newly enabled reminders
    const checkInterval = setInterval(scheduleReminders, 30000);
    return () => clearInterval(checkInterval);
  }, [appointments]);

  const handleToggleReminder = async (aptId: string) => {
    // Request notification permission if needed
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showNotification('Notification permission denied. Reminders will only show in-app.');
      }
    }

    setAppointments(prev => prev.map(apt => {
      if (apt.id === aptId) {
        const newEnabled = !apt.reminderEnabled;
        if (!newEnabled && reminderTimersRef.current.has(aptId)) {
          clearTimeout(reminderTimersRef.current.get(aptId));
          reminderTimersRef.current.delete(aptId);
        }
        return { ...apt, reminderEnabled: newEnabled };
      }
      return apt;
    }));
  };


  // Sound Helper
  const playSound = (type: 'receive' | 'thinking_start') => {
    try {
      if (type === 'receive') {
        receiveAudioRef.current?.play().catch(() => {});
      } else if (type === 'thinking_start') {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 600;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Handlers
  const handleSymptomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSymptomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setTimeout(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setIsCameraOpen(false);
            showNotification("Unable to access camera. Please check permissions.");
        }
    }, 100);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setSymptomImage(dataUrl);
            stopCamera();
        }
    }
  };

  const handleBookAppointment = async (args: BookAppointmentArgs): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      doctorName: args.specialty === 'Dermatologist' ? 'Dr. James Wilson' : 'Dr. Sarah Chen',
      specialty: args.specialty,
      date: args.date,
      time: args.time,
      reason: args.reason,
      status: 'confirmed'
    };
    
    setAppointments(prev => [...prev, newAppointment]);
    addSystemLog('appointment', `Scheduled: ${args.specialty} with ${newAppointment.doctorName} on ${args.date}`, 'low');
    showNotification("Appointment scheduled successfully!");
    
    return `Appointment successfully booked with ${newAppointment.doctorName} on ${args.date} at ${args.time}. ID: ${newAppointment.id}`;
  };

  const handleCancelAppointment = (id: string) => {
    if (window.confirm("Are you sure you want to cancel and remove this appointment?")) {
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      addSystemLog('appointment', `Appointment ${id} cancelled by user.`, 'low');
      showNotification("Appointment removed.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.doctorName || !manualForm.date || !manualForm.time) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      doctorName: manualForm.doctorName,
      specialty: manualForm.specialty || 'General Practice',
      date: manualForm.date,
      time: manualForm.time,
      reason: manualForm.reason || 'Check-up',
      status: 'confirmed',
      clinicName: selectedClinic?.name,
      clinicAddress: selectedClinic?.address,
      clinicDistance: selectedClinic?.distance,
      nearbyPharmacyName: selectedPharmacy?.name,
      nearbyPharmacyAddress: selectedPharmacy?.address,
      nearbyPharmacyDistance: selectedPharmacy?.distance,
      reminderEnabled: false,
    };

    setAppointments(prev => [...prev, newAppointment]);
    addSystemLog('appointment', `Manual booking: ${manualForm.specialty} on ${manualForm.date}${selectedClinic ? ` at ${selectedClinic.name}` : ''}`, 'low');
    setManualForm({ doctorName: '', specialty: '', date: '', time: '', reason: '' });
    setSelectedClinic(null);
    setSelectedPharmacy(null);
    setNearbyClinics([]);
    setNearbyPharmacies([]);
    setShowManualForm(false);
    showNotification("Appointment added successfully!");
  };

  // --- Profile Logic ---
  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startProfileCamera = async () => {
    setIsProfileCameraOpen(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (profileVideoRef.current) {
          profileVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        showNotification("Camera access denied");
        setIsProfileCameraOpen(false);
      }
    }, 100);
  };

  const stopProfileCamera = () => {
    if (profileVideoRef.current?.srcObject) {
       const stream = profileVideoRef.current.srcObject as MediaStream;
       stream.getTracks().forEach(t => t.stop());
    }
    setIsProfileCameraOpen(false);
  };

  const captureProfilePhoto = () => {
    if (profileVideoRef.current && profileCanvasRef.current) {
       const video = profileVideoRef.current;
       const canvas = profileCanvasRef.current;
       canvas.width = video.videoWidth;
       canvas.height = video.videoHeight;
       const ctx = canvas.getContext('2d');
       if (ctx) {
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
         setProfileAvatar(canvas.toDataURL('image/jpeg', 0.8));
         stopProfileCamera();
       }
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(profileForm);
    setIsEditingProfile(false);
    
    // Persist Avatar Hack (Update local storage user so it persists on reload)
    const storedUser = localStorage.getItem('pulsetalk_auth_user');
    if (storedUser) {
        const u = JSON.parse(storedUser);
        u.avatar = profileAvatar;
        u.name = profileForm.name;
        localStorage.setItem('pulsetalk_auth_user', JSON.stringify(u));
    }

    addSystemLog('system', 'User profile updated.', 'low');
    showNotification("Profile updated successfully.");
  };

  const handleAnalyzeMeds = () => {
    if (userProfile.currentMedications.length === 0) {
      showNotification("No medications listed to analyze.");
      return;
    }
    
    setActiveTab('chat');
    const prompt = `Please check my current medications for any potential interactions with each other or with my allergies.\n\nMy Medications: ${userProfile.currentMedications.join(', ')}\nMy Allergies: ${userProfile.allergies.join(', ') || 'None'}\n\nPlease provide a safety summary.`;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: Sender.USER,
      timestamp: new Date()
    };
    setConversations(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          title: c.title === 'New Consultation' ? 'Medication Analysis' : c.title,
          messages: [...c.messages, userMsg],
          timestamp: new Date()
        };
      }
      return c;
    }));
    setIsLoading(true);
    
    sendMessageToGemini(prompt, undefined, handleBookAppointment)
      .then(response => {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: Sender.BOT,
          timestamp: new Date()
        };
        setConversations(prev => prev.map(c => {
          if (c.id === activeChatId) {
            return {
              ...c,
              messages: [...c.messages, botMsg],
              timestamp: new Date()
            };
          }
          return c;
        }));
        playSound('receive');
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  const handleAnalyzeSymptom = async () => {
    if (!symptomText && !symptomImage) {
      showNotification("Please provide a description or an image.");
      return;
    }

    setIsAnalyzing(true);
    setSymptomResult(null);

    try {
      const allergiesStr = userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Unknown';
      const medsStr = userProfile.currentMedications && userProfile.currentMedications.length > 0 ? userProfile.currentMedications.join(', ') : 'None listed';

      let prompt = `
        [ROLE: Medical Triage Assistant]
        [TASK: Analyze the provided symptom description and/or image.]
        
        PATIENT PROFILE:
        - Age/Gender: ${userProfile.age || 'Unknown'} / ${userProfile.gender || 'Unknown'}
        - Allergies: ${allergiesStr}
        - Current Meds: ${medsStr}
        - Conditions: ${userProfile.chronicConditions && userProfile.chronicConditions.length > 0 ? userProfile.chronicConditions.join(', ') : 'None'}
        
        USER INPUT:
        - Description: "${symptomText}"
        - Has Image: ${symptomImage ? 'Yes' : 'No'}
        
        ${includeHindi ? `
        [LANGUAGE CONFIGURATION]
        Generate the report in BOTH English and Hindi (Bilingual).
        For every section (Potential Condition, Clinical Analysis, etc.), provide the English text first, immediately followed by the Hindi translation.
        Ensure medical terms are explained clearly in Hindi.
        ` : ''}

        OUTPUT FORMAT (Strictly adhere to this layout):
        ## Potential Condition
        [Name of possible condition(s) based on visual/text evidence]
        ${includeHindi ? '(Hindi Translation)' : ''}

        ## Clinical Analysis
        [Detailed observation of symptoms, visual characteristics if image provided, and potential causes.]
        ${includeHindi ? '(Hindi Translation)' : ''}

        ## Suggested OTC Treatments
        [List 2-3 specific Over-The-Counter suggestions. 
         IMPORTANT: Check against Patient Profile. If patient takes ${medsStr}, check for interactions. If patient has ${allergiesStr} allergy, check for contraindications.
         If an interaction exists, output "WARNING: [Drug] interacts with [Patient Med]".]
        ${includeHindi ? '(Hindi Translation)' : ''}

        ## Urgency Level
        [Low / Medium / High - with brief reasoning]
        ${includeHindi ? '(Hindi Translation)' : ''}

        ## Disclaimer
        [Standard medical disclaimer]
        ${includeHindi ? '(Hindi Translation)' : ''}
      `;

      // Use the dedicated generation function for the report
      const response = await generateSymptomAnalysis(prompt, symptomImage || undefined);
      setSymptomResult(response);

      // Log for Admin
      const severity = response.toLowerCase().includes('high urgency') ? 'high' : response.toLowerCase().includes('medium urgency') ? 'medium' : 'low';
      addSystemLog(
        'symptom_analysis', 
        `User analyzed symptoms: "${symptomText.substring(0, 50)}...". Result snippet: ${response.substring(0, 50)}...`, 
        severity
      );

    } catch (error) {
      console.error(error);
      setSymptomResult("Error analyzing symptoms. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      image: attachedImage || undefined,
      sender: Sender.USER,
      timestamp: new Date()
    };

    const currentInput = input;
    const currentImage = attachedImage;

    setConversations(prev => prev.map(c => {
      if (c.id === activeChatId) {
        const updatedMessages = [...c.messages, userMsg];
        const newTitle = c.title === 'New Consultation' && currentInput.trim()
          ? (currentInput.trim().length > 30 ? currentInput.trim().substring(0, 30) + '...' : currentInput.trim())
          : c.title;
        return {
          ...c,
          title: newTitle,
          messages: updatedMessages,
          timestamp: new Date()
        };
      }
      return c;
    }));

    setIsLoading(true);
    playSound('thinking_start');
    
    setInput('');
    setAttachedImage(null);

    try {
      let promptToSend = currentInput;
      const allergiesStr = userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Unknown';
      const medsStr = userProfile.currentMedications && userProfile.currentMedications.length > 0 ? userProfile.currentMedications.join(', ') : 'None listed';
      
      const profileContext = `\n\n[USER CONTEXT: Name: ${userProfile.name || 'Unknown'}, Age: ${userProfile.age || 'Unknown'}, Gender: ${userProfile.gender || 'Unknown'}, Allergies: ${allergiesStr}, Current Medications: ${medsStr}. CRITICAL: Check for interactions.]`;
      promptToSend += profileContext;

      if (currentImage) {
        promptToSend += `\n\n[SYSTEM INSTRUCTION: Analyze image for skin conditions/abnormalities. Describe visual characteristics. Identify potential conditions. MANDATORY DISCLAIMER: "AI visual analysis is not a diagnosis."]`;
      }

      if (chatLanguage !== 'English') {
        promptToSend += `\n\n[LANGUAGE INSTRUCTION: Please respond entirely in ${chatLanguage}. Translate all medical terms and explanations naturally into ${chatLanguage}.]`;
      }

      const responseText = await sendMessageToGemini(promptToSend, currentImage || undefined, handleBookAppointment);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: Sender.BOT,
        timestamp: new Date()
      };
      
      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, botMsg],
            timestamp: new Date()
          };
        }
        return c;
      }));
      playSound('receive');
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I encountered a temporary error. Please try again.",
        sender: Sender.BOT,
        timestamp: new Date()
      };
      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, errorMsg],
            timestamp: new Date()
          };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Consultation',
      messages: [],
      timestamp: new Date()
    };
    setConversations(prev => [newSession, ...prev]);
    setActiveChatId(newId);
  };

  const handleDeleteChat = (idToDelete: string) => {
    const updated = conversations.filter(c => c.id !== idToDelete);
    if (updated.length === 0) {
      const defaultSession: ChatSession = {
        id: 'default',
        title: 'New Consultation',
        messages: [],
        timestamp: new Date()
      };
      setConversations([defaultSession]);
      setActiveChatId('default');
    } else {
      setConversations(updated);
      if (activeChatId === idToDelete) {
        setActiveChatId(updated[0].id);
      }
    }
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, title: newTitle };
      }
      return c;
    }));
  };

  // Helper function to render structured symptom results
  const renderSymptomResult = (result: string) => {
    const sections = result.split(/(?=## )/g);
    
    return sections.map((section, index) => {
      const trimmed = section.trim();
      if (!trimmed) return null;
      
      const lines = trimmed.split('\n');
      const titleLine = lines[0].replace('## ', '').trim();
      const content = lines.slice(1).join('\n').trim();

      if (titleLine.toLowerCase().includes('otc treatments') || titleLine.toLowerCase().includes('treatments')) {
        return (
          <div key={index} className="my-6 p-5 bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
             <h4 className="flex items-center gap-2 text-lg font-bold text-indigo-800 dark:text-indigo-300 mb-3">
               <Pill className="text-indigo-600 dark:text-indigo-400" size={20} />
               {titleLine}
             </h4>
             <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
               {content}
             </div>
          </div>
        );
      }

      if (titleLine.toLowerCase().includes('urgency')) {
         let urgencyColor = 'bg-slate-100 text-slate-800 border-slate-300';
         if (content.toLowerCase().includes('high')) urgencyColor = 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
         else if (content.toLowerCase().includes('medium')) urgencyColor = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800';
         else if (content.toLowerCase().includes('low')) urgencyColor = 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';

         return (
           <div key={index} className={`my-4 p-4 rounded-xl border ${urgencyColor} flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4`}>
              <h4 className="font-bold shrink-0 flex items-center gap-2 uppercase tracking-wide text-xs">
                 <Activity size={16} /> {titleLine}
              </h4>
              <div className="font-medium whitespace-pre-wrap">{content}</div>
           </div>
         );
      }
      
      if (titleLine.toLowerCase().includes('disclaimer')) {
         return (
            <div key={index} className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 italic">
               <span className="font-bold not-italic mr-1">{titleLine}:</span> {content}
            </div>
         )
      }

      return (
        <div key={index} className="mb-6">
           <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              {titleLine.includes('Condition') && <FileText size={20} className="text-teal-500" />}
              {titleLine.includes('Analysis') && <Sparkles size={20} className="text-teal-500" />}
              {titleLine}
           </h4>
           <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content}
           </div>
        </div>
      );
    });
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Live Assistant Modal */}
      {isLiveModalOpen && (
        <LiveAssistantModal 
          onClose={() => setIsLiveModalOpen(false)} 
          onBookAppointment={handleBookAppointment}
          userProfile={userProfile}
          language={chatLanguage}
        />
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-teal-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium">
            <Check size={18} />
            {notification}
          </div>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-teal-600 p-1.5 rounded-lg mr-2">
              <Activity className="text-white h-5 w-5" />
            </div>
            <span className="font-bold text-xl text-slate-800 dark:text-slate-100 tracking-tight">PulseTalk</span>
            <button className="md:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-slate-500" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
              onClick={() => { setIsLiveModalOpen(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-700 mb-4"
            >
              <Mic2 size={18} className="animate-pulse" />
              Live Consultation
            </button>

            <button 
              onClick={() => { setActiveTab('health-metrics'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'health-metrics' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Activity size={18} />
              Health Dashboard
            </button>

             <button 
              onClick={() => { setActiveTab('symptom-checker'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'symptom-checker' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Stethoscope size={18} />
              Symptom Checker
            </button>

            <button 
              onClick={() => { setActiveTab('chat'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <MessageSquare size={18} />
              Chat Assistant
            </button>
            <button 
              onClick={() => { setActiveTab('appointments'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appointments' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Calendar size={18} />
              Appointments
              {appointments.filter(a => a.status !== 'cancelled').length > 0 && (
                <span className="ml-auto bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {appointments.filter(a => a.status !== 'cancelled').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <UserCircle size={18} />
              My Profile
            </button>
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
             <button
               onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
               className="w-full flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
               <div className="flex items-center gap-2">
                 {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                 <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
               </div>
               <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-teal-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
               </div>
             </button>

            {/* Profile / Logout */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3">
              <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">Patient Account</p>
              </div>
              <button 
                onClick={onLogout}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full bg-slate-50 dark:bg-slate-900 transition-colors">
        {/* Mobile Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden shrink-0">
           <div className="flex items-center gap-2">
              <div className="bg-teal-600 p-1.5 rounded-lg">
                <Activity className="text-white h-4 w-4" />
              </div>
              <span className="font-bold text-lg text-slate-800 dark:text-slate-100">PulseTalk</span>
           </div>
           <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-400">
             <Menu size={24} />
           </button>
        </header>

        {/* View Switcher */}
        <div className="flex-1 overflow-hidden relative">
          
           {activeTab === 'health-metrics' && (
             <div className="h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
               <div className="max-w-5xl mx-auto space-y-6">
                 {/* Dashboard Header */}
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Health Dashboard
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Weekly physiological overview and trends.</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      {/* Live Indicator */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Live Syncing</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                          <Clock size={14} />
                          <span>Last updated: Just now</span>
                      </div>
                    </div>
                 </div>

                 {/* Grid Layout */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 1. Overall Wellness Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/60 flex flex-col items-center justify-between relative overflow-hidden group h-80 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
                        <div className="w-full flex items-center justify-between">
                            <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-wider">Overall Wellness</span>
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2 py-0.5 rounded-full">Score</span>
                        </div>
                        
                        <div className="h-40 w-full relative flex items-center justify-center my-2">
                           <ResponsiveContainer width="100%" height="100%" key={theme}>
                              <RadialBarChart 
                                cx="50%" cy="50%" innerRadius="75%" outerRadius="105%" barSize={16} 
                                data={[{ name: 'Score', value: metrics.wellnessScore, fill: '#0d9488' }]} 
                                startAngle={180} endAngle={0}
                              >
                                <RadialBar
                                  background={{ fill: theme === 'dark' ? '#334155' : '#f1f5f9' }}
                                  dataKey="value"
                                  cornerRadius={12}
                                />
                                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                              </RadialBarChart>
                           </ResponsiveContainer>
                           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4 flex flex-col items-center">
                              <span className="text-5xl font-black text-slate-900 dark:text-white leading-none">{metrics.wellnessScore}</span>
                              <span className="text-xs text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full mt-2 border border-emerald-100/50 dark:border-emerald-900/30">Excellent</span>
                           </div>
                        </div>
                        
                        <p className="text-center text-xs text-slate-400 dark:text-slate-500 px-4">Calculated based on your weekly activity and vitals stability.</p>
                    </div>

                    {/* 2. Heart Rate Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-80 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 relative overflow-hidden">
                       <div>
                         <div className="flex justify-between items-start mb-2">
                            <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl text-rose-500 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
                               <Heart size={20} className="fill-rose-500/10" />
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30">{metrics.heartRate.status}</span>
                         </div>
                         <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Avg Heart Rate</h4>
                         <div className="flex items-end gap-2 mt-1 mb-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{metrics.heartRate.value}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium pb-0.5">{metrics.heartRate.unit}</span>
                            <div className="ml-auto">
                              <TrendIndicator value={metrics.heartRate.trend} label="vs last week" />
                            </div>
                         </div>
                       </div>
                       
                       <div className="h-32 w-full -ml-4 -mb-2">
                          <ResponsiveContainer width="112%" height="100%" key={theme}>
                            <AreaChart data={metrics.heartRate.history}>
                              <defs>
                                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="day" hide />
                              <Tooltip 
                                contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px' }}
                                itemStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#334155' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(val: number) => [Math.round(val), 'BPM']}
                              />
                              <Area type="monotone" dataKey="value" stroke="#f43f5e" fillOpacity={1} fill="url(#colorHr)" strokeWidth={2.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 3. Blood Pressure Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-80 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 relative overflow-hidden">
                       <div>
                         <div className="flex justify-between items-start mb-2">
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-xl text-blue-500 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30">
                               <Activity size={20} />
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30">{metrics.bloodPressure.status}</span>
                         </div>
                         <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Blood Pressure</h4>
                         <div className="flex items-end gap-2 mt-1 mb-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none flex items-baseline gap-1">
                              {metrics.bloodPressure.sys}<span className="text-xl font-medium text-slate-400 dark:text-slate-500">/</span>{metrics.bloodPressure.dia}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium pb-0.5">{metrics.bloodPressure.unit}</span>
                            <div className="ml-auto">
                              <TrendIndicator value={metrics.bloodPressure.trend} label="vs last week" />
                            </div>
                         </div>
                       </div>
                       
                       <div className="h-32 w-full -ml-4 -mb-2">
                          <ResponsiveContainer width="112%" height="100%" key={theme}>
                            <LineChart data={metrics.bloodPressure.history}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.06} />
                              <XAxis dataKey="day" hide />
                              <Tooltip 
                                contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px' }}
                                labelStyle={{ display: 'none' }}
                              />
                              <Line type="monotone" dataKey="sys" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                              <Line type="monotone" dataKey="dia" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 4. Sleep Duration Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-80 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 relative overflow-hidden">
                       <div>
                         <div className="flex justify-between items-start mb-2">
                            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-xl text-indigo-500 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                               <Moon size={20} />
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30">{metrics.sleep.status}</span>
                         </div>
                         <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Sleep Duration</h4>
                         <div className="flex items-end gap-2 mt-1 mb-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{metrics.sleep.value}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium pb-0.5">{metrics.sleep.unit}</span>
                            <div className="ml-auto">
                              <TrendIndicator value={metrics.sleep.trend} label="avg" />
                            </div>
                         </div>
                       </div>
                       
                       <div className="h-32 w-full -ml-4 -mb-2">
                          <ResponsiveContainer width="112%" height="100%" key={theme}>
                            <BarChart data={metrics.sleep.history}>
                              <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px' }}
                              />
                              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={18} />
                            </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 5. Daily Steps Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-80 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 relative overflow-hidden">
                       <div>
                         <div className="flex justify-between items-start mb-2">
                            <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl text-amber-500 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30">
                               <Footprints size={20} />
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-100 dark:bg-slate-750 dark:text-slate-300 dark:border-slate-700">Goal: 10k</span>
                         </div>
                         <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Daily Steps</h4>
                         <div className="flex items-end gap-2 mt-1 mb-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{metrics.steps.value.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium pb-0.5">{metrics.steps.unit}</span>
                            <div className="ml-auto">
                              <TrendIndicator value={metrics.steps.trend} />
                            </div>
                         </div>
                       </div>
                       
                       <div className="h-32 w-full -ml-4 -mb-2">
                          <ResponsiveContainer width="112%" height="100%" key={theme}>
                            <AreaChart data={metrics.steps.history}>
                              <defs>
                                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="day" hide />
                              <Tooltip 
                                contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px' }}
                              />
                              <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSteps)" strokeWidth={2.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 6. Body Temperature Card - Wide Bottom */}
                    <div className="col-span-1 md:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl text-emerald-500 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
                                   <Thermometer size={20} />
                                </div>
                                <div>
                                   <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Body Temperature</h4>
                                   <div className="flex items-end gap-2 mt-0.5">
                                      <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{metrics.temperature.value}</p>
                                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{metrics.temperature.unit}</p>
                                   </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 sm:ml-auto">
                                <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30">{metrics.temperature.status}</span>
                                <TrendIndicator value={metrics.temperature.trend} />
                            </div>
                        </div>
                        
                        <div className="h-28 w-full -ml-2">
                           <ResponsiveContainer width="102%" height="100%" key={theme}>
                              <LineChart data={metrics.temperature.history} margin={{ left: 10, right: 10, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.06} />
                                 <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 11 }} />
                                 <Tooltip 
                                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px' }}
                                 />
                                 <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} strokeDasharray="4 4" dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: theme === 'dark' ? '#1e293b' : '#fff' }} activeDot={{ r: 6 }} />
                              </LineChart>
                           </ResponsiveContainer>
                        </div>
                    </div>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'symptom-checker' && (
            <div className="h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
              <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                 
                 <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Symptom Checker</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">AI-powered visual and text analysis for preliminary insights.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">1. Describe your symptoms</label>
                       <textarea 
                          className="w-full h-32 rounded-xl border border-slate-300 dark:border-slate-600 p-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 dark:bg-slate-700 dark:text-white resize-none"
                          placeholder="e.g. I have a red itchy rash on my arm that started 2 days ago. It feels warm to the touch..."
                          value={symptomText}
                          onChange={(e) => setSymptomText(e.target.value)}
                       />

                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-6 mb-3">2. Upload an image (Optional)</label>
                       
                       {isCameraOpen ? (
                          <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-slate-700 mb-2">
                              <video 
                                  ref={videoRef} 
                                  className="absolute inset-0 w-full h-full object-cover" 
                                  autoPlay 
                                  playsInline 
                                  muted 
                              />
                              <canvas ref={canvasRef} className="hidden" />
                              
                              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 z-20">
                                  <button 
                                      onClick={stopCamera} 
                                      className="p-3 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors backdrop-blur-sm"
                                      title="Cancel"
                                  >
                                      <X size={24} />
                                  </button>
                                  <button 
                                      onClick={capturePhoto} 
                                      className="p-1 rounded-full border-4 border-white/30 hover:border-white/50 transition-colors"
                                      title="Capture"
                                  >
                                      <div className="w-14 h-14 bg-white rounded-full border-4 border-transparent"></div>
                                  </button>
                              </div>
                          </div>
                       ) : (
                          <div className="relative group">
                              <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={handleSymptomImageUpload}
                                  className="hidden"
                                  ref={symptomFileInputRef}
                                />
                              
                              <div 
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${symptomImage ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500'}`}
                                onClick={() => symptomFileInputRef.current?.click()}
                              >
                                {symptomImage ? (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden group/image">
                                      <img src={symptomImage} alt="Symptom" className="w-full h-full object-contain" />
                                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity z-20 gap-3">
                                          <p className="text-white font-medium text-sm">Change Image</p>
                                          <div className="flex gap-2">
                                              <button 
                                                  onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      symptomFileInputRef.current?.click();
                                                  }} 
                                                  className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-2"
                                              >
                                                  <Upload size={14}/> Upload
                                              </button>
                                              <button 
                                                  onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      startCamera();
                                                  }}
                                                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center gap-2"
                                              >
                                                  <Camera size={14}/> Camera
                                              </button>
                                          </div>
                                      </div>
                                    </div>
                                ) : (
                                    <>
                                      <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-3 text-slate-500 dark:text-slate-300">
                                        <Upload size={24} />
                                      </div>
                                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload or drag & drop</p>
                                      <p className="text-xs text-slate-400 mt-1 mb-4">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                                      
                                      <div className="flex items-center gap-2 w-full max-w-[200px]">
                                          <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                          <span className="text-[10px] text-slate-400 font-bold uppercase">OR</span>
                                          <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                      </div>

                                      <button 
                                          type="button"
                                          onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation(); 
                                              startCamera();
                                          }}
                                          className="mt-4 relative z-20 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                      >
                                          <Camera size={16} /> Use Camera
                                      </button>
                                    </>
                                )}
                              </div>
                          </div>
                       )}
                       
                       <button
                          type="button"
                          onClick={() => setIncludeHindi(!includeHindi)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all mb-4 w-full justify-center ${
                            includeHindi 
                              ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                          }`}
                       >
                          <Languages size={16} />
                          {includeHindi ? 'English & Hindi Output Enabled' : 'Enable English & Hindi Output'}
                       </button>

                       <Button 
                          onClick={handleAnalyzeSymptom} 
                          className="w-full py-3 text-base flex items-center justify-center gap-2"
                          disabled={isAnalyzing || (!symptomText && !symptomImage) || isCameraOpen}
                          isLoading={isAnalyzing}
                       >
                          {isAnalyzing ? "Analyzing..." : <><Sparkles size={18} /> Analyze Condition</>}
                       </Button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex gap-3">
                       <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                       <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                          <strong>Privacy Notice:</strong> Images are processed securely and not stored permanently. 
                          This tool does not provide a medical diagnosis. In case of emergency, call 911.
                       </p>
                    </div>
                 </div>

                 {/* Right Column: Result */}
                 <div className="flex flex-col h-full">
                    {symptomResult ? (
                       <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
                             <h3 className="text-white font-bold flex items-center gap-2">
                                <FileText size={20} /> Analysis Report
                             </h3>
                             <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">AI Generated</span>
                          </div>
                          <div className="p-6 overflow-y-auto flex-1">
                             {renderSymptomResult(symptomResult)}
                          </div>
                          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                             <Button 
                               onClick={() => setActiveTab('appointments')}
                               className="w-full" variant="secondary"
                             >
                               Schedule Appointment for this
                             </Button>
                          </div>
                       </div>
                    ) : (
                       <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50 dark:bg-slate-800/50">
                          <Activity size={48} className="mb-4 opacity-20" />
                          <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400">Ready to Analyze</h3>
                          <p className="text-sm max-w-xs mt-2">Fill in the details on the left and click "Analyze Condition" to generate a comprehensive report.</p>
                       </div>
                    )}
                 </div>

              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatInterface 
              conversations={conversations}
              activeChatId={activeChatId}
              onSelectChat={setActiveChatId}
              onNewChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
              onRenameChat={handleRenameChat}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              onImageAttached={setAttachedImage}
              attachedImage={attachedImage}
              chatLanguage={chatLanguage}
              setChatLanguage={setChatLanguage}
              onOpenLiveAssistant={() => setIsLiveModalOpen(true)}
            />
          )}
          
          {activeTab === 'appointments' && (
            <div className="h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
              <div className="max-w-4xl mx-auto">
                {/* Header with Sync & Schedule buttons */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Your Appointments</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your medical schedule, reminders, and nearby facilities</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleManualSync}
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg font-medium border transition-all ${
                        isSyncing
                          ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sync
                    </button>
                    <button 
                      onClick={() => {
                        setShowManualForm(!showManualForm);
                        if (!showManualForm) {
                          setSelectedClinic(null);
                          setSelectedPharmacy(null);
                        }
                      }}
                      className="flex items-center gap-2 text-sm text-white bg-teal-600 px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      {showManualForm ? <X size={16} /> : <Plus size={16} />}
                      {showManualForm ? 'Cancel' : 'Schedule New'}
                    </button>
                  </div>
                </div>

                {/* Manual Appointment Form with Location Integration */}
                {showManualForm && (
                  <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {/* Form Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Stethoscope size={20} />
                        Schedule New Appointment
                      </h3>
                      <p className="text-teal-100 text-sm mt-0.5">Fill in the details and optionally find nearby clinics</p>
                    </div>

                    <form onSubmit={handleManualSubmit} className="p-6 space-y-6">
                      {/* Basic Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Doctor Name *</label>
                          <input 
                            type="text" 
                            required
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 dark:text-white transition-shadow"
                            value={manualForm.doctorName}
                            onChange={e => setManualForm({...manualForm, doctorName: e.target.value})}
                            placeholder="e.g. Dr. Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Specialty</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 dark:text-white transition-shadow"
                            value={manualForm.specialty}
                            onChange={e => setManualForm({...manualForm, specialty: e.target.value})}
                            placeholder="e.g. Dermatology"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                          <input 
                            type="date" 
                            required
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 dark:text-white transition-shadow"
                            value={manualForm.date}
                            onChange={e => setManualForm({...manualForm, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time *</label>
                          <input 
                            type="time" 
                            required
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 dark:text-white transition-shadow"
                            value={manualForm.time}
                            onChange={e => setManualForm({...manualForm, time: e.target.value})}
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason for Visit</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 dark:text-white transition-shadow"
                            value={manualForm.reason}
                            onChange={e => setManualForm({...manualForm, reason: e.target.value})}
                            placeholder="Brief description of symptoms or purpose"
                          />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-200 dark:border-slate-700" />

                      {/* Location Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <Navigation size={16} className="text-teal-600" />
                              Find Nearby Clinics & Pharmacies
                            </h4>
                            {locationName && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-6 flex items-center gap-1">
                                <MapPin size={10} /> Showing results near <span className="font-medium text-teal-600 dark:text-teal-400">{locationName}</span>
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={locateNearbyFacilities}
                            disabled={isLocating || isFetchingFacilities}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 disabled:opacity-60 transition-all shadow-sm"
                          >
                            {(isLocating || isFetchingFacilities) ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <MapPin size={12} />
                            )}
                            {isLocating ? 'Getting location...' : isFetchingFacilities ? 'Finding facilities...' : 'Use My Location'}
                          </button>
                        </div>

                        {locationError && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
                            <AlertTriangle size={12} /> {locationError}
                          </p>
                        )}

                        {/* Fetching State */}
                        {isFetchingFacilities && (
                          <div className="mb-4 p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-700 flex flex-col items-center gap-3 animate-pulse">
                            <Loader2 size={28} className="animate-spin text-teal-600 dark:text-teal-400" />
                            <div className="text-center">
                              <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Searching for real facilities near you...</p>
                              <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">Using AI to find actual clinics and pharmacies in your area</p>
                            </div>
                          </div>
                        )}

                        {/* Nearby Clinics */}
                        {nearbyClinics.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                              <Building2 size={12} /> Nearby Clinics
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {nearbyClinics.map((clinic, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClinic(selectedClinic?.name === clinic.name ? null : clinic);
                                    // Auto-fill doctor name from clinic if not already set
                                    if (!manualForm.doctorName && clinic.doctors.length > 0) {
                                      setManualForm(prev => ({ ...prev, doctorName: clinic.doctors[0] }));
                                    }
                                  }}
                                  className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${
                                    selectedClinic?.name === clinic.name
                                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-sm'
                                      : 'border-slate-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-teal-600 bg-white dark:bg-slate-700/50'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{clinic.name}</p>
                                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                                      <Star size={10} className="fill-amber-500" /> {clinic.rating}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{clinic.address}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                                      <MapPin size={10} /> {clinic.distance}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                      {clinic.specialties.slice(0, 2).join(', ')}
                                    </span>
                                  </div>
                                  {selectedClinic?.name === clinic.name && (
                                    <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-700">
                                      <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Available Doctors</p>
                                      <div className="flex flex-wrap gap-1">
                                        {clinic.doctors.map((doc, di) => (
                                          <button
                                            key={di}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setManualForm(prev => ({ ...prev, doctorName: doc }));
                                            }}
                                            className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                                              manualForm.doctorName === doc
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-teal-100'
                                            }`}
                                          >
                                            {doc}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Nearby Pharmacies */}
                        {nearbyPharmacies.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                              <Pill size={12} /> Nearby Pharmacies — Medication Availability
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {nearbyPharmacies.map((pharmacy, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedPharmacy(selectedPharmacy?.name === pharmacy.name ? null : pharmacy)}
                                  className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${
                                    selectedPharmacy?.name === pharmacy.name
                                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm'
                                      : 'border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 bg-white dark:bg-slate-700/50'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{pharmacy.name}</p>
                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                                      <Star size={8} className="fill-amber-500" /> {pharmacy.rating}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{pharmacy.address}</p>
                                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-1 flex items-center gap-1">
                                    <MapPin size={8} /> {pharmacy.distance}
                                  </p>
                                  {/* Medication Stock */}
                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-600 space-y-1">
                                    {pharmacy.medications.map((med, mi) => (
                                      <div key={mi} className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-600 dark:text-slate-400 truncate">{med.name}</span>
                                        <span className={`flex items-center gap-0.5 font-medium ${
                                          med.inStock ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                                        }`}>
                                          {med.inStock ? (
                                            <><Check size={8} /> In Stock</>
                                          ) : (
                                            <><X size={8} /> Out</>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selected Summary */}
                      {(selectedClinic || selectedPharmacy) && (
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-teal-200 dark:border-teal-700">
                          <p className="text-xs font-semibold text-teal-800 dark:text-teal-300 mb-2">Selected Facilities</p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            {selectedClinic && (
                              <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                <Building2 size={12} /> {selectedClinic.name} ({selectedClinic.distance})
                              </span>
                            )}
                            {selectedPharmacy && (
                              <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                                <Pill size={12} /> {selectedPharmacy.name} ({selectedPharmacy.distance})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Form Actions */}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => {
                            setShowManualForm(false);
                            setSelectedClinic(null);
                            setSelectedPharmacy(null);
                            setNearbyClinics([]);
                            setNearbyPharmacies([]);
                          }}
                          className="dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="flex items-center gap-2 shadow-sm">
                          <Save size={16} /> Save Appointment
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Empty State */}
                {appointments.length === 0 && !showManualForm ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center flex flex-col items-center">
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 p-5 rounded-2xl mb-5">
                        <Calendar size={36} className="text-teal-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No appointments scheduled</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">Chat with our AI assistant to schedule one, or add an appointment manually with nearby clinic recommendations.</p>
                    <div className="flex gap-3">
                      <button 
                          onClick={() => setActiveTab('chat')}
                          className="px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                      >
                          Go to Chat
                      </button>
                      <button 
                          onClick={() => setShowManualForm(true)}
                          className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors text-sm font-medium shadow-sm"
                      >
                          Schedule Appointment
                      </button>
                    </div>
                  </div>
                ) : appointments.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 pb-10">
                    {[...appointments].sort((a,b) => b.id.localeCompare(a.id)).map(apt => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onCancel={handleCancelAppointment}
                        onToggleReminder={handleToggleReminder}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
               <div className="max-w-4xl mx-auto pb-10">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                       <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Personal Health Profile</h2>
                       <p className="text-sm text-slate-500 dark:text-slate-400">Manage your medical identity and critical information.</p>
                    </div>
                    {!isEditingProfile && (
                      <Button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2">
                        <Edit size={16} /> Edit Profile
                      </Button>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
                    {/* Read Only View */}
                    {!isEditingProfile ? (
                       <div className="space-y-10">
                          {/* Header Section */}
                          <div className="flex flex-col md:flex-row gap-8 items-start">
                             <div className="shrink-0 relative">
                                <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-700 shadow-md">
                                  <img src={profileAvatar || user.avatar} alt="Profile" className="object-cover w-full h-full" />
                                </div>
                             </div>
                             
                             <div className="flex-1 w-full">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                   <div>
                                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{profileForm.name}</h3>
                                      <div className="flex items-center gap-3 mt-2">
                                         <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">
                                            {profileForm.gender || 'Gender not set'}
                                         </span>
                                         <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">
                                            {profileForm.age > 0 ? `${profileForm.age} years` : 'Age not set'}
                                         </span>
                                      </div>
                                   </div>
                                </div>

                                {/* Vitals Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                      <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                         <Droplet size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Blood Type</span>
                                      </div>
                                      <p className="text-lg font-bold text-slate-900 dark:text-white">{profileForm.bloodType || '--'}</p>
                                   </div>
                                   <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                      <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                         <Ruler size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Height</span>
                                      </div>
                                      <p className="text-lg font-bold text-slate-900 dark:text-white">{profileForm.height || '--'}</p>
                                   </div>
                                   <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                      <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                         <Scale size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Weight</span>
                                      </div>
                                      <p className="text-lg font-bold text-slate-900 dark:text-white">{profileForm.weight || '--'}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                          
                          {/* Medical Details */}
                          <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                             <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Stethoscope className="text-teal-600" size={20} /> Medical History
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div>
                                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Chronic Conditions</p>
                                   {profileForm.chronicConditions && profileForm.chronicConditions.length > 0 ? (
                                      <ul className="space-y-2">
                                         {profileForm.chronicConditions.map((c, i) => (
                                            <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-200 text-sm">
                                               <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> {c}
                                            </li>
                                         ))}
                                      </ul>
                                   ) : <p className="text-sm text-slate-400 italic">None listed</p>}
                                </div>
                                <div>
                                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Allergies</p>
                                   <div className="flex flex-wrap gap-2">
                                      {profileForm.allergies.length > 0 ? profileForm.allergies.map((a, i) => (
                                         <span key={i} className="px-3 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm font-medium border border-red-100 dark:border-red-800">
                                            {a}
                                         </span>
                                      )) : <p className="text-sm text-slate-400 italic">None listed</p>}
                                   </div>
                                </div>
                                <div>
                                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Current Meds</p>
                                   {profileForm.currentMedications.length > 0 ? (
                                      <ul className="space-y-2">
                                         {profileForm.currentMedications.map((m, i) => (
                                            <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-200 text-sm">
                                               <Pill size={14} className="text-indigo-500" /> {m}
                                            </li>
                                         ))}
                                      </ul>
                                   ) : <p className="text-sm text-slate-400 italic">None listed</p>}
                                </div>
                             </div>
                          </div>

                          {/* Contact & Insurance */}
                          <div className="pt-8 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                     <ShieldCheck className="text-indigo-600" size={20} /> Emergency Contact
                                  </h4>
                                  <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                     {profileForm.emergencyContact?.name ? (
                                        <div className="space-y-2">
                                           <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                                              <User size={16} /> {profileForm.emergencyContact.name} 
                                              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({profileForm.emergencyContact.relation})</span>
                                           </div>
                                           <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                              <Phone size={14} /> {profileForm.emergencyContact.phone}
                                           </div>
                                        </div>
                                     ) : <p className="text-sm text-slate-400 italic">No contact set</p>}
                                  </div>
                               </div>

                               <div>
                                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                     <FileBadge className="text-blue-600" size={20} /> Insurance Info
                                  </h4>
                                  <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                      {profileForm.insuranceProvider ? (
                                         <div className="space-y-2">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                               {profileForm.insuranceProvider}
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                               <CreditCard size={14} /> ID: <span className="font-mono">{profileForm.insurancePolicyNumber || 'N/A'}</span>
                                            </div>
                                         </div>
                                      ) : <p className="text-sm text-slate-400 italic">No insurance info</p>}
                                  </div>
                               </div>
                          </div>
                       </div>
                    ) : (
                       // Edit Form
                       <form onSubmit={handleProfileSave} className="space-y-8 animate-in fade-in duration-300">
                          
                          {/* Avatar Upload UI */}
                          <div className="flex justify-center mb-6">
                             {isProfileCameraOpen ? (
                                // Camera UI
                                <div className="relative w-40 h-40 bg-slate-900 rounded-full overflow-hidden flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
                                   <video ref={profileVideoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
                                   <canvas ref={profileCanvasRef} className="hidden" />
                                   <button type="button" onClick={captureProfilePhoto} className="absolute bottom-4 z-20 p-2 bg-white rounded-full text-slate-900 shadow-lg hover:scale-105 transition-transform"><Camera size={20}/></button>
                                   <button type="button" onClick={stopProfileCamera} className="absolute top-4 right-4 z-20 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"><X size={16}/></button>
                                </div>
                             ) : (
                                 <div className="relative group">
                                     <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800">
                                        <img src={profileAvatar || user.avatar} alt="Profile" className="object-cover w-full h-full" />
                                     </div>
                                     <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => profileFileInputRef.current?.click()}>
                                        <Camera className="text-white" size={24} />
                                     </div>
                                     <input type="file" ref={profileFileInputRef} className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                                     
                                     <div className="absolute -bottom-2 -right-2 flex gap-1">
                                        <button type="button" onClick={() => profileFileInputRef.current?.click()} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-teal-600"><Upload size={16}/></button>
                                        <button type="button" onClick={startProfileCamera} className="p-2 bg-teal-600 rounded-full shadow-md text-white hover:bg-teal-700"><Camera size={16}/></button>
                                     </div>
                                 </div>
                             )}
                          </div>

                          {/* Personal Info Section */}
                          <div className="bg-white dark:bg-slate-800 rounded-xl">
                             <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Personal Information</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="col-span-1 md:col-span-2">
                                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
                                   <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Age</label>
                                    <input type="number" value={profileForm.age} onChange={e => setProfileForm({...profileForm, age: parseInt(e.target.value) || 0})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Gender</label>
                                    <select value={profileForm.gender} onChange={e => setProfileForm({...profileForm, gender: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white">
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                             </div>
                          </div>

                          {/* Vitals Section */}
                          <div className="bg-white dark:bg-slate-800 rounded-xl">
                             <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Key Vitals</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Blood Type</label>
                                    <select value={profileForm.bloodType} onChange={e => setProfileForm({...profileForm, bloodType: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white">
                                        <option value="">Select Type</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div>
                                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Height</label>
                                   <input type="text" placeholder="e.g. 5'10" value={profileForm.height} onChange={e => setProfileForm({...profileForm, height: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                </div>
                                <div>
                                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Weight</label>
                                   <input type="text" placeholder="e.g. 165 lbs" value={profileForm.weight} onChange={e => setProfileForm({...profileForm, weight: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                </div>
                             </div>
                          </div>
                          
                          {/* Medical Section */}
                          <div className="bg-white dark:bg-slate-800 rounded-xl">
                             <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Medical History</h4>
                             <div className="space-y-4">
                                <div>
                                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Chronic Conditions (comma separated)</label>
                                   <textarea value={profileForm.chronicConditions ? profileForm.chronicConditions.join(', ') : ''} onChange={e => setProfileForm({...profileForm, chronicConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full rounded-lg border px-3 py-2 h-16 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none resize-none dark:text-white" placeholder="e.g. Asthma, Diabetes" />
                                </div>
                                <div>
                                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Allergies (comma separated)</label>
                                   <textarea value={profileForm.allergies.join(', ')} onChange={e => setProfileForm({...profileForm, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full rounded-lg border px-3 py-2 h-16 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none resize-none dark:text-white" placeholder="e.g. Penicillin, Peanuts" />
                                </div>
                                <div>
                                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Current Medications (comma separated)</label>
                                   <textarea value={profileForm.currentMedications.join(', ')} onChange={e => setProfileForm({...profileForm, currentMedications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full rounded-lg border px-3 py-2 h-16 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none resize-none dark:text-white" placeholder="e.g. Lisinopril 10mg, Aspirin" />
                                </div>
                             </div>
                          </div>

                          {/* Contact & Insurance */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white dark:bg-slate-800 rounded-xl">
                                 <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Emergency Contact</h4>
                                 <div className="space-y-4">
                                     <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Contact Name</label>
                                        <input type="text" value={profileForm.emergencyContact?.name || ''} onChange={e => setProfileForm({...profileForm, emergencyContact: { ...profileForm.emergencyContact!, name: e.target.value }})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                     </div>
                                     <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Relationship</label>
                                        <input type="text" value={profileForm.emergencyContact?.relation || ''} onChange={e => setProfileForm({...profileForm, emergencyContact: { ...profileForm.emergencyContact!, relation: e.target.value }})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                     </div>
                                     <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Phone Number</label>
                                        <input type="tel" value={profileForm.emergencyContact?.phone || ''} onChange={e => setProfileForm({...profileForm, emergencyContact: { ...profileForm.emergencyContact!, phone: e.target.value }})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                     </div>
                                 </div>
                              </div>

                              <div className="bg-white dark:bg-slate-800 rounded-xl">
                                 <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Insurance</h4>
                                 <div className="space-y-4">
                                     <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Provider Name</label>
                                        <input type="text" value={profileForm.insuranceProvider || ''} onChange={e => setProfileForm({...profileForm, insuranceProvider: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                     </div>
                                     <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Policy / Member ID</label>
                                        <input type="text" value={profileForm.insurancePolicyNumber || ''} onChange={e => setProfileForm({...profileForm, insurancePolicyNumber: e.target.value})} className="w-full rounded-lg border px-3 py-2 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white" />
                                     </div>
                                 </div>
                              </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                             <Button type="button" variant="ghost" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                             <Button type="submit">Save Changes</Button>
                          </div>
                       </form>
                    )}
                  </div>
               </div>
             </div>
          )}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}