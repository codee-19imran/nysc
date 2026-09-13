import { useEffect } from 'react';
import { X, MapPin, Calendar, Clock, Building2 } from 'lucide-react';

export default function SpeakerModal({ speaker, onClose }) {
  const { name, designation, institution, bio, photo, session, role } = speaker;

  // ✅ Proper scroll lock with cleanup
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Cleanup when modal closes
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 border border-ink/10 flex items-center justify-center hover:bg-white transition-colors"
        >
          <X className="w-5 h-5 text-navy" />
        </button>

        <div className="p-8 md:p-10">
          {/* Header with Photo */}
          <div className="flex flex-col md:flex-row gap-6 mb-8 pb-8 border-b border-ink/10">
            {/* Photo */}
            <div className="flex-shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover ring-4 ring-white shadow-lg border border-ink/10 mx-auto md:mx-0"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-navy/5 border-2 border-ink/10 flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-4xl font-display font-bold text-navy/40">
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
            </div>

            {/* Name and Details */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-ochre mb-2">
                {role}
              </p>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-3 leading-tight">
                {name}
              </h2>
              <p className="text-base text-ink-soft font-body mb-2">
                {designation}
              </p>
              <div className="flex items-center gap-2 text-sm text-moss font-medium justify-center md:justify-start">
                <Building2 className="w-4 h-4" />
                <span>{institution}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy mb-4">
              About
            </h3>
            <p className="text-base text-ink-soft font-body leading-relaxed">
              {bio}
            </p>
          </div>

          {/* Session Details (if applicable) */}
          {session && (
            <div className="border-t border-ink/10 pt-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-navy mb-4">
                Conference Session
              </h3>
              
              <div className="bg-atmosphere rounded-lg p-6 border border-ink/10">
                <h4 className="font-display font-bold text-lg text-navy mb-3 leading-snug">
                  {session.title}
                </h4>
                
                <p className="text-sm text-ink-soft font-body leading-relaxed mb-4">
                  {session.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-ink/8">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ochre" />
                    <span className="text-sm text-navy font-medium">{session.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ochre" />
                    <span className="text-sm text-navy font-medium">{session.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-ochre" />
                    <span className="text-sm text-navy font-medium">{session.venue}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}