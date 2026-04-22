import React from 'react';

const privacySections = [
  {
    title: 'Information We Collect',
    points: [
      'Account details like your name, email, and profile photo when you sign in.',
      'Event activity such as registrations, attendance check-ins, and event preferences.',
      'Basic technical details (browser, device, and log data) to keep the platform stable and secure.',
    ],
  },
  {
    title: 'How We Use Your Data',
    points: [
      'To operate event registration, attendance tracking, and organizer workflows.',
      'To improve product performance, detect issues, and protect platform integrity.',
      'To communicate updates, support responses, and critical service notifications.',
    ],
  },
  {
    title: 'Data Sharing & Security',
    points: [
      'We do not sell your personal data to third parties.',
      'Data is shared only with trusted service providers needed to run platform features.',
      'We use reasonable security controls to protect data from unauthorized access.',
    ],
  },
  {
    title: 'Your Rights',
    points: [
      'You can request access, correction, or deletion of your personal information.',
      'You can contact us anytime for privacy questions or account-related concerns.',
      'You can stop receiving non-essential communications by contacting support.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <section className="mb-12">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-300">
            Privacy
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-black text-white">Privacy Policy</h1>
          <p className="mt-5 text-slate-300 leading-relaxed max-w-3xl">
            This policy explains how Esoteric Hub collects, uses, and protects your information when you use our platform.
          </p>
          <p className="mt-3 text-sm text-slate-400">Last updated: April 4, 2026</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {privacySections.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-7"
            >
              <h2 className="text-2xl font-bold text-white">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-slate-300 leading-relaxed">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
