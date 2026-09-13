import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { request } from '../lib/api';

export default function Ticker() {
  const [news, setNews] = useState([]);
  
  useEffect(() => {
    request('/public/news').then(data => {
      // Show only recent/featured up to 5 for the ticker
      setNews(data.slice(0, 5));
    }).catch(console.error);
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="w-full bg-navy border-t border-b border-white/10 overflow-hidden py-3">
      <div className="max-w-7xl mx-auto flex items-center px-4 relative">
        <div className="bg-ochre text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm mr-4 shrink-0 z-10 shadow-md">
          Announcements
        </div>
        <div className="overflow-hidden flex-grow relative flex items-center h-6">
          <motion.div
            className="whitespace-nowrap font-body text-sm text-atmosphere font-medium flex gap-12 absolute left-0"
            animate={{ x: [0, -1000] }}
            transition={{
              repeat: Infinity,
              duration: 20,
              ease: 'linear',
            }}
          >
            {news.map(item => (
              <span key={`a-${item.id}`}>✨ {item.title}</span>
            ))}
            {/* Duplicate for seamless looping */}
            {news.map(item => (
              <span key={`b-${item.id}`}>✨ {item.title}</span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
