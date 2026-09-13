import OrbitalMotif from './OrbitalMotif'

export default function Host() {
  return (
    <section id="host" className="relative border-t border-ink/10 px-6 py-16 md:py-24 min-h-[60vh] flex flex-col justify-center items-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/Schoold-Header.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-navy/85 backdrop-blur-[2px]"></div>

      <div className="relative z-10 mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">

        {/* Organizer Section */}
        <div className="flex flex-col">
          <p className="font-display text-lg md:text-xl text-ochre uppercase tracking-widest font-bold">Organized by</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight">
            Central University
            <br />
            of Karnataka
          </h2>
          <p className="mt-6 font-body text-lg md:text-xl leading-relaxed text-atmosphere">
            NYSC&ndash;2026 is Organized by the Central University of Karnataka (CUK) under the aegis of the Indian Space Research Organisation (ISRO), the conference convenes school students, academic researchers, and senior government officials on the Taurian World School campus for presentations and field discussions on satellite remote sensing and mining safety.
          </p>
        </div>

        {/* Venue Section */}
        <div className="flex flex-col">
          <p className="font-display text-lg md:text-xl text-ochre uppercase tracking-widest font-bold">Conference Venue</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight">
            Taurian World
            <br />
            School
          </h2>
          <p className="mt-6 font-body text-lg md:text-xl leading-relaxed text-atmosphere">
            a leading educational institution located in Hajam, Jharkhand, serves as the official host institute for the National Young Scientist Conference (NYSC&ndash;2026)
          </p>
        </div>

      </div>
    </section>
  )
}
