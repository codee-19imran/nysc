import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What is the scope of the National Young Scientist Conference 2026?",
      answer: "NYSC 2026 focuses on next-generation technologies for earth observation, mining safety, and sustainable development. We welcome papers intersecting space science, resource safety, and environmental sustainability."
    },
    {
      question: "Will the accepted papers be published?",
      answer: "Yes, all accepted and presented papers that meet our quality standards will be published in the official conference proceedings."
    },
    {
      question: "What is the maximum page limit for paper submission?",
      answer: "The initial submission can be up to 6 pages. Camera-ready papers may include up to 2 additional pages (maximum 8 pages) subject to an over-length page charge."
    },
    {
      question: "Is there any financial support or travel grant available?",
      answer: "Yes, we offer limited travel grants for full-time students (B.Tech, M.Tech, and Ph.D.) and early-career researchers based on the quality of their accepted papers and financial need."
    },
    {
      question: "How do I process my registration fee?",
      answer: "Registration fees are securely processed online via Razorpay. Indian delegates can pay via UPI, NetBanking, or Credit/Debit Cards. International delegates can use major credit cards."
    }
  ];

  const toggleOpen = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-display font-bold text-navy mb-4">Frequently Asked Questions</h2>
          <p className="text-ink-soft max-w-2xl mx-auto font-body">
            Find answers to common queries regarding paper submission, registration, and the conference format.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border border-atmosphere-dim rounded-md overflow-hidden bg-atmosphere/30 transition-colors hover:bg-atmosphere"
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none"
                onClick={() => toggleOpen(index)}
              >
                <span className="font-display font-bold text-navy text-lg pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-ochre transition-transform duration-300 shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}
                />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                } overflow-hidden`}
              >
                <p className="px-6 pb-6 text-ink-soft font-body leading-relaxed border-t border-atmosphere-dim pt-4 mx-6">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
