import { MapPin } from 'lucide-react';

export default function SpeakerCard({ speaker, onClick, variant = 'standard' }) {
  const { name, designation, institution, teaser, photo } = speaker;

  // Determine size based on variant
  const photoSize = variant === 'hero' ? 'w-40 h-40' : variant === 'standard' ? 'w-28 h-28' : 'w-24 h-24';
  const cardPadding = variant === 'hero' ? 'p-8' : variant === 'standard' ? 'p-6' : 'p-5';

  return (
    <article
      onClick={() => onClick(speaker)}
      className={`group rounded-xl bg-white border border-ink/10 ${cardPadding} transition-all duration-300 hover:border-ochre/40 hover:shadow-lg hover:shadow-ochre/5 cursor-pointer flex flex-col items-center text-center`}
    >
      {/* Photo or Placeholder */}
      <div className="mb-5">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className={`${photoSize} rounded-full object-cover ring-4 ring-white shadow-md border border-ink/10`}
          />
        ) : (
          <div className={`${photoSize} rounded-full bg-navy/5 border-2 border-ink/10 flex items-center justify-center`}>
            <span className="text-2xl font-display font-bold text-navy/40">
              {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-display font-bold text-lg text-navy mb-2 leading-tight">
        {name}
      </h3>

      {/* Designation */}
      <p className="text-sm text-ink-soft font-body mb-1">
        {designation}
      </p>

      {/* Institution */}
      <div className="flex items-center gap-1.5 text-xs text-moss font-medium mb-4">
        <MapPin className="w-3 h-3" />
        <span className="truncate max-w-[200px]">{institution}</span>
      </div>

      {/* Teaser (only for standard and hero variants) */}
      {variant !== 'compact' && (
        <p className="text-sm text-ink-soft font-body leading-relaxed line-clamp-3">
          {teaser}
        </p>
      )}

      {/* View Profile Link */}
      <div className="mt-4 pt-4 border-t border-ink/8 w-full">
        <span className="text-xs font-medium text-ochre group-hover:text-ochre/80 transition-colors">
          View Full Profile →
        </span>
      </div>
    </article>
  );
}