import React, { FormEvent, useState } from 'react';
import { Github, Heart, Instagram, Linkedin, Mail, Twitter, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    toast.success('Thanks for subscribing to Esoteric Hub updates.');
    setEmail('');
  };

  return (
    <footer className="relative border-t border-white/10 bg-gradient-to-b from-[#0c1228] to-[#070b19] px-6 pt-20 pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/45 to-transparent" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="mb-5 text-2xl font-black text-white">Esoteric Hub</h2>
            <p className="max-w-md leading-relaxed text-slate-300">
              Premium event intelligence for teams that want to orchestrate smoother operations, stronger engagement, and measurable outcomes from every event.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { icon: Instagram, href: 'https://www.instagram.com/esoteric.hub/?hl=en', label: 'Instagram' },
                // { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
                // { icon: Linkedin, href: 'https://www.linkedin.com', label: 'LinkedIn' },
                // { icon: Github, href: 'https://github.com', label: 'GitHub' },
                { icon: Youtube, href: 'https://www.youtube.com', label: 'YouTube' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition-all hover:-translate-y-1 hover:border-indigo-300/50 hover:bg-indigo-500/20 hover:text-white hover:shadow-[0_0_20px_rgba(129,140,248,0.4)]"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="mb-5 font-bold text-white">Platform</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link to="/" className="transition-colors hover:text-indigo-300">Home</Link></li>
              <li><Link to="/events" className="transition-colors hover:text-indigo-300">Events</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-300">About</Link></li>
              <li><Link to="/dashboard" className="transition-colors hover:text-indigo-300">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-bold text-white">Resources</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link to="/help" className="transition-colors hover:text-indigo-300">Contact Support</Link></li>
              <li><Link to="/partnerships" className="transition-colors hover:text-indigo-300">Partnerships</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-indigo-300">Privacy</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-indigo-300">Terms</Link></li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="mb-4 font-bold text-white">Newsletter</h4>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">
              Get event growth ideas and product updates straight to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <label className="relative block">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.45)]"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row">
          <p>© 2026 Esoteric Hub Inc. All rights reserved.</p>
          <p className="flex items-center gap-2">
            Crafted with <Heart size={14} className="fill-pink-500 text-pink-500" /> for ambitious event teams
          </p>
        </div>
      </div>
    </footer>
  );
}
