import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, ArrowRight, Search, Plus } from 'lucide-react';
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

type EventFilter = 'all' | 'upcoming' | 'ongoing' | 'completed';

function statusUi(status: EventStatus) {
  if (status === 'ongoing') {
    return {
      label: 'Live Now',
      badgeClass:
        'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40',
      ctaLabel: 'Join Event',
    };
  }
  if (status === 'completed') {
    return {
      label: 'Event Ended',
      badgeClass: 'bg-slate-500/25 text-slate-100 border border-slate-300/30',
      ctaLabel: 'View Highlights',
    };
  }
  return {
    label: 'Upcoming',
    badgeClass: 'bg-blue-500/20 text-blue-100 border border-blue-300/40',
    ctaLabel: 'Register Now',
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<EventFilter>('all');

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        if (isMounted) {
          setEvents(eventsData);
        }
      } catch (error) {
        console.error('Failed to load events from API:', error);
        if (isMounted) {
          toast.error('Failed to load events. Please refresh.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
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

  const searchedEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return events;
    return events.filter((event) => {
      const location = getEventLocation(event).toLowerCase();
      return (
        event.title.toLowerCase().includes(normalizedSearch) ||
        event.description.toLowerCase().includes(normalizedSearch) ||
        location.includes(normalizedSearch)
      );
    });
  }, [events, searchTerm]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return searchedEvents;
    return searchedEvents.filter((event) => getEventStatus(event) === filter);
  }, [filter, searchedEvents]);

  const sorted = useMemo(() => {
    const entries = [...filteredEvents];
    entries.sort((left, right) => {
      const leftStatus = getEventStatus(left);
      const rightStatus = getEventStatus(right);
      const rank = (status: EventStatus) =>
        status === 'ongoing' ? 0 : status === 'upcoming' ? 1 : 2;
      const rankDiff = rank(leftStatus) - rank(rightStatus);
      if (rankDiff !== 0) return rankDiff;

      const leftStart = getEventStartDate(left)?.getTime() ?? 0;
      const rightStart = getEventStartDate(right)?.getTime() ?? 0;

      if (leftStatus === 'completed') {
        return rightStart - leftStart;
      }
      return leftStart - rightStart;
    });
    return entries;
  }, [filteredEvents]);

  const activeEvents = sorted.filter((event) => getEventStatus(event) !== 'completed');
  const completedEvents = sorted.filter((event) => getEventStatus(event) === 'completed');
  const formatInr = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);

  const renderCard = (event: Event, index: number) => {
    const status = getEventStatus(event);
    const ui = statusUi(status);
    const attendeesCount = getEventAttendeesCount(event);
    const location = getEventLocation(event);
    const actionHref = status === 'completed' ? '/event-highlights' : `/events/${event.id}`;

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 ${
          status === 'completed' ? 'opacity-90' : ''
        }`}
      >
        <div className="relative h-56 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${ui.badgeClass}`}>
              {ui.label}
            </span>
            {status === 'ongoing' && (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-80" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300" />
              </span>
            )}
          </div>
          <div className="absolute right-4 top-4 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white">
            {formatEventDateTime(getEventStartDate(event), {
              month: 'short',
              day: 'numeric',
            })}
          </div>

          {status === 'completed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45">
              <span className="rounded-full border border-slate-200/25 bg-slate-900/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
                Event Completed
              </span>
            </div>
          )}
        </div>

        <div className="p-8">
          <h3 className="mb-4 line-clamp-1 text-2xl font-bold text-white">{event.title}</h3>
          <p className="mb-6 line-clamp-2 leading-relaxed text-slate-400">{event.description}</p>

          <div className="mb-8 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MapPin size={16} className="text-indigo-400" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Users size={16} className="text-teal-400" />
              <span>
                {attendeesCount} / {event.capacity} Registered
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Calendar size={16} className="text-pink-400" />
              <span>{event.ticketPrice > 0 ? formatInr(event.ticketPrice) : 'Free Entry'}</span>
            </div>
          </div>

          <Link
            to={actionHref}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 font-bold text-white transition-all group-hover:border-indigo-600 group-hover:bg-indigo-600"
          >
            {ui.ctaLabel} <ArrowRight size={18} />
          </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A] px-6 pb-20 pt-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <h1 className="mb-4 text-5xl font-black text-white">
              ESOTERIC <span className="text-indigo-400">EVENTS</span>
            </h1>
            <p className="text-lg text-slate-400">
              Browse upcoming, live, and past experiences across Esoteric Hub.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-4 md:w-auto">
            <Link
              to="/events/new"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white transition-all hover:bg-indigo-500"
            >
              <Plus size={18} /> Add New Event
            </Link>
            <div className="relative flex-1 md:w-80">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={20}
              />
              <input
                type="text"
                placeholder="Search events..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {[
            { key: 'all', label: 'All' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'ongoing', label: 'Live' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as EventFilter)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'border-indigo-300/60 bg-indigo-500/30 text-white'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:border-indigo-300/40 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[500px] animate-pulse rounded-3xl bg-white/5"
              />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
            No events match your filters right now.
          </div>
        ) : (
          <div className="space-y-10">
            {activeEvents.length > 0 && (
              <section>
                <h2 className="mb-5 text-xl font-bold uppercase tracking-[0.16em] text-slate-200">
                  Active Events
                </h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {activeEvents.map((event, index) => renderCard(event, index))}
                </div>
              </section>
            )}

            {completedEvents.length > 0 && (
              <section>
                <h2 className="mb-5 text-xl font-bold uppercase tracking-[0.16em] text-slate-300">
                  Past Events
                </h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {completedEvents.map((event, index) => renderCard(event, index))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
