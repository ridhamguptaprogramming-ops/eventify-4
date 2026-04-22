import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, ArrowLeft, CheckCircle, Clock, Shield, Share2, X, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Event, checkRegistration, createRegistration, getEventById, initiatePayment, PaymentIntent } from '../lib/api';
import {
  formatEventDateTime,
  getEventAttendeesCount,
  getEventEndDate,
  getEventLocation,
  getEventStartDate,
  getEventStatus,
} from '../lib/eventLifecycle';

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [showPaymentQr, setShowPaymentQr] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const formatInr = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const loadEvent = async () => {
      try {
        const eventData = await getEventById(id);
        if (isMounted) {
          setEvent(eventData);
        }
      } catch (error) {
        console.error('Failed to load event from MongoDB API:', error);
        toast.error('Failed to load event details.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadEvent();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !user) {
      setIsRegistered(false);
      return;
    }

    let isMounted = true;

    const loadRegistration = async () => {
      try {
        const status = await checkRegistration(user.uid, id);
        if (isMounted) {
          setIsRegistered(status.registered);
        }
      } catch (error) {
        console.error('Failed to check registration from MongoDB API:', error);
      }
    };

    void loadRegistration();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const handleRegister = async () => {
    if (!user) {
      toast.error('Please login to register for events');
      return;
    }

    if (!id || !event) return;
    if (getEventStatus(event) === 'completed') {
      toast.error('This event has already ended.');
      return;
    }

    setRegistering(true);
    try {
      await createRegistration({
        uid: user.uid,
        eventId: id,
        userEmail: user.email ?? '',
        userName: user.displayName ?? 'Event Attendee'
      });

      toast.success('Successfully registered for the event!');
      setIsRegistered(true);
      setEvent((prev) => {
        if (!prev) return prev;
        const updatedCount = getEventAttendeesCount(prev) + 1;
        return {
          ...prev,
          attendeesCount: updatedCount,
          registeredCount: updatedCount,
        };
      });
    } catch (error) {
      console.error('Registration error:', error);
      const message = error instanceof Error ? error.message : 'Failed to register. Please try again.';
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  const handleSecurePayment = async () => {
    if (!user) {
      toast.error('Please login to continue with secure payment');
      return;
    }

    if (!id || !event) return;
    if (getEventStatus(event) === 'completed') {
      toast.error('This event has already ended.');
      return;
    }

    if (isRegistered) {
      toast.success('You are already registered. Your ticket is secured in dashboard.');
      return;
    }

    if (event.ticketPrice <= 0) {
      toast.info('This event is free. Proceeding with direct registration.');
      void handleRegister();
      return;
    }

    setGeneratingPayment(true);
    try {
      const intent = await initiatePayment({ uid: user.uid, eventId: id });
      if (!intent.requiresPayment) {
        toast.info(intent.message ?? 'This event does not require payment.');
        void handleRegister();
        return;
      }

      if (!intent.qrPayload || !intent.upiIntentUrl) {
        toast.error('Unable to generate payment QR right now.');
        return;
      }

      setPaymentIntent(intent);
      setShowPaymentQr(true);
      toast.success('Payment QR generated. Scan with Google Pay or Paytm.');
    } catch (error) {
      console.error('Failed to initiate secure payment:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate payment QR.';
      toast.error(message);
    } finally {
      setGeneratingPayment(false);
    }
  };

  const handleCompleteRegistration = () => {
    setShowPaymentQr(false);
    void handleRegister();
  };

  if (loading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Loading...</div>;
  if (!event) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Event not found</div>;

  const eventStatus = getEventStatus(event);
  const attendeesCount = getEventAttendeesCount(event);
  const eventLocation = getEventLocation(event);
  const eventStartDate = getEventStartDate(event);
  const eventEndDate = getEventEndDate(event);
  const availableSlots = Math.max(event.capacity - attendeesCount, 0);
  const statusUi =
    eventStatus === 'ongoing'
      ? {
          label: 'Live Now',
          badge: 'bg-emerald-500/20 text-emerald-200',
          registerLabel: 'Join Event',
        }
      : eventStatus === 'completed'
        ? {
            label: 'Event Ended',
            badge: 'bg-slate-500/30 text-slate-200',
            registerLabel: 'View Highlights',
          }
        : {
            label: 'Upcoming',
            badge: 'bg-blue-500/20 text-blue-200',
            registerLabel: 'Register Now',
          };

  return (
    <div className="min-h-screen bg-[#0F172A] pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={20} /> Back to Events
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden"
            >
              <div className="h-[400px] relative">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] to-transparent opacity-60" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{event.title}</h1>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusUi.badge}`}>
                    {statusUi.label}
                  </span>
                  <div className="flex flex-wrap gap-6 text-white/80">
                    <div className="flex items-center gap-2">
                      <Calendar size={20} className="text-indigo-400" />
                      <span>{formatEventDateTime(eventStartDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={20} className="text-teal-400" />
                      <span>{eventLocation}</span>
                    </div>
                    {eventEndDate && (
                      <div className="flex items-center gap-2">
                        <Clock size={20} className="text-sky-300" />
                        <span>Ends {formatEventDateTime(eventEndDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10">
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white mb-6">About the Event</h2>
                  <p className="text-slate-400 text-lg leading-relaxed mb-6">{event.description}</p>

                  {event.streamingProvider && event.streamingProvider !== 'none' && event.streamingUrl && (
                    <div className="mb-8 p-6 rounded-2xl border border-teal-400/30 bg-teal-500/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-teal-200">Live stream details</h3>
                        <span className="text-sm uppercase tracking-wider text-teal-100">{event.streamingProvider.replace('_', ' ')}</span>
                      </div>
                      <p className="text-slate-300 text-sm mb-4">
                        This event includes a live stream. Click the button below to open the meeting link.
                      </p>
                      <a
                        href={event.streamingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold"
                      >
                        Join Stream
                      </a>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-white mb-8">Event Schedule</h2>
                  <div className="space-y-6 mb-12">
                    {(event.schedule || [
                      { time: '09:00 AM', activity: 'Registration & Welcome Coffee' },
                      { time: '10:00 AM', activity: 'Opening Keynote: The Future of Innovation' },
                      { time: '11:30 AM', activity: 'Panel Discussion: Industry Trends' },
                      { time: '01:00 PM', activity: 'Networking Lunch' },
                      { time: '02:30 PM', activity: 'Workshop Sessions' },
                      { time: '04:30 PM', activity: 'Closing Ceremony' }
                    ]).map((item, i) => (
                      <div key={i} className="flex gap-6 items-start group">
                        <div className="text-indigo-400 font-bold w-24 shrink-0 pt-1">{item.time}</div>
                        <div className="flex-1 pb-6 border-b border-white/5 group-last:border-0">
                          <h4 className="text-white font-bold text-lg mb-1">{item.activity}</h4>
                          <p className="text-slate-500 text-sm">Main Stage • Level 2</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-8">Featured Speakers</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {(event.speakers || [
                      { name: 'Dr. Sarah Chen', role: 'AI Research Lead, Google', image: 'https://i.pravatar.cc/150?u=sarah' },
                      { name: 'Marcus Thorne', role: 'Design Director, Apple', image: 'https://i.pravatar.cc/150?u=marcus' }
                    ]).map((speaker, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <img src={speaker.image} alt={speaker.name} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                          <h4 className="text-white font-bold">{speaker.name}</h4>
                          <p className="text-slate-500 text-sm">{speaker.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Registration</div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusUi.badge}`}>
                    {statusUi.label}
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Available Slots</span>
                    <span className="text-white font-bold">{availableSlots} / {event.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Ticket Price</span>
                    <span className="text-white font-bold">{event.ticketPrice > 0 ? formatInr(event.ticketPrice) : 'Free'}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-teal-500" 
                      style={{ width: `${(attendeesCount / event.capacity) * 100}%` }}
                    />
                  </div>
                </div>

                {isRegistered ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-3 text-teal-400 font-bold">
                      <CheckCircle size={20} /> You are registered!
                    </div>
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20"
                    >
                      View QR Ticket
                    </button>
                  </div>
                ) : eventStatus === 'completed' ? (
                  <button
                    onClick={() => navigate('/event-highlights')}
                    className="w-full py-4 bg-slate-600 hover:bg-slate-500 text-white rounded-2xl font-bold transition-all"
                  >
                    View Highlights
                  </button>
                ) : (
                  <button
                    onClick={event.ticketPrice > 0 ? () => void handleSecurePayment() : handleRegister}
                    disabled={registering || generatingPayment}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    {event.ticketPrice > 0
                      ? generatingPayment
                        ? 'Generating QR...'
                        : `Pay ${formatInr(event.ticketPrice)} & Register`
                      : registering
                        ? 'Processing...'
                        : statusUi.registerLabel}
                  </button>
                )}

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                  <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    <Share2 size={16} /> Share Event
                  </button>
                  <button
                    onClick={() => void handleSecurePayment()}
                    disabled={registering || generatingPayment || event.ticketPrice <= 0 || eventStatus === 'completed'}
                    className="flex items-center gap-2 text-slate-400 hover:text-white disabled:text-slate-500/70 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Shield size={16} /> {event.ticketPrice <= 0 ? 'No Payment Needed' : generatingPayment ? 'Generating...' : eventStatus === 'completed' ? 'Event Ended' : 'Secure Payment'}
                  </button>
                </div>
              </motion.div>

              <div className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                <h3 className="text-xl font-bold mb-4">Need Help?</h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">If you have any questions about the event or registration process, our support team is here to help.</p>
                <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPaymentQr && paymentIntent?.qrPayload && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0b1226] border border-white/10 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Scan To Pay</h3>
                <p className="text-slate-400 text-sm">{event.title}</p>
              </div>
              <button
                onClick={() => setShowPaymentQr(false)}
                className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close payment QR"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
              <p className="text-indigo-100 text-xs uppercase tracking-widest font-bold mb-1">Amount</p>
              <p className="text-white text-2xl font-black">{formatInr(paymentIntent.amount ?? event.ticketPrice)}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 flex items-center justify-center mb-4">
              <QRCodeSVG value={paymentIntent.qrPayload} size={240} level="H" />
            </div>

            <div className="space-y-2 text-xs text-slate-400 mb-5">
              <p>Payee: <span className="text-slate-200">{paymentIntent.upiPayeeName} ({paymentIntent.upiPayeeVpa})</span></p>
              <p>Txn Ref: <span className="text-slate-200">{paymentIntent.transactionRef}</span></p>
              <p>Use Google Pay, Paytm, PhonePe, or any UPI app to scan this QR.</p>
            </div>

            {paymentIntent.upiIntentUrl && (
              <a
                href={paymentIntent.upiIntentUrl}
                className="w-full mb-3 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 text-slate-100 hover:bg-white/10 transition-colors font-semibold"
              >
                Open UPI App <ExternalLink size={16} />
              </a>
            )}

            <button
              onClick={handleCompleteRegistration}
              disabled={registering}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold transition-colors"
            >
              {registering ? 'Completing...' : "I've Paid, Complete Registration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
