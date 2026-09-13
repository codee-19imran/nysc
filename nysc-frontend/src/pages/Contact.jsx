import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { request } from '../lib/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', subject: 'general_inquiry', message: '', website: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await request('/contact/public', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setStatus('success');
      setFormData({ first_name: '', last_name: '', email: '', subject: 'general_inquiry', message: '', website: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to send message. Please try again.');
    }
  };

  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Contact Us</h1>
            <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
              Have questions about the conference, registration, or paper submissions? We're here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="bg-navy text-white rounded-3xl p-8 md:p-10 shadow-lg">
                <h2 className="text-2xl font-display font-bold mb-8">Get in Touch</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-ochre" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Email</h3>
                      <a href="mailto:info@nysc2026.org" className="text-atmosphere-dim hover:text-ochre transition-colors">info@nysc2026.org</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-ochre" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Phone</h3>
                      <a href="tel:+918001234567" className="text-atmosphere-dim hover:text-ochre transition-colors">+91 (800) 123-4567</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-ochre" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Venue Address</h3>
                      <p className="text-atmosphere-dim leading-relaxed">
                        Taurian World School, Knowledge City, Hajam,<br />
                        Ranchi, Jharkhand 834002, India
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-atmosphere-dim">
              <h2 className="text-2xl font-display font-bold text-navy mb-6">Send a Message</h2>
              
              {status === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">Message sent successfully! We'll reply within 24 hours.</p>
                </div>
              )}
              
              {status === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Honeypot field (hidden from humans, catches bots) */}
                <input type="text" name="website" value={formData.website} onChange={handleChange} className="hidden" tabIndex="-1" autoComplete="off" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-navy mb-2">First Name</label>
                    <input required name="first_name" value={formData.first_name} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-atmosphere border border-atmosphere-dim focus:border-ochre focus:ring-2 focus:ring-ochre/20 outline-none transition-all" placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy mb-2">Last Name</label>
                    <input required name="last_name" value={formData.last_name} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-atmosphere border border-atmosphere-dim focus:border-ochre focus:ring-2 focus:ring-ochre/20 outline-none transition-all" placeholder="Doe" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-navy mb-2">Email Address</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-atmosphere border border-atmosphere-dim focus:border-ochre focus:ring-2 focus:ring-ochre/20 outline-none transition-all" placeholder="john@example.com" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-navy mb-2">Subject</label>
                  <select required name="subject" value={formData.subject} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-atmosphere border border-atmosphere-dim focus:border-ochre focus:ring-2 focus:ring-ochre/20 outline-none transition-all text-ink">
                    <option value="general_inquiry">General Inquiry</option>
                    <option value="registration_support">Registration Support</option>
                    <option value="paper_submission_issue">Paper Submission Issue</option>
                    <option value="sponsorship_opportunities">Sponsorship Opportunities</option>
                    <option value="technical_issue">Technical Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-navy mb-2">Message</label>
                  <textarea required rows="4" name="message" value={formData.message} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-atmosphere border border-atmosphere-dim focus:border-ochre focus:ring-2 focus:ring-ochre/20 outline-none transition-all resize-none" placeholder="How can we help you?"></textarea>
                </div>

                <button type="submit" disabled={status === 'loading'}
                  className="w-full bg-ochre hover:bg-ochre/90 disabled:opacity-70 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md">
                  {status === 'loading' ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
