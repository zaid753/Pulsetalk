import React, { useState } from 'react';
import { Appointment } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, Clock3, Ban, MapPin, Pill, Bell, BellOff, Download, ExternalLink } from 'lucide-react';
import { Button } from './Button';

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: (id: string) => void;
  onToggleReminder?: (id: string) => void;
}

// Generate Google Calendar URL
const buildGoogleCalendarUrl = (apt: Appointment): string => {
  const startDate = apt.date.replace(/-/g, '');
  const timeParts = apt.time.split(':');
  const startTime = `${timeParts[0]}${timeParts[1]}00`;
  const endHour = String(Number(timeParts[0]) + 1).padStart(2, '0');
  const endTime = `${endHour}${timeParts[1]}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Medical Appointment - ${apt.specialty} with ${apt.doctorName}`,
    dates: `${startDate}T${startTime}/${startDate}T${endTime}`,
    details: `Reason: ${apt.reason}\nDoctor: ${apt.doctorName}\nSpecialty: ${apt.specialty}${apt.clinicName ? `\nClinic: ${apt.clinicName}` : ''}${apt.nearbyPharmacyName ? `\nNearby Pharmacy: ${apt.nearbyPharmacyName}` : ''}`,
    location: apt.clinicAddress || apt.clinicName || '',
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
};

// Generate iCal content
const generateICS = (apt: Appointment): string => {
  const startDate = apt.date.replace(/-/g, '');
  const timeParts = apt.time.split(':');
  const startTime = `${timeParts[0]}${timeParts[1]}00`;
  const endHour = String(Number(timeParts[0]) + 1).padStart(2, '0');
  const endTime = `${endHour}${timeParts[1]}00`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PulseTalk//Appointments//EN',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}T${startTime}`,
    `DTEND:${startDate}T${endTime}`,
    `SUMMARY:${apt.specialty} with ${apt.doctorName}`,
    `DESCRIPTION:Reason: ${apt.reason}`,
    `LOCATION:${apt.clinicAddress || apt.clinicName || 'N/A'}`,
    'STATUS:CONFIRMED',
    `UID:${apt.id}@pulsetalk`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your appointment is in 10 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

const downloadICS = (apt: Appointment) => {
  const content = generateICS(apt);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${apt.doctorName.replace(/\s+/g, '-')}-${apt.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onCancel, onToggleReminder }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          borderColor: 'border-l-green-500',
          icon: <CheckCircle size={12} />,
          label: 'Confirmed'
        };
      case 'cancelled':
        return {
          color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          borderColor: 'border-l-red-500',
          icon: <Ban size={12} />,
          label: 'Cancelled'
        };
      default:
        return {
          color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          borderColor: 'border-l-amber-500',
          icon: <Clock3 size={12} />,
          label: 'Pending'
        };
    }
  };

  const statusConfig = getStatusConfig(appointment.status);

  return (
    <div className={`
      p-5 rounded-xl border border-l-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-lg
      bg-white border-slate-200 ${statusConfig.borderColor}
      dark:bg-slate-800 dark:border-slate-700
    `}>
      {/* Header: Doctor + Status */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-600 rounded-xl dark:from-teal-900/50 dark:to-cyan-900/50 dark:text-teal-400">
                <User size={20} />
            </div>
            <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{appointment.doctorName}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider dark:text-slate-400">{appointment.specialty}</p>
            </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${statusConfig.color}`}>
            {statusConfig.icon} {statusConfig.label}
        </span>
      </div>
      
      {/* Date & Time */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex gap-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-teal-500" />
            <span className="font-medium">{appointment.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-teal-500" />
            <span className="font-medium">{appointment.time}</span>
        </div>
      </div>
      
      {/* Reason */}
      <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">Reason:</span> {appointment.reason}
      </div>

      {/* Clinic Info */}
      {appointment.clinicName && (
        <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
          <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-300">{appointment.clinicName}</p>
            {appointment.clinicAddress && (
              <p className="text-blue-600 dark:text-blue-400 mt-0.5">{appointment.clinicAddress}</p>
            )}
            {appointment.clinicDistance && (
              <p className="text-blue-500 dark:text-blue-500 mt-0.5">{appointment.clinicDistance} away</p>
            )}
          </div>
        </div>
      )}

      {/* Pharmacy Info */}
      {appointment.nearbyPharmacyName && (
        <div className="flex items-start gap-2 text-xs bg-purple-50 dark:bg-purple-900/20 p-2.5 rounded-lg">
          <Pill size={14} className="text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-purple-800 dark:text-purple-300">{appointment.nearbyPharmacyName}</p>
            {appointment.nearbyPharmacyAddress && (
              <p className="text-purple-600 dark:text-purple-400 mt-0.5">{appointment.nearbyPharmacyAddress}</p>
            )}
            {appointment.nearbyPharmacyDistance && (
              <p className="text-purple-500 dark:text-purple-500 mt-0.5">{appointment.nearbyPharmacyDistance} away</p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {appointment.status !== 'cancelled' && (
        <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex flex-wrap gap-2">
            {/* Google Calendar */}
            <a
              href={buildGoogleCalendarUrl(appointment)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <ExternalLink size={12} /> Google Calendar
            </a>

            {/* Download iCal */}
            <button
              onClick={() => downloadICS(appointment)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <Download size={12} /> iCal (.ics)
            </button>

            {/* Remind Me Toggle */}
            {onToggleReminder && (
              <button
                onClick={() => onToggleReminder(appointment.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  appointment.reminderEnabled
                    ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {appointment.reminderEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                {appointment.reminderEnabled ? 'Reminder On' : 'Remind Me'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {appointment.status !== 'cancelled' && onCancel && (
        <div className="pt-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => onCancel(appointment.id)}
          >
            Cancel Appointment
          </Button>
        </div>
      )}
    </div>
  );
};