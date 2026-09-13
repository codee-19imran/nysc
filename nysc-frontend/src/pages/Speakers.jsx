import { useState, useMemo } from 'react';
import { Crown, Award, Users, Building2, Search, X } from 'lucide-react';
import { speakersData, filterOptions } from '../data/speakers';
import SpeakerCard from '../components/SpeakerCard';
import SpeakerModal from '../components/SpeakerModal';
import SpeakerFilters from '../components/SpeakerFilters';
import PageTransition from '../components/PageTransition';

export default function Speakers() {
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    topic: 'All',
    date: 'All',
    format: 'All'
  });

  // Combine all speakers for filtering
  const allSpeakers = useMemo(() => {
    const combined = [
      speakersData.chiefGuest,
      speakersData.guestOfHonour,
      ...speakersData.academicSpeakers,
      ...speakersData.industryLeaders,
      ...speakersData.researchDelegates,
      ...speakersData.sessionChairs
    ];
    return combined;
  }, []);

  // Filter speakers based on search and filters
  const filteredSpeakers = useMemo(() => {
    return allSpeakers.filter(speaker => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.designation.toLowerCase().includes(searchQuery.toLowerCase());

      // Topic filter
      const matchesTopic = filters.topic === 'All' || speaker.topic === filters.topic;

      // Date filter
      const matchesDate = filters.date === 'All' || speaker.date === filters.date;

      // Format filter
      const matchesFormat = filters.format === 'All' || speaker.format === filters.format;

      return matchesSearch && matchesTopic && matchesDate && matchesFormat;
    });
  }, [allSpeakers, searchQuery, filters]);

  const handleSpeakerClick = (speaker) => {
    setSelectedSpeaker(speaker);
  };

  const handleCloseModal = () => {
    setSelectedSpeaker(null);
  };

  return (
    <PageTransition>
      <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-3">
            Program
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-navy tracking-tight leading-[1.1] mb-4">
            Invited Speakers & Dignitaries
          </h1>
          <p className="text-base text-ink-soft font-body leading-relaxed">
            Distinguished guests, eminent academicians, and industry leaders contributing to the National Young Scientist Conference 2026 through keynote addresses, technical sessions, and institutional support.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
              <input
                type="text"
                placeholder="Search by name, institution, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 border border-ink/15 rounded-lg text-sm font-body text-navy placeholder:text-ink-soft/60 focus:outline-none focus:border-ochre/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          <SpeakerFilters filters={filters} setFilters={setFilters} filterOptions={filterOptions} />
        </div>

        {/* Chief Guest & Guest of Honour - Hero Section (DYNAMIC) */}
        {(() => {
          const showChiefGuest = filteredSpeakers.some(s => s.id === 'chief-guest');
          const showGuestOfHonour = filteredSpeakers.some(s => s.id === 'guest-of-honour');
          
          // Hide entire section if neither dignitary matches filters
          if (!showChiefGuest && !showGuestOfHonour) return null;

          return (
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-8">
                <Crown className="w-5 h-5 text-ochre" />
                <h2 className="text-xl font-display font-bold text-navy">
                  Chief Guest & Guest of Honour
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {showChiefGuest && (
                  <SpeakerCard 
                    speaker={speakersData.chiefGuest} 
                    onClick={handleSpeakerClick}
                    variant="hero"
                  />
                )}
                {showGuestOfHonour && (
                  <SpeakerCard 
                    speaker={speakersData.guestOfHonour} 
                    onClick={handleSpeakerClick}
                    variant="hero"
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* Academic Keynote Speakers */}
        {filteredSpeakers.filter(s => speakersData.academicSpeakers.some(as => as.id === s.id)).length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <Award className="w-5 h-5 text-ochre" />
              <h2 className="text-xl font-display font-bold text-navy">
                Academic Keynote Speakers
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers
                .filter(s => speakersData.academicSpeakers.some(as => as.id === s.id))
                .map(speaker => (
                  <SpeakerCard 
                    key={speaker.id}
                    speaker={speaker} 
                    onClick={handleSpeakerClick}
                    variant="standard"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Industry Leaders */}
        {filteredSpeakers.filter(s => speakersData.industryLeaders.some(il => il.id === s.id)).length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <Building2 className="w-5 h-5 text-ochre" />
              <h2 className="text-xl font-display font-bold text-navy">
                Industry Leaders & Public Sector Executives
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers
                .filter(s => speakersData.industryLeaders.some(il => il.id === s.id))
                .map(speaker => (
                  <SpeakerCard 
                    key={speaker.id}
                    speaker={speaker} 
                    onClick={handleSpeakerClick}
                    variant="compact"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Research Delegates */}
        {filteredSpeakers.filter(s => speakersData.researchDelegates.some(rd => rd.id === s.id)).length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-5 h-5 text-ochre" />
              <h2 className="text-xl font-display font-bold text-navy">
                Research & Scientific Organisation Delegates
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers
                .filter(s => speakersData.researchDelegates.some(rd => rd.id === s.id))
                .map(speaker => (
                  <SpeakerCard 
                    key={speaker.id}
                    speaker={speaker} 
                    onClick={handleSpeakerClick}
                    variant="compact"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Session Chairs */}
        {filteredSpeakers.filter(s => speakersData.sessionChairs.some(sc => sc.id === s.id)).length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-5 h-5 text-ochre" />
              <h2 className="text-xl font-display font-bold text-navy">
                Technical Session Chairs & Jury Panelists
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers
                .filter(s => speakersData.sessionChairs.some(sc => sc.id === s.id))
                .map(speaker => (
                  <SpeakerCard 
                    key={speaker.id}
                    speaker={speaker} 
                    onClick={handleSpeakerClick}
                    variant="compact"
                  />
                ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {filteredSpeakers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-ink-soft font-body">No speakers match your current filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({ topic: 'All', date: 'All', format: 'All' });
              }}
              className="mt-4 text-sm text-ochre hover:text-ochre/80 font-body font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

      </div>

      {/* Modal */}
      {selectedSpeaker && (
        <SpeakerModal speaker={selectedSpeaker} onClose={handleCloseModal} />
      )}
    </section>
  </PageTransition>
  );
}