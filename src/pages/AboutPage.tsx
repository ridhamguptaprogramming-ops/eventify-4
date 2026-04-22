import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Compass,
  Globe,
  Instagram,
  Lightbulb,
  Linkedin,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Feature = {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type TeamMember = {
  name: string;
  role: string;
  impact: string;
  linkedin: string;
  Instagram?: string;
  image?: string;
};

const features: Feature[] = [
  {
    title: 'Launch Events in Minutes',
    description:
      'Spin up registration, agendas, and ticketing quickly with templates and automations that eliminate setup friction.',
    icon: Rocket,
  },
  {
    title: 'Designed for Attendee Engagement',
    description:
      'Drive participation with real-time updates, check-ins, and interactions that keep every attendee connected to the moment.',
    icon: UsersRound,
  },
  {
    title: 'Enterprise-Grade Security',
    description:
      'Protect event operations with role-based access, secure infrastructure, and controls trusted by high-scale teams.',
    icon: ShieldCheck,
  },
];

const stats = [
  { label: 'Events Hosted', value: '00' },
  { label: 'Attendees', value: '00' },
  { label: 'Cities', value: '00' },
];

const journey = [
  { year: '2025', milestone: 'Idea', detail: 'We identified the operational chaos most event teams face and drafted our first product principles.' },
  { year: '2026', milestone: 'MVP', detail: 'We shipped the first Esoteric Hub MVP focused on check-ins, operations, and event visibility.' },
  { year: '2026', milestone: 'Growth', detail: 'We scaled globally with richer analytics, stronger reliability, and a growing organizer community.' },
];

const team: TeamMember[] = [
  {
    name: 'Ridham Gupta',
    role: 'Co-Founder & CEO',
    image: '2.png',
    impact: 'Shapes product direction so teams can run events with less complexity and more impact.',
    linkedin: 'https://www.linkedin.com/in/ridham-gupta-09056a386/',
    Instagram: 'https://www.instagram.com/i.ridhamgupta/?hl=en',
  },
  {
    name: 'Pranav Sharma',
    role: 'Co-Founder & CTO',
    image: '1.png',
    impact: 'Leads platform architecture to ensure speed, resilience, and scalability at every event touchpoint.',
    linkedin: 'https://www.linkedin.com/in/hackwithpranav?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    Instagram: 'https://www.instagram.com/01pranav_sharma?igsh=MXczejU4bmUyb3Nqcg%3D%3D',
  },
  {
    name: 'Arman Khan',
    role: 'Engineering Lead',
    image: '3.png',
    impact: 'Builds core product systems that keep live event operations fast, stable, and intelligent.',
    linkedin: 'https://www.linkedin.com/in/arman-khan-778874350/',
  },
  {
    name: 'Mohammad Ayan Khan',
    role: 'Lead Designer',
    image: '4.png',
    impact: 'Crafts intuitive experiences that make complex event workflows feel simple and effortless.',
    linkedin: 'https://www.linkedin.com/in/mohammad-ayan-khan-40a164333/',
     Instagram: 'https://www.instagram.com/ayan_verse_diaries?igsh=MTlsMThsdWMxa3ZuZw%3D%3D'
  },
  {
    name: 'Khushal Agarwal',
    role: 'Head of Marketing',
    image: '5.png',
    impact: 'Drives storytelling and market growth so more organizers discover smarter event operations.',
    linkedin: 'https://www.linkedin.com/in/khushal-agarwal-172406353/',
     Instagram: 'https://www.instagram.com/k_garg_4/'
  },
   {
    name: 'Khushal Agarwal',
    role: 'Head of Marketing',
    image: '6.png',
    impact: 'Drives storytelling and market growth so more organizers discover smarter event operations.',
    linkedin: 'https://www.linkedin.com/in/khushal-agarwal-172406353/',
  },
   {
    name: 'Khushal Agarwal',
    role: 'Head of Marketing',
    image: '7.png',
    impact: 'Drives storytelling and market growth so more organizers discover smarter event operations.',
    linkedin: 'https://www.linkedin.com/in/khushal-agarwal-172406353/',
  },
    {
    name: 'Khushal Agarwal',
    role: 'Head of Marketing',
    image: '7.png',
    impact: 'Drives storytelling and market growth so more organizers discover smarter event operations.',
    linkedin: 'https://www.linkedin.com/in/khushal-agarwal-172406353/',
  },
];

const values = [
  {
    title: 'Simplicity',
    description: 'We remove complexity from every workflow so event teams can focus on execution.',
    icon: Sparkles,
  },
  {
    title: 'User-first',
    description: 'Every product decision starts with organizer and attendee outcomes.',
    icon: UsersRound,
  },
  {
    title: 'Reliability',
    description: 'Events are high-stakes, so the platform is designed to stay dependable under pressure.',
    icon: Target,
  },
  {
    title: 'Innovation',
    description: 'We keep evolving with automation and insights that move events forward.',
    icon: Lightbulb,
  },
];

const revealOnScroll = (amount = 0.25) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount },
  transition: { duration: 0.55 },
});

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/25 blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-[130px]" />
        <div className="absolute bottom-12 right-0 h-80 w-80 rounded-full bg-purple-500/20 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-16 md:space-y-24">
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative"
        >
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200 backdrop-blur-xl">
            About Esoteric Hub
          </span>
          <h1
            className="mt-7 text-5xl font-black leading-[0.95] md:text-7xl"
            style={{ fontFamily: '"Sora", "Space Grotesk", "Inter", sans-serif' }}
          >
            Built To Run{' '}
            <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
              Better Events
            </span>
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-slate-300">
            We built Esoteric Hub to simplify how events are planned and experienced. From seamless check-ins to
            real-time insights, our platform helps teams run smarter, faster, and more engaging events.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-blue-300/25 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-100 backdrop-blur-xl">
            <Globe size={16} className="text-blue-200" />
            Powering 10,000+ events worldwide
          </div>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.25)}
          className="grid gap-6 md:grid-cols-2"
        >
          <article className="group rounded-3xl border border-white/15 bg-white/[0.06] p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-300/45 hover:shadow-[0_0_40px_rgba(96,165,250,0.22)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/35 bg-blue-500/20 text-blue-100">
              <Target size={20} />
            </div>
            <h2 className="mt-5 text-3xl font-black">Mission</h2>
            <p className="mt-3 text-slate-300">Simplify and elevate event management.</p>
          </article>
          <article className="group rounded-3xl border border-white/15 bg-white/[0.06] p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-300/45 hover:shadow-[0_0_40px_rgba(168,85,247,0.26)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-300/35 bg-purple-500/20 text-purple-100">
              <Compass size={20} />
            </div>
            <h2 className="mt-5 text-3xl font-black">Vision</h2>
            <p className="mt-3 text-slate-300">Become the operating system for events worldwide.</p>
          </article>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.2)}
        >
          <h2 className="text-3xl font-black md:text-4xl">What Makes Esoteric Hub Different</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group rounded-3xl border border-white/15 bg-white/[0.06] p-7 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-indigo-300/55 hover:shadow-[0_0_45px_rgba(129,140,248,0.28)]"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-indigo-100">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-2xl font-extrabold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{feature.description}</p>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.3)}
          className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#111a38]/90 to-[#0b1026]/95 p-8 backdrop-blur-xl md:p-10"
        >
          <h2 className="text-3xl font-black md:text-4xl">Why We Built Esoteric Hub</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-red-300/20 bg-red-500/10 p-6">
              <h3 className="text-xl font-bold text-red-100">The Problem</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Event teams were stuck juggling spreadsheets, fragmented tools, and manual coordination. Small mistakes
                created big chaos in logistics, communication, and attendee flow.
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-6">
              <h3 className="text-xl font-bold text-emerald-100">Our Solution</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                We built a smart platform that centralizes operations, tracks live performance, and gives every team a
                faster way to plan, run, and improve events.
              </p>
            </article>
          </div>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.4)}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group rounded-3xl border border-white/15 bg-white/[0.06] p-7 text-center backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-300/50 hover:shadow-[0_0_32px_rgba(96,165,250,0.26)]"
              >
                <p className="text-4xl font-black text-blue-200">{stat.value}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.25)}
        >
          <h2 className="text-3xl font-black md:text-4xl">Our Journey</h2>
          <div className="relative mt-8 space-y-5 md:grid md:grid-cols-3 md:gap-5 md:space-y-0">
            <div className="absolute left-6 top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-blue-300/60 via-indigo-300/40 to-purple-300/60 md:hidden" />
            {journey.map((step, index) => (
              <motion.article
                key={step.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300/55 hover:shadow-[0_0_36px_rgba(99,102,241,0.22)]"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-blue-400/80 to-purple-400/80 text-white">
                  <Zap size={16} />
                </div>
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-indigo-200">{step.year}</p>
                <h3 className="mt-1 text-2xl font-black">{step.milestone}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.detail}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.2)}
        >
        <h2 className="text-3xl font-black md:text-4xl">Team Behind The Platform</h2>

<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {team.map((member, index) => (
    <motion.article
      key={member.name}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-blue-300/55 hover:shadow-[0_0_42px_rgba(96,165,250,0.2)]"
    >
      <div className="flex items-start justify-between gap-3">
        
        <div className="flex h-90 w-80 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/80">
          {member.image ? (
            <img
              src={member.image}
              alt={member.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-blue-200">
              {member.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('')}
            </span>
          )}
        </div>

        {/* LINKEDIN BUTTON */}
        <a
          href={member.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${member.name} LinkedIn`}
          className="rounded-xl border border-white/20 bg-white/5 p-2 text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/60 hover:bg-blue-500/20 hover:text-blue-100 hover:shadow-[0_0_18px_rgba(96,165,250,0.4)]"
        >
          <Linkedin size={16} />

          {/* INSTAGRAM BUTTON */}
          <a
            href={member.Instagram}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} Instagram`}
            className="ml-2 rounded-xl border border-white/20 bg-white/5 p-2 text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/60 hover:bg-purple-500/20 hover:text-purple-100 hover:shadow-[0_0_18px_rgba(168,85,247,0.4)]"
          >
            <  Instagram size={16} />
          </a>
        </a>
      </div>

      <h3 className="mt-5 text-xl font-bold">{member.name}</h3>
      <p className="text-sm text-blue-200">{member.role}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {member.impact}
      </p>
    </motion.article>
  ))}
</div>
</motion.section>

        <motion.section
          {...revealOnScroll(0.3)}
        >
          <h2 className="text-3xl font-black md:text-4xl">Our Values</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-300/50 hover:shadow-[0_0_30px_rgba(192,132,252,0.25)]"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-purple-500/20 text-purple-100">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{value.description}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          {...revealOnScroll(0.3)}
          className="rounded-3xl border border-white/15 bg-gradient-to-r from-blue-600/18 via-indigo-600/20 to-purple-600/18 p-8 backdrop-blur-xl md:p-12"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Ready when you are</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">Ready to run better events?</h2>
          <p className="mt-4 max-w-3xl text-slate-200">
            Bring your operations, attendees, and performance insights into one platform built for modern event teams.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/events/new"
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/40 bg-blue-500/85 px-6 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.55)]"
            >
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300/70 hover:bg-indigo-500/20 hover:shadow-[0_0_24px_rgba(129,140,248,0.4)]"
            >
              Explore Events
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
