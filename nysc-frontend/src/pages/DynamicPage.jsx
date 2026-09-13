import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { request } from '../lib/api';

export default function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      const data = await request(`/public/pages/${slug}`);
      setPage(data);
      
      // Update document title and meta tags
      document.title = data.meta_title || data.title;
      
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = data.meta_description || '';
      
    } catch (err) {
      setError(err.message || 'Page not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-soft">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-navy mb-4">Page Not Found</h1>
          <p className="text-ink-soft mb-6">{error}</p>
          <Link to="/" className="px-6 py-2 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Simple markdown-like rendering (converts **bold**, *italic*, etc.)
  const renderContent = (content) => {
    if (!content) return null;
    
    // Convert markdown-like syntax to HTML
    const html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-display font-bold text-navy mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-display font-bold text-navy mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-display font-bold text-navy mt-8 mb-4">$1</h1>')
      .replace(/\n\n/g, '</p><p class="mb-4 text-ink leading-relaxed">')
      .replace(/\n/g, '<br/>');
    
    return `<p class="mb-4 text-ink leading-relaxed">${html}</p>`;
  };

  return (
    <div className="min-h-screen bg-atmosphere">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <header className="mb-8 border-b border-ink/10 pb-6">
            <h1 className="text-4xl font-display font-bold text-navy mb-2">
              {page.title}
            </h1>
            {page.updated_at && (
              <p className="text-sm text-ink-soft">
                Last updated: {new Date(page.updated_at).toLocaleDateString()}
              </p>
            )}
          </header>
          
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: renderContent(page.content) }}
          />
        </article>
        
        <div className="mt-8 text-center">
          <Link to="/" className="text-ochre hover:underline font-bold">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
