import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ChevronDown, Mail, Phone, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: 'How do I create an event?',
    answer: 'To create an event, first log in to your account. Then navigate to Events and click the "Create Event" button. Fill in all the required details including event name, date, time, location, and description. Once you submit, your event will be visible to other users.'
  },
  {
    id: 2,
    question: 'Can I edit my event after creating it?',
    answer: 'Yes, you can edit your event anytime before it starts. Go to your Dashboard, find the event you want to edit, and click the edit button. Make your changes and save them. Note: You cannot edit events that have already occurred.'
  },
  {
    id: 3,
    question: 'How do I register for an event?',
    answer: 'Navigate to the Events page, find the event you\'re interested in, and click on it for details. Once on the event details page, click the "Register" button. You\'ll need to be logged in to complete the registration.'
  },
  {
    id: 4,
    question: 'How can I cancel my event registration?',
    answer: 'Go to your Dashboard and find the registered event. Click the event and look for the "Cancel Registration" button. Your registration will be removed, and you can register again if needed.'
  },
  {
    id: 5,
    question: 'Is there a limit on how many events I can create?',
    answer: 'No, there is no limit on the number of events you can create. However, please ensure your events are relevant and follow our community guidelines. Events that violate policies may be removed.'
  },
  {
    id: 6,
    question: 'How do I become an admin?',
    answer: 'Admin access is granted by invitation only. If you believe you should have admin access, please reach out to us through the support form below with details about your request.'
  },
  {
    id: 7,
    question: 'How long does registration stay on my dashboard?',
    answer: 'Your registrations will appear on your Dashboard until 30 days after the event has ended. Past events will be archived but can still be viewed in your history.'
  },
  {
    id: 8,
    question: 'Can I delete my account?',
    answer: 'Yes, you can request account deletion through the support form below. Please note that deleting your account will remove all your personal data and cannot be reversed.'
  }
];

export default function HelpPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.querySelectorAll('.animate-up'),
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out' }
      );
    }
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        createdAt: serverTimestamp(),
        status: 'open'
      });

      toast.success('Support ticket submitted! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error('Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0F172A] overflow-hidden pt-24">
      {/* Background Shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[5%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[10%] w-64 h-64 bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative">
        {/* Hero Section */}
        <section ref={heroRef} className="px-6 max-w-7xl mx-auto py-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="animate-up text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">
              Help & Support
            </span>
          </motion.h1>
          <p className="animate-up text-xl text-white/70 max-w-3xl mx-auto">
            Get answers to common questions about events and registration, or contact our support team for additional help.
          </p>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* FAQ Section */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <MessageSquare className="text-indigo-400" size={32} />
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: faq.id * 0.05 }}
                    className="group border border-white/10 rounded-lg overflow-hidden hover:border-indigo-500/50 transition-all"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-left text-lg font-semibold text-white/90">{faq.question}</span>
                      <ChevronDown
                        size={24}
                        className={`text-indigo-400 transition-transform ${
                          expandedFAQ === faq.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedFAQ === faq.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 py-4 bg-white/[0.02] border-t border-white/10 text-white/70"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Contact Support Section */}
            <div className="lg:col-span-1">
              <div className="sticky top-32 space-y-6">
                {/* Quick Contact Info */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-br from-indigo-600/20 to-teal-600/20 border border-indigo-500/30 rounded-xl p-6"
                >
                  <h3 className="text-xl font-bold mb-6 text-white">Quick Contact</h3>
                  
                  <div className="space-y-4">
                    <a
                      href="mailto:support@eventify.com"
                      className="flex items-center gap-3 text-white/80 hover:text-indigo-400 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/40 transition-colors">
                        <Mail size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white/50">Email</p>
                        <p className="font-medium">hubesoteric@gmail.com</p>
                      </div>
                    </a>

                    <a
                      href="tel:+1-800-EVENT-1"
                      className="flex items-center gap-3 text-white/80 hover:text-indigo-400 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/40 transition-colors">
                        <Phone size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white/50">Phone</p>
                        <p className="font-medium">+1 (800) 338-2468</p>
                      </div>
                    </a>
                  </div>
                </motion.div>

                {/* Response Time Info */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-teal-600/10 border border-teal-500/30 rounded-xl p-6"
                >
                  <h4 className="font-semibold text-teal-300 mb-3 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Response Time
                  </h4>
                  <p className="text-white/70 text-sm">
                    We typically respond to support tickets within 24 hours during business days.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Contact Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mt-20 max-w-2xl mx-auto bg-gradient-to-br from-indigo-600/10 to-teal-600/10 border border-indigo-500/20 rounded-2xl p-8"
          >
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Send className="text-indigo-400" size={32} />
              Contact Our Support Team
            </h2>
            <p className="text-white/60 mb-8">
              Fill out the form below and our support team will get back to you as soon as possible.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="How can we help?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  placeholder="Describe your issue or question..."
                  rows={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/20 ${
                  isSubmitting
                    ? 'opacity-70 cursor-not-allowed'
                    : 'hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105'
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Support Ticket'}
              </button>
            </form>
          </motion.div>

          {/* Additional Help Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Report an Issue</h3>
              <p className="text-white/60">
                Found a bug or issue? Let us know and we'll fix it right away.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Feature Request</h3>
              <p className="text-white/60">
                Have an idea for a new feature? We'd love to hear from you!
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">General Inquiry</h3>
              <p className="text-white/60">
                Have questions? Fill out the form above and we'll respond promptly.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
