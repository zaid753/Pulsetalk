import React, { useRef, useEffect, useState } from 'react';
import { Message, Sender, ChatSession } from '../types';
import { Bot, User, Paperclip, Send, Loader2, AlertTriangle, ShieldCheck, Mic, X, ImageIcon, Sparkles, Plus, Trash2, Edit2, PanelLeftClose, PanelLeftOpen, MessageSquare, ChevronDown, AudioLines, Stethoscope } from 'lucide-react';
import { Button } from './Button';
import { analyzeSymptomsRealtime } from '../services/geminiService';

interface ChatInterfaceProps {
  conversations: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
  isLoading: boolean;
  onImageAttached: (image: string | null) => void;
  attachedImage: string | null;
  chatLanguage: string;
  setChatLanguage: (lang: string) => void;
  onOpenLiveAssistant: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  input,
  setInput,
  onSend,
  isLoading,
  onImageAttached,
  attachedImage,
  chatLanguage,
  setChatLanguage,
  onOpenLiveAssistant
}) => {
  const activeChat = conversations.find(c => c.id === activeChatId) || conversations[0];
  const messages = activeChat ? activeChat.messages : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const handleSaveRename = (id: string) => {
    if (editTitleInput.trim()) {
      onRenameChat(id, editTitleInput.trim());
    }
    setEditingChatId(null);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, attachedImage, suggestion]);

  // Real-time analysis debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (input.trim().length > 8 && !isLoading) {
         try {
            const result = await analyzeSymptomsRealtime(input);
            setSuggestion(result || null);
         } catch(e) {
            setSuggestion(null);
         }
      } else {
        setSuggestion(null);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [input, isLoading]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    const getLanguageCode = (lang: string) => {
      switch(lang) {
        case 'Spanish': return 'es-ES';
        case 'Hindi': return 'hi-IN';
        case 'French': return 'fr-FR';
        case 'German': return 'de-DE';
        case 'Arabic': return 'ar-SA';
        case 'Chinese': return 'zh-CN';
        default: return 'en-US';
      }
    };
    recognition.lang = getLanguageCode(chatLanguage);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${transcript}` : transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Clear suggestion when sending
      setSuggestion(null);
      onSend();
    }
  };

  // --- Image Handling Logic ---

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageAttached(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) processFile(file);
        break;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // Determine loading text based on context
  const lastUserMsg = messages[messages.length - 1]?.sender === Sender.USER ? messages[messages.length - 1] : null;
  const isAnalyzingImage = isLoading && !!lastUserMsg?.image;

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-200">
      
      {/* Sidebar for Chat History */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex flex-col border-r border-slate-200 dark:border-slate-800/60 transition-all duration-300 md:static ${
          sidebarOpen 
            ? 'translate-x-0 opacity-100 w-64' 
            : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none md:border-r-0 overflow-hidden'
        }`}
      >
        <div className="w-64 flex flex-col h-full flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <span className="font-bold text-[11px] tracking-[0.15em] text-teal-600 dark:text-teal-400 uppercase flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center">
              <MessageSquare size={12} className="text-teal-600 dark:text-teal-400" />
            </div>
            Consultations
          </span>
          <button 
            onClick={onNewChat}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-[11px] font-bold rounded-lg transition-all shadow-lg shadow-teal-600/20 dark:shadow-teal-900/30 hover:shadow-teal-500/30 dark:hover:shadow-teal-800/40"
            title="Start new consultation"
          >
            <Plus size={13} strokeWidth={2.5} /> New Chat
          </button>
        </div>

        {/* Sidebar Chat List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5 scrollbar-hide">
          {conversations.map((c) => {
            const isActive = c.id === activeChatId;
            const isEditing = c.id === editingChatId;

            return (
              <div
                key={c.id}
                onClick={() => !isEditing && onSelectChat(c.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-teal-50 dark:bg-gradient-to-r dark:from-slate-800/80 dark:to-slate-800/40 text-slate-900 dark:text-white border-l-[3px] border-teal-500 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200 border-l-[3px] border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare size={14} className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-600'} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitleInput}
                      onChange={(e) => setEditTitleInput(e.target.value)}
                      onBlur={() => handleSaveRename(c.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(c.id)}
                      autoFocus
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-0.5 rounded text-xs outline-none w-full border border-teal-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={`truncate text-[12px] ${isActive ? 'font-medium' : ''}`}>{c.title || 'New Consultation'}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(c.id);
                        setEditTitleInput(c.title);
                      }}
                      className="p-1 hover:text-teal-600 dark:hover:text-teal-400 text-slate-400 dark:text-slate-500 rounded transition-colors"
                      title="Rename consultation"
                    >
                      <Edit2 size={11} />
                    </button>
                    {conversations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(c.id);
                        }}
                        className="p-1 hover:text-red-500 dark:hover:text-red-400 text-slate-400 dark:text-slate-500 rounded transition-colors"
                        title="Delete consultation"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-200"
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-teal-500/10 backdrop-blur-sm border-2 border-dashed border-teal-500 m-4 rounded-2xl pointer-events-none animate-in fade-in duration-200">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl flex flex-col items-center animate-bounce">
                <ImageIcon size={48} className="text-teal-600 mb-3" />
                <p className="font-bold text-lg text-teal-800 dark:text-teal-200">Drop image to attach</p>
             </div>
          </div>
        )}

        {/* Header / Brand Strip */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60 px-4 py-3 flex items-center justify-between text-slate-800 dark:text-slate-200 gap-2 select-none z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50"
              title="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            {/* Brand with Bot Avatar */}
            <div className="relative group">
              <button className="flex items-center gap-2 font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                  <Bot size={15} className="text-white" />
                </div>
                <span className="tracking-tight">PulseTalk</span>
                <ChevronDown size={14} className="opacity-50" />
              </button>
              <div className="absolute left-0 mt-1 hidden group-hover:block w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-[0.12em]">Consultation Language</div>
                {['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Chinese'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setChatLanguage(lang)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between ${
                      chatLanguage === lang ? 'text-teal-500 font-semibold bg-teal-50/50 dark:bg-teal-950/20' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>
                      {lang === 'Hindi' ? 'हिन्दी (Hindi)' :
                       lang === 'Spanish' ? 'Español (Spanish)' :
                       lang === 'French' ? 'Français (French)' :
                       lang === 'German' ? 'Deutsch (German)' :
                       lang === 'Arabic' ? 'العربية (Arabic)' :
                       lang === 'Chinese' ? '中文 (Chinese)' : lang}
                    </span>
                    {chatLanguage === lang && <div className="w-2 h-2 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400/80 dark:text-slate-500/80 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              <ShieldCheck size={12} className="text-teal-500/70" />
              <span>Conversations are private & secure</span>
            </div>
            
            <button 
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-500/30 transition-all"
            >
              <Plus size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">New Consultation</span><span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-700 dark:text-slate-300 max-w-lg mx-auto text-center px-4">
              {/* Premium Empty State */}
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/20 dark:shadow-teal-500/10">
                  <Bot size={36} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <Sparkles size={10} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-slate-900 dark:text-white">How can I help you today?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                I'm your medical AI assistant. Describe symptoms, upload medical images, or start a live voice consultation.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {['Check symptoms', 'Find medication info', 'Schedule appointment'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all hover:shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex w-full chat-message-enter ${
                msg.sender === Sender.USER ? 'justify-end' : 'justify-start'
              }`}
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            >
              <div
                className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${
                  msg.sender === Sender.USER ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.sender === Sender.USER
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-2 ring-indigo-500/20'
                      : msg.sender === Sender.CLINICIAN
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-2 ring-blue-500/20 dark:ring-blue-500/10'
                      : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white ring-2 ring-teal-500/20 dark:ring-teal-500/10'
                  }`}
                >
                  {msg.sender === Sender.USER ? <User size={14} /> : msg.sender === Sender.CLINICIAN ? <Stethoscope size={14} /> : <Bot size={14} />}
                </div>

                <div
                  className={`flex flex-col gap-1 ${
                    msg.sender === Sender.USER ? 'items-end' : 'items-start'
                  }`}
                >
                  {msg.sender === Sender.CLINICIAN && (
                     <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                       <Stethoscope size={10} /> Clinician Response
                     </span>
                  )}
                  {msg.image && (
                     <div className="mb-2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-w-[200px] shadow-sm">
                        <img src={msg.image} alt="User upload" className="rounded-lg w-full h-auto" />
                     </div>
                  )}
                  
                  <div
                    className={`px-4 py-3 text-[13.5px] leading-[1.7] whitespace-pre-wrap ${
                      msg.sender === Sender.USER
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-indigo-500/15'
                        : msg.sender === Sender.CLINICIAN
                        ? 'bg-blue-50/50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl rounded-tl-sm shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400/80 dark:text-slate-500/80 px-1.5 font-medium">
                      {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start w-full chat-message-enter">
               <div className="flex max-w-[80%] gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-teal-500/20">
                      <Bot size={14} />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                        {isAnalyzingImage ? "Analyzing image..." : "PulseTalk is thinking..."}
                      </span>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-4 z-10 w-full max-w-3xl mx-auto flex flex-col">
          
          {/* Floating Previews */}
          <div className="flex flex-col gap-2 mb-2 items-start">
            {/* Suggestion Bubble */}
            {suggestion && (
                <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-100 dark:border-indigo-800/60 rounded-xl flex items-center gap-2 w-fit shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setInput(suggestion)}>
                    <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center">
                      <Sparkles size={11} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        Insight: <span className="font-normal text-indigo-600/80 dark:text-indigo-300/80">{suggestion}</span>
                    </span>
                </div>
            )}

            {/* Attachment Preview */}
            {attachedImage && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit shadow-md">
                    <div className="h-12 w-12 relative overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                        <img src={attachedImage} alt="Preview" className="object-cover h-full w-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1">
                        <ImageIcon size={10} /> Image attached
                      </span>
                      <span className="text-[10px] text-slate-400">Ready to send</span>
                    </div>
                    <button 
                        onClick={() => onImageAttached(null)} 
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2 group"
                        title="Remove image"
                    >
                        <X size={14} className="text-slate-400 group-hover:text-red-500" />
                    </button>
                </div>
            )}
          </div>
          
          {/* Main Input Capsule — Glassmorphism */}
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 rounded-2xl py-2 px-2.5 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 w-full relative transition-all duration-300 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-400 dark:focus-within:border-teal-500">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileInputChange}
            />

            {/* Plus Button on the Left */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100/80 dark:bg-slate-700/50 w-9 h-9 flex items-center justify-center rounded-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 cursor-pointer border border-slate-200/40 dark:border-slate-600/40"
              title="Attach image (Click, Paste, or Drop)"
            >
              <Plus size={20} strokeWidth={2} />
            </button>
            
            {/* Input Text Area */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask anything"}
              className="flex-1 resize-none bg-transparent outline-none border-none py-2 px-1.5 text-[13.5px] text-slate-800 dark:text-slate-100 placeholder-slate-400/70 max-h-32 overflow-y-auto w-full focus:ring-0 focus:outline-none scrollbar-hide"
              rows={1}
              style={{ minHeight: '36px' }}
            />

            {/* Right Side Icons */}
            <div className="flex items-center gap-1 self-end mb-0.5">
              {/* Voice Microphone Text input */}
              <button
                onClick={toggleListening}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isListening 
                    ? 'bg-red-500/10 text-red-500 animate-pulse ring-1 ring-red-200/50' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic size={20} />
              </button>

              {/* Voice Waveform Button (launches Live Triage Call) */}
              <button
                onClick={onOpenLiveAssistant}
                className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center flex-shrink-0 hover:bg-slate-800 dark:hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/20 dark:shadow-slate-100/10 cursor-pointer"
                title="Start Live Voice Consultation"
              >
                <AudioLines size={17} />
              </button>

              {/* Send Button */}
              <button
                onClick={() => {
                   setSuggestion(null);
                   onSend();
                }}
                disabled={(!input.trim() && !attachedImage) || isLoading}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0 hover:from-teal-400 hover:to-teal-500 disabled:opacity-25 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 disabled:text-slate-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-teal-500/25 disabled:shadow-none cursor-pointer"
                title="Send message"
              >
                <Send size={15} />
              </button>
              
              {/* Dot indicator for voice status */}
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 self-center ml-0.5 animate-pulse" title="Live Voice Consultation Available" />
            </div>
          </div>
          
          {/* Disclaimer Footer */}
           <div className="mt-2.5 flex justify-center">
               <div className="text-[10px] text-slate-400/80 dark:text-slate-500/70 flex items-center gap-1.5 select-none">
                  <AlertTriangle size={9} className="text-amber-500/70" />
                  <span>AI can make mistakes. Always consult a healthcare professional.</span>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};