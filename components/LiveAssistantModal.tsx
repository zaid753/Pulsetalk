import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { X, Mic, MicOff, PhoneOff, Activity, Loader2, Sparkles, AudioLines, ChevronDown, Square } from 'lucide-react';
import { SYSTEM_INSTRUCTION } from '../constants';
import { Button } from './Button';
import { BookAppointmentArgs, UserProfile } from '../types';

// --- Tool Definition ---
const bookAppointmentTool: FunctionDeclaration = {
  name: 'bookAppointment',
  parameters: {
    type: Type.OBJECT,
    description: 'Schedule a medical appointment for the user.',
    properties: {
      specialty: {
        type: Type.STRING,
        description: 'The type of doctor or specialty needed (e.g., Dermatologist, GP).',
      },
      date: {
        type: Type.STRING,
        description: 'The requested date for the appointment (YYYY-MM-DD format preferred).',
      },
      time: {
        type: Type.STRING,
        description: 'The requested time for the appointment (HH:MM format).',
      },
      reason: {
        type: Type.STRING,
        description: 'A brief reason for the visit.',
      },
    },
    required: ['specialty', 'date', 'time', 'reason'],
  },
};

// --- Audio Helper Functions ---

function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createPcmBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Component ---

interface LiveAssistantModalProps {
  onClose: () => void;
  onBookAppointment: (args: BookAppointmentArgs) => Promise<string>;
  userProfile: UserProfile;
  language?: string;
}

interface TranscriptItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
}

export const LiveAssistantModal: React.FC<LiveAssistantModalProps> = ({ onClose, onBookAppointment, userProfile, language }) => {
  const handleEndCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    onClose();
  };
  const [status, setStatus] = useState<'connecting' | 'connected' | 'speaking' | 'processing' | 'error' | 'disconnected'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [frequencies, setFrequencies] = useState<number[]>(Array(15).fill(0));
  const [conversation, setConversation] = useState<TranscriptItem[]>([]);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Refs for logic that needs to be accessed inside closures
  const onBookAppointmentRef = useRef(onBookAppointment);
  const isMutedRef = useRef(isMuted);

  // Audio Contexts & Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update refs when props/state change
  useEffect(() => {
    onBookAppointmentRef.current = onBookAppointment;
  }, [onBookAppointment]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Scroll to bottom of transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  useEffect(() => {
    let active = true;

    // Helper to update transcript safely
    const appendToTranscript = (sender: 'user' | 'model', text: string) => {
      setConversation(prev => {
        const last = prev[prev.length - 1];
        if (last && last.sender === sender) {
          return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        } else {
          return [...prev, { id: Date.now().toString(), sender, text }];
        }
      });
      // Simple logic to detect if model is "processing" or speaking based on events
      if (sender === 'model') setStatus('speaking');
    };

    const startSession = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY });
        
        // 1. Initialize Audio Contexts
        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        // 2. Setup visualizer
        analyzerRef.current = inputContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 64; // Higher resolution for smoother wave
        analyzerRef.current.smoothingTimeConstant = 0.8;

        // 3. Get Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Prepare context
        const allergiesStr = userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Unknown';
        const profileContext = `\n\n[USER CONTEXT: Name: ${userProfile.name || 'Unknown'}, Age: ${userProfile.age || 'Unknown'}, Allergies: ${allergiesStr}. Please consider these factors (especially allergies) when suggesting remedies.]`;

        // 4. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            tools: [{ functionDeclarations: [bookAppointmentTool] }],
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: SYSTEM_INSTRUCTION + profileContext + ` \n\nIMPORTANT FOR VOICE: You are speaking on a voice call. Keep your responses concise, conversational, and suitable for spoken output. Do not read out long lists unless asked. Use natural pauses.${
              language && language !== 'English' 
                ? `\n\nIMPORTANT: The user wants to consult in ${language}. You MUST respond and speak entirely in ${language} (bilingual is NOT preferred, speak exclusively in ${language}).`
                : ''
            }`,
          },
          callbacks: {
            onopen: () => {
              if (!active) return;
              setStatus('connected');
              
              const ctx = inputContextRef.current!;
              const source = ctx.createMediaStreamSource(stream);
              sourceRef.current = source;
              
              source.connect(analyzerRef.current!);

              const processor = ctx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

           processor.onaudioprocess = (e) => {
  if (isMutedRef.current) return;

  const session = sessionRef.current;

  // 🚨 IMPORTANT: stop if session is not active
  if (!session || status === 'disconnected' || status === 'error') return;

  const inputData = e.inputBuffer.getChannelData(0);
  const pcmBlob = createPcmBlob(inputData);

  try {
    session.sendRealtimeInput({ media: pcmBlob });
  } catch (err) {
    console.warn("WebSocket closed, skipping send");
  }
};

              source.connect(processor);
              processor.connect(ctx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (!active) return;

              // Transcription
              if (msg.serverContent?.inputTranscription) {
                 appendToTranscript('user', msg.serverContent.inputTranscription.text);
                 setStatus('processing'); // User finished talking, model thinking
              }
              if (msg.serverContent?.outputTranscription) {
                 appendToTranscript('model', msg.serverContent.outputTranscription.text);
              }

              // Tool Calls
              if (msg.toolCall) {
                setStatus('processing');
                const responses = [];
                for (const fc of msg.toolCall.functionCalls) {
                    if (fc.name === 'bookAppointment') {
                        const args = fc.args as any;
                        const result = await onBookAppointmentRef.current(args);
                        responses.push({
                            id: fc.id,
                            name: fc.name,
                            response: { result: result }
                        });
                    }
                }
                if (responses.length > 0) {
                     sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: responses
                        });
                     });
                }
              }

              // Audio Output
              const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && outputContextRef.current) {
                setStatus('speaking');
                const ctx = outputContextRef.current;
                const audioBuffer = await decodeAudioData(
                  decodeAudio(base64Audio),
                  ctx,
                  24000,
                  1
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.onended = () => {
                  audioQueueRef.current.delete(source);
                  if (audioQueueRef.current.size === 0) {
                      setStatus('connected'); // Back to idle/listening
                  }
                };

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                audioQueueRef.current.add(source);
              }

              if (msg.serverContent?.interrupted) {
                audioQueueRef.current.forEach(s => {
                  try { s.stop(); } catch(e) {}
                });
                audioQueueRef.current.clear();
                nextStartTimeRef.current = 0;
                setStatus('connected');
              }
            },
            onclose: () => {
  console.log("Session closed");

  // ❗ STOP AUDIO PROCESSING
  if (processorRef.current) {
    processorRef.current.disconnect();
    processorRef.current.onaudioprocess = null;
  }

  if (sourceRef.current) {
    sourceRef.current.disconnect();
  }

  if (active) setStatus('disconnected');
},
            onerror: (err) => {
              console.error("Session error:", err);
              if (active) setStatus('error');
            }
          }
        });

        sessionRef.current = await sessionPromise;
        // Prompt the model to speak first with the specific phrase
        const initialText = language && language !== 'English'
          ? `You are the AI doctor. Start the consultation immediately by greeting the user and asking how you can help, speaking entirely in ${language}. Do not use English.`
          : "You are the AI doctor. Start the consultation immediately by saying: 'Hey, how can I help you?'";
        await sessionRef.current.send([{ text: initialText }], true);

      } catch (e) {
        console.error("Failed to start live session:", e);
        setStatus('error');
      }
    };

    startSession();

    // Visualization Loop
    const updateVolume = () => {
      if (analyzerRef.current && status !== 'error' && status !== 'disconnected') {
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume for the main pulse
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(avg);

        // Extract 15 frequency bands for the animated bars
        const numBars = 15;
        const step = Math.floor(dataArray.length / numBars) || 1;
        const newFrequencies = Array.from({ length: numBars }, (_, i) => {
          return dataArray[i * step] || 0;
        });
        setFrequencies(newFrequencies);
      }
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };
    updateVolume();

    return () => {
    active = false;

    // ❗ STOP AUDIO PROCESSOR
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

}, []);

  const handleStopSpeaking = () => {
    audioQueueRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignored
      }
    });
    audioQueueRef.current.clear();
    nextStartTimeRef.current = 0;
    if (status === 'speaking' || status === 'processing') {
      setStatus('connected');
    }
  };

  // Dynamic visual styles based on status
  const getVisualState = () => {
    switch (status) {
      case 'connecting': return 'text-slate-400 animate-pulse';
      case 'speaking': return 'text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.6)]';
      case 'processing': return 'text-purple-400 animate-spin-slow drop-shadow-[0_0_15px_rgba(192,132,252,0.6)]';
      case 'error': return 'text-red-500';
      default: return 'text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.4)]';
    }
  };

  const getStatusText = () => {
     switch (status) {
        case 'connecting': return 'Establishing secure connection...';
        case 'processing': return 'PulseTalk is thinking...';
        case 'speaking': return 'Dr. AI is speaking...';
        case 'error': return '';
        case 'disconnected': return 'Session Ended';
        default: return 'Listening...';
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950/0 to-slate-950/0"></div>
         <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950/0 to-slate-950/0"></div>
         
         {/* Grid Pattern */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
         <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }}></div>
      </div>

      {/* Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start z-20">
         <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
                <Activity className="text-teal-400 h-4 w-4" />
             </div>
             <div>
                <h3 className="text-white font-semibold tracking-wide text-sm">PulseTalk <span className="text-teal-400">Live</span></h3>
                <p className="text-slate-500 text-teal-400 text-[10px] uppercase tracking-wider font-medium">Secure Triage Session</p>
             </div>
         </div>
          <button 
            onClick={handleEndCall}
            className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg relative z-10 mt-10">
        
        {/* The Core Visualizer */}
        <div className="relative h-64 w-64 flex items-center justify-center mb-12">
           {/* Outer Ripple */}
           <div 
             className={`absolute inset-0 rounded-full border border-teal-500/10 transition-transform duration-75 ease-out`}
             style={{ 
               transform: `scale(${1 + (volume / 255) * 1.5})`,
               opacity: Math.max(0.1, volume / 500)
             }} 
           />
           {/* Mid Ripple */}
           <div 
             className={`absolute inset-4 rounded-full border border-white/5 bg-gradient-to-tr from-teal-500/5 to-indigo-500/5 backdrop-blur-sm transition-transform duration-100 ease-out`}
             style={{ transform: `scale(${1 + (volume / 255) * 0.8})` }} 
           />
           
           {/* Inner Core */}
           <div className={`h-32 w-32 rounded-full relative flex items-center justify-center shadow-2xl transition-all duration-500 ${
               status === 'speaking' ? 'bg-indigo-500/20 shadow-indigo-500/30' : 
               status === 'processing' ? 'bg-purple-500/20 shadow-purple-500/30' :
               'bg-teal-500/20 shadow-teal-500/30'
           }`}>
             {/* Core Glow */}
             <div className={`absolute inset-0 rounded-full blur-xl opacity-50 transition-colors duration-500 ${
                status === 'speaking' ? 'bg-indigo-500' :
                status === 'processing' ? 'bg-purple-500' :
                'bg-teal-500'
             }`}></div>

             {/* Icon */}
             <div className={`relative z-10 transition-all duration-500 ${getVisualState()}`}>
               {status === 'connecting' ? <Loader2 size={40} className="animate-spin" /> :
                status === 'processing' ? <Sparkles size={40} /> :
                status === 'speaking' ? <AudioLines size={40} /> :
                <Mic size={40} />
               }
             </div>
           </div>
        </div>

        {/* Status Text */}
        <div className="mb-8 text-center space-y-2">
           <h2 className="text-2xl font-light text-white tracking-tight">
             {status === 'processing' ? "Analyzing..." : 
              status === 'speaking' ? "Speaking..." : 
              "Listening"}
           </h2>
           <p className={`text-sm font-medium transition-colors duration-300 ${
             status === 'error' ? 'text-red-400' : 'text-slate-400'
           }`}>
              {getStatusText()}
            </p>
         </div>

         {/* Visual Audio Waveform Equalizer */}
         {status !== 'connecting' && status !== 'disconnected' && status !== 'error' && !isMuted ? (
           <div className="flex items-end justify-center gap-1.5 h-16 my-4 select-none">
             {frequencies.map((freq, i) => {
               const height = Math.max(6, (freq / 255) * 60);
               return (
                 <div 
                   key={i} 
                   className="w-1.5 bg-gradient-to-t from-teal-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-75 ease-out shadow-sm"
                   style={{ height: `${height}px` }}
                 />
               );
             })}
           </div>
         ) : (
           <div className="flex items-center justify-center gap-1.5 h-16 my-4 select-none">
             {Array.from({ length: 15 }).map((_, i) => (
               <div 
                 key={i} 
                 className="w-1.5 h-1.5 bg-slate-700 dark:bg-slate-600 rounded-full"
               />
             ))}
           </div>
         )}

        {/* Floating Transcript (Teleprompter style) */}
        <div className="w-full h-32 relative group">
           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none"></div>
           <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none"></div>
           
           <div 
             className="h-full overflow-y-auto px-6 space-y-4 scroll-smooth scrollbar-hide text-center"
             ref={scrollRef}
           >
              {conversation.length === 0 ? (
                <p className="text-slate-600 text-sm mt-8 italic">Start speaking to begin consultation...</p>
              ) : (
                conversation.map((item, idx) => (
                  <div key={idx} className={`transition-opacity duration-500 ${
                    idx === conversation.length - 1 ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
                  }`}>
                    <p className={`text-lg font-medium leading-relaxed ${
                      item.sender === 'user' ? 'text-white' : 'text-indigo-200'
                    }`}>
                      {idx === conversation.length - 1 && item.sender === 'model' && <span className="text-xs text-indigo-400 uppercase tracking-widest block mb-1">PulseTalk</span>}
                      "{item.text}"
                    </p>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="w-full p-8 pb-10 flex justify-center z-20">
         <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-2 pl-6 pr-2 flex items-center gap-6 shadow-2xl shadow-black/50">
            
            {/* Visualizer Mini */}
            <div className="flex gap-1 h-4 items-center opacity-50">
               {[1,2,3,4].map(i => (
                  <div key={i} className="w-1 bg-white rounded-full transition-all duration-75" 
                       style={{ height: `${Math.max(4, Math.min(16, (volume / (10 * i)) * 10))}px` }} />
               ))}
            </div>

            <div className="h-8 w-px bg-white/10"></div>

            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full transition-all duration-300 ${
                isMuted 
                ? 'bg-slate-800 text-red-400 hover:bg-slate-700' 
                : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button 
              onClick={handleStopSpeaking}
              disabled={status !== 'speaking' && status !== 'processing'}
              className={`p-4 rounded-full transition-all duration-300 ${
                status === 'speaking' || status === 'processing'
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
              title="Stop Speaking"
            >
              <Square size={20} />
            </button>
            
            <button 
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-all duration-300 shadow-lg shadow-red-500/20 group"
              title="End Call"
            >
              <PhoneOff size={20} className="group-hover:scale-110 transition-transform" />
            </button>
         </div>
      </div>
    </div>
  );
};