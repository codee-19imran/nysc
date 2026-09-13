import Sponsors from '../components/Sponsors';
import PageTransition from '../components/PageTransition';

export default function PatronsPage() {
  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Our Patrons & Sponsors</h1>
            <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
              NYSC 2026 is made possible through the generous support and collaboration of our esteemed patrons and technical co-sponsors.
            </p>
          </div>
          
          {/* Reusing the existing Sponsors component inside a card for the dedicated page */}
          <div className="bg-white rounded-3xl shadow-sm border border-atmosphere-dim overflow-hidden">
            <Sponsors />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
