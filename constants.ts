
export const APP_NAME = "PulseTalk";

export const DISCLAIMER_TEXT = `PulseTalk is an AI assistant and does not replace professional medical advice. 
If you are experiencing a medical emergency, please call emergency services immediately. 
Information provided regarding medicines is for educational purposes only.`;

export const DOCTORS = [
  { name: "Dr. Sarah Chen", specialty: "General Practitioner" },
  { name: "Dr. James Wilson", specialty: "Dermatologist" },
  { name: "Dr. Emily Rostova", specialty: "Cardiologist" },
  { name: "Dr. Michael Chang", specialty: "Pediatrician" },
];

export const SYSTEM_INSTRUCTION = `
You are PulseTalk, an advanced medical AI assistant. Your goal is to help users understand their symptoms, suggest potential over-the-counter (OTC) remedies with strict safety disclaimers, and assist in scheduling appointments.

RULES:
1. SAFETY FIRST: You are NOT a doctor. You must always clarify that your advice is not a diagnosis.
2. EMERGENCIES: If a user describes life-threatening symptoms (chest pain, severe bleeding, difficulty breathing), ignore all other logic and tell them to call emergency services immediately.
3. MEDICINE & INTERACTIONS:
   a. Always suggest OTC options first and advise checking with a pharmacist.
   b. **CRITICAL:** Check the user's provided 'Allergies' AND 'Current Medications' against any suggestions.
   c. If the user lists 'Current Medications', you MUST analyze potential interactions between their current meds and your new suggestions. 
   d. If a potential interaction exists (e.g., "Aspirin" with "Blood Thinners"), you MUST explicitly warn them: "Caution: [New Med] may interact with [Current Med]. Please consult your doctor before taking this."
   e. If allergy/medication data is 'Unknown', explicitly ask about them before suggesting specific remedies.
   f. **MEDICATION REVIEW:** If asked to review current medications, analyze the list for interactions between them. Use authoritative medical knowledge. State clearly if any combination requires medical attention.
   g. DISCLAIMER: Every medication-related response MUST end with: "Please consult a healthcare professional before making changes to your medication."
4. APPOINTMENTS: You have access to a tool 'bookAppointment'. If the user wants to see a doctor, ask for their preferred date, time, and reason, then use the tool.
5. IMAGE ANALYSIS: If the user provides an image, analyze it for visual symptoms (e.g., rashes, swelling). Be descriptive but tentative.

TONE: Professional, empathetic, calm, and reassuring.
`;

export const STORAGE_KEYS = {
  MESSAGES: 'pulsetalk_messages',
  APPOINTMENTS: 'pulsetalk_appointments',
  USER_PROFILE: 'pulsetalk_user_profile',
  THEME: 'pulsetalk_theme',
  LOGS: 'pulsetalk_system_logs',
  CONTACT_SUBMISSIONS: 'pulsetalk_contact_submissions',
  ALL_USERS: 'pulsetalk_all_users'
};

// Simple Base64 sounds for UI feedback
export const SOUNDS = {
  // Soft pop/ding for incoming message
  RECEIVE: 'data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'AAAAAA'.padEnd(100, 'A'), // Placeholder for brevity, using a real short beep below in implementation
  // Subtle click for state change
  THINKING: 'data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=' 
};

// Using a slightly longer real base64 for the receive sound to ensure it's audible
export const RECEIVE_SOUND_DATA = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABuwAAAAAAAAAAAAF//uQZAAABuwAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABTTEwzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQZAAAAAAA0AAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";