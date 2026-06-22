
export enum Sender {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
  CLINICIAN = 'clinician'
}

export type UserRole = 'patient' | 'clinician' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  image?: string; // base64
  isThinking?: boolean;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  reason: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  patientId?: string; // For clinician view
  patientName?: string; // For clinician view
  clinicName?: string;
  clinicAddress?: string;
  clinicDistance?: string;
  nearbyPharmacyName?: string;
  nearbyPharmacyAddress?: string;
  nearbyPharmacyDistance?: string;
  reminderEnabled?: boolean;
}

export interface UserProfile {
  name: string;
  age: number;
  gender?: string; // New
  bloodType?: string; // New
  height?: string; // New
  weight?: string; // New
  allergies: string[];
  currentMedications: string[];
  chronicConditions?: string[]; // New
  emergencyContact?: { // New
    name: string;
    phone: string;
    relation: string;
  };
  insuranceProvider?: string; // New
  insurancePolicyNumber?: string; // New
}

export interface SystemLog {
  id: string;
  type: 'symptom_analysis' | 'live_consultation' | 'appointment' | 'system';
  userName: string;
  timestamp: string;
  details: string;
  severity?: 'low' | 'medium' | 'high';
  metadata?: any;
}

export interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  timestamp: string;
  status: 'new' | 'read';
}

// Tool types
export interface BookAppointmentArgs {
  specialty: string;
  date: string;
  time: string;
  reason: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}