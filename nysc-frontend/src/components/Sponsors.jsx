export default function Sponsors() {
  const sponsors = [
    { name: 'ISRO', role: 'Technical Co-Sponsor', logo: 'https://placehold.co/150x80/1F2937/FFFFFF?text=ISRO' },
    { name: 'Ministry of Mines', role: 'Patron', logo: 'https://placehold.co/150x80/1F2937/FFFFFF?text=Govt+of+India' },
    { name: 'Jharkhand Govt', role: 'Patron', logo: 'https://placehold.co/150x80/1F2937/FFFFFF?text=Jharkhand' },
  ];

  return (
    <section id="patrons" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-display font-bold text-navy text-center mb-12">
          Patrons &amp; Technical Co-Sponsors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {sponsors.map((sponsor) => (
            <div key={sponsor.name} className="flex flex-col items-center justify-center p-6 bg-atmosphere rounded-md border border-atmosphere-dim transition-transform hover:-translate-y-1 hover:shadow-lg">
              <img src={sponsor.logo} alt={sponsor.name} className="w-full max-w-[120px] object-contain mb-4" />
              <p className="text-xs font-bold text-ochre uppercase tracking-wider">{sponsor.role}</p>
              <h3 className="text-sm font-semibold text-navy mt-1 text-center">{sponsor.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
