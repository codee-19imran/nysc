export default function Theme() {
  return (
    <section id="theme" className="border-t border-ink/10 bg-navy px-6 py-16 text-atmosphere">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Why this theme, why now
        </h2>
        <p className="mt-6 font-body text-lg leading-relaxed text-atmosphere/80">
          Earth observation satellites now watch mining sites, forests, and
          coastlines change in near real time. That data is only useful if a
          new generation of scientists knows how to turn it into safer mines,
          better early-warning systems, and development that doesn&rsquo;t cost
          the planet its future. NYSC&ndash;2026 brings that generation
          together &mdash; in one room, for three focus areas that rarely
          share a stage.
        </p>

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          <div className="border-l-2 border-gold/60 pl-5">
            <h3 className="font-display text-lg font-semibold">Earth Observation</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-atmosphere/70">
              Remote sensing, satellite data pipelines, and geospatial
              intelligence for a changing planet.
            </p>
          </div>
          <div className="border-l-2 border-gold/60 pl-5">
            <h3 className="font-display text-lg font-semibold">Mining Safety</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-atmosphere/70">
              Predictive monitoring, hazard detection, and technology that
              protects the people underground.
            </p>
          </div>
          <div className="border-l-2 border-gold/60 pl-5">
            <h3 className="font-display text-lg font-semibold">Sustainable Development</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-atmosphere/70">
              Technology choices that hold up against the next fifty years,
              not just the next funding cycle.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
