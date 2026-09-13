import { Shield, FileText, Scale } from 'lucide-react';
import { useState } from 'react';
import PageTransition from '../components/PageTransition';

export default function Legal() {
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Legal & Policies</h1>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
            Review our terms, policies, and guidelines to ensure a safe and compliant environment for all attendees.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-atmosphere-dim overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar Nav */}
          <div className="md:w-1/3 bg-atmosphere border-b md:border-b-0 md:border-r border-atmosphere-dim p-6 space-y-2">
            <button 
              onClick={() => setActiveTab('privacy')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'privacy' ? 'bg-navy text-white shadow-md' : 'text-ink-soft hover:bg-white hover:text-navy'}`}
            >
              <Shield className="w-5 h-5" />
              Privacy Policy
            </button>
            <button 
              onClick={() => setActiveTab('terms')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'terms' ? 'bg-navy text-white shadow-md' : 'text-ink-soft hover:bg-white hover:text-navy'}`}
            >
              <FileText className="w-5 h-5" />
              Terms & Conditions
            </button>
            <button 
              onClick={() => setActiveTab('conduct')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'conduct' ? 'bg-navy text-white shadow-md' : 'text-ink-soft hover:bg-white hover:text-navy'}`}
            >
              <Scale className="w-5 h-5" />
              Code of Conduct
            </button>
          </div>

          {/* Content Area */}
          <div className="md:w-2/3 p-8 md:p-12 h-[500px] overflow-y-auto">
            {activeTab === 'privacy' && (
              <div className="space-y-6 text-ink-soft font-body leading-relaxed">
                <h2 className="text-2xl font-bold font-display text-navy border-b border-atmosphere-dim pb-4">Privacy Policy</h2>
                <p><strong>Last Updated: July 1, 2025</strong></p>
                <p>NYSC 2026 is committed to protecting your privacy. This policy outlines how we collect, use, and safeguard your personal information.</p>
                <h3 className="text-lg font-bold text-navy mt-6">1. Information Collection</h3>
                <p>We collect information you provide during registration, paper submission, and general inquiries. This includes name, email, affiliation, and dietary preferences.</p>
                <h3 className="text-lg font-bold text-navy mt-6">2. Data Usage</h3>
                <p>Your data is strictly used for conference administration, including ticketing, scheduling, and providing necessary updates. We do not sell your data to third parties.</p>
                <p>By using this website, you consent to our use of cookies to improve user experience.</p>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-6 text-ink-soft font-body leading-relaxed">
                <h2 className="text-2xl font-bold font-display text-navy border-b border-atmosphere-dim pb-4">Terms & Conditions</h2>
                <h3 className="text-lg font-bold text-navy mt-6">1. Registration & Payment</h3>
                <p>All registrations are subject to availability and full payment. Early bird rates apply only until the specified deadline.</p>
                <h3 className="text-lg font-bold text-navy mt-6">2. Cancellation Policy</h3>
                <p>Cancellations made 30 days prior to the event are eligible for a 50% refund. No refunds will be issued for cancellations made within 30 days of the conference.</p>
                <h3 className="text-lg font-bold text-navy mt-6">3. Intellectual Property</h3>
                <p>All materials presented at NYSC 2026 remain the intellectual property of their respective authors. Recording or broadcasting sessions without prior written consent is prohibited.</p>
              </div>
            )}

            {activeTab === 'conduct' && (
              <div className="space-y-6 text-ink-soft font-body leading-relaxed">
                <h2 className="text-2xl font-bold font-display text-navy border-b border-atmosphere-dim pb-4">Code of Conduct</h2>
                <p>NYSC 2026 is dedicated to providing a harassment-free conference experience for everyone, regardless of gender, sexual orientation, disability, physical appearance, race, or religion.</p>
                <h3 className="text-lg font-bold text-navy mt-6">Expected Behavior</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Be considerate and respectful to all attendees, speakers, and staff.</li>
                  <li>Refrain from demeaning, discriminatory, or harassing behavior and speech.</li>
                  <li>Be mindful of your surroundings and your fellow participants.</li>
                </ul>
                <h3 className="text-lg font-bold text-navy mt-6">Reporting</h3>
                <p>If you are being harassed, notice someone else being harassed, or have any other concerns, please contact a member of the conference staff immediately. Staff can be identified by their distinctive badges.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
