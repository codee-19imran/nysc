import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import OrbitalMotif from './OrbitalMotif'
import Ticker from './Ticker'

const sequence = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  return (
    <>
      <section id="top" className="relative min-h-screen flex items-center justify-start overflow-hidden bg-slate-950 pt-20">
      {/* Static Background Video */}
      <video
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-80"
      >
        <source src="/earth_rotation.mp4" type="video/mp4" />
      </video>

      {/* Linear Gradient Overlay for perfect readability */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)' }}
      ></div>

      <motion.div
        variants={sequence}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-12 gap-8 items-center py-40"
      >
        <div className="col-span-12 md:col-span-8 lg:col-span-7">
          {/* Editorial Date/Location Badge */}
          <motion.div variants={item} className="mb-10 flex items-center gap-4 border-l-2 border-amber-500 pl-4">
            <span className="font-body font-medium text-xs tracking-widest uppercase text-white">
              Dec 17 - 18, 2026
            </span>
            <span className="font-body font-medium text-xs tracking-widest uppercase text-white/50">
              |
            </span>
            <span className="font-body font-medium text-xs tracking-widest uppercase text-white">
              CUK, Karnataka
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="font-display text-5xl font-bold leading-[1.1] text-white sm:text-6xl md:text-7xl lg:text-8xl mb-8 tracking-tight"
          >
            National Young Scientist
            <br />
            <span className="text-amber-500">Conference 2026</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={item} className="font-body text-lg md:text-xl leading-[1.6] text-white/80 mb-12 font-medium max-w-[600px]">
            Next generation technologies for earth observation, mining safety
            &amp; sustainable development &mdash; a national gathering of young
            researchers working at the intersection of space science, resource
            safety, and a livable planet.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={item} className="flex flex-wrap justify-start gap-4">
            <Link
              to="/register"
              className="rounded-md bg-amber-500 px-8 py-3.5 font-body text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Register to attend
            </Link>
            <Link
              to="/submit"
              className="rounded-md bg-transparent border border-white px-8 py-3.5 font-body text-sm font-bold text-white transition-opacity hover:bg-white/10"
            >
              Submit a paper
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
    <Ticker />
    </>
  )
}
