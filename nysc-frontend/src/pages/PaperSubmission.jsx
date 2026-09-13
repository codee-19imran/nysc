import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

export default function PaperSubmission() {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [file, setFile] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      navigate('/login');
      return;
    }

    if (!file) {
      setMessage({ type: 'error', text: 'Please select a PDF file to upload.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('abstract', abstract);
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/papers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Do not set Content-Type, fetch will set it automatically for FormData with boundary
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Paper submission failed. Ensure file size is under 20MB and is a PDF.');
      }

      setMessage({ type: 'success', text: 'Paper submitted successfully!' });
      setTitle('');
      setAbstract('');
      setFile(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <main className="pt-12 pb-16 px-4 max-w-2xl mx-auto min-h-screen">
      <h1 className="font-display text-4xl font-bold text-ink mb-6">Submit Your Paper</h1>
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-atmosphere-dim">
        {!token ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-navy/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-display text-navy mb-2">Authentication Required</h2>
            <p className="text-ink-soft font-body mb-6">
              You must be logged in to submit a research paper for NYSC 2026.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="bg-navy hover:bg-navy-light text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <p className="text-ink-soft mb-8">
              Present your research at NYSC 2026. Submissions must be double-blind and in PDF format.
            </p>

            {message && (
              <div className={`p-4 rounded-xl mb-6 font-body text-sm ${message.type === 'success' ? 'bg-moss/20 text-moss-light' : 'bg-red-50 text-red-600'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink font-bold">Paper Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-atmosphere border-none focus:ring-2 focus:ring-moss outline-none text-ink font-body" 
                  placeholder="Enter paper title" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink font-bold">Abstract</label>
                <textarea 
                  required
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-atmosphere border-none focus:ring-2 focus:ring-moss outline-none min-h-[120px] text-ink font-body" 
                  placeholder="Summary of your research..." 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink font-bold">Upload PDF (Max 20MB)</label>
                
                <label className="border-2 border-dashed border-moss-light/50 rounded-xl p-8 flex flex-col justify-center items-center bg-atmosphere/50 hover:bg-atmosphere transition-colors cursor-pointer text-center relative">
                  <span className="text-moss font-bold font-body">
                    {file ? file.name : 'Click to browse or drag file here'}
                  </span>
                  {file && <span className="text-xs text-ink-soft mt-1">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>}
                  <input 
                    type="file" 
                    accept="application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-moss hover:bg-moss-light text-white font-bold transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Uploading...' : 'Submit Paper'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  </PageTransition>
  );
}
