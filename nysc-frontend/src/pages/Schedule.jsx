import { Calendar, Clock, MapPin, Coffee, Users, Star, Download } from 'lucide-react';
import PageTransition from '../components/PageTransition';

export default function Schedule() {
  const scheduleData = [
    {
      day: "Day 1",
      date: "Dec 17, 2026",
      focus: "Research, Expert Knowledge & Project Showcase",
      events: [
        { time: "08:00 AM - 10:00 AM", title: "Inaugural Session: Opening Ceremony", type: "keynote", location: "Main Auditorium", icon: Star },
        { time: "10:00 AM - 11:45 AM", title: "Research Session: Paper Presentation - I", type: "session", location: "Various Venues", icon: Users },
        { time: "11:45 AM - 12:00 PM", title: "Tea Break", type: "break", location: "Courtyard", icon: Coffee },
        { time: "12:00 PM - 01:00 PM", title: "Expert Session: Technical Talk - I", type: "session", location: "Main Auditorium", icon: Users },
        { time: "01:00 PM - 02:00 PM", title: "Lunch Break", type: "break", location: "Dining Hall", icon: Coffee },
        { time: "02:00 PM - 03:45 PM", title: "Research Session: Paper Presentation - II", type: "session", location: "Various Venues", icon: Users },
        { time: "02:00 PM - 04:30 PM", title: "Innovation & Exhibition: Project Exhibition", type: "session", location: "Exhibition Center", icon: Users },
        { time: "04:30 PM Onwards", title: "Day 1 Activities Conclude", type: "break", location: "", icon: Clock },
      ]
    },
    {
      day: "Day 2",
      date: "Dec 18, 2026",
      focus: "Innovation, Career & Expert Learning",
      events: [
        { time: "08:00 AM - 09:45 AM", title: "Research Session: Paper Presentation - III", type: "session", location: "Various Venues", icon: Users },
        { time: "08:00 AM - 01:00 PM", title: "Student Innovation & Idea Pitching", type: "session", location: "Innovation Hub", icon: Users },
        { time: "09:45 AM - 10:00 AM", title: "Tea Break", type: "break", location: "Courtyard", icon: Coffee },
        { time: "10:00 AM - 11:45 AM", title: "Research Session: Paper Presentation - IV", type: "session", location: "Various Venues", icon: Users },
        { time: "11:45 AM - 12:00 PM", title: "Tea Break", type: "break", location: "Courtyard", icon: Coffee },
        { time: "12:00 PM - 01:00 PM", title: "Career Development: Career Guidance Talk", type: "session", location: "Main Auditorium", icon: Users },
        { time: "01:00 PM - 02:00 PM", title: "Lunch Break", type: "break", location: "Dining Hall", icon: Coffee },
        { time: "02:00 PM - 03:00 PM", title: "Expert Session: Technical Talk - II", type: "session", location: "Main Auditorium", icon: Users },
        { time: "03:00 PM - 04:30 PM", title: "Valedictory Session: Valedictory Ceremony & Awards", type: "keynote", location: "Main Auditorium", icon: Star },
      ]
    }
  ];

  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-navy mb-3">Detailed Schedule</h1>
          <p className="text-base text-ink-soft font-body max-w-2xl mx-auto mb-6">
            A comprehensive breakdown of sessions, keynotes, and events over the 2-day conference.
          </p>
        </div>

        <div className="space-y-8">
          {scheduleData.map((day, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-atmosphere-dim">
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-atmosphere-dim pb-3 mb-4 gap-3">
                <div>
                  <h2 className="text-xl font-display font-bold text-navy">{day.day}</h2>
                  <p className="text-sm font-body text-ink-soft mt-1">{day.date}</p>
                </div>
                <div className="text-sm font-bold text-ochre bg-ochre/10 px-3 py-1 rounded-full">
                  {day.focus}
                </div>
              </div>

              <div className="space-y-2">
                {day.events.map((event, eventIdx) => {
                  const Icon = event.icon;
                  const isBreak = event.type === 'break';
                  return (
                    <div 
                      key={eventIdx} 
                      className={`flex flex-col md:flex-row gap-3 md:gap-6 py-3 px-4 rounded-xl transition-colors ${isBreak ? 'bg-atmosphere/50' : 'hover:bg-atmosphere'}`}
                    >
                      <div className="md:w-1/4 flex-shrink-0 pt-0.5">
                        <div className="flex items-center gap-1.5 text-navy font-bold text-sm">
                          <Clock className="w-3.5 h-3.5 text-ochre" />
                          <span>{event.time}</span>
                        </div>
                      </div>
                      
                      <div className="md:w-3/4 flex flex-col gap-1.5">
                        <h3 className={`text-base font-bold font-display ${isBreak ? 'text-ink-soft' : 'text-navy'}`}>
                          {event.title}
                        </h3>
                        {event.speaker && (
                          <p className="text-ochre font-medium text-sm">{event.speaker}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-ink-soft mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
