import { Building2, Landmark, Compass } from 'lucide-react';

export default function About() {
  const conferenceFacts = [
    { label: 'Organizing Institute', value: 'Central University of Karnataka (CUK)' },
    { label: 'Patronage', value: 'Indian Space Research Organisation (ISRO)' },
    { label: 'Venue', value: 'Taurian World School, Hajam, Jharkhand' },
    { label: 'Conference Dates', value: '2026 (Dates to be announced)' },
    { label: 'Core Theme', value: 'Earth Observation, Mining Safety & Sustainable Development' },
    { label: 'Reach', value: 'Delegations from 28 States & 8 Union Territories' },
  ];

  const thematicPillars = [
    {
      icon: Compass,
      title: 'Remote Sensing & Earth Observation',
      description: 'Satellite-based geo-spatial monitoring, land-use mapping, and environmental surveillance techniques applied to regional and national challenges.',
    },
    {
      icon: Landmark,
      title: 'Mining Safety & Hazard Mitigation',
      description: 'Slope stability analysis, subsidence monitoring, and worker safety protocols for the mineral-rich corridors of Jharkhand and eastern India.',
    },
    {
      icon: Building2,
      title: 'Sustainable Geoscience & Development',
      description: 'Integration of geospatial technologies with sustainable resource management, climate resilience, and long-term regional planning frameworks.',
    },
  ];

  const participantCategories = [
    {
      title: 'School-Level Researchers',
      description: 'Dedicated track for students of Grades 9–12 presenting original models, science projects, and applied remote-sensing concepts.',
    },
    {
      title: 'Academic Paper Presenters',
      description: 'Peer-reviewed technical sessions for undergraduate, postgraduate, and doctoral scholars contributing original research.',
    },
    {
      title: 'Government & Institutional Delegates',
      description: 'Policy officers, mining administrators, and space scientists evaluating field implementations and research outcomes.',
    },
  ];

  return (
    <section id="overview" className="py-20 md:py-28 bg-white border-b border-ink/10 scroll-mt-24 sm:scroll-mt-28">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section Header — academic, not promotional */}
        <div className="max-w-3xl mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-4">
            National Young Scientist Conference 2026
          </p>
          <h2 id="about-heading" className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-navy tracking-tight leading-[1.1]">
            About the Conference
          </h2>
        </div>

        {/* Two-Column: Narrative + Fact Sheet (editorial layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-20">

          {/* Left: Narrative Paragraph */}
          <div className="lg:col-span-7">
            <p className="text-base sm:text-lg text-ink-soft font-body leading-relaxed mb-5">
              The <strong className="text-navy font-semibold">National Young Scientist Conference (NYSC–2026)</strong> is a national-level academic summit convened by the{' '}
              <strong className="text-navy font-semibold">Central University of Karnataka</strong> under the patronage of the{' '}
              <strong className="text-navy font-semibold">Indian Space Research Organisation (ISRO)</strong>, and hosted at{' '}
              <strong className="text-navy font-semibold">Taurian World School</strong>, Hajam, Jharkhand.
            </p>
            <p className="text-base text-ink-soft font-body leading-relaxed mb-5">
              The conference brings together school-level researchers, academic scholars, university faculty, and government delegates to examine the application of geospatial and remote-sensing technologies to two pressing national priorities: the safety of India's mining operations and the sustainable development of its resource-rich regions.
            </p>
            <p className="text-base text-ink-soft font-body leading-relaxed">
              Set against the geological and industrial backdrop of Jharkhand — a state central to India's mining and earth-science research — NYSC–2026 provides a platform for young scientists to engage directly with the institutions shaping the country's observational and environmental policy.
            </p>
          </div>

          {/* Right: Fact Sheet */}
          <aside className="lg:col-span-5">
            <div className="border-t-2 border-navy pt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ochre mb-6">
                Conference Fact Sheet
              </p>
              <dl className="divide-y divide-ink/8">
                {conferenceFacts.map((fact, index) => (
                  <div key={index} className="py-3.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      {fact.label}
                    </dt>
                    <dd className="text-sm font-semibold text-navy sm:text-right">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>

        </div>

        {/* Thematic Pillars */}
        <div className="mb-20">
          <div className="border-t border-ink/10 pt-12 mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-2">
              Thematic Scope
            </p>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-navy tracking-tight">
              Pillars of Scientific Focus
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {thematicPillars.map((pillar, idx) => {
              const IconComp = pillar.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-atmosphere p-7 border border-atmosphere-dim flex flex-col justify-between transition-all duration-300 hover:border-ochre/30 hover:shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white border border-ink/10 flex items-center justify-center text-navy mb-5 shadow-2xs">
                      <IconComp className="w-5 h-5 text-navy" />
                    </div>
                    <h4 className="font-display font-bold text-lg text-navy tracking-tight mb-2.5 leading-snug">
                      {pillar.title}
                    </h4>
                    <p className="font-body text-sm text-ink-soft leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Participant Categories */}
        <div>
          <div className="border-t border-ink/10 pt-12 mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-2">
              Conference Inclusivity
            </p>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-navy tracking-tight">
              Delegation &amp; Participant Framework
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {participantCategories.map((cat, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white p-7 border border-ink/10 transition-all duration-300 hover:border-ochre/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-ochre shrink-0" />
                  <h4 className="font-display font-bold text-base sm:text-lg text-navy tracking-tight">
                    {cat.title}
                  </h4>
                </div>
                <p className="font-body text-sm text-ink-soft leading-relaxed">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
