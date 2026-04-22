import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  QrCode,
  Shield,
  Ticket,
  User,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { updateProfile } from 'firebase/auth';
import { auth, signOut } from '../lib/firebase';
import {
  cancelRegistration,
  Event,
  getEvents,
  getRegistrations,
  Registration,
  upsertUserProfile,
  UserProfile,
} from '../lib/api';
import {
  formatEventDateTime,
  getEventEndDate,
  getEventLocation,
  getEventStartDate,
  getEventStatus,
} from '../lib/eventLifecycle';
import { useAuth } from '../context/AuthContext';

type FilterType = 'all' | 'upcoming' | 'ongoing' | 'attended' | 'missed';
type SortType = 'date' | 'recently_registered';
type RegistrationLifecycle = 'upcoming' | 'ongoing' | 'attended' | 'missed';

type EnrichedRegistration = Registration & {
  eventStartDateTime?: string;
  eventEndDateTime?: string;
  eventLocation?: string;
  eventStatus?: Event['status'];
  eventDescription?: string;
};

const cardEnter = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function getStatusForRegistration(reg: EnrichedRegistration): RegistrationLifecycle {
  if (reg.attended) return 'attended';
  if (reg.eventStatus === 'completed') return 'missed';
  if (reg.eventStatus === 'ongoing') return 'ongoing';
  return 'upcoming';
}

function formatEventDate(date?: string) {
  return formatEventDateTime(date);
}

function getRegistrationStatusLabel(status: RegistrationLifecycle) {
  if (status === 'attended') return 'Attended';
  if (status === 'missed') return 'Missed';
  if (status === 'ongoing') return 'Live';
  return 'Upcoming';
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<EnrichedRegistration[]>([]);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [profileView, setProfileView] = useState<UserProfile | null>(profile);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', email: '' });
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setProfileView(profile);
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setRegistrations([]);
      setSelectedRegId(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [regs, events] = await Promise.all([getRegistrations({ uid: user.uid }), getEvents()]);
        if (!isMounted) return;

        const eventsById = new Map<string, Event>(events.map((event) => [event.id, event]));

        const enriched = regs.map((reg) => {
          const matchingEvent = eventsById.get(reg.eventId);
          const eventStartDate = matchingEvent ? getEventStartDate(matchingEvent)?.toISOString() : undefined;
          const eventEndDate = matchingEvent ? getEventEndDate(matchingEvent)?.toISOString() : undefined;
          return {
            ...reg,
            eventStartDateTime: eventStartDate,
            eventEndDateTime: eventEndDate,
            eventLocation: matchingEvent ? getEventLocation(matchingEvent) : undefined,
            eventStatus: matchingEvent ? getEventStatus(matchingEvent) : undefined,
            eventDescription: matchingEvent?.description,
          };
        });

        setRegistrations(enriched);
        setSelectedRegId((previous) => {
          if (previous && enriched.some((item) => item.id === previous)) {
            return previous;
          }
          return enriched[0]?.id ?? null;
        });
      } catch (error) {
        console.error('Failed to load dashboard data from MongoDB API:', error);
        toast.error('Failed to load registrations. Please refresh.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadDashboardData();
    const pollId = window.setInterval(() => {
      void loadDashboardData();
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(pollId);
    };
  }, [user]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-notification-dropdown]')) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [notificationsOpen]);

  const enrichedByFilter = useMemo(() => {
    const filtered = registrations.filter((reg) => {
      const status = getStatusForRegistration(reg);
      if (filter === 'all') return true;
      return status === filter;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'recently_registered') {
        return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      }

      const aDate = a.eventStartDateTime ? new Date(a.eventStartDateTime).getTime() : 0;
      const bDate = b.eventStartDateTime ? new Date(b.eventStartDateTime).getTime() : 0;

      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
    });
  }, [registrations, filter, sortBy]);

  const selectedReg = useMemo(
    () => registrations.find((registration) => registration.id === selectedRegId) ?? null,
    [registrations, selectedRegId]
  );

  const totalEvents = registrations.length;
  const attendedCount = registrations.filter((reg) => getStatusForRegistration(reg) === 'attended').length;
  const upcomingCount = registrations.filter((reg) => getStatusForRegistration(reg) === 'upcoming').length;
  const ongoingCount = registrations.filter((reg) => getStatusForRegistration(reg) === 'ongoing').length;
  const missedCount = registrations.filter((reg) => getStatusForRegistration(reg) === 'missed').length;

  const activity = useMemo(() => {
    const timeline = registrations.flatMap((reg) => {
      const registeredEntry = {
        id: `${reg.id}-registered`,
        label: `Registered for ${reg.eventTitle}`,
        date: reg.registeredAt,
        tone: 'info' as const,
      };

      if (reg.attendedAt) {
        return [
          {
            id: `${reg.id}-attended`,
            label: `Attendance marked for ${reg.eventTitle}`,
            date: reg.attendedAt,
            tone: 'success' as const,
          },
          registeredEntry,
        ];
      }

      return [registeredEntry];
    });

    return timeline
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [registrations]);

  const notifications = useMemo(() => {
    const output: { id: string; message: string; tone: 'info' | 'success' }[] = [];

    const activeCount = upcomingCount + ongoingCount;
    if (activeCount > 0) {
      output.push({
        id: 'upcoming',
        message: `You have ${activeCount} active registration${activeCount > 1 ? 's' : ''}.`,
        tone: 'info',
      });
    }

    if (profileView?.isVerified) {
      output.push({ id: 'verified', message: 'Your account is verified and event-ready.', tone: 'success' });
    } else {
      output.push({ id: 'verify-pending', message: 'Account verification is pending review.', tone: 'info' });
    }

    if (selectedReg) {
      output.push({ id: 'ticket-ready', message: `Ticket ready for ${selectedReg.eventTitle}.`, tone: 'success' });
    }

    return output;
  }, [ongoingCount, profileView?.isVerified, selectedReg, upcomingCount]);

  const downloadQrImage = (registration: EnrichedRegistration) => {
    if (!selectedReg || selectedReg.id !== registration.id) {
      setSelectedRegId(registration.id);
      requestAnimationFrame(() => {
        setTimeout(() => downloadQrImage(registration), 50);
      });
      return;
    }

    const canvas = qrCanvasRef.current;
    if (!canvas) {
      toast.error('QR code is not ready yet.');
      return;
    }

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${registration.eventTitle.replace(/\s+/g, '-').toLowerCase()}-qr-ticket.png`;
    link.click();
    toast.success('QR downloaded successfully.');
  };

  const downloadTicketDetails = (registration: EnrichedRegistration) => {
    const status = getRegistrationStatusLabel(getStatusForRegistration(registration));
    const lines = [
      'Esoteric Hub Ticket',
      '-------------------',
      `Event: ${registration.eventTitle}`,
      `Event Date: ${formatEventDate(registration.eventStartDateTime)}`,
      `Location: ${registration.eventLocation ?? 'Venue TBA'}`,
      `Status: ${status}`,
      `Registered On: ${new Date(registration.registeredAt).toLocaleString()}`,
      `Ticket QR Value: ${registration.qrCode}`,
      `Attendee: ${registration.userName}`,
      `Email: ${registration.userEmail}`,
    ];

    const file = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${registration.eventTitle.replace(/\s+/g, '-').toLowerCase()}-ticket.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Ticket details downloaded.');
  };

  const addToWallet = (registration: EnrichedRegistration) => {
    if (getStatusForRegistration(registration) === 'missed') {
      toast.info('Completed events cannot be edited in wallet.');
      return;
    }

    const eventDate = registration.eventStartDateTime
      ? new Date(registration.eventStartDateTime)
      : null;
    if (!eventDate || Number.isNaN(eventDate.getTime())) {
      toast.error('Event date unavailable for wallet action.');
      return;
    }

    const endDate = registration.eventEndDateTime
      ? new Date(registration.eventEndDateTime)
      : new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

    const formatForGoogle = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: registration.eventTitle,
      details: `Registration ID: ${registration.id} | Ticket QR: ${registration.qrCode}`,
      location: registration.eventLocation ?? 'Venue TBA',
      dates: `${formatForGoogle(eventDate)}/${formatForGoogle(endDate)}`,
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleCancelRegistration = async (registration: EnrichedRegistration) => {
    const lifecycle = getStatusForRegistration(registration);
    if (lifecycle === 'missed' || lifecycle === 'attended') return;

    const shouldContinue = window.confirm(`Cancel registration for \"${registration.eventTitle}\"?`);
    if (!shouldContinue) return;

    setCancelingId(registration.id);
    try {
      await cancelRegistration(registration.id);
      setRegistrations((current) => current.filter((item) => item.id !== registration.id));
      setSelectedRegId((current) => (current === registration.id ? null : current));
      toast.success('Registration cancelled successfully.');
    } catch (error) {
      console.error('Failed to cancel registration:', error);
      const message = error instanceof Error ? error.message : 'Failed to cancel registration.';
      toast.error(message);
    } finally {
      setCancelingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully.');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const openEditProfile = () => {
    setProfileForm({
      displayName: (profileView?.displayName || user.displayName || '').trim(),
      email: (profileView?.email || user.email || '').trim(),
    });
    setIsEditProfileOpen(true);
  };

  const closeEditProfile = () => {
    if (savingProfile) return;
    setIsEditProfileOpen(false);
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const displayName = profileForm.displayName.trim();
    const email = profileForm.email.trim();

    if (!displayName) {
      toast.error('Display name is required.');
      return;
    }

    if (!email) {
      toast.error('Email is required.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await upsertUserProfile(user.uid, {
        uid: user.uid,
        email,
        displayName,
        role: profileView?.role ?? 'user',
        isVerified: profileView?.isVerified ?? false,
        verificationQRCode: profileView?.verificationQRCode,
        createdAt: profileView?.createdAt ?? new Date().toISOString(),
      });

      if ((user.displayName || '') !== displayName) {
        await updateProfile(user, { displayName });
      }

      setProfileView(updated);
      setIsEditProfileOpen(false);
      toast.success('Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile:', error);
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070B18] flex items-center justify-center px-6 text-center text-white">
        Please login to view dashboard.
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B18] px-6 pb-20 pt-32 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 left-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute top-40 right-0 h-80 w-80 rounded-full bg-purple-500/20 blur-[130px]" />
        <div className="absolute bottom-12 left-0 h-72 w-72 rounded-full bg-indigo-500/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <motion.aside {...cardEnter} className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={profileView?.displayName || user.displayName || 'Profile'}
                  className="h-16 w-16 rounded-2xl border border-blue-300/40 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-300/40 bg-blue-500/20 text-blue-100">
                  <User size={24} />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{profileView?.displayName || user.displayName || 'Esoteric Hub User'}</h2>
                <p className="truncate text-sm text-slate-300">{profileView?.email || user.email}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Account type</p>
                <p className="mt-1 flex items-center gap-2 font-semibold text-blue-100">
                  <Shield size={15} className="text-blue-300" />
                  {(profileView?.role || 'user').toUpperCase()}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Verification</p>
                <p className="mt-1 flex items-center gap-2 font-semibold text-emerald-200">
                  <CheckCircle2 size={15} className={profileView?.isVerified ? 'text-emerald-300' : 'text-amber-300'} />
                  {profileView?.isVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={openEditProfile}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/35 bg-blue-500/20 px-4 py-2.5 text-sm font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/30 hover:shadow-[0_0_18px_rgba(96,165,250,0.4)]"
              >
                <Pencil size={15} /> Edit Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/35 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-100 transition-all hover:-translate-y-0.5 hover:bg-red-500/25 hover:shadow-[0_0_18px_rgba(248,113,113,0.35)]"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <h3 className="text-lg font-bold">Quick Actions</h3>
            <div className="mt-4 space-y-3">
              <Link
                to="/events/new"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-blue-300/50 hover:bg-blue-500/15"
              >
                <span className="inline-flex items-center gap-2"><Zap size={15} className="text-blue-300" /> Register New Event</span>
                <span className="text-slate-300">→</span>
              </Link>
              <Link
                to="/events"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-indigo-300/50 hover:bg-indigo-500/15"
              >
                <span className="inline-flex items-center gap-2"><Ticket size={15} className="text-indigo-300" /> Explore Events</span>
                <span className="text-slate-300">→</span>
              </Link>
              <Link
                to="/help"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-purple-300/50 hover:bg-purple-500/15"
              >
                <span className="inline-flex items-center gap-2"><Mail size={15} className="text-purple-300" /> Contact Support</span>
                <span className="text-slate-300">→</span>
              </Link>
            </div>
          </section>
        </motion.aside>

        <motion.main {...cardEnter} transition={{ duration: 0.5, delay: 0.05 }} className="space-y-6">
          <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-black md:text-4xl">My Registrations</h1>
                <p className="mt-1 text-sm text-slate-300">Manage tickets, view status, and track your event journey.</p>
              </div>

              <div className="relative" data-notification-dropdown>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((state) => !state)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-blue-300/45 hover:bg-blue-500/15"
                >
                  <Bell size={16} className="text-blue-200" />
                  Notifications
                  <ChevronDown size={14} className={`transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-white/15 bg-[#0b122a]/95 p-3 shadow-2xl backdrop-blur-2xl">
                    <p className="px-2 pb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Alerts</p>
                    <div className="space-y-2">
                      {notifications.map((note) => (
                        <div
                          key={note.id}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            note.tone === 'success'
                              ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
                              : 'border-blue-300/30 bg-blue-500/15 text-blue-100'
                          }`}
                        >
                          {note.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex rounded-2xl border border-white/15 bg-white/[0.03] p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'ongoing', label: 'Live' },
                  { key: 'attended', label: 'Attended' },
                  { key: 'missed', label: 'Missed' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key as FilterType)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      filter === item.key
                        ? 'bg-blue-500/35 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                Sort by
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortType)}
                  className="rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/70"
                >
                  <option value="date">Date</option>
                  <option value="recently_registered">Recently Registered</option>
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total Events', value: totalEvents, icon: Calendar, color: 'text-blue-200' },
                { label: 'Live', value: ongoingCount, icon: Clock3, color: 'text-emerald-200' },
                { label: 'Attended', value: attendedCount, icon: CheckCircle2, color: 'text-emerald-200' },
                { label: 'Missed', value: missedCount, icon: XCircle, color: 'text-rose-200' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/45 hover:shadow-[0_0_22px_rgba(96,165,250,0.2)]"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-3xl font-black">{item.value}</p>
                      <Icon size={20} className={item.color} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {loading ? (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[0.05]" />
                ))}
              </div>
              <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.05]" />
            </section>
          ) : registrations.length === 0 ? (
            <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-10 text-center backdrop-blur-2xl">
              <Calendar size={50} className="mx-auto text-slate-500" />
              <h3 className="mt-5 text-2xl font-bold">No events registered yet</h3>
              <p className="mt-2 text-slate-300">Start exploring live and upcoming experiences curated for your interests.</p>
              <Link
                to="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-blue-300/35 bg-blue-500/25 px-6 py-3 font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/35 hover:shadow-[0_0_24px_rgba(96,165,250,0.45)]"
              >
                Explore Events
              </Link>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                {enrichedByFilter.length === 0 ? (
                  <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-8 text-center backdrop-blur-2xl">
                    <p className="text-lg font-semibold">No events in this filter.</p>
                    <p className="mt-2 text-sm text-slate-300">Try switching to another status view.</p>
                  </div>
                ) : (
                  enrichedByFilter.map((registration, index) => {
                    const status = getStatusForRegistration(registration);
                    const statusBadgeClass =
                      status === 'attended'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : status === 'missed'
                          ? 'bg-slate-500/25 text-slate-200'
                          : status === 'ongoing'
                            ? 'bg-green-500/20 text-green-200'
                            : 'bg-blue-500/20 text-blue-200';
                    return (
                      <motion.article
                        key={registration.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.06 }}
                        className={`group rounded-3xl border bg-white/[0.06] p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] ${
                          selectedRegId === registration.id
                            ? 'border-blue-300/55 shadow-[0_0_28px_rgba(96,165,250,0.35)]'
                            : 'border-white/15 hover:border-indigo-300/55'
                        }`}
                      >
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                          <button
                            type="button"
                            onClick={() => setSelectedRegId(registration.id)}
                            className="text-left"
                          >
                            <h3 className="text-2xl font-bold transition-colors group-hover:text-blue-100">{registration.eventTitle}</h3>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar size={14} className="text-blue-200" />
                                {formatEventDate(registration.eventStartDateTime)}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin size={14} className="text-purple-200" />
                                {registration.eventLocation ?? 'Venue TBA'}
                              </span>
                            </div>
                          </button>

                          <span
                            className={`h-fit rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] ${statusBadgeClass}`}
                          >
                            {getRegistrationStatusLabel(status)}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                          <Link
                            to={`/events/${registration.eventId}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-blue-300/50 hover:bg-blue-500/15"
                          >
                            View Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => downloadTicketDetails(registration)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-indigo-300/50 hover:bg-indigo-500/15"
                          >
                            <Download size={14} /> Download Ticket
                          </button>
                          {status === 'upcoming' || status === 'ongoing' ? (
                            <button
                              type="button"
                              disabled={cancelingId === registration.id}
                              onClick={() => void handleCancelRegistration(registration)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/35 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-100 transition-all hover:-translate-y-0.5 hover:bg-red-500/25 hover:shadow-[0_0_20px_rgba(248,113,113,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle size={14} /> {cancelingId === registration.id ? 'Cancelling...' : 'Cancel Registration'}
                            </button>
                          ) : status === 'missed' ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-500"
                            >
                              <XCircle size={14} /> Missed - Actions Locked
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-500"
                            >
                              <CheckCircle2 size={14} /> Attended
                            </button>
                          )}
                        </div>
                      </motion.article>
                    );
                  })
                )}
              </div>

              <div className="space-y-4">
                <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-blue-600/25 via-indigo-600/20 to-purple-600/20 p-6 backdrop-blur-2xl">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-blue-100">
                    <QrCode size={14} /> QR Ticket
                  </div>

                  {selectedReg ? (
                    <>
                      <h3 className="mt-3 line-clamp-2 text-xl font-bold">{selectedReg.eventTitle}</h3>
                      <div className="mt-4 rounded-2xl bg-white p-4 text-center">
                        <QRCodeCanvas
                          id="dashboard-ticket-qr"
                          value={selectedReg.qrCode}
                          size={190}
                          level="H"
                          includeMargin
                          className="mx-auto"
                          ref={qrCanvasRef}
                        />
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => downloadQrImage(selectedReg)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-white/20"
                        >
                          <Download size={14} /> Download QR
                        </button>
                        <button
                          type="button"
                          onClick={() => addToWallet(selectedReg)}
                          disabled={getStatusForRegistration(selectedReg) === 'missed'}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Wallet size={14} /> {getStatusForRegistration(selectedReg) === 'missed' ? 'Locked' : 'Add to Wallet'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-blue-100/85">Select an event to preview and download its QR ticket.</p>
                  )}
                </section>

                <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl">
                  <h3 className="text-lg font-bold">Recent Activity</h3>
                  <div className="mt-4 space-y-3">
                    {activity.length === 0 ? (
                      <p className="text-sm text-slate-300">No activity yet. Register for an event to get started.</p>
                    ) : (
                      activity.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              item.tone === 'success' ? 'bg-emerald-300' : 'bg-blue-300'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100">{item.label}</p>
                            <p className="text-xs text-slate-400">{new Date(item.date).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </section>
          )}
        </motion.main>
      </div>

      {isEditProfileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onClick={closeEditProfile}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md rounded-3xl border border-white/20 bg-[#0b122a]/95 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-profile-title" className="text-2xl font-bold text-white">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-slate-300">Update your Esoteric Hub account details.</p>
              </div>
              <button
                type="button"
                onClick={closeEditProfile}
                disabled={savingProfile}
                className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Display Name
                </span>
                <input
                  type="text"
                  required
                  value={profileForm.displayName}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, displayName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  placeholder="Enter your name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  placeholder="Enter your email"
                />
              </label>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl border border-blue-300/45 bg-blue-500/30 px-4 py-2.5 text-sm font-semibold text-blue-100 transition-all hover:-translate-y-0.5 hover:bg-blue-500/40 hover:shadow-[0_0_18px_rgba(59,130,246,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
