
export default function CommitteesPreview() {
  const coreLeaders = [
    {
      id: 'general-chair',
      name: 'Mr. Prashant Kumar Bhogta',
      role: 'General Chair',
      affiliation: 'Regional Director, Cuttack Delta Region',
      institution: 'ISRO / YUVIKA-AYSRP',
      photo: '/Prashant.png',
      imageClass: 'scale-[1.15] translate-y-3 object-contain',
      bio: 'Provides overall strategic direction, institutional liaison with venue school and ISRO/YUVIKA-AYSRP stakeholders, and final inter-team governance.',
    },
    {
      id: 'co-chair',
      name: 'Mr. Satwik Hegde',
      role: 'Co-Chair',
      affiliation: 'Team member, Cuttack Delta Region',
      institution: 'YUVIKA-AYSRP',
      photo: '/satwik.png',
      imageClass: 'scale-[1.25] translate-y-4 object-contain',
      bio: 'Leads operational planning, venue readiness, on-ground execution, student affairs, and protocol arrangements.',
    },
    {
      id: 'finance-chair',
      name: 'Mr. Singh Shakti',
      role: 'Finance Chair',
      affiliation: 'Team member, Cuttack Delta Region',
      institution: 'YUVIKA-AYSRP',
      photo: '/Shakti.png',
      imageClass: 'scale-[1.15] translate-y-3 object-contain',
      bio: 'Manages financial planning, budget monitoring, expenditure tracking, procurement records, and official institutional administration.',
    },
  ];

  return (
    <section id="committee" className="py-20 md:py-28 bg-white border-t border-ink/10 scroll-mt-24 sm:scroll-mt-28">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section Header — quieter, more academic */}
        <div className="max-w-2xl mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-3">
            Organizing Committee
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-navy tracking-tight leading-[1.1]">
            The Leadership Behind the Conference
          </h2>
          <p className="mt-4 text-base text-ink-soft font-body leading-relaxed max-w-xl">
            Executive leadership guiding the National Young Scientist Conference 2026 — overseeing strategy, operations, and institutional coordination.
          </p>
        </div>

        {/* Leadership Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {coreLeaders.map((leader) => (
            <article
              key={leader.id}
              id={`leader-${leader.id}`}
              className="group rounded-xl bg-white border border-ink/10 p-7 transition-all duration-300 hover:border-ochre/40 hover:shadow-lg hover:shadow-ochre/5"
            >
              {/* Photo — larger, circular, academic feel */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white shadow-md border border-ink/10 bg-slate-50 flex items-center justify-center">
                    <img
                      src={leader.photo}
                      alt={leader.name}
                      className={`w-full h-full ${leader.imageClass || 'object-cover'}`}
                    />
                  </div>

                </div>
              </div>

              {/* Role — typography-driven, no colored badge */}
              <div className="text-center mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-ochre mb-2">
                  {leader.role}
                </p>
                <h3 className="font-display font-bold text-xl text-navy leading-tight">
                  {leader.name}
                </h3>
              </div>

              {/* Affiliation — this is what adds academic weight */}
              <div className="text-center mb-5 pb-5 border-b border-ink/8">
                <p className="font-body text-sm text-ink-soft leading-snug">
                  {leader.affiliation}
                </p>
                <p className="font-body text-xs font-semibold text-moss mt-1 uppercase tracking-wide">
                  {leader.institution}
                </p>
              </div>

              {/* Bio */}
              <p className="font-body text-sm text-ink-soft leading-relaxed text-center">
                {leader.bio}
              </p>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
