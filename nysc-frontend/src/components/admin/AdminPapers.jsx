import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Eye, CheckCircle, XCircle, Clock, Download, ArrowLeft } from 'lucide-react';
import { request, API_BASE } from '../../lib/api';

export default function AdminPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const data = await request('/admin/papers?limit=100');
      setPapers(data);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || paper.review_status === filterStatus;
    const matchesDomain = filterDomain === 'all' || paper.domain === filterDomain;
    return matchesSearch && matchesStatus && matchesDomain;
  });

  const getStatusBadge = (status) => {
    const styles = {
      submitted: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'under_review': return <Eye className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const openPaperDetail = async (id) => {
    setPdfUrl(null);
    setDetailError('');
    setShowReviewModal(false);
    try {
      const data = await request(`/admin/papers/${id}`);
      setSelectedPaper(data);

      // Fetch PDF securely if it exists
      if (data.file_url) {
        const token = localStorage.getItem('nysc_token');
        fetch(`${API_BASE}/papers/${data.id}/download`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to load PDF');
            return res.blob();
          })
          .then(blob => setPdfUrl(URL.createObjectURL(blob)))
          .catch(err => console.error('PDF fetch error:', err));
      }
    } catch (err) {
      console.error('Error fetching paper details:', err);
      setDetailError('Failed to fetch paper details: ' + (err.message || ''));
    }
  };

  const closeModal = () => {
    setSelectedPaper(null);
    setShowReviewModal(false);
    setPdfUrl(null);
    setDetailError('');
  };

  if (loading) {
    return <div className="text-center py-12">Loading papers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
            <input
              type="text"
              placeholder="Search papers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
          >
            <option value="all">All Domains</option>
            <option value="Mining & Earth Observation">Mining & Earth Observation</option>
            <option value="Renewable Energy & Sustainability">Renewable Energy</option>
            <option value="Environmental Science & Climate">Environmental Science</option>
          </select>
        </div>
      </div>

      {/* Papers List */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
            <thead className="bg-atmosphere border-b border-ink/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Title</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Domain</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Status</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Submitted</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filteredPapers.map(paper => (
                <tr key={paper.id} className="hover:bg-atmosphere/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-ochre flex-shrink-0" />
                      <div>
                        <p className="text-base font-medium text-navy line-clamp-1">{paper.title}</p>
                        <p className="text-sm text-ink-soft mt-1">ID: {paper.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-base text-ink-soft">{paper.domain || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold rounded-full ${getStatusBadge(paper.review_status)}`}>
                      {getStatusIcon(paper.review_status)}
                      {paper.review_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-base text-ink-soft">
                    {new Date(paper.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openPaperDetail(paper.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-navy bg-atmosphere rounded-lg hover:bg-ochre/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPapers.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No papers found</div>
        )}
      </div>

      {/* Paper Detail Modal */}
      <AnimatePresence>
        {selectedPaper && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeModal}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-ink/10 flex items-start justify-between bg-gradient-to-r from-navy/5 to-transparent flex-shrink-0">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-2xl font-display font-bold text-navy mb-2 truncate">{selectedPaper.title}</h2>
                  <div className="flex items-center gap-4 text-base text-ink-soft flex-wrap">
                    <span className="flex items-center gap-1 px-3 py-1 bg-ochre/10 text-ochre rounded-full text-sm font-bold">
                      <FileText className="w-3 h-3" />
                      {selectedPaper.domain || 'No Domain'}
                    </span>
                    <span>Submitted: {new Date(selectedPaper.created_at).toLocaleDateString()}</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold rounded-full ${getStatusBadge(selectedPaper.review_status)}`}>
                      {getStatusIcon(selectedPaper.review_status)}
                      {selectedPaper.review_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-ink-soft hover:text-navy transition-colors rounded-full hover:bg-ink/5 flex-shrink-0"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-6 space-y-6">

                {detailError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {detailError}
                  </div>
                )}

                {/* Abstract */}
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-ink-soft mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-ochre rounded-full"></div>
                    Abstract
                  </h3>
                  <p className="text-base text-navy leading-relaxed bg-atmosphere/50 p-4 rounded-lg border border-ink/5">
                    {selectedPaper.abstract || 'No abstract provided'}
                  </p>
                </div>

                {/* PDF Viewer */}
                {selectedPaper.file_url && (
                  <div>
                    <h3 className="text-base font-bold uppercase tracking-wider text-ink-soft mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-ochre rounded-full"></div>
                      Full Paper
                    </h3>
                    <div className="border border-ink/10 rounded-lg overflow-hidden bg-gray-50 shadow-sm">
                      {pdfUrl ? (
                        <iframe src={pdfUrl} className="w-full h-[500px] border-0" title="Paper PDF" />
                      ) : (
                        <div className="w-full h-[200px] flex items-center justify-center text-ink-soft">
                          Loading PDF...
                        </div>
                      )}
                    </div>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        download={`Paper_${selectedPaper.id.slice(0, 8)}.pdf`}
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 text-base text-white bg-ochre rounded-lg hover:bg-ochre/90 transition-colors shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    )}
                  </div>
                )}

                {/* Existing Review Comments */}
                {selectedPaper.comments_for_authors && (
                  <div className="bg-gradient-to-br from-moss/5 to-moss/10 rounded-lg p-4 border border-moss/20">
                    <h3 className="text-base font-bold uppercase tracking-wider text-ink-soft mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-moss rounded-full"></div>
                      Existing Review Comments
                    </h3>
                    <p className="text-base text-navy">{selectedPaper.comments_for_authors}</p>
                  </div>
                )}

                {/* Review Section */}
                <AnimatePresence mode="wait">
                  {showReviewModal ? (
                    <motion.div
                      key="review-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="pt-4 border-t border-ink/10"
                    >
                      <ReviewForm
                        paperId={selectedPaper.id}
                        onSubmit={() => {
                          closeModal();
                          fetchPapers();
                        }}
                        onCancel={() => setShowReviewModal(false)}
                      />
                    </motion.div>
                  ) : (
                    selectedPaper.review_status !== 'accepted' && selectedPaper.review_status !== 'rejected' && (
                      <motion.div
                        key="review-button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="w-full py-4 bg-gradient-to-r from-ochre to-ochre/90 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl hover:from-ochre/90 hover:to-ochre"
                        >
                          Submit Review Decision
                        </button>
                      </motion.div>
                    )
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewForm({ paperId, onSubmit, onCancel }) {
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [confidentialComments, setConfidentialComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();

    if (!isDraft && !decision) {
      setError('Please select a decision');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await request(`/admin/papers/${paperId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision: isDraft ? 'draft' : decision,
          comments_for_authors: comments,
          confidential_comments: confidentialComments,
        }),
      });
      onSubmit();
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      <h3 className="text-xl font-display font-bold text-navy mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-ochre rounded-full"></div>
        Submit Review Decision
      </h3>

      {/* Decision Buttons */}
      <div>
        <label className="block text-base font-bold uppercase tracking-wider text-ink-soft mb-3">
          Decision *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setDecision('accepted')}
            className={`p-6 border-2 rounded-xl transition-all shadow-sm ${
              decision === 'accepted'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-green-300'
            }`}
          >
            <CheckCircle className={`w-10 h-10 mx-auto mb-3 ${decision === 'accepted' ? 'text-green-500' : 'text-gray-400'}`} />
            <p className="text-base font-bold text-navy">Accept Paper</p>
            <p className="text-sm text-ink-soft mt-1">Approve for publication</p>
          </button>

          <button
            type="button"
            onClick={() => setDecision('rejected')}
            className={`p-6 border-2 rounded-xl transition-all shadow-sm ${
              decision === 'rejected'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 bg-white hover:border-red-300'
            }`}
          >
            <XCircle className={`w-10 h-10 mx-auto mb-3 ${decision === 'rejected' ? 'text-red-500' : 'text-gray-400'}`} />
            <p className="text-base font-bold text-navy">Reject Paper</p>
            <p className="text-sm text-ink-soft mt-1">Decline submission</p>
          </button>
        </div>
      </div>

      {/* Comments for Authors */}
      <div>
        <label className="block text-base font-bold uppercase tracking-wider text-ink-soft mb-2">
          Comments for Authors <span className="text-sm text-ochre normal-case">(Visible to Presenter)</span>
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full px-4 py-3 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/20 transition-all resize-none"
          placeholder="Provide constructive feedback for the authors..."
        />
        <p className="text-sm mt-1 text-right text-ink-soft">{comments.length}/2000</p>
      </div>

      {/* Confidential Comments */}
      <div>
        <label className="block text-base font-bold uppercase tracking-wider text-ink-soft mb-2">
          Confidential Comments <span className="text-sm text-navy/60 normal-case">(Admin Only)</span>
        </label>
        <textarea
          value={confidentialComments}
          onChange={(e) => setConfidentialComments(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full px-4 py-3 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/20 transition-all resize-none bg-navy/5"
          placeholder="Private notes for other admins (not visible to authors)..."
        />
        <p className="text-sm mt-1 text-right text-ink-soft">{confidentialComments.length}/2000</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-base text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-ink/10">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-ink/15 text-navy font-bold rounded-lg hover:bg-atmosphere transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>

        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={submitting}
          className="flex-1 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : 'Save as Draft'}
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-3 bg-gradient-to-r from-ochre to-ochre/90 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
