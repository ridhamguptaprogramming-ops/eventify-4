import React from 'react';

const termSections = [
  {
    title: 'Platform Usage',
    points: [
      'You agree to use Esoteric Hub only for lawful event-related activities.',
      'You are responsible for the accuracy of event details and attendee communication.',
      'Abusive behavior, misuse, or attempts to compromise security are prohibited.',
    ],
  },
  {
    title: 'Accounts & Access',
    points: [
      'You are responsible for maintaining the confidentiality of your account access.',
      'Administrator permissions may be limited or revoked if policy violations occur.',
      'We may suspend access for activities that harm users or system reliability.',
    ],
  },
  {
    title: 'Content & Responsibility',
    points: [
      'You retain ownership of the event content you create on the platform.',
      'By posting content, you confirm it does not infringe rights or violate laws.',
      'We may remove content that breaches legal requirements or community standards.',
    ],
  },
  {
    title: 'Service & Liability',
    points: [
      'We aim for high availability but cannot guarantee uninterrupted service at all times.',
      'Feature updates or maintenance may temporarily impact platform performance.',
      'To the extent permitted by law, liability is limited to direct damages only.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <section className="mb-12">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-300">
            Terms
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-black text-white">Terms of Service</h1>
          <p className="mt-5 text-slate-300 leading-relaxed max-w-3xl">
            These terms define the rules and responsibilities for using Esoteric Hub and its event management services.
          </p>
          <p className="mt-3 text-sm text-slate-400">Last updated: April 4, 2026</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {termSections.map((section) => (
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
