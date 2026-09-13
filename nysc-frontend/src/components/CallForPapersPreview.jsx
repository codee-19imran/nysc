import { Link } from 'react-router-dom';

export default function CallForPapersPreview() {
  const tracks = [
    'Earth Observation & Remote Sensing',
    'Mining Safety & Automation',
    'Sustainable Resource Development',
    'AI & Data Analytics in Geo-Sciences',
    'Climate Change Mitigation Technologies',
  ];

  return (
    <section id="cfp" className="py-16 bg-navy text-white relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-navy-light opacity-50 blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row gap-16 items-center">
        <div className="lg:w-1/2">
          <h2 className="text-4xl font-display font-bold mb-6">Call for Papers</h2>
          <p className="text-atmosphere-dim font-body text-lg mb-8 leading-relaxed">
            We invite researchers, academicians, and industry professionals to submit their original research papers. Accepted papers will be published in the official conference proceedings.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/submit" className="bg-ochre hover:bg-ochre-light text-white font-bold py-3 px-8 rounded-md transition-colors shadow-lg">
              Submit Your Paper
            </Link>
            <Link to="/guidelines" className="inline-block border-2 border-white/20 hover:bg-white/10 text-white font-bold py-3 px-8 rounded-md transition-colors">
              Read Guidelines
            </Link>
          </div>
        </div>

        <div className="lg:w-1/2 w-full">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-8">
            <h3 className="text-xl font-display font-bold mb-6 text-ochre-light">Featured Technical Tracks</h3>
            <ul className="space-y-4">
              {tracks.map((track, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="mt-1 min-w-[24px] h-6 w-6 rounded-full bg-green-600/20 text-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="font-body text-atmosphere">{track}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
