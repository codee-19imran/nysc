import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { request } from '../lib/api';

// Default fallback dates (used if API returns empty)
const DEFAULT_DATES = [
  { event: 'Call for Papers Opens', date: 'January 1, 2026', passed: true },
  { event: 'Paper Submission Deadline', date: 'March 15, 2026', passed: false },
  { event: 'Notification of Acceptance', date: 'May 1, 2026', passed: false },
  { event: 'Camera Ready Submission', date: 'June 1, 2026', passed: false },
  { event: 'Early Bird Registration Ends', date: 'June 15, 2026', passed: false },
  { event: 'Conference Dates', date: 'Dec 17-18, 2026', passed: false },
];

export default function ImportantDates() {
  const [dates, setDates] = useState(DEFAULT_DATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      const data = await request('/settings/public/important-dates');
      if (data.important_dates && data.important_dates.length > 0) {
        setDates(data.important_dates);
      }
      // If empty, keep DEFAULT_DATES as fallback
    } catch (err) {
      console.error('Failed to fetch important dates:', err);
      // Keep DEFAULT_DATES as fallback on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="dates" className="py-24 bg-atmosphere relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-navy/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-ochre/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Important Dates</h2>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-ink-soft max-w-2xl mx-auto font-body text-lg">
            Mark your calendars. Ensure all submissions and registrations are completed before the deadlines to guarantee your spot.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-atmosphere-dim transform md:-translate-x-1/2 rounded-full"></div>

          <div className="space-y-12">
            {dates.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={index} className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Timeline Dot */}
                  <div className={`absolute left-8 md:left-1/2 w-6 h-6 rounded-full transform -translate-x-1/2 border-4 border-atmosphere shadow-sm ${item.passed ? 'bg-green-500' : 'bg-ochre'}`}>
                    {item.passed && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>

                  {/* Content Card */}
                  <div className={`w-full md:w-1/2 pl-20 pr-4 md:px-12 ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                    <div className={`bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-atmosphere-dim group flex flex-col ${isEven ? 'items-start' : 'items-start md:items-end'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className={`w-4 h-4 ${item.passed ? 'text-green-500' : 'text-ochre'}`} />
                        <h3 className="font-display font-bold text-xl text-navy">{item.date}</h3>
                      </div>
                      <p className="font-body text-ink-soft">{item.event}</p>
                      
                      {/* Decorative Line on Hover */}
                      <div className={`h-1 bg-ochre mt-4 rounded-full transition-all duration-300 w-0 group-hover:w-full`}></div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
