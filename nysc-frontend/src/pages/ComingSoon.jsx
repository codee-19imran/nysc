import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import PageTransition from '../components/PageTransition';

export default function ComingSoon() {
  return (
    <PageTransition>
      <div className="min-h-[70vh] flex items-center justify-center bg-atmosphere px-6 py-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="w-24 h-24 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-ochre" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy">
            Coming Soon
          </h1>
          <p className="text-lg text-ink-soft font-body leading-relaxed max-w-lg mx-auto">
            We're working hard to finalize the details for this section. Please check back later for updates as we get closer to the conference dates.
          </p>
          <div className="pt-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-ochre hover:bg-ochre-light text-white px-8 py-3 rounded-xl font-bold font-body transition-colors shadow-md hover:shadow-lg"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
