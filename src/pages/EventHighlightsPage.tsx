import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Search, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Event, getEvents } from '../lib/api';
import {
  formatEventDateTime,
  getEventAttendeesCount,
  getEventLocation,
  getEventStartDate,
  getEventStatus,
} from '../lib/eventLifecycle';

export default function EventHighlightsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const data = await getEvents();
        if (isMounted) {
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to load highlighted events:', error);
        if (isMounted) {
          toast.error('Unable to load highlights right now.');
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

  const highlightedCompletedEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return events
      .filter((event) => event.isHighlighted && getEventStatus(event) === 'completed')
      .filter((event) => {
        if (!query) return true;
        const location = getEventLocation(event).toLowerCase();
        return (
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          location.includes(query)
        );
      })
      .sort((left, right) => {
        const leftStart = getEventStartDate(left)?.getTime() ?? 0;
        const rightStart = getEventStartDate(right)?.getTime() ?? 0;
        return rightStart - leftStart;
      });
  }, [events, searchTerm]);

  const featured = highlightedCompletedEvents[0] ?? null;
  const others = highlightedCompletedEvents.slice(1);
  const totalAttendees = highlightedCompletedEvents.reduce(
    (sum, event) => sum + getEventAttendeesCount(event),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#130f2e] to-slate-950 px-6 pb-20 pt-28 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-12 rounded-[2rem] border border-white/15 bg-white/5 p-8 backdrop-blur-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-cyan-100">
                <Sparkles size={14} />
                Past Event Highlights
              </div>
              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                Highlight Reel
              </h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                Events marked as highlighted and completed by the Esoteric Hub team.
              </p>
            </div>

            <div className="w-full md:w-80">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search highlights..."
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Highlighted Events</p>
              <p className="mt-1 text-2xl font-black">{highlightedCompletedEvents.length}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Attendees</p>
              <p className="mt-1 text-2xl font-black">{totalAttendees.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Last Sync</p>
              <p className="mt-1 text-2xl font-black">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-80 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-80 animate-pulse rounded-3xl bg-white/10" />
          </div>
        ) : highlightedCompletedEvents.length === 0 ? (
          <section className="rounded-3xl border border-white/15 bg-white/5 p-10 text-center backdrop-blur-2xl">
            <p className="text-2xl font-bold">No completed highlights yet</p>
            <p className="mt-2 text-slate-300">
              Ask an admin to mark an event as highlighted, then it will appear here after completion.
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center rounded-xl border border-cyan-300/35 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
            >
              Explore Events
            </Link>
          </section>
        ) : (
          <div className="space-y-8">
            {featured && (
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-3xl border border-white/15 bg-white/5 backdrop-blur-2xl"
              >
                <div className="grid lg:grid-cols-2">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="h-full min-h-[280px] w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-8">
                    <span className="rounded-full border border-slate-200/30 bg-slate-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-100">
                      Featured Highlight
                    </span>
                    <h2 className="mt-4 text-3xl font-black">{featured.title}</h2>
                    <p className="mt-3 text-slate-300">{featured.description}</p>
                    <div className="mt-5 space-y-2 text-sm text-slate-200">
                      <p className="inline-flex items-center gap-2">
                        <Calendar size={15} className="text-cyan-200" />
                        {formatEventDateTime(getEventStartDate(featured))}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <MapPin size={15} className="text-indigo-200" />
                        {getEventLocation(featured)}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <Users size={15} className="text-emerald-200" />
                        {getEventAttendeesCount(featured)} attendees
                      </p>
                    </div>
                    <Link
                      to={`/events/${featured.id}`}
                      className="mt-6 inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      View Event Details
                    </Link>
                  </div>
                </div>
              </motion.article>
            )}

            {others.length > 0 && (
              <section>
                <h3 className="mb-4 text-xl font-bold uppercase tracking-[0.14em] text-slate-200">
                  More Highlights
                </h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {others.map((event, index) => (
                    <motion.article
                      key={event.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="overflow-hidden rounded-3xl border border-white/12 bg-white/5 backdrop-blur-2xl"
                    >
                      <img
                        src={event.image}
                        alt={event.title}
                        className="h-44 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-5">
                        <h4 className="line-clamp-1 text-lg font-bold">{event.title}</h4>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-300">{event.description}</p>
                        <p className="mt-3 text-xs text-slate-400">
                          {formatEventDateTime(getEventStartDate(event), {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: undefined,
                            minute: undefined,
                          })}
                        </p>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

