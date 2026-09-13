import { Link } from 'react-router-dom';
import { Mail, MapPin, Twitter, Linkedin, Facebook, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy text-atmosphere py-16 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Branding & About */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="NYSC 2026 Logo" className="h-10 w-10 object-cover rounded-full border border-white/20 shadow-lg bg-white" />
            <span className="font-display text-2xl font-bold tracking-tight text-white">
              NYSC&ndash;2026
            </span>
          </div>
          <p className="font-body text-atmosphere-dim text-sm leading-relaxed">
            The premier national gathering for young scientists, fostering innovation and interdisciplinary collaboration in space science and sustainable development.
          </p>
          <div className="flex gap-4 mt-2">
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-ochre hover:text-white transition-all duration-300 hover:-translate-y-1">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-ochre hover:text-white transition-all duration-300 hover:-translate-y-1">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-ochre hover:text-white transition-all duration-300 hover:-translate-y-1">
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-display text-lg font-bold text-white mb-6">Quick Links</h3>
          <ul className="flex flex-col gap-3 font-body text-sm text-atmosphere-dim">
            <li><Link to="/" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Home</Link></li>
            <li><a href="/overview" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>About the Conference</a></li>
            <li><a href="/#dates" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Important Dates</a></li>
            <li><a href="/#cfp" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Call for Papers</a></li>
            <li><a href="/committee" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Organizing Committee</a></li>
          </ul>
        </div>

        {/* Legal & Resources */}
        <div>
          <h3 className="font-display text-lg font-bold text-white mb-6">Resources</h3>
          <ul className="flex flex-col gap-3 font-body text-sm text-atmosphere-dim">
            <li><Link to="/guidelines" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Participant Guidelines</Link></li>
            <li><Link to="/legal" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Code of Conduct</Link></li>
            <li><Link to="/legal" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Privacy Policy</Link></li>
            <li><Link to="/legal" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>Terms & Conditions</Link></li>
            <li><a href="/#faq" className="hover:text-ochre transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ochre/50"></span>FAQs</a></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="font-display text-lg font-bold text-white mb-6">Contact Us</h3>
          <ul className="flex flex-col gap-4 font-body text-sm text-atmosphere-dim">
            <li className="flex items-start gap-3 group">
              <MapPin className="w-5 h-5 text-ochre shrink-0 mt-0.5 group-hover:-translate-y-1 transition-transform" />
              <span className="leading-relaxed">
                <strong className="text-white font-medium">Taurian World School</strong><br />
                Hajam, Jharkhand<br />
                India
              </span>
            </li>
            <li className="flex items-center gap-3 group">
              <Mail className="w-5 h-5 text-ochre shrink-0 group-hover:-translate-y-1 transition-transform" />
              <a href="mailto:info@nysc2026.org" className="hover:text-ochre transition-colors">info@nysc2026.org</a>
            </li>
            <li className="flex items-center gap-3 group">
              <Phone className="w-5 h-5 text-ochre shrink-0 group-hover:-translate-y-1 transition-transform" />
              <span className="hover:text-ochre transition-colors cursor-pointer">+91 (123) 456-7890</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 font-body text-sm text-atmosphere-dim/60">
        <p>&copy; {new Date().getFullYear()} National Young Scientist Conference. All rights reserved.</p>
        <p>Organized by <span className="text-atmosphere-dim hover:text-white transition-colors cursor-pointer">Central University of Karnataka</span></p>
      </div>
    </footer>
  );
}
