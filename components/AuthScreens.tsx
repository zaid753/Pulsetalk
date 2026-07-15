import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../services/firebase";


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './Button';
import { 
  Activity, ShieldCheck, Mail, Lock, User, Github, Smartphone, KeyRound, 
  CheckCircle2, Stethoscope, Eye, Pill, CalendarClock, Menu, X, ArrowRight,
  MessageSquareText, Globe, Star, Zap, ChevronRight, Play, Quote, Server, Heart,
  Sun, Moon, MapPin, Database, LayoutDashboard, Check, Linkedin
} from 'lucide-react';
import { AuthUser, UserRole, ContactSubmission } from '../types';
import { STORAGE_KEYS } from '../constants';

interface AuthScreensProps {
  onLogin: (user: AuthUser) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// --- Animation Hook ---
const useScrollAnimation = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-section, .reveal-3d').forEach((dom) => {
      observer.observe(dom);
    });

    return () => observer.disconnect();
  }, []);
};

// --- Particle Canvas Component ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

const ParticleCanvas: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });

  const initParticles = useCallback((width: number, height: number) => {
    // Increase density a bit for the constellation look
    const count = Math.min(Math.floor((width * height) / 12000), 120);
    const particles: Particle[] = [];
    
    // Monochromatic colors
    const color = theme === 'dark' ? 'rgba(255,255,255,' : 'rgba(71,85,105,';
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2 + 1.2,
        opacity: Math.random() * 0.4 + 0.4,
        color: color,
      });
    }
    particlesRef.current = particles;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      
      initParticles(width, height);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const connectionDist = 140;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Gentle mouse repulsion and interaction
        if (mouse.x > -1000) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = (150 - dist) / 150;
            p.vx += (dx / dist) * force * 0.2;
            p.vy += (dy / dist) * force * 0.2;

            // Draw line from mouse to particle
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            const mouseLineOpacity = (1 - dist / 150) * 0.25;
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(255,255,255,${mouseLineOpacity})`
              : `rgba(71,85,105,${mouseLineOpacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Friction/Damping to keep speeds sane
        p.vx *= 0.97;
        p.vy *= 0.97;

        // Apply constant slight speed to avoid particles stopping
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed < 0.2) {
          const angle = Math.random() * Math.PI * 2;
          p.vx += Math.cos(angle) * 0.1;
          p.vy += Math.sin(angle) * 0.1;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges with damping
        if (p.x < 0) {
          p.x = 0;
          p.vx = -p.vx * 0.9;
        } else if (p.x > width) {
          p.x = width;
          p.vx = -p.vx * 0.9;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy = -p.vy * 0.9;
        } else if (p.y > height) {
          p.y = height;
          p.vy = -p.vy * 0.9;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.opacity + ')';
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < connectionDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineOpacity = (1 - d / connectionDist) * 0.18;
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(255,255,255,${lineOpacity})`
              : `rgba(71,85,105,${lineOpacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [theme, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: theme === 'dark' ? 0.7 : 0.5 }}
    />
  );
};

// --- CountUp Component ---
interface CountUpProps { 
  end: number; 
  duration?: number; 
  prefix?: string; 
  suffix?: string; 
  decimals?: number;
  keepIncreasing?: boolean;
  fluctuate?: boolean;
}

const CountUp: React.FC<CountUpProps> = ({ 
  end, 
  duration = 4000, 
  prefix = '', 
  suffix = '', 
  decimals = 0,
  keepIncreasing = false,
  fluctuate = false
}) => {
  const [count, setCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;
          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Ease out quart for smooth slow stop
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            
            setCount(easeProgress * end);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(end);
              setIsFinished(true);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  // Real-time updates after animation
  useEffect(() => {
    if (!isFinished) return;
    
    let interval: any;

    if (keepIncreasing) {
       // Simulate live counter incrementing slowly
       interval = setInterval(() => {
         setCount(prev => prev + (Math.random() * 0.01));
       }, 2500);
    } else if (fluctuate) {
       // Simulate live metric fluctuation
       interval = setInterval(() => {
         const variance = (Math.random() - 0.5) * (end * 0.05); // +/- 5% variance
         setCount(end + variance);
       }, 3000);
    }

    return () => clearInterval(interval);
  }, [isFinished, keepIncreasing, fluctuate, end]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
};

// --- Auth Modal Component ---
const AuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialView: 'login' | 'signup';
  initialRole?: UserRole;
  onLogin: (user: AuthUser) => void;
}> = ({ isOpen, onClose, initialView, initialRole, onLogin }) => {
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole || 'patient');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [passkey, setPasskey] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

  useEffect(() => {
    setView(initialView);
    if (initialRole) setRole(initialRole);
    setPasskey('');
    setPasskeyError('');
  }, [initialView, isOpen, initialRole]);

  useEffect(() => {
    setPasskey('');
    setPasskeyError('');
  }, [role, view]);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPasskeyError('');
    
    if (role === 'admin') {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (passkey === '123456') {
        completeLogin();
      } else {
        setPasskeyError('Invalid admin passkey. Please try again.');
      }
      setIsLoading(false);
      return;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (view === 'signup' || view === 'login') {
      if (email.includes('mfa')) {
        setView('mfa');
      } else {
        completeLogin();
      }
    } else if (view === 'mfa') {
      completeLogin();
    }
    setIsLoading(false);
  };

 const handleGoogleLogin = async () => {
  setIsLoading(true);
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    const firebaseUser: AuthUser = {
      id: user.uid,
      email: user.email || "",
      name: user.displayName || "User",
      role: "patient",
      avatar: user.photoURL || ""
    };

    onLogin(firebaseUser);
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    alert("Google sign-in failed");
  } finally {
    setIsLoading(false);
  }
};

  const completeLogin = () => {
    const userEmail = email || (role === 'admin' ? 'admin@pulsetalk.ai' : 'user@example.com');
    const userName = email.split('@')[0] || (role === 'admin' ? 'Admin' : 'User');
    const userAvatar = 'https://ui-avatars.com/api/?name=' + (userEmail || role) + '&background=0D9488&color=fff';

    let allUsers: AuthUser[] = [];
    try {
      allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
    } catch (e) {
      console.error("Error parsing user list", e);
    }

    let authenticatedUser = allUsers.find(u => u.email === userEmail);

    if (!authenticatedUser) {
      // Create new user record
      authenticatedUser = {
        id: Date.now().toString(),
        email: userEmail,
        name: userName,
        role: role,
        avatar: userAvatar
      };
      allUsers.push(authenticatedUser);
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(allUsers));
    } else {
      // Update existing user
      if (role !== 'patient') { 
          authenticatedUser.role = role;
          const idx = allUsers.findIndex(u => u.id === authenticatedUser!.id);
          if (idx !== -1) {
              allUsers[idx] = authenticatedUser;
              localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(allUsers));
          }
      }
    }

    onLogin(authenticatedUser);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-8 pt-8 pb-4 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4 text-teal-600 dark:text-teal-400">
              {view === 'login' ? <KeyRound size={26}/> : view === 'signup' ? <User size={26}/> : <ShieldCheck size={26}/>}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {view === 'login' && (role === 'admin' ? "Admin Access" : "Welcome Back")}
              {view === 'signup' && "Create Account"}
              {view === 'mfa' && "Security Check"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              {view === 'login' && (role === 'admin' ? "Restricted access for system administrators." : "Sign in to access your personal health dashboard.")}
              {view === 'signup' && "Join PulseTalk for secure AI-powered health insights."}
              {view === 'mfa' && "Enter the 6-digit code sent to your verified device."}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 pt-4 overflow-y-auto">
          <form onSubmit={handleAuth} className="space-y-5">
            {view !== 'mfa' ? (
              <>
                {role === 'admin' ? (
                  <div className="animate-in slide-in-from-top-3 fade-in">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Admin Passkey</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                      <input 
                        type="password" required value={passkey} onChange={(e) => setPasskey(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-white"
                        placeholder="Enter admin passkey"
                      />
                    </div>
                    {passkeyError && (
                      <p className="text-red-500 text-xs mt-1.5 font-medium">{passkeyError}</p>
                    )}
                  </div>
                ) : (
                  <>
                    {view === 'signup' && (
                      <div className="animate-in slide-in-from-top-2 fade-in">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Full Name</label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                          <input 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-white"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="animate-in slide-in-from-top-3 fade-in">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                        <input 
                          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-white"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>

                    <div className="animate-in slide-in-from-top-4 fade-in">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Password</label>
                        {view === 'login' && <a href="#" className="text-xs text-teal-600 hover:text-teal-700 font-medium">Forgot?</a>}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                        <input 
                          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-white"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {/* Role Selection - Hidden if initialRole is set via Footer */}
                    {!initialRole && (
                      <div className="pt-2 animate-in slide-in-from-top-5 fade-in">
                         <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">I am a...</label>
                         <div className="grid grid-cols-2 gap-3">
                           {(['patient', 'clinician'] as const).map((r) => (
                             <button
                               key={r}
                               type="button"
                               onClick={() => setRole(r)}
                               className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all capitalize flex items-center justify-center ${
                                 role === r 
                                 ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30 dark:border-teal-500 dark:text-teal-300 ring-1 ring-teal-500' 
                                 : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                               }`}
                             >
                               {r}
                             </button>
                           ))}
                         </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="py-6 text-center animate-in zoom-in-95 fade-in">
                 <div className="mx-auto w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-teal-50/50 dark:ring-teal-900/40">
                    <Smartphone className="text-teal-600 dark:text-teal-400" size={32} />
                 </div>
                 <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Enter code ending in 88</p>
                 <div className="flex gap-2 justify-center mb-2">
                   {[...Array(6)].map((_, i) => (
                      <div key={i} className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-mono transition-colors ${
                        mfaCode[i] 
                        ? 'border-teal-500 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        {mfaCode[i] || ''}
                      </div>
                   ))}
                 </div>
                 <input 
                   autoFocus
                   value={mfaCode}
                   onChange={(e) => setMfaCode(e.target.value)}
                   className="absolute opacity-0 inset-0 cursor-default"
                   maxLength={6}
                   autoComplete="one-time-code"
                 />
                 <button type="button" className="text-xs text-slate-500 hover:text-teal-600 mt-4 underline">Resend code</button>
              </div>
            )}

            <Button type="submit" className="w-full py-3.5 text-base font-bold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all active:scale-[0.98]" isLoading={isLoading}>
              {view === 'login' ? "Access Portal" : view === 'signup' ? "Create Secure Account" : "Verify Identity"}
            </Button>

            {/* Social Logins - Only show for general login/signup (not Admin/MFA) */}
            {view !== 'mfa' && role !== 'admin' && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="flex flex-col">
                    <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>
                </div>
              </div>
            )}
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
            {view === 'login' ? (
              <p>Don't have an account? <button onClick={() => setView('signup')} className="text-teal-600 dark:text-teal-400 font-bold hover:underline transition-colors">Register here</button></p>
            ) : (
              <p>Already registered? <button onClick={() => setView('login')} className="text-teal-600 dark:text-teal-400 font-bold hover:underline transition-colors">Sign in</button></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Landing Page Component ---

export const AuthScreens: React.FC<AuthScreensProps> = ({ onLogin, theme, onToggleTheme }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authRole, setAuthRole] = useState<UserRole | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  useScrollAnimation();

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        setScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuth = (view: 'login' | 'signup', role?: UserRole) => {
    setAuthView(view);
    setAuthRole(role);
    setIsAuthOpen(true);
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.firstName || !contactForm.email || !contactForm.message) return;

    setIsContactSubmitting(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const existingSubmissions: ContactSubmission[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTACT_SUBMISSIONS) || '[]');
      const newSubmission: ContactSubmission = {
        id: Date.now().toString(),
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email,
        message: contactForm.message,
        timestamp: new Date().toISOString(),
        status: 'new'
      };
      
      localStorage.setItem(STORAGE_KEYS.CONTACT_SUBMISSIONS, JSON.stringify([...existingSubmissions, newSubmission]));
      
      // Redirect to mailto so the user can send the email directly
      const subject = `PulseTalk Contact Form: Message from ${contactForm.firstName} ${contactForm.lastName}`;
      const body = `Contact Information:\n- Name: ${contactForm.firstName} ${contactForm.lastName}\n- Email: ${contactForm.email}\n\nMessage:\n${contactForm.message}`;
      window.location.href = `mailto:mohammedjaid813@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setContactSuccess(true);
      setContactForm({ firstName: '', lastName: '', email: '', message: '' });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (e) {
      console.error("Failed to save contact submission", e);
    } finally {
      setIsContactSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden transition-colors duration-300 relative">
      {/* Global Particle Canvas */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ParticleCanvas theme={theme} />
      </div>
      <style>{`
        .reveal-3d {
          opacity: 0;
          transform: perspective(1000px) rotateX(10deg) translateY(40px) scale(0.95);
          transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .reveal-3d.is-visible {
          opacity: 1;
          transform: perspective(1000px) rotateX(0) translateY(0) scale(1);
        }
        
        .preserve-3d {
          transform-style: preserve-3d;
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.15); }
          50% { box-shadow: 0 0 30px 10px rgba(20,184,166,0.1); }
        }
        .animate-float-gentle { animation: float-gentle 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        
        .hero-text-reveal {
          opacity: 0;
          transform: translateY(30px);
          animation: heroReveal 0.8s ease-out forwards;
        }
        .hero-text-reveal-delay-1 { animation-delay: 0.15s; }
        .hero-text-reveal-delay-2 { animation-delay: 0.3s; }
        .hero-text-reveal-delay-3 { animation-delay: 0.45s; }
        @keyframes heroReveal {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        initialView={authView}
        initialRole={authRole}
        onLogin={onLogin} 
      />

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-teal-600 p-2 rounded-xl shadow-lg shadow-teal-600/20 group-hover:scale-105 transition-transform">
              <Activity className="text-white h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">PulseTalk</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Reviews', 'Contact'].map((item) => (
               <button 
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(/\s+/g, '-'))} 
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-teal-600 after:transition-all hover:after:w-full"
               >
                  {item}
               </button>
            ))}
            
            <button 
              onClick={onToggleTheme} 
              className="p-2 text-slate-600 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            
            <button onClick={() => openAuth('login')} className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Log In</button>
            <button 
               onClick={() => openAuth('signup')} 
               className="px-5 py-2.5 bg-slate-900 dark:bg-teal-600 hover:bg-teal-600 dark:hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-slate-900/20 hover:shadow-teal-600/20 transition-all transform hover:-translate-y-0.5"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-slate-600 dark:text-slate-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2">
            <button onClick={() => scrollToSection('features')} className="text-left font-medium text-slate-600 dark:text-slate-300">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-left font-medium text-slate-600 dark:text-slate-300">How It Works</button>
            <button onClick={() => scrollToSection('contact')} className="text-left font-medium text-slate-600 dark:text-slate-300">Contact</button>
            <div className="flex items-center justify-between">
               <span className="text-slate-600 dark:text-slate-300 font-medium">Appearance</span>
               <button onClick={onToggleTheme} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
               </button>
            </div>
            <hr className="border-slate-100 dark:border-slate-800 my-2" />
            <button onClick={() => openAuth('login')} className="text-left font-medium text-slate-900 dark:text-white">Sign In</button>
            <button onClick={() => openAuth('signup')} className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold shadow-md">Get Started</button>
          </div>
        )}
      </nav>

      {/* Hero Section with 3D Scroll Effect + Particles */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-[900px] transition-colors duration-300 bg-transparent">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
           <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-200/40 dark:bg-teal-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"></div>
           <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"></div>
           <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen"></div>
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-soft-light dark:opacity-20"></div>
        </div>

        {/* Particle Effect Canvas Removed (Now Global) */}

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          <div className="space-y-8">
            
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] text-slate-900 dark:text-white tracking-tight">
              <span className="hero-text-reveal inline-block">Instant Triage.</span> <br/>
              <span className="hero-text-reveal hero-text-reveal-delay-1 inline-block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-400 dark:to-indigo-400">Total Privacy.</span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg font-light hero-text-reveal hero-text-reveal-delay-2">
              Securely analyze symptoms, check interactions, and book specialists in seconds. Your health data stays yours.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2 hero-text-reveal hero-text-reveal-delay-3">
              <button onClick={() => openAuth('signup')} className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold rounded-xl shadow-xl shadow-teal-600/20 transition-all transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-600/30 flex items-center justify-center gap-2 group animate-pulse-glow">
                Start Consultation <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => scrollToSection('features')} className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 text-lg font-semibold rounded-xl transition-all flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm hover:shadow-md gap-2 hover:-translate-y-0.5">
                <Play size={18} fill="currentColor" className="text-slate-400" /> Demo
              </button>
            </div>
            
          </div>

          <div className="relative h-[600px] w-full flex items-center justify-center perspective-[1200px]" style={{ perspective: '1200px' }}>
            {/* Abstract Decorative Circles */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
               <div className="w-[500px] h-[500px] border border-slate-200 dark:border-slate-700 rounded-full opacity-50 animate-[spin_60s_linear_infinite]"></div>
               <div className="w-[350px] h-[350px] border border-slate-200 dark:border-slate-700 rounded-full opacity-50 absolute animate-[spin_40s_linear_infinite_reverse]"></div>
            </div>

            {/* Main Mockup Card with Scroll-Driven 3D Tilt */}
            <div 
              className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
              style={{
                 transform: `rotateX(${Math.min(20, scrollY * 0.05)}deg) rotateY(${Math.min(10, scrollY * 0.02)}deg) translateZ(${-scrollY * 0.2}px)`,
                 transformStyle: 'preserve-3d',
                 transition: 'transform 0.1s ease-out'
              }}
            >
               {/* Mockup Header */}
               <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                     <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PulseTalk AI</div>
               </div>
               
               {/* Mockup Body */}
               <div className="p-6 space-y-4">
                  <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <User size={16} />
                     </div>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl rounded-tl-none text-xs text-indigo-900 dark:text-indigo-200 max-w-[80%]">
                        I have a weird rash on my arm. It's itchy and red.
                     </div>
                  </div>
                  
                  {/* Image Attachment Mock */}
                  <div className="flex gap-3 justify-end">
                     <div className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                        <img src="https://images.unsplash.com/photo-1623944889288-cd147dbb517c?auto=format&fit=crop&w=200&q=80" alt="Rash" className="w-32 h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Eye className="text-white" size={20} />
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/30">
                        <Activity size={16} />
                     </div>
                     <div className="space-y-2 max-w-[90%]">
                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-xs text-slate-600 dark:text-slate-300 shadow-sm">
                           Analyzing image patterns...
                           <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
                              <div className="bg-teal-500 h-full w-2/3 animate-[shimmer_2s_infinite]"></div>
                           </div>
                        </div>
                        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 p-4 rounded-2xl text-xs text-teal-900 dark:text-teal-200 shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-500">
                           <div className="flex items-center gap-2 font-bold mb-1 text-teal-700 dark:text-teal-400">
                              <ShieldCheck size={14} /> Analysis Complete
                           </div>
                           Visual indicators suggest mild contact dermatitis. I recommend booking a dermatologist for confirmation.
                           <button className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-colors">
                              Book Appointment
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Floating Widgets - Parallax + Float Animation */}
            <div 
               className="absolute top-[20%] right-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-float-gentle"
               style={{ transform: `translateY(${scrollY * -0.15}px) translateZ(50px)` }}
            >
               <div className="flex items-center gap-3">
                  <div className="bg-rose-100 dark:bg-rose-900/20 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                     <Heart size={20} />
                  </div>
                  <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">Vitals</p>
                     <p className="text-sm font-bold text-slate-900 dark:text-white">Normal</p>
                  </div>
               </div>
            </div>

            <div 
               className="absolute bottom-[20%] left-[-20px] bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-float-slow"
               style={{ transform: `translateY(${scrollY * -0.08}px) translateZ(80px)` }}
            >
               <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                     <Lock size={20} />
                  </div>
                  <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">Encryption</p>
                     <p className="text-sm font-bold text-slate-900 dark:text-white">AES-256</p>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* Logo Strip */}
        <div className="border-y border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-8 mt-12">
           <div className="max-w-7xl mx-auto px-6">
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Trusted by Innovative Healthcare Providers</p>
              <div className="flex justify-center flex-wrap gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                 {['MedCore', 'HealthPlus', 'Vitality Systems', 'CareNetwork', 'BioSync'].map((name, i) => (
                    <div key={i} className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-slate-200">
                       <div className={`w-6 h-6 rounded ${i % 2 === 0 ? 'bg-slate-800 dark:bg-slate-200' : 'border-2 border-slate-800 dark:border-slate-200'}`}></div>
                       {name}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid (Bento Style) */}
      <section id="features" className="py-24 transition-colors duration-300 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-3d">
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Complete Clinical Intelligence</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg font-light leading-relaxed">
               More than just a chatbot. PulseTalk acts as a comprehensive triage layer, reducing administrative burden and prioritizing care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Feature 1: Large */}
            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 group overflow-hidden relative reveal-3d delay-100">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 group-hover:rotate-12 duration-500 dark:opacity-5 dark:group-hover:opacity-10">
                  <MessageSquareText size={200} className="dark:text-white" />
               </div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                     <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/20">
                        <Zap size={24} />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Real-time Triage Engine</h3>
                     <p className="text-slate-600 dark:text-slate-400 max-w-md">Our NLP engine detects urgency cues in natural conversation, instantly categorizing cases as Low, Medium, or Critical priority to route patients correctly.</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                     <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">Symptom Parsing</span>
                     <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">Urgency Scoring</span>
                  </div>
               </div>
            </div>

            {/* Feature 2: Tall */}
            <div className="md:row-span-2 bg-teal-900 rounded-3xl p-8 border border-teal-800 text-white hover:shadow-xl transition-all duration-300 relative overflow-hidden group reveal-3d delay-200">
               <div className="absolute inset-0 bg-gradient-to-b from-teal-800/50 to-teal-900/50"></div>
               <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center text-white mb-6">
                     <Eye size={24} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Visual Dermatology</h3>
                  <p className="text-teal-100/80 mb-8 leading-relaxed">
                     Computer vision algorithms analyze skin conditions from user-uploaded photos, providing preliminary categorization with 94% accuracy against standard datasets.
                  </p>
                  
                  <div className="mt-auto bg-teal-800/50 rounded-2xl p-4 backdrop-blur-sm border border-teal-700">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Analysis Confidence</span>
                        <span className="text-sm font-bold">98.2%</span>
                     </div>
                     <div className="w-full bg-teal-900/50 rounded-full h-2 overflow-hidden">
                        <div className="bg-teal-400 h-full w-[98%]"></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Feature 3: Standard */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group reveal-3d delay-300 transform hover:-translate-y-2">
               <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 group-hover:scale-110 transition-transform">
                  <Pill size={24} />
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Interaction Check</h3>
               <p className="text-slate-600 dark:text-slate-400 text-sm">Cross-references OTC suggestions with patient medication profiles to prevent adverse reactions.</p>
            </div>

            {/* Feature 4: Standard */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group reveal-3d delay-400 transform hover:-translate-y-2">
               <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                  <CalendarClock size={24} />
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Smart Scheduling</h3>
               <p className="text-slate-600 dark:text-slate-400 text-sm">Seamlessly books appointments with relevant specialists when AI triage indicates care is needed.</p>
            </div>
            
             {/* Feature 5: Wide */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 group reveal-3d delay-500 flex items-center justify-between">
               <div className="max-w-md">
                   <div className="w-12 h-12 bg-slate-900 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-white mb-6">
                      <ShieldCheck size={24} />
                   </div>
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">HIPAA Compliant Core</h3>
                   <p className="text-slate-600 dark:text-slate-400">Zero-knowledge architecture ensures patient data is encrypted at rest and in transit. Session data is wiped automatically.</p>
               </div>
               <div className="hidden lg:block bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 transform group-hover:rotate-2 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
                     <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Encryption Active</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                     AES-256-GCM<br/>
                     TLS 1.3 Handshake<br/>
                     Key Exchange: ECDHE_RSA
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-20 text-white relative overflow-hidden border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
         <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center divide-x divide-slate-800">
               <div className="reveal-3d">
                  <div className="text-4xl lg:text-5xl font-bold text-teal-400 mb-2">
                     <CountUp end={24} suffix="/7" duration={3000} />
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Availability</div>
               </div>
               <div className="reveal-3d delay-100">
                  <div className="text-4xl lg:text-5xl font-bold text-indigo-400 mb-2">
                     <CountUp end={2} prefix="< " suffix="s" decimals={1} duration={4000} fluctuate={true} />
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Response Time</div>
               </div>
               <div className="reveal-3d delay-200">
                  <div className="text-4xl lg:text-5xl font-bold text-rose-400 mb-2">
                     <CountUp end={94} suffix="%" duration={3500} />
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Triage Accuracy</div>
               </div>
               <div className="reveal-3d delay-300">
                  <div className="text-4xl lg:text-5xl font-bold text-amber-400 mb-2">
                     <CountUp end={1} suffix="M+" decimals={1} duration={5000} keepIncreasing={true} />
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Symptoms Processed</div>
               </div>
            </div>
         </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="py-24 transition-colors duration-300 bg-transparent">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 reveal-3d">
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white">What Professionals Say</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
               {[
                  {
                     text: "PulseTalk has reduced our administrative triage load by 40%. The preliminary reports are surprisingly detailed.",
                     author: "Dr. Elena Rossi",
                     role: "Chief of Medicine, City Hospital",
                     bg: "bg-white dark:bg-slate-900"
                  },
                  {
                     text: "The interaction checker saved a patient of mine from a serious drug conflict before they even reached my office.",
                     author: "Dr. Marcus Chen",
                     role: "GP, Private Practice",
                     bg: "bg-teal-50 border-teal-100 dark:bg-teal-900/20 dark:border-teal-800"
                  },
                  {
                     text: "Finally, an AI tool that respects privacy first. The zero-retention policy made compliance approval a breeze.",
                     author: "Sarah Jenkins",
                     role: "Hospital Admin",
                     bg: "bg-white dark:bg-slate-900"
                  }
               ].map((review, i) => (
                  <div key={i} className={`p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm ${review.bg} reveal-3d delay-${(i+1)*100} hover:shadow-md transition-shadow transform hover:-translate-y-1 duration-300`}>
                     <Quote className="text-teal-500 mb-4 opacity-50" size={32} />
                     <p className="text-slate-700 dark:text-slate-300 italic mb-6 leading-relaxed">"{review.text}"</p>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                           {review.author.charAt(0)}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900 dark:text-white">{review.author}</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">{review.role}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="reveal-3d">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Get in Touch</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Have questions about enterprise integration, security protocols, or just want to see a deeper demo? Our team is ready to help.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-teal-600 shadow-sm border border-slate-100 dark:border-slate-700">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Email Us</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">mohammedjaid813@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Headquarters</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Varanasi, U.P</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none reveal-3d delay-200 relative overflow-hidden">
              {contactSuccess && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 flex flex-col items-center justify-center z-10 animate-in fade-in">
                   <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                      <Check size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white">Message Sent!</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">We'll get back to you shortly.</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">First Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                      value={contactForm.firstName}
                      onChange={(e) => setContactForm({...contactForm, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm({...contactForm, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address</label>
                  <input 
                    type="email" required
                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Message</label>
                  <textarea 
                    rows={4} required
                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none dark:text-white"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  ></textarea>
                </div>
                <Button 
                  type="submit" 
                  className="w-full py-4 text-base font-bold shadow-lg shadow-teal-600/20"
                  isLoading={isContactSubmitting}
                >
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-200 dark:border-slate-800 text-sm transition-colors duration-300 bg-transparent">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
               <div className="col-span-2 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="bg-teal-600 p-1.5 rounded-lg">
                       <Activity className="text-white h-4 w-4" />
                     </div>
                     <span className="font-bold text-lg text-slate-900 dark:text-white">PulseTalk</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                     The privacy-first AI assistant for modern healthcare triage and coordination.
                  </p>
               </div>
               
               <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4">Product</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Features</a></li>
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Security</a></li>
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">API</a></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4">Company</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">About</a></li>
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Careers</a></li>
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Contact</a></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4">Internal</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Staff Login</a></li>
                     <li><a href="#" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Documentation</a></li>
                  </ul>
               </div>
            </div>
            
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 dark:text-slate-400">
               <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <p>&copy; 2026 PulseTalk AI Inc.</p>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                  <button 
                     onClick={() => openAuth('login', 'admin')} 
                     className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 transition-colors font-semibold"
                  >
                     <LayoutDashboard size={12} /> Admin Portal
                  </button>
               </div>
               <div className="flex gap-6">
                  <a href="https://github.com/zaid753" target="_blank" rel="noopener noreferrer" title="GitHub">
                     <Github size={20} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"/>
                  </a>
                  <a href="https://www.linkedin.com/in/mohammedjaid" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                     <Linkedin size={20} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"/>
                  </a>
                  <a href="https://mohammedjaid-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer" title="Portfolio">
                     <Globe size={20} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"/>
                  </a>
                  <Server size={20} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors" title="Server Status"/>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}