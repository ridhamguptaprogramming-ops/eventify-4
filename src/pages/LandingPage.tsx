import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  Globe2,
  LockKeyhole,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Event, EventStatus, getEvents } from '../lib/api';
import {
  formatEventDateTime,
  getEventAttendeesCount,
  getEventLocation,
  getEventStartDate,
  getEventStatus,
} from '../lib/eventLifecycle';

type EventCategory = 'Tech' | 'AI' | 'Design';

const LIVE_CATEGORIES: EventCategory[] = ['Tech', 'AI', 'Design'];

const sectionReveal = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const featureCards = [
  {
    title: 'Smart Scheduling',
    description:
      'Plan sessions, speakers, and resources in minutes so your team spends less time coordinating and more time delivering standout events.',
    icon: Calendar,
  },
  {
    title: 'Real-time Attendance',
    description:
      'Monitor arrivals and check-ins live to keep crowd flow smooth and make decisions instantly during every event moment.',
    icon: Users,
  },
  {
    title: 'Secure Access',
    description:
      'Protect entries with verified QR access and role-based controls so every attendee interaction stays safe and reliable.',
    icon: LockKeyhole,
  },
];

const testimonials = [
  {
    quote:
      'Esoteric Hub helped us reduce entry queues by 68% and gave our sponsors better performance visibility in real time.',
    name: 'Priya Mehta',
    role: 'Head of Events, NovaTech',
  },
  {
    quote:
      'The dashboard made planning and execution feel effortless. Our team finally had one source of truth for attendance and engagement.',
    name: 'Daniel Ross',
    role: 'Operations Manager, PixelCon',
  },
  {
    quote:
      'From QR check-ins to post-event analytics, Esoteric Hub turned our workflow into a premium experience for both staff and attendees.',
    name: 'Aarav Kapoor',
    role: 'Community Lead, BuildSphere',
  },
];

const trustedLogos = ['Microsoft', 'Google', 'Adobe', 'Stripe', 'Notion', 'Figma'];

function formatEventDate(date?: string) {
  return formatEventDateTime(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: undefined,
    minute: undefined,
  });
}

function getHomeStatusUi(status: EventStatus) {
  if (status === 'ongoing') {
    return {
      label: 'Live Now',
      badgeClass:
        'border border-emerald-300/45 bg-emerald-500/25 text-emerald-100',
      ctaLabel: 'Join Event',
      ctaHref: undefined as string | undefined,
    };
  }
  if (status === 'completed') {
    return {
      label: 'Event Ended',
      badgeClass: 'border border-slate-300/35 bg-slate-500/25 text-slate-100',
      ctaLabel: 'View Highlights',
      ctaHref: '/event-highlights',
    };
  }
  return {
    label: 'Upcoming',
    badgeClass: 'border border-blue-300/45 bg-blue-500/25 text-blue-100',
    ctaLabel: 'Register Now',
    ctaHref: undefined as string | undefined,
  };
}

function inferEventCategory(event: Event): EventCategory {
  const content = `${event.title} ${event.description}`.toLowerCase();
  if (
    content.includes('machine learning') ||
    content.includes('artificial intelligence') ||
    /\b(ai|llm|genai|neural)\b/.test(content)
  ) {
    return 'AI';
  }
  if (/\b(design|ux|ui|creative|figma|branding|prototype)\b/.test(content)) {
    return 'Design';
  }
  return 'Tech';
}

export default function LandingPage() {
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<EventCategory>('Tech');

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        if (!isMounted) return;

        const sortedEvents = [...eventsData].sort((left, right) => {
          const rank = (event: Event) => {
            const status = getEventStatus(event);
            return status === 'ongoing' ? 0 : status === 'upcoming' ? 1 : 2;
          };
          const rankDiff = rank(left) - rank(right);
          if (rankDiff !== 0) return rankDiff;

          const leftStart = getEventStartDate(left)?.getTime() ?? 0;
          const rightStart = getEventStartDate(right)?.getTime() ?? 0;
          return leftStart - rightStart;
        });

        setActiveEvents(sortedEvents);
      } catch (error) {
        console.error('Failed to load events:', error);
        if (isMounted) {
          toast.error('Unable to load live events right now.');
        }
      } finally {
        if (isMounted) {
          setEventsLoading(false);
        }
      }
    };

    void loadEvents();
    const pollId = window.setInterval(() => {
      void loadEvents();
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(pollId);
    };
  }, []);

  const categorizedEvents = useMemo(() => {
    const grouped: Record<EventCategory, Event[]> = { Tech: [], AI: [], Design: [] };
    activeEvents.forEach((event) => {
      grouped[inferEventCategory(event)].push(event);
    });
    return grouped;
  }, [activeEvents]);

  const categoryEvents = categorizedEvents[activeCategory];
  const featuredEvent = categoryEvents[0] ?? activeEvents[0] ?? null;
  const liveEventCards =
    categoryEvents.length > 1
      ? categoryEvents.slice(1, 4)
      : activeEvents.filter((event) => event.id !== featuredEvent?.id).slice(0, 3);

  const totalAttendees = activeEvents.reduce((sum, event) => sum + event.capacity, 0);
  const totalCheckIns = activeEvents.reduce(
    (sum, event) => sum + getEventAttendeesCount(event),
    0
  );
  const engagementRate =
    totalAttendees > 0 ? Math.min(99, Math.max(62, Math.round((totalCheckIns / totalAttendees) * 100))) : 86;
  const featuredStatus = featuredEvent ? getEventStatus(featuredEvent) : null;
  const featuredStatusUi = featuredStatus ? getHomeStatusUi(featuredStatus) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060b1f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.28),transparent_42%),radial-gradient(circle_at_75%_18%,rgba(147,51,234,0.24),transparent_40%),radial-gradient(circle_at_62%_78%,rgba(14,165,233,0.2),transparent_46%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-flow bg-[linear-gradient(120deg,rgba(15,23,42,0.96),rgba(30,41,59,0.62),rgba(30,58,138,0.34),rgba(88,28,135,0.42),rgba(15,23,42,0.96))]" />

      <section className="relative px-6 pt-36 pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 backdrop-blur-xl">
              <Sparkles size={15} />
              Modern Event OS
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">
              Elevate Your{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                Event Experience
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-300">
              Track attendance, manage events, and analyze performance — all in one intelligent platform.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-7 py-4 text-base font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.5)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_40px_rgba(129,140,248,0.6)]"
                >
                  Explore Events
                  <ArrowRight size={18} />
                </Link>
              </motion.div>

              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                href="#dashboard-preview"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-xl transition-all hover:border-indigo-300/40 hover:bg-indigo-500/15"
              >
                See It in Action
              </motion.a>
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              Trusted by 00 event organizers
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-[2.2rem] bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-cyan-400/25 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-white/5 p-6 backdrop-blur-2xl">
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Dashboard Preview</p>
                  <p className="mt-1 text-sm font-semibold text-white">Esoteric Hub Analytics</p>
                </div>
                <div className="rounded-xl bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300">Live</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                  <p className="text-xs text-slate-400">Attendees</p>
                  <p className="mt-1 text-xl font-black text-white">00</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                  <p className="text-xs text-slate-400">Check-ins</p>
                  <p className="mt-1 text-xl font-black text-white">00</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                  <p className="text-xs text-slate-400">Engagement</p>
                  <p className="mt-1 text-xl font-black text-white">00%</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Event Performance</span>
                  <span>This Week</span>
                </div>
                <div className="flex h-24 items-end gap-2">
                  {[0, 0, 0, 0, 0, 0, 0].map((value) => (
                    <div key={value} className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500 to-cyan-400/90" style={{ height: `${value}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black md:text-4xl">Built for High-impact Event Teams</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Powerful capabilities designed to help your team move faster, delight attendees, and drive measurable outcomes.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  whileHover={{ y: -9, scale: 1.01 }}
                  className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur-2xl transition-all duration-300 hover:shadow-[0_0_38px_rgba(129,140,248,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/14 via-blue-500/7 to-purple-500/12 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/18 text-indigo-200">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                    <p className="mt-3 leading-relaxed text-slate-300">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/12 bg-white/5 p-8 backdrop-blur-2xl md:p-10">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black md:text-4xl">Event Pulse on Esoteric Hub</h2>
              <p className="mt-2 text-slate-300">
                Track upcoming, live, and recently completed experiences in one feed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {LIVE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all ${
                    activeCategory === category
                      ? 'border-indigo-300/70 bg-indigo-500/25 text-white shadow-[0_0_24px_rgba(99,102,241,0.45)]'
                      : 'border-white/20 bg-white/5 text-slate-300 hover:border-indigo-300/45 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {eventsLoading ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-80 rounded-3xl bg-white/10 animate-pulse lg:col-span-2" />
              <div className="space-y-4">
                <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
                <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
                <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
              </div>
            </div>
          ) : featuredEvent ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <motion.div
                whileHover={{ y: -6 }}
                className={`group relative overflow-hidden rounded-3xl border border-white/15 bg-slate-950/70 lg:col-span-2 ${
                  featuredStatus === 'completed' ? 'opacity-90' : ''
                }`}
              >
                <img src={featuredEvent.image} alt={featuredEvent.title} className="h-80 w-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050913] via-[#050913]/60 to-transparent" />
                {featuredStatus === 'completed' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                    <span className="rounded-full border border-slate-200/30 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                      Event Completed
                    </span>
                  </div>
                )}
                <div className="absolute left-6 right-6 bottom-6">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${featuredStatusUi?.badgeClass ?? ''}`}>
                    {featuredStatusUi?.label ?? inferEventCategory(featuredEvent)}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-white">{featuredEvent.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-200">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={15} className="text-indigo-200" />
                      {formatEventDate(
                        (featuredEvent.startDateTime || featuredEvent.date) ?? undefined
                      )}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={15} className="text-cyan-200" />
                      {getEventLocation(featuredEvent)}
                    </span>
                  </div>
                  <Link
                    to={featuredStatusUi?.ctaHref ?? `/events/${featuredEvent.id}`}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-indigo-300/50 hover:bg-indigo-500/20"
                  >
                    {featuredStatusUi?.ctaLabel ?? 'Register Now'}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </motion.div>

              <div className="space-y-4">
                {liveEventCards.length > 0 ? (
                  liveEventCards.map((event) => (
                    <motion.div
                      key={event.id}
                      whileHover={{ x: 5 }}
                      className={`rounded-2xl border border-white/15 bg-slate-950/65 p-4 transition-all hover:border-indigo-300/40 ${
                        getEventStatus(event) === 'completed' ? 'opacity-90' : ''
                      }`}
                    >
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getHomeStatusUi(getEventStatus(event)).badgeClass}`}>
                        {getHomeStatusUi(getEventStatus(event)).label}
                      </span>
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      {getEventStatus(event) === 'completed' && (
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                          Event Completed
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {formatEventDate((event.startDateTime || event.date) ?? undefined)} •{' '}
                        {getEventLocation(event)}
                      </p>
                      <Link
                        to={getHomeStatusUi(getEventStatus(event)).ctaHref ?? `/events/${event.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-200 hover:text-white"
                      >
                        {getHomeStatusUi(getEventStatus(event)).ctaLabel}
                        <ArrowRight size={13} />
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/15 bg-slate-950/65 p-5">
                    <p className="text-sm text-slate-300">
                      No more events in this category yet. Switch filters to explore additional sessions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-slate-950/65 p-6">
              <p className="text-slate-300">
                No events are available right now. Create an event to get started.
              </p>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            { label: 'Events Hosted', value: '00' },
            { label: 'Attendees', value: '00' },
            { label: 'Platform Uptime', value: '00' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-indigo-500/18 via-slate-900/65 to-cyan-500/10 p-8 text-center backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_36px_rgba(56,189,248,0.25)]"
            >
              <p className="text-4xl font-black text-white">{stat.value}</p>
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        id="dashboard-preview"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black md:text-4xl">Command Dashboard Preview</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            A centralized analytics workspace to monitor attendees, check-ins, and engagement across every event stream.
          </p>

          <div className="mt-10 rounded-[2rem] border border-white/12 bg-slate-950/60 p-6 backdrop-blur-2xl md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Realtime Analytics</p>
                <p className="mt-1 text-2xl font-black text-white">Esoteric Hub Dashboard</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-4 py-1.5 text-xs font-semibold text-emerald-300">
                <Clock3 size={14} />
                Synced every 30s
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Attendees</p>
                <p className="mt-1 text-2xl font-black text-white">00</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Check-ins</p>
                <p className="mt-1 text-2xl font-black text-white">00</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Engagement</p>
                <p className="mt-1 text-2xl font-black text-white">00%</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Growth</p>
                <p className="mt-1 inline-flex items-center gap-1 text-2xl font-black text-emerald-300">
                  <TrendingUp size={18} />
                  00%
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/5 p-5 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Attendance vs Engagement</p>
                  <BarChart3 size={17} className="text-indigo-200" />
                </div>
                <div className="flex h-36 items-end gap-3">
                  {[0, 0, 0, 0, 0, 0, 0].map((value) => (
                    <div key={value} className="flex-1 rounded-t-xl bg-gradient-to-t from-indigo-500 to-cyan-400" style={{ height: `${value}%` }} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">Live Health</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-300" />
                    Check-in gateways stable
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-200" />
                    Security layers active
                  </li>
                  <li className="flex items-center gap-2">
                    <Globe2 size={16} className="text-cyan-200" />
                    Multi-venue sync enabled
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black md:text-4xl">What Customers Say</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {testimonials.map((review) => (
              <div
                key={review.name}
                className="rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_28px_rgba(129,140,248,0.3)]"
              >
                <p className="text-slate-200 leading-relaxed">“{review.quote}”</p>
                <p className="mt-6 font-bold text-white">{review.name}</p>
                <p className="text-sm text-slate-400">{review.role}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/12 bg-white/5 p-8 backdrop-blur-2xl md:p-10">
          <h2 className="text-3xl font-black md:text-4xl">How It Works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: 'Step 1',
                title: 'Create Event',
                description: 'Launch events with schedules, ticketing, and venue details in one polished workflow.',
                icon: Calendar,
              },
              {
                step: 'Step 2',
                title: 'Share QR Code',
                description: 'Distribute secure event QR codes instantly to attendees and partners.',
                icon: QrCode,
              },
              {
                step: 'Step 3',
                title: 'Track Attendance',
                description: 'Watch check-ins and engagement analytics update live from your dashboard.',
                icon: TrendingUp,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  whileHover={{ y: -6 }}
                  className="rounded-2xl border border-white/15 bg-slate-950/60 p-6 transition-all hover:border-indigo-300/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">{item.step}</p>
                  <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-100">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-slate-300">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-24"
      >
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Trusted By</p>
          <div className="mt-8 flex flex-wrap justify-center gap-5">
            {trustedLogos.map((logo, index) => (
              <motion.div
                key={logo}
                whileHover={{ scale: 1.06, y: -3 }}
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 3.4, repeat: Infinity, delay: index * 0.2 }}
                className="rounded-2xl border border-white/12 bg-white/5 px-6 py-3 font-semibold text-slate-200 backdrop-blur-xl shadow-[0_0_0_rgba(129,140,248,0)] transition-all hover:border-indigo-300/45 hover:shadow-[0_0_22px_rgba(129,140,248,0.35)]"
              >
                {logo}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative px-6 pb-20"
      >
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-indigo-300/25 bg-gradient-to-r from-indigo-500/24 via-purple-500/22 to-cyan-500/20 p-10 text-center backdrop-blur-2xl md:p-14">
          <h2 className="text-3xl font-black text-white md:text-5xl">Ready to elevate your events?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-100/90">
            Join teams creating smarter, more engaging event experiences with Esoteric Hub.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="mt-8">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-slate-950/55 px-8 py-4 text-base font-bold text-white transition-all hover:border-cyan-200/60 hover:shadow-[0_0_30px_rgba(56,189,248,0.4)]"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
