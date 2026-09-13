const milestones = [
  { label: 'Abstract submission opens', when: 'To be announced' },
  { label: 'Full paper submission deadline', when: 'To be announced' },
  { label: 'Review decisions communicated', when: 'To be announced' },
  { label: 'Registration closes', when: 'To be announced' },
  { label: 'Conference dates', when: 'To be announced' },
]

export default function Dates() {
  return (
    <section id="dates" className="border-t border-ink/10 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl font-semibold text-navy sm:text-4xl">
          Important dates
        </h2>
        <p className="mt-3 max-w-lg font-body text-ink-soft">
          The organizing committee is finalizing the exact schedule. Check
          back here as dates are confirmed.
        </p>

        <ol className="mt-10 border-l-2 border-ochre/30">
          {milestones.map((m, i) => (
            <li key={m.label} className="relative pb-9 pl-8 last:pb-0">
              <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-ochre" />
              <p className="font-body text-sm text-ink-soft">{m.when}</p>
              <p className="mt-1 font-display text-lg font-medium text-navy">{m.label}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
