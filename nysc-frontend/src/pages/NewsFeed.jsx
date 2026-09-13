import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Calendar, Tag } from 'lucide-react';
import { request } from '../lib/api';

export default function NewsFeed() {
  const [news, setNews] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNews();
    fetchFeatured();
  }, []);

  const fetchNews = async () => {
    try {
      const url = filter === 'all' ? '/public/news' : `/public/news?category=${filter}`;
      const data = await request(url);
      setNews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatured = async () => {
    try {
      const data = await request('/public/news/featured');
      setFeatured(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [filter]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-atmosphere">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-navy mb-2">News & Updates</h1>
          <p className="text-ink-soft">Stay updated with the latest from NYSC-2026</p>
        </header>

        {/* Featured News */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-display font-bold text-navy mb-6 flex items-center gap-2">
              <span className="text-ochre">★</span> Featured
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featured.map(item => (
                <article key={item.id} className="bg-gradient-to-br from-navy to-navy/90 text-white rounded-2xl p-8 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-bold bg-ochre rounded-full capitalize">
                      {item.category}
                    </span>
                    <span className="text-xs text-white/70 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.publish_date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-3">{item.title}</h3>
                  <p className="text-white/80 leading-relaxed">{item.content}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {['all', 'announcement', 'news', 'update'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 text-sm font-bold rounded-lg capitalize transition-colors ${
                filter === cat ? 'bg-ochre text-white' : 'bg-white text-navy hover:bg-atmosphere'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* News List */}
        <section>
          <div className="space-y-4">
            {news.map(item => (
              <article key={item.id} className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                      item.category === 'announcement' ? 'bg-red-100 text-red-700' :
                      item.category === 'news' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.category}
                    </span>
                    {item.is_featured && (
                      <span className="px-2 py-1 text-xs font-bold bg-ochre/10 text-ochre rounded-full">
                        Featured
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-soft flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.publish_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-display font-bold text-navy mb-2">{item.title}</h3>
                <p className="text-ink leading-relaxed">{item.content}</p>
              </article>
            ))}
          </div>
          
          {news.length === 0 && (
            <div className="text-center py-12 text-ink-soft">
              No news articles found
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
