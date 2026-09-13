import { MapPin, Plane, Train, Car } from 'lucide-react';
import PageTransition from '../components/PageTransition';

export default function VenuePage() {
  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Conference Venue</h1>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
            NYSC 2026 will be hosted at the serene, state-of-the-art campus of Taurian World School, designed to inspire creativity and focus.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Venue Details */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-atmosphere-dim">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-navy/5 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-navy" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy mb-2">Location</h2>
                  <p className="text-ink-soft font-body text-lg leading-relaxed">
                    Main Auditorium,<br />
                    Taurian World School,<br />
                    Knowledge City, Hajam,<br />
                    Ranchi, Jharkhand 834002,<br />
                    India
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-display font-bold text-navy border-b border-atmosphere-dim pb-2">How to Reach</h3>
                
                <div className="flex gap-4">
                  <Plane className="w-6 h-6 text-ochre shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-navy">By Air</h4>
                    <p className="text-ink-soft text-sm mt-1">The nearest airport is Birsa Munda Airport (IXR) in Ranchi, located approx. 20 km from the campus. Regular flights connect to major cities like Delhi, Mumbai, and Kolkata.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Train className="w-6 h-6 text-ochre shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-navy">By Train</h4>
                    <p className="text-ink-soft text-sm mt-1">Ranchi Junction (RNC) is the major railway station, well-connected to all parts of India. It is about 25 km from the campus.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Car className="w-6 h-6 text-ochre shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-navy">By Road</h4>
                    <p className="text-ink-soft text-sm mt-1">The campus is located in Hajam. Regular state transport buses and private taxis/cabs are easily available from Ranchi city center.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-atmosphere-dim flex items-center justify-center min-h-[400px]">
            <div className="text-center text-ink-soft">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-atmosphere-dim" />
              <p className="font-bold text-lg mb-2">Interactive Map Integration</p>
              <p className="text-sm px-8">A Google Maps embed showing the exact location of the CUK campus and nearby landmarks will be placed here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
