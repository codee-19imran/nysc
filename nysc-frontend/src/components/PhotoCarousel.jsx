import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PhotoCarousel() {
  const images = [
    { url: '/carosal/Landscape Poster (1).png', alt: 'Landscape Poster' },
    { url: '/carosal/Patriot Poster.png', alt: 'Patriot Poster' }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev === 0 ? 1 : 0));
  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? 1 : 0));

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-ochre mb-3">Gallery</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy">Conference Highlights</h2>
          </div>
          <div className="hidden md:flex gap-4">
            <button 
              onClick={prevSlide}
              className="p-3 rounded-full border border-ink/20 text-navy hover:bg-atmosphere hover:border-transparent transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextSlide}
              className="p-3 rounded-full border border-ink/20 text-navy hover:bg-atmosphere hover:border-transparent transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden shadow-lg group">
          {images.map((img, idx) => (
            <div 
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <img 
                src={img.url} 
                alt={img.alt} 
                className="w-full h-full object-contain"
              />
            </div>
          ))}
          
          {/* Mobile controls */}
          <button 
            onClick={prevSlide}
            className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextSlide}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 flex gap-2 z-10">
            {images.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-ochre' : 'bg-white/50 hover:bg-white'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
