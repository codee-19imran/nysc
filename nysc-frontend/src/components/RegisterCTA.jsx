import { Link } from 'react-router-dom';

export default function RegisterCTA() {
  return (
    <section id="register" className="px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold text-navy sm:text-4xl">
          Attending or presenting?
        </h2>
        <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-ink-soft">
          Registration is now open! Choose whether you&rsquo;re joining as
          an attendee or submitting a paper &mdash; the right next steps
          follow from there.
        </p>
        <Link
          to="/register"
          className="inline-block mt-8 rounded-xl bg-ochre px-8 py-4 font-body text-sm font-bold text-white transition-colors hover:bg-ochre-light shadow-lg hover:-translate-y-1 transform duration-200"
        >
          Register Now
        </Link>
      </div>
    </section>
  )
}
