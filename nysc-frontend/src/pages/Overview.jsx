import { Sparkles, Target, BookOpen } from 'lucide-react';
import PageTransition from '../components/PageTransition';

export default function Overview() {
  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Conference Overview</h1>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
            Discover the vision, themes, and impact of the National Young Scientist Conference 2026.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-atmosphere-dim mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-navy/5 flex items-center justify-center text-navy shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-navy">About NYSC 2026</h2>
          </div>
          <div className="space-y-6 text-ink-soft font-body text-lg leading-relaxed">
            <p>
              The <strong>National Young Scientist Conference (NYSC) 2026</strong> is a premier scientific event aimed at bringing together the brightest young minds, researchers, and innovators from across India.
            </p>
            <p>
              Organized by the Central University of Karnataka in collaboration with the Indian Space Research Organisation (ISRO), this conference serves as a dynamic platform for early-career scientists to showcase their groundbreaking research, exchange ideas, and foster interdisciplinary collaborations.
            </p>
            <p>
              The conference focuses on cutting-edge developments in space sciences, sustainable technologies, and advanced materials. We aim to bridge the gap between academic research and industry applications by facilitating deep conversations among scientists, policymakers, and industry leaders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-navy text-white rounded-3xl p-8 md:p-10 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-ochre shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-display font-bold">Our Mission</h3>
            </div>
            <p className="text-atmosphere-dim font-body leading-relaxed">
              To empower the next generation of scientific leaders by providing a rigorous, supportive, and highly visible platform for disseminating knowledge and sparking innovative solutions to global challenges.
            </p>
          </div>

          <div className="bg-ochre text-white rounded-3xl p-8 md:p-10 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-display font-bold">Key Themes</h3>
            </div>
            <ul className="space-y-3 font-body font-medium">
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white shrink-0"></span> Space Exploration & Technology</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white shrink-0"></span> Sustainable Earth Observations</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white shrink-0"></span> AI & Machine Learning in Sciences</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white shrink-0"></span> Advanced Materials & Physics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
