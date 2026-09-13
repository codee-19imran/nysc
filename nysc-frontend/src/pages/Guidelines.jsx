import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import PageTransition from '../components/PageTransition';

export default function Guidelines() {
  return (
    <PageTransition>
      <div className="bg-atmosphere min-h-screen pt-8 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-navy mb-4">Submission Guidelines</h1>
          <div className="w-24 h-2 bg-ochre mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-ink-soft font-body max-w-2xl mx-auto">
            Please review the following instructions carefully before submitting your manuscript to NYSC 2026.
          </p>
        </div>

        <div className="space-y-12">
          {/* Section 1 */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-atmosphere-dim">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-navy/5 flex items-center justify-center text-navy">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-display text-navy">Manuscript Formatting</h2>
            </div>
            <ul className="space-y-4 text-ink-soft font-body">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>All papers must be formatted according to the standard two-column conference template.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>Submissions should be written in English.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>The maximum page limit is 6 pages, including all figures, tables, and references. Additional pages will incur an extra fee.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>Only PDF files will be accepted for the review process.</span>
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-atmosphere-dim">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-ochre/10 flex items-center justify-center text-ochre">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-display text-navy">Review Process & Policies</h2>
            </div>
            <p className="text-ink-soft font-body mb-4 leading-relaxed">
              NYSC 2026 employs a strict <strong>double-blind review process</strong>. Authors must ensure that their identities are not revealed in the initial manuscript submission.
            </p>
            <ul className="space-y-4 text-ink-soft font-body mt-6">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0 mt-2"></div>
                <span>Remove author names, affiliations, and email addresses from the title page.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0 mt-2"></div>
                <span>Avoid citing your own previous work in a way that reveals your identity (e.g., use "In [1], it was shown..." instead of "In our previous work [1]...").</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0 mt-2"></div>
                <span>All submissions will be checked for plagiarism using industry-standard tools. Papers with a similarity index above 20% will be rejected without review.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
  );
}
