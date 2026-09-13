import CommitteesPreview from '../components/CommitteesPreview';
import { Star } from 'lucide-react';
import PageTransition from '../components/PageTransition';

export default function CommitteePage() {
  const heads = [
    { name: "Md Reza", role: "Head of Technical & Scientific Coordination", affiliation: "Central University of Karnataka", image: "https://placehold.co/400x400/1F2937/FFFFFF?text=Dr.+Kumar" },
    { name: "Vishwaa J", role: "Head of Website, Registration & Digital Management", affiliation: "Central University of Karnataka", image: "https://placehold.co/400x400/1F2937/FFFFFF?text=Prof.+Reddy" },
    { name: "Adharsh Kumar Pandey", role: "Head of Publicity, Media & Documentation", affiliation: "Central University of Karnataka", image: "https://placehold.co/400x400/1F2937/FFFFFF?text=Dr.+Singh" },
    { name: "Adarsh", role: "Head of Logistics & Venue Management", affiliation: "Central University of Karnataka", image: "https://placehold.co/400x400/1F2937/FFFFFF?text=Prof.+Desai" },
    { name: "Yash Gangwar", role: "Head of Hospitality, Student Affairs & Protocol", affiliation: "Central University of Karnataka", image: "https://placehold.co/400x400/1F2937/FFFFFF?text=Dr.+Babu" }
  ];

  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Organizing Committee</h1>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
            Meet the dedicated team of leaders, academics, and administrators working tirelessly to make NYSC 2026 a resounding success.
          </p>
        </div>

        {/* Organizing Chairs (Main) */}
        <div className="mb-16">
          <div className="bg-white rounded-3xl shadow-sm border border-atmosphere-dim overflow-hidden">
            <CommitteesPreview />
          </div>
        </div>

        {/* Committee Heads Section (Subordinate) */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-ochre/10 flex items-center justify-center text-ochre shrink-0">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <h2 className="text-3xl font-display font-bold text-navy">Committee Heads</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {heads.map((head, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-atmosphere-dim flex items-center gap-6 hover:shadow-md transition-shadow">
                <img
                  src={head.image}
                  alt={head.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-atmosphere"
                />
                <div>
                  <h3 className="font-display font-bold text-lg text-navy">{head.name}</h3>
                  <p className="text-ochre font-bold text-sm mb-1">{head.role}</p>
                  <p className="text-ink-soft font-body text-xs">{head.affiliation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
