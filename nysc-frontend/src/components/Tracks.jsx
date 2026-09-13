const tracks = [
  {
    name: 'Earth Observation',
    detail: 'Satellite imagery, remote sensing algorithms, geospatial analytics, and climate monitoring systems.',
  },
  {
    name: 'Mining Safety',
    detail: 'Sensor networks, predictive hazard modeling, autonomous inspection, and worker-safety technology.',
  },
  {
    name: 'Sustainable Development',
    detail: 'Clean energy systems, resource-efficient engineering, and technology for long-term environmental resilience.',
  },
]

export default function Tracks() {
  return (
    <section id="tracks" className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="font-display text-3xl font-semibold text-navy sm:text-4xl">
            Paper tracks
          </h2>
          <p className="font-body text-sm text-ink-soft">Finalized tracks to follow</p>
        </div>

        <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {tracks.map((track) => (
            <div key={track.name} className="flex flex-col gap-2 py-7 sm:flex-row sm:gap-10">
              <h3 className="font-display text-xl font-semibold text-navy sm:w-64 sm:shrink-0">
                {track.name}
              </h3>
              <p className="font-body text-base leading-relaxed text-ink-soft">
                {track.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
