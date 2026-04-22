import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Handshake, Megaphone, Users } from 'lucide-react';

const partnershipTracks = [
  {
    icon: Handshake,
    title: 'Brand Collaborations',
    description: 'Partner with Esoteric Hub for event sponsorships, co-branded activations, and audience growth campaigns.',
  },
  {
    icon: Users,
    title: 'Community Partnerships',
    description: 'Work with us to organize workshops, college events, and creator-led experiences with smooth operations.',
  },
  {
    icon: Megaphone,
    title: 'Marketing Alliances',
    description: 'Run cross-promotion initiatives, media campaigns, and launch announcements with measurable impact.',
  },
];

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <section className="mb-14">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-300">
            Partnerships
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-black text-white">Partner With Esoteric Hub</h1>
          <p className="mt-5 text-slate-300 leading-relaxed max-w-3xl">
            We collaborate with brands, communities, and organizers to deliver memorable event experiences at scale.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {partnershipTracks.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-7">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
                  <Icon size={22} />
                </div>
                <h2 className="text-2xl font-bold text-white">{item.title}</h2>
                <p className="mt-4 text-slate-300 leading-relaxed">{item.description}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-600/20 via-slate-900/30 to-emerald-500/20 p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-black text-white">Start a collaboration</h2>
          <p className="mt-4 max-w-2xl text-slate-200 leading-relaxed">
            Share your partnership idea with our team and we will get back to you quickly with the next steps.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="mailto:hubesoteric@gmail.com?subject=Partnership%20Inquiry"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-500"
            >
              Email Partnerships <ArrowRight size={18} />
            </a>
            <Link
              to="/help"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-bold text-white transition-colors hover:bg-white/10"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
