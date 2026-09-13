import { Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

export default function Workshops() {
  const workshops = [
    {
      title: "Satellite Data Processing & Applications",
      instructor: "Dr. R. K. Sharma, ISRO",
      duration: "4 Hours",
      location: "Lab 3, Earth Sciences Dept",
      level: "Intermediate",
      description: "A hands-on workshop on processing raw satellite imagery, applying radiometric and geometric corrections, and extracting actionable insights for agriculture and urban planning using open-source tools.",
      tags: ["Remote Sensing", "QGIS", "Python"]
    },
    {
      title: "Space Policy & Entrepreneurship",
      instructor: "Adv. Meera Menon",
      duration: "3 Hours",
      location: "Seminar Hall B",
      level: "Beginner",
      description: "Understand the nuances of the new Indian Space Policy. Learn how to navigate regulatory frameworks, secure funding, and protect IP as a space-tech startup founder.",
      tags: ["Policy", "Startups", "Law"]
    },
    {
      title: "Miniaturized Satellite Design (CubeSats)",
      instructor: "Prof. Amit Verma, IIT Madras",
      duration: "Full Day (8 Hours)",
      location: "Innovation Hub",
      level: "Advanced",
      description: "Dive deep into the systems engineering of CubeSats. From power budgets and attitude control to telemetry and payload integration. Participants will work on a dummy satellite assembly.",
      tags: ["CubeSat", "Systems Engineering", "Hardware"]
    },
    {
      title: "AI & ML in Space Exploration",
      instructor: "Dr. Sarah Jenkins, ESA",
      duration: "5 Hours",
      location: "Virtual/Hall C",
      level: "Intermediate",
      description: "Explore how machine learning is revolutionizing anomaly detection in spacecraft telemetry, autonomous navigation for rovers, and deep-space image reconstruction.",
      tags: ["AI/ML", "Data Science", "Robotics"]
    }
  ];

  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Technical Workshops</h1>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
            Enhance your skills with our intensive, hands-on workshops led by industry experts. Seats are limited and require prior registration.
          </p>
        </div>

        <div className="space-y-8">
          {workshops.map((workshop, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-atmosphere-dim hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-navy text-white px-4 py-2 rounded-bl-2xl font-bold text-sm">
                {workshop.level}
              </div>
              
              <div className="md:w-5/6">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-4">{workshop.title}</h2>
                
                <div className="flex flex-wrap items-center gap-6 mb-6 text-sm font-medium text-ink-soft">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-ochre" />
                    <span>{workshop.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ochre" />
                    <span>{workshop.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-ochre" />
                    <span>{workshop.location}</span>
                  </div>
                </div>

                <p className="text-ink-soft font-body leading-relaxed mb-6">
                  {workshop.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-8">
                  {workshop.tags.map((tag, i) => (
                    <span key={i} className="bg-atmosphere px-3 py-1 rounded-full text-xs font-bold text-navy border border-atmosphere-dim">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link 
                  to="/register" 
                  className="inline-flex items-center gap-2 text-ochre font-bold hover:text-navy transition-colors group"
                >
                  Register for this Workshop
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
