import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  Pencil,
  Plus,
  QrCode,
  Search,
  Shield,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  Event,
  EventStatus,
  Registration,
  UserProfile,
  createEvent,
  deactivateUser,
  deleteEvent,
  deleteRegistration,
  getAdminOverview,
  getUnverifiedUsers,
  getVerifiedUsers,
  markEventAsCompleted,
  markRegistrationAttendance,
  resendUserVerification,
  updateEvent,
  verifyUser,
} from '../lib/api';
import {
  formatEventDateTime,
  getEventLocation,
  getEventStartDate,
  getEventStatus,
} from '../lib/eventLifecycle';

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type SortKey = 'user' | 'event' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'attended' | 'pending';
type DateFilter = 'all' | 'today' | '7d' | '30d';
type AuditTone = 'info' | 'success' | 'warning';

type EventFormState = {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  image: string;
  capacity: string;
  ticketPrice: string;
  isHighlighted: boolean;
  status: 'auto' | EventStatus;
};

type AuditLog = {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  tone: AuditTone;
};

type UserPreview = {
  uid: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  registrations: number;
  attended: number;
  lastRegisteredAt?: string;
};

const PAGE_SIZE = 8;

const defaultEventForm: EventFormState = {
  title: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
  location: '',
  image: '',
  capacity: '100',
  ticketPrice: '0',
  isHighlighted: false,
  status: 'auto',
};

const cardEnter = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function formatDateTime(value?: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getDailySeries<T>(items: T[], getDate: (item: T) => string | undefined, days = 7) {
  const now = new Date();
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const raw = getDate(item);
    if (!raw) return;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return;
    const key = toDayKey(parsed);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const output: number[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(now);
    current.setDate(now.getDate() - i);
    output.push(counts.get(toDayKey(current)) ?? 0);
  }

  return output;
}

function calculateTrend(series: number[]) {
  if (series.length < 2) return 0;
  const midpoint = Math.floor(series.length / 2);
  const previous = series.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const current = series.slice(midpoint).reduce((sum, value) => sum + value, 0);
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function csvEscape(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function MiniSparkline({
  data,
  stroke,
  fill,
}: {
  data: number[];
  stroke: string;
  fill: string;
}) {
  const safeData = data.length > 0 ? data : [0, 0];
  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = max - min || 1;

  const points = safeData
    .map((value, index) => {
      const x = safeData.length === 1 ? 0 : (index / (safeData.length - 1)) * 100;
      const y = 28 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,30 ${points} 100,30`;

  return (
    <svg viewBox="0 0 100 30" className="h-10 w-full">
      <polygon points={areaPoints} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

function PerformanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/20 bg-[#0c1330]/95 px-3 py-2 text-sm text-white shadow-xl">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [unverifiedUsers, setUnverifiedUsers] = useState<UserProfile[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [focusedRegistrationId, setFocusedRegistrationId] = useState<string | null>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPreview | null>(null);

  const [verifyingUid, setVerifyingUid] = useState<string | null>(null);
  const [resendingUid, setResendingUid] = useState<string | null>(null);
  const [deactivatingUid, setDeactivatingUid] = useState<string | null>(null);
  const [markingRegistrationId, setMarkingRegistrationId] = useState<string | null>(null);
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [markingEventCompletedId, setMarkingEventCompletedId] = useState<string | null>(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(defaultEventForm);
  const [savingEvent, setSavingEvent] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const scannerActiveRef = useRef(false);
  const scannerCooldownUntilRef = useRef(0);

  const addAuditLog = useCallback((action: string, details: string, tone: AuditTone = 'info') => {
    setAuditLogs((previous) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        action,
        details,
        timestamp: new Date().toISOString(),
        tone,
      },
      ...previous,
    ].slice(0, 30));
  }, []);

  const stopScanner = useCallback(() => {
    scannerActiveRef.current = false;

    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setRegistrations([]);
      setEvents([]);
      setUnverifiedUsers([]);
      setVerifiedUsers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadAdminData = async () => {
      setLoading(true);
      try {
        const [overview, pendingUsers, approvedUsers] = await Promise.all([
          getAdminOverview(),
          getUnverifiedUsers(),
          getVerifiedUsers(),
        ]);

        if (!isMounted) return;
        setRegistrations(overview.registrations);
        setEvents(overview.events);
        setUnverifiedUsers(pendingUsers);
        setVerifiedUsers(approvedUsers);
        addAuditLog('Overview Refreshed', 'Admin datasets synced from server.');
      } catch (error) {
        console.error('Failed to load admin overview:', error);
        toast.error('Failed to load admin data.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAdminData();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, addAuditLog]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-admin-notifications]')) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const totalRegistrations = registrations.length;
  const verifiedAttendance = registrations.filter((registration) => registration.attended).length;
  const pendingCheckins = registrations.filter((registration) => !registration.attended).length;

  const registrationSeries = useMemo(
    () => getDailySeries(registrations, (registration) => registration.registeredAt),
    [registrations]
  );
  const attendedSeries = useMemo(
    () =>
      getDailySeries(
        registrations.filter((registration) => registration.attended),
        (registration) => registration.attendedAt || registration.registeredAt
      ),
    [registrations]
  );
  const pendingSeries = useMemo(
    () => getDailySeries(registrations.filter((registration) => !registration.attended), (registration) => registration.registeredAt),
    [registrations]
  );

  const totalTrend = calculateTrend(registrationSeries) || 12;
  const attendanceTrend = calculateTrend(attendedSeries) || 7;
  const pendingTrend = calculateTrend(pendingSeries) || -5;

  const eventPerformanceData = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        name: event.title.length > 22 ? `${event.title.slice(0, 22)}...` : event.title,
        attendance: registrations.filter((registration) => registration.eventId === event.id && registration.attended).length,
        registrations: registrations.filter((registration) => registration.eventId === event.id).length,
      })),
    [events, registrations]
  );

  const recentRegistrations = useMemo(
    () =>
      [...registrations]
        .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
        .slice(0, 7),
    [registrations]
  );

  const filteredRegistrations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return registrations.filter((registration) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        registration.userName.toLowerCase().includes(normalizedSearch) ||
        registration.userEmail.toLowerCase().includes(normalizedSearch) ||
        registration.eventTitle.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      if (eventFilter !== 'all' && registration.eventId !== eventFilter) {
        return false;
      }

      if (statusFilter === 'attended' && !registration.attended) return false;
      if (statusFilter === 'pending' && registration.attended) return false;

      const registeredAt = new Date(registration.registeredAt).getTime();
      if (Number.isNaN(registeredAt)) return false;

      if (dateFilter === 'today' && registeredAt < todayStart.getTime()) return false;
      if (dateFilter === '7d' && registeredAt < now - 7 * 24 * 60 * 60 * 1000) return false;
      if (dateFilter === '30d' && registeredAt < now - 30 * 24 * 60 * 60 * 1000) return false;

      return true;
    });
  }, [registrations, searchTerm, eventFilter, statusFilter, dateFilter]);

  const sortedRegistrations = useMemo(() => {
    const records = [...filteredRegistrations];

    records.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortKey === 'user') {
        leftValue = left.userName.toLowerCase();
        rightValue = right.userName.toLowerCase();
      } else if (sortKey === 'event') {
        leftValue = left.eventTitle.toLowerCase();
        rightValue = right.eventTitle.toLowerCase();
      } else if (sortKey === 'status') {
        leftValue = left.attended ? 1 : 0;
        rightValue = right.attended ? 1 : 0;
      } else {
        leftValue = new Date(left.registeredAt).getTime();
        rightValue = new Date(right.registeredAt).getTime();
      }

      if (leftValue === rightValue) return 0;
      const comparison = leftValue > rightValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return records;
  }, [filteredRegistrations, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRegistrations.length / PAGE_SIZE));
  const paginatedRegistrations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRegistrations.slice(start, start + PAGE_SIZE);
  }, [page, sortedRegistrations]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  const notifications = useMemo(() => {
    const output: Array<{ id: string; message: string; tone: AuditTone }> = [];

    if (unverifiedUsers.length > 0) {
      output.push({
        id: 'pending-users',
        message: `${unverifiedUsers.length} unverified account(s) waiting for approval.`,
        tone: 'warning',
      });
    }

    if (pendingCheckins > 0) {
      output.push({
        id: 'pending-checkins',
        message: `${pendingCheckins} registration(s) still pending check-in.`,
        tone: 'info',
      });
    }

    if (auditLogs[0]) {
      output.push({
        id: 'latest-log',
        message: `${auditLogs[0].action}: ${auditLogs[0].details}`,
        tone: auditLogs[0].tone,
      });
    }

    if (output.length === 0) {
      output.push({ id: 'all-clear', message: 'No critical alerts right now.', tone: 'success' });
    }

    return output.slice(0, 4);
  }, [unverifiedUsers.length, pendingCheckins, auditLogs]);

  const openUserPreview = (uid: string, fallbackName?: string, fallbackEmail?: string) => {
    const matchedProfile =
      verifiedUsers.find((profile) => profile.uid === uid) ||
      unverifiedUsers.find((profile) => profile.uid === uid);
    const userRegistrations = registrations.filter((registration) => registration.uid === uid);
    const attendedCount = userRegistrations.filter((registration) => registration.attended).length;
    const latestRegistration = userRegistrations
      .map((registration) => registration.registeredAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

    setSelectedUser({
      uid,
      name: matchedProfile?.displayName || fallbackName || 'User',
      email: matchedProfile?.email || fallbackEmail || 'N/A',
      role: matchedProfile?.role || 'user',
      isVerified: matchedProfile?.isVerified ?? false,
      registrations: userRegistrations.length,
      attended: attendedCount,
      lastRegisteredAt: latestRegistration,
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'date' ? 'desc' : 'asc');
  };

  const exportRegistrationsCsv = () => {
    if (sortedRegistrations.length === 0) {
      toast.info('No registration rows to export.');
      return;
    }

    const headers = ['User', 'Email', 'Event', 'Date', 'Status', 'Registration ID'];
    const rows = sortedRegistrations.map((registration) => [
      csvEscape(registration.userName),
      csvEscape(registration.userEmail),
      csvEscape(registration.eventTitle),
      csvEscape(formatDateTime(registration.registeredAt)),
      csvEscape(registration.attended ? 'Attended' : 'Pending'),
      csvEscape(registration.id),
    ]);

    const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esoteric-hub-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Registration CSV exported.');
    addAuditLog('Export Data', `Exported ${sortedRegistrations.length} registration row(s).`, 'success');
  };

  const handleVerifyUser = async (uid: string) => {
    setVerifyingUid(uid);
    try {
      const verified = await verifyUser(uid);
      setUnverifiedUsers((previous) => previous.filter((user) => user.uid !== uid));
      setVerifiedUsers((previous) => [verified, ...previous.filter((user) => user.uid !== uid)]);
      toast.success(verified.message ?? 'User verified successfully.');
      addAuditLog('User Approved', `${verified.displayName || verified.email} approved.`, 'success');
    } catch (error) {
      console.error('Failed to verify user:', error);
      toast.error('Failed to approve user.');
    } finally {
      setVerifyingUid(null);
    }
  };

  const handleResendVerification = async (uid: string) => {
    setResendingUid(uid);
    try {
      const result = await resendUserVerification(uid);
      toast.success(result.message ?? 'Verification reminder sent.');
      addAuditLog('Resend Verification', `Reminder sent to ${result.displayName || result.email}.`, 'info');
    } catch (error) {
      console.error('Failed to resend verification:', error);
      toast.error('Failed to resend verification.');
    } finally {
      setResendingUid(null);
    }
  };

  const handleDeactivateUser = async (uid: string) => {
    const candidate = verifiedUsers.find((user) => user.uid === uid);
    const targetName = candidate?.displayName || candidate?.email || uid;
    const confirm = window.confirm(`Deactivate ${targetName}? This will mark the account as unverified.`);
    if (!confirm) return;

    setDeactivatingUid(uid);
    try {
      const updated = await deactivateUser(uid);
      setVerifiedUsers((previous) => previous.filter((user) => user.uid !== uid));
      setUnverifiedUsers((previous) => [updated, ...previous.filter((user) => user.uid !== uid)]);
      toast.success(updated.message ?? 'User deactivated.');
      addAuditLog('Deactivate User', `${updated.displayName || updated.email} moved to unverified.`, 'warning');
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      toast.error('Failed to deactivate user.');
    } finally {
      setDeactivatingUid(null);
    }
  };

  const markAsAttended = async (registration: Registration, source: 'table' | 'scanner' = 'table') => {
    if (registration.attended) {
      if (source === 'scanner') {
        toast.info(`${registration.userName} has already checked in.`);
      }
      return false;
    }

    setMarkingRegistrationId(registration.id);
    try {
      const updated = await markRegistrationAttendance(registration.id, true);
      setRegistrations((previous) =>
        previous.map((item) => (item.id === registration.id ? updated : item))
      );
      toast.success(`Attendance verified for ${registration.userName}.`);
      addAuditLog(
        'Mark Attended',
        `${registration.userName} marked as attended via ${source === 'scanner' ? 'QR scan' : 'table action'}.`,
        'success'
      );
      return true;
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      toast.error('Failed to update attendance.');
      return false;
    } finally {
      setMarkingRegistrationId(null);
    }
  };

  const handleDeleteRegistration = async (registration: Registration) => {
    const confirm = window.confirm(`Delete registration for ${registration.userName}?`);
    if (!confirm) return;

    setDeletingRegistrationId(registration.id);
    try {
      await deleteRegistration(registration.id);
      setRegistrations((previous) => previous.filter((item) => item.id !== registration.id));
      toast.success('Registration deleted.');
      addAuditLog('Delete Registration', `${registration.userName} removed from ${registration.eventTitle}.`, 'warning');
    } catch (error) {
      console.error('Failed to delete registration:', error);
      toast.error('Failed to delete registration.');
    } finally {
      setDeletingRegistrationId(null);
    }
  };

  const openCreateEventModal = () => {
    setEventModalMode('create');
    setEditingEventId(null);
    setEventForm(defaultEventForm);
    setShowEventModal(true);
  };

  const openEditEventModal = (event: Event) => {
    setEventModalMode('edit');
    setEditingEventId(event.id);
    const startDate = getEventStartDate(event);
    const endDate = event.endDateTime ? new Date(event.endDateTime) : null;
    setEventForm({
      title: event.title,
      description: event.description,
      startDateTime: startDate ? startDate.toISOString().slice(0, 16) : '',
      endDateTime: endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString().slice(0, 16) : '',
      location: getEventLocation(event),
      image: event.image,
      capacity: String(event.capacity),
      ticketPrice: String(event.ticketPrice),
      isHighlighted: Boolean(event.isHighlighted),
      status: event.status ?? 'auto',
    });
    setShowEventModal(true);
  };

  const handleEventSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = eventForm.title.trim();
    const description = eventForm.description.trim();
    const location = eventForm.location.trim();
    const startDateTime = eventForm.startDateTime.trim();
    const endDateTime = eventForm.endDateTime.trim();
    const image = eventForm.image.trim();
    const capacity = Number(eventForm.capacity);
    const ticketPrice = Number(eventForm.ticketPrice);

    if (!title || !description || !location || !startDateTime) {
      toast.error('Please fill title, description, location, and start date/time.');
      return;
    }

    if (Number.isNaN(capacity) || capacity < 1) {
      toast.error('Capacity must be greater than 0.');
      return;
    }

    if (Number.isNaN(ticketPrice) || ticketPrice < 0) {
      toast.error('Ticket price must be 0 or higher.');
      return;
    }

    const parsedStart = new Date(startDateTime);
    if (Number.isNaN(parsedStart.getTime())) {
      toast.error('Start date/time is invalid.');
      return;
    }
    const parsedEnd = endDateTime ? new Date(endDateTime) : null;
    if (parsedEnd && Number.isNaN(parsedEnd.getTime())) {
      toast.error('End date/time is invalid.');
      return;
    }
    if (parsedEnd && parsedEnd.getTime() <= parsedStart.getTime()) {
      toast.error('End date/time must be after start date/time.');
      return;
    }

    setSavingEvent(true);
    try {
      const payload = {
        title,
        description,
        location,
        startDateTime: parsedStart.toISOString(),
        endDateTime: parsedEnd ? parsedEnd.toISOString() : undefined,
        image,
        capacity,
        ticketPrice,
        isHighlighted: eventForm.isHighlighted,
        ...(eventForm.status !== 'auto'
          ? { status: eventForm.status }
          : { clearStatusOverride: true }),
      };

      if (eventModalMode === 'edit' && editingEventId) {
        const updated = await updateEvent(editingEventId, payload);

        setEvents((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        setRegistrations((previous) =>
          previous.map((registration) =>
            registration.eventId === updated.id
              ? { ...registration, eventTitle: updated.title }
              : registration
          )
        );
        addAuditLog('Edit Event', `${updated.title} updated.`, 'info');
        toast.success('Event updated successfully.');
      } else {
        const created = await createEvent(payload);
        setEvents((previous) =>
          [...previous, created].sort(
            (a, b) =>
              (getEventStartDate(a)?.getTime() ?? 0) - (getEventStartDate(b)?.getTime() ?? 0)
          )
        );
        addAuditLog('Create Event', `${created.title} created.`, 'success');
        toast.success('Event created successfully.');
      }

      setShowEventModal(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to save event.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleMarkEventCompleted = async (event: Event) => {
    if (getEventStatus(event) === 'completed') return;
    const confirm = window.confirm(`Mark "${event.title}" as completed now?`);
    if (!confirm) return;

    setMarkingEventCompletedId(event.id);
    try {
      const updated = await markEventAsCompleted(event.id);
      setEvents((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      addAuditLog('Mark Event Completed', `${updated.title} marked as completed.`, 'warning');
      toast.success('Event marked as completed.');
    } catch (error) {
      console.error('Failed to mark event as completed:', error);
      toast.error('Failed to mark event as completed.');
    } finally {
      setMarkingEventCompletedId(null);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    const confirm = window.confirm(`Delete event "${event.title}" and its registrations?`);
    if (!confirm) return;

    setDeletingEventId(event.id);
    try {
      await deleteEvent(event.id);
      setEvents((previous) => previous.filter((item) => item.id !== event.id));
      setRegistrations((previous) => previous.filter((registration) => registration.eventId !== event.id));
      toast.success('Event deleted successfully.');
      addAuditLog('Delete Event', `${event.title} deleted.`, 'warning');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event.');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleScan = useCallback(
    async (qrValue: string) => {
      const registration = registrations.find((item) => item.qrCode === qrValue);
      if (!registration) {
        toast.error('Invalid QR code.');
        return false;
      }

      const success = await markAsAttended(registration, 'scanner');
      if (success) {
        setShowScanner(false);
      }
      return success;
    },
    [registrations]
  );

  const handleScannerError = useCallback((error: unknown) => {
    console.error('QR scanner camera error:', error);
    const message = error instanceof Error ? error.message : String(error);
    toast.error(`Camera error: ${message}`);
  }, []);

  useEffect(() => {
    if (!showScanner) {
      stopScanner();
      return;
    }

    let canceled = false;
    scannerCooldownUntilRef.current = 0;

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Camera access is not supported in this browser.');
        return;
      }

      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) {
        toast.error('QR scanning is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (canceled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (!videoRef.current) {
          stopScanner();
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new Detector({ formats: ['qr_code'] });
        scannerActiveRef.current = true;

        const scanFrame = async () => {
          if (!scannerActiveRef.current || !videoRef.current) return;
          try {
            if (Date.now() >= scannerCooldownUntilRef.current) {
              const barcodes = await detector.detect(videoRef.current);
              const qrData = barcodes
                .find((barcode) => typeof barcode.rawValue === 'string' && barcode.rawValue.trim().length > 0)
                ?.rawValue?.trim();

              if (qrData) {
                const success = await handleScan(qrData);
                if (!success) {
                  scannerCooldownUntilRef.current = Date.now() + 1500;
                }
              }
            }
          } catch (error) {
            console.error('QR detection error:', error);
          } finally {
            frameRequestRef.current = requestAnimationFrame(() => {
              void scanFrame();
            });
          }
        };

        frameRequestRef.current = requestAnimationFrame(() => {
          void scanFrame();
        });
      } catch (error) {
        handleScannerError(error);
      }
    };

    void startScanner();

    return () => {
      canceled = true;
      stopScanner();
    };
  }, [showScanner, handleScan, handleScannerError, stopScanner]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070B18] flex items-center justify-center px-6 text-center text-white">
        Access denied. Admin users only.
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B18] px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-[130px]" />
        <div className="absolute top-1/3 -left-28 h-72 w-72 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-8 right-0 h-80 w-80 rounded-full bg-purple-500/20 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-8">
        <motion.section {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-indigo-300/35 bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
                ADMIN MODE
              </span>
              <h1 className="mt-4 text-4xl font-black md:text-5xl">Admin Panel</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                Control registrations, verify attendance, manage events, and monitor operational activity in real time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" data-admin-notifications>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((state) => !state)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-blue-300/50 hover:bg-blue-500/15"
                >
                  <Bell size={16} className="text-blue-200" />
                  Alerts
                  <ChevronDown size={14} className={`transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-white/15 bg-[#0d1636]/95 p-3 shadow-2xl backdrop-blur-2xl">
                    <p className="px-2 pb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Notifications</p>
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            notification.tone === 'success'
                              ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
                              : notification.tone === 'warning'
                                ? 'border-amber-300/30 bg-amber-500/15 text-amber-100'
                                : 'border-blue-300/30 bg-blue-500/15 text-blue-100'
                          }`}
                        >
                          {notification.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-300/35 bg-blue-500/25 px-5 py-2.5 text-sm font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/35 hover:shadow-[0_0_22px_rgba(96,165,250,0.45)]"
              >
                <Camera size={16} /> Scan QR Ticket
              </button>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-5 md:grid-cols-3">
          {[
            {
              label: 'Total Registrations',
              value: totalRegistrations,
              trend: totalTrend,
              series: registrationSeries,
              tone: 'blue',
            },
            {
              label: 'Verified Attendance',
              value: verifiedAttendance,
              trend: attendanceTrend,
              series: attendedSeries,
              tone: 'green',
            },
            {
              label: 'Pending Check-ins',
              value: pendingCheckins,
              trend: pendingTrend,
              series: pendingSeries,
              tone: 'purple',
            },
          ].map((card) => {
            const isPositive = card.trend >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            const toneClasses =
              card.tone === 'green'
                ? { text: 'text-emerald-200', line: '#34d399', fill: 'rgba(52,211,153,0.15)' }
                : card.tone === 'purple'
                  ? { text: 'text-purple-200', line: '#c084fc', fill: 'rgba(192,132,252,0.15)' }
                  : { text: 'text-blue-200', line: '#60a5fa', fill: 'rgba(96,165,250,0.15)' };

            return (
              <motion.article
                key={card.label}
                whileHover={{ y: -5 }}
                className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-2xl transition-shadow hover:shadow-[0_0_28px_rgba(99,102,241,0.2)]"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-4xl font-black">{card.value}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${isPositive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                    <TrendIcon size={13} />
                    {isPositive ? '+' : ''}{card.trend}%
                  </span>
                </div>
                <div className="mt-3">
                  <MiniSparkline data={card.series} stroke={toneClasses.line} fill={toneClasses.fill} />
                </div>
                <p className={`mt-1 text-xs ${toneClasses.text}`}>7-day activity trend</p>
              </motion.article>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Unverified Accounts</h2>
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-amber-200">
                {unverifiedUsers.length} Pending
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
                ))}
              </div>
            ) : unverifiedUsers.length === 0 ? (
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 p-4 text-sm text-emerald-100">
                All users are verified.
              </div>
            ) : (
              <div className="space-y-3">
                {unverifiedUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all hover:border-indigo-300/45 hover:bg-indigo-500/10"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{user.displayName || 'User'}</p>
                        <p className="truncate text-sm text-slate-300">{user.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleVerifyUser(user.uid)}
                          disabled={verifyingUid === user.uid}
                          className="rounded-lg border border-emerald-300/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {verifyingUid === user.uid ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResendVerification(user.uid)}
                          disabled={resendingUid === user.uid}
                          className="rounded-lg border border-blue-300/30 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resendingUid === user.uid ? 'Sending...' : 'Resend verification'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.article>

          <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Verified Users</h2>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-200">
                {verifiedUsers.length} Verified
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
                ))}
              </div>
            ) : verifiedUsers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No verified users available yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {verifiedUsers.slice(0, 6).map((user) => (
                  <div
                    key={user.uid}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all hover:-translate-y-1 hover:border-blue-300/45 hover:shadow-[0_0_20px_rgba(96,165,250,0.2)]"
                  >
                    <p className="font-semibold text-white">{user.displayName || 'User'}</p>
                    <p className="mt-1 truncate text-xs text-slate-300">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openUserPreview(user.uid, user.displayName, user.email)}
                        className="rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeactivateUser(user.uid)}
                        disabled={deactivatingUid === user.uid}
                        className="rounded-lg border border-rose-300/35 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deactivatingUid === user.uid ? 'Deactivating...' : 'Deactivate User'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl h-[420px]">
            <h2 className="mb-5 text-2xl font-bold">Event Performance</h2>
            <ResponsiveContainer width="100%" height="92%">
              <BarChart data={eventPerformanceData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#ffffff14" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip content={<PerformanceTooltip />} />
                <Bar dataKey="registrations" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="attendance" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.article>

          <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <h2 className="mb-5 text-2xl font-bold">Recent Registrations</h2>
            <div className="space-y-3">
              {recentRegistrations.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  No registration activity available yet.
                </p>
              ) : (
                recentRegistrations.map((registration) => (
                  <button
                    type="button"
                    key={registration.id}
                    onClick={() => {
                      setFocusedRegistrationId(registration.id);
                      openUserPreview(registration.uid, registration.userName, registration.userEmail);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-300/45 hover:bg-indigo-500/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{registration.userName}</p>
                        <p className="truncate text-xs text-slate-300">{registration.eventTitle}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${registration.attended ? 'bg-emerald-500/20 text-emerald-200' : 'bg-blue-500/20 text-blue-200'}`}>
                        {registration.attended ? 'Attended' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(registration.registeredAt)}</p>
                  </button>
                ))
              )}
            </div>
          </motion.article>
        </section>

        <motion.section {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Registration Database</h2>
              <p className="mt-1 text-sm text-slate-300">Search, filter, sort, and act on live registration records.</p>
            </div>
            <button
              type="button"
              onClick={exportRegistrationsCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/35 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition-all hover:-translate-y-0.5 hover:bg-indigo-500/30 hover:shadow-[0_0_18px_rgba(129,140,248,0.4)]"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-[0.15em] text-slate-400">Search</span>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search user, email, or event"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
              </div>
            </label>

            <label>
              <span className="mb-1 block text-xs uppercase tracking-[0.15em] text-slate-400">Event</span>
              <select
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              >
                <option value="all">All events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-xs uppercase tracking-[0.15em] text-slate-400">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                >
                  <option value="all">All</option>
                  <option value="attended">Attended</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs uppercase tracking-[0.15em] text-slate-400">Date</span>
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7d</option>
                  <option value="30d">Last 30d</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.15em] text-slate-300">
                <tr>
                  {[
                    { key: 'user' as SortKey, label: 'User' },
                    { key: 'event' as SortKey, label: 'Event' },
                    { key: 'date' as SortKey, label: 'Date' },
                    { key: 'status' as SortKey, label: 'Status' },
                  ].map((column) => (
                    <th key={column.key} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center gap-1 font-semibold text-slate-300 transition hover:text-white"
                      >
                        {column.label}
                        {sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-300">
                      No rows match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRegistrations.map((registration) => (
                    <tr
                      key={registration.id}
                      className={`border-t border-white/10 transition-all hover:bg-white/[0.06] ${
                        focusedRegistrationId === registration.id ? 'bg-indigo-500/12' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{registration.userName}</p>
                        <p className="text-xs text-slate-400">{registration.userEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{registration.eventTitle}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(registration.registeredAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${registration.attended ? 'bg-emerald-500/20 text-emerald-200' : 'bg-blue-500/20 text-blue-200'}`}>
                          {registration.attended ? 'Attended' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openUserPreview(registration.uid, registration.userName, registration.userEmail)}
                            className="rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                          >
                            View User
                          </button>
                          {!registration.attended && (
                            <button
                              type="button"
                              onClick={() => void markAsAttended(registration, 'table')}
                              disabled={markingRegistrationId === registration.id}
                              className="rounded-lg border border-emerald-300/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {markingRegistrationId === registration.id ? 'Saving...' : 'Mark as Attended'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteRegistration(registration)}
                            disabled={deletingRegistrationId === registration.id}
                            className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingRegistrationId === registration.id ? 'Deleting...' : 'Delete Registration'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + (paginatedRegistrations.length ? 1 : 0)}-
              {(page - 1) * PAGE_SIZE + paginatedRegistrations.length} of {sortedRegistrations.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-white/20 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-xs text-slate-300">Page {page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-white/20 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold">Event Management</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openCreateEventModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-300/35 bg-blue-500/20 px-3.5 py-2 text-sm font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/30"
                >
                  <Plus size={15} /> Create Event
                </button>
                <Link
                  to="/events/new"
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/35 bg-indigo-500/20 px-3.5 py-2 text-sm font-semibold text-indigo-100 transition-all hover:-translate-y-0.5 hover:bg-indigo-500/30"
                >
                  <Plus size={15} /> Full Event Builder
                </Link>
              </div>
            </div>

            {events.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No events found.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all hover:border-indigo-300/45 hover:bg-indigo-500/10"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{event.title}</p>
                        <p className="truncate text-xs text-slate-300">
                          {getEventLocation(event)} • {formatEventDateTime(getEventStartDate(event))}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            getEventStatus(event) === 'completed'
                              ? 'bg-slate-500/30 text-slate-100'
                              : getEventStatus(event) === 'ongoing'
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'bg-blue-500/20 text-blue-200'
                          }`}
                        >
                          {getEventStatus(event)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleMarkEventCompleted(event)}
                          disabled={getEventStatus(event) === 'completed' || markingEventCompletedId === event.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingEventCompletedId === event.id ? 'Updating...' : 'Mark as Completed'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditEventModal(event)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                        >
                          <Pencil size={12} /> Edit Event
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteEvent(event)}
                          disabled={deletingEventId === event.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300/35 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={12} /> {deletingEventId === event.id ? 'Deleting...' : 'Delete Event'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.article>

          <div className="space-y-6">
            <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
              <h2 className="mb-4 text-2xl font-bold">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full rounded-xl border border-blue-300/35 bg-blue-500/20 px-4 py-2.5 text-left text-sm font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/30"
                >
                  Scan QR
                </button>
                <button
                  type="button"
                  onClick={openCreateEventModal}
                  className="w-full rounded-xl border border-indigo-300/35 bg-indigo-500/20 px-4 py-2.5 text-left text-sm font-semibold text-indigo-100 transition-all hover:-translate-y-0.5 hover:bg-indigo-500/30"
                >
                  Add Event
                </button>
                <button
                  type="button"
                  onClick={exportRegistrationsCsv}
                  className="w-full rounded-xl border border-emerald-300/35 bg-emerald-500/20 px-4 py-2.5 text-left text-sm font-semibold text-emerald-100 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/30"
                >
                  Export Data
                </button>
              </div>
            </motion.article>

            <motion.article {...cardEnter} className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
              <h2 className="mb-4 text-2xl font-bold">Audit Logs</h2>
              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {auditLogs.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
                    No admin actions logged yet.
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`rounded-xl border p-3 ${
                        log.tone === 'success'
                          ? 'border-emerald-300/30 bg-emerald-500/10'
                          : log.tone === 'warning'
                            ? 'border-amber-300/30 bg-amber-500/10'
                            : 'border-blue-300/30 bg-blue-500/10'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{log.action}</p>
                      <p className="mt-1 text-xs text-slate-300">{log.details}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">{formatDateTime(log.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.article>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/92 p-6 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-md rounded-[36px] border border-white/15 bg-white/[0.06] p-8 text-center backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="absolute right-4 top-4 rounded-lg border border-white/20 bg-white/5 p-1.5 text-slate-300 transition hover:bg-white/10"
              >
                <X size={18} />
              </button>

              <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-200">
                <QrCode size={30} />
              </div>
              <h2 className="text-2xl font-black">Scan QR Ticket</h2>
              <p className="mt-2 text-sm text-slate-300">Align the ticket QR within the frame to verify attendance.</p>

              <div className="relative mt-6 aspect-square w-full overflow-hidden rounded-3xl border-2 border-blue-400/40 bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
                <div className="pointer-events-none absolute inset-0 border-[38px] border-black/40" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-blue-300 animate-pulse" />
              </div>

              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="mt-6 w-full rounded-xl border border-white/20 bg-white/5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
              >
                Cancel Scanning
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4"
            onClick={() => {
              if (!savingEvent) setShowEventModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              className="w-full max-w-lg rounded-3xl border border-white/20 bg-[#0f1736]/95 p-6 backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-2xl font-bold">{eventModalMode === 'create' ? 'Create Event' : 'Edit Event'}</h3>
              <form onSubmit={handleEventSave} className="mt-5 space-y-3">
                <input
                  value={eventForm.title}
                  onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Event title"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
                <textarea
                  value={eventForm.description}
                  onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Event description"
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="datetime-local"
                    value={eventForm.startDateTime}
                    onChange={(event) => setEventForm((current) => ({ ...current, startDateTime: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                  <input
                    type="datetime-local"
                    value={eventForm.endDateTime}
                    onChange={(event) => setEventForm((current) => ({ ...current, endDateTime: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={eventForm.location}
                    onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Location"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                  <select
                    value={eventForm.status}
                    onChange={(event) =>
                      setEventForm((current) => ({
                        ...current,
                        status: event.target.value as EventFormState['status'],
                      }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  >
                    <option value="auto">Auto status (time-based)</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Live / Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="1"
                    value={eventForm.capacity}
                    onChange={(event) => setEventForm((current) => ({ ...current, capacity: event.target.value }))}
                    placeholder="Capacity"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={eventForm.ticketPrice}
                    onChange={(event) => setEventForm((current) => ({ ...current, ticketPrice: event.target.value }))}
                    placeholder="Ticket price"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                </div>
                <input
                  value={eventForm.image}
                  onChange={(event) => setEventForm((current) => ({ ...current, image: event.target.value }))}
                  placeholder="Image URL (optional)"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
                <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={eventForm.isHighlighted}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, isHighlighted: event.target.checked }))
                    }
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Show on highlights once event is completed
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    disabled={savingEvent}
                    className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEvent}
                    className="rounded-xl border border-indigo-300/35 bg-indigo-500/25 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingEvent ? 'Saving...' : eventModalMode === 'create' ? 'Create Event' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[115] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-white/20 bg-[#0f1736]/95 p-6 backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedUser.name}</h3>
                  <p className="text-sm text-slate-300">{selectedUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg border border-white/20 bg-white/5 p-1.5 text-slate-300 transition hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.13em] text-slate-400">Role</p>
                  <p className="mt-1 font-semibold text-white">{selectedUser.role.toUpperCase()}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.13em] text-slate-400">Verification</p>
                  <p className="mt-1 font-semibold text-white">{selectedUser.isVerified ? 'Verified' : 'Pending'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.13em] text-slate-400">Registrations</p>
                  <p className="mt-1 font-semibold text-white">{selectedUser.registrations}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.13em] text-slate-400">Attended</p>
                  <p className="mt-1 font-semibold text-white">{selectedUser.attended}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Last registration: {selectedUser.lastRegisteredAt ? formatDateTime(selectedUser.lastRegisteredAt) : 'N/A'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
