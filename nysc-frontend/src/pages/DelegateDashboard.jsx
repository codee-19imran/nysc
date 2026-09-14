import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Calendar, FileText, Package, Bell, QrCode, 
  CheckCircle, Clock, AlertCircle, Download, Plus, Send,
  CreditCard, Utensils, Award, Upload
} from 'lucide-react';
import { request, auth as apiAuth, API_BASE } from '../lib/api';
import MyQRModal from '../components/MyQRModal';

export default function DelegateDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const currentUser = apiAuth.getUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  // Exactly 7 tabs as per specification - no more, no less
  const tabs = [
    { id: 'checkin', label: 'Check-in Status', icon: CheckCircle },
    { id: 'idcard', label: 'ID Card', icon: Award },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'qrcode', label: 'My QR Code', icon: QrCode },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'paper', label: 'Paper Upload', icon: Upload },
    { id: 'helpdesk', label: 'Help Desk', icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-atmosphere">
      {/* Header */}
      <header className="bg-navy text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold">Welcome, {user.name}!</h1>
              <p className="text-sm text-white/70">NYSC-2026 • Dec 17-19, 2026</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-ochre text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === 'checkin' && <CheckInTab user={user} />}
        {activeTab === 'idcard' && <IDCardTab user={user} />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'qrcode' && <QRCodeTab user={user} />}
        {activeTab === 'schedule' && <ScheduleTab user={user} />}
        {activeTab === 'paper' && <PaperUploadTab user={user} />}
        {activeTab === 'helpdesk' && <HelpDeskTab user={user} />}
      </div>
    </div>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/delegate/overview').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load overview data.</div>;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat
          icon={CheckCircle}
          label="Checked In"
          value={data.checked_in_today ? 'Yes ✓' : 'No'}
          color={data.checked_in_today ? 'text-green-600' : 'text-orange-600'}
        />
        <QuickStat
          icon={Utensils}
          label="Meals Today"
          value={`${data.meals_today}/3`}
          color="text-blue-600"
        />
        <QuickStat
          icon={Package}
          label="Materials"
          value={`${data.materials_collected}/${data.materials_total}`}
          color="text-purple-600"
        />
        <QuickStat
          icon={CreditCard}
          label="ID Card"
          value={data.id_card_status === 'not_generated' ? 'Pending' : data.id_card_status}
          color="text-ochre"
        />
      </div>

      {/* Next Session (for presenters) */}
      {data.next_session && (
        <div className="bg-gradient-to-r from-ochre to-ochre/80 text-white rounded-2xl p-6">
          <p className="text-xs font-bold uppercase opacity-80 mb-2">Your Next Presentation</p>
          <h3 className="text-xl font-display font-bold mb-1">{data.next_session.name}</h3>
          <p className="text-sm opacity-90">
            {data.next_session.date && new Date(data.next_session.date).toLocaleDateString()} • {data.next_session.time_slot}
          </p>
        </div>
      )}

      {/* Latest Announcements */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Latest Announcements</h3>
        <div className="space-y-3">
          {data.announcements?.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 bg-atmosphere/50 rounded-lg">
              <Bell className="w-5 h-5 text-ochre mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-navy">{a.title}</p>
                <p className="text-xs text-ink-soft">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {(!data.announcements || data.announcements.length === 0) && (
            <p className="text-sm text-ink-soft text-center py-4">No announcements yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-4">
      <Icon className={`w-6 h-6 ${color} mb-2`} />
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ============ SCHEDULE TAB ============
function ScheduleTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/delegate/schedule').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!data || !data.all_sessions) return <div className="text-center py-12 text-red-500">Failed to load schedule.</div>;

  // Group by date
  const byDate = {};
  data.all_sessions.forEach(s => {
    const date = s.date || 'TBD';
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(s);
  });

  return (
    <div className="space-y-6">
      {data.my_presentations?.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl p-6">
          <h3 className="text-lg font-display font-bold mb-3">★ Your Presentations</h3>
          {data.my_presentations.map(p => (
            <div key={p.session_id} className="bg-white/10 rounded-lg p-4 mb-2">
              <p className="font-bold">{p.paper_title}</p>
              <p className="text-sm opacity-90">
                {p.session_name} • {p.date && new Date(p.date).toLocaleDateString()} {p.time_slot}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(byDate).map(([date, sessions]) => (
          <div key={date} className="bg-white rounded-xl border border-ink/10 p-6">
            <h3 className="text-md font-display font-bold text-navy mb-4">
              {date === 'TBD' ? 'TBD' : new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.session_id} className={`p-3 rounded-lg border-l-4 ${
                  s.is_my_presentation ? 'border-ochre bg-ochre/5' : 'border-ink/15 bg-atmosphere/50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-navy">{s.session_name}</p>
                      <p className="text-xs text-ink-soft">
                        {s.time_slot} • {s.session_type.replace('_', ' ')}
                      </p>
                    </div>
                    {s.is_my_presentation && (
                      <span className="px-2 py-1 text-xs font-bold bg-ochre text-white rounded-full">
                        YOURS
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsTab({ user }) {
  const [documents, setDocuments] = useState(null);
  const [idCard, setIdCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState([]);
  const [deadlineStatus, setDeadlineStatus] = useState(null);

  const fetchData = () => {
    Promise.all([
      request('/delegate/my-documents'),
      request('/delegate/id-card-status'),
      request('/settings/public/domains'),
      request('/settings/public/paper-deadline'),
    ]).then(([docs, id, domainsRes, dl]) => {
      setDocuments(docs);
      setIdCard(id);
      setDomains(domainsRes.domains || []);
      setDeadlineStatus(dl);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadIdCard = async () => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`${API_BASE}/delegate/id-card/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_id_card.pdf';
      a.click();
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!documents || !idCard) return <div className="text-center py-12 text-red-500">Failed to load documents.</div>;

  return (
    <div className="space-y-6">
      {/* Papers */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">My Papers</h3>
        {documents.papers?.length > 0 ? (
          <div className="space-y-3">
            {/* Deadline Banner */}
            {deadlineStatus && (
              deadlineStatus.open ? (
                deadlineStatus.deadline && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                    <span className="text-blue-700 font-bold">📅 Submission Deadline:</span>
                    <span className="text-blue-600">
                      {new Date(deadlineStatus.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs">
                  <span className="text-red-700 font-bold">🔒 Submissions Closed</span>
                  <span className="text-red-600">{deadlineStatus.message}</span>
                </div>
              )
            )}
            {documents.papers.map(p => (
              <PaperItem key={p.id} initialPaper={p} onRefresh={fetchData} domains={domains} deadlineStatus={deadlineStatus} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft text-center py-4">No papers submitted yet</p>
        )}
      </div>

      {/* ID Card */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">My ID Card</h3>
        {idCard.generated ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div>
              <p className="text-sm font-bold text-green-800">ID Card Ready ✓</p>
              <p className="text-xs text-green-700 capitalize">Status: {idCard.status}</p>
            </div>
            <button
              onClick={handleDownloadIdCard}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-bold rounded-lg"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-bold text-yellow-800">Not yet generated</p>
            <p className="text-xs text-yellow-700">{idCard.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SERVICES TAB ============
function ServicesTab({ user }) {
  const [meals, setMeals] = useState([]);
  const [materials, setMaterials] = useState({ collected: [], available: [] });
  const [helpRequests, setHelpRequests] = useState([]);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request('/delegate/my-meals'),
      request('/delegate/my-materials'),
      request('/delegate/helpdesk')
    ]).then(([m, mat, hr]) => {
      setMeals(m);
      setMaterials(mat);
      setHelpRequests(hr);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!meals || !materials || !helpRequests) return <div className="text-center py-12 text-red-500">Failed to load services.</div>;

  return (
    <div className="space-y-6">
      {/* Meals */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Meals Claimed</h3>
        {meals.length > 0 ? (
          <div className="space-y-2">
            {meals.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-atmosphere/50 rounded-lg">
                <span className="text-sm font-bold text-navy capitalize">{m.meal_type}</span>
                <span className="text-xs text-ink-soft">{new Date(m.claimed_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft text-center py-4">No meals claimed yet</p>
        )}
      </div>

      {/* Materials */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Materials</h3>
        <div className="space-y-2">
          {materials.collected?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-navy">{m.name}</span>
            </div>
          ))}
          {materials.available?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-atmosphere/50 rounded-lg">
              <Clock className="w-5 h-5 text-ink-soft" />
              <span className="text-sm text-ink-soft">{m.name} (pending)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Help Desk */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold text-navy">Help Desk</h3>
          <button
            onClick={() => setShowHelpForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-ochre text-white text-xs font-bold rounded-lg"
          >
            <Plus className="w-3 h-3" /> New Request
          </button>
        </div>
        {helpRequests.length > 0 ? (
          <div className="space-y-2">
            {helpRequests.map(r => (
              <div key={r.id} className="p-3 bg-atmosphere/50 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-bold text-navy">{r.description}</p>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    r.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{r.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-ink-soft capitalize">{r.category} • {new Date(r.created_at).toLocaleDateString()}</p>
                {r.resolution_notes && (
                  <p className="text-xs text-ochre mt-1">Response: {r.resolution_notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft text-center py-4">No help requests yet</p>
        )}
      </div>

      {showHelpForm && <HelpRequestForm onClose={() => setShowHelpForm(false)}
        onSaved={async () => {
          setShowHelpForm(false);
          setHelpRequests(await request('/delegate/helpdesk'));
        }} />}
    </div>
  );
}

function HelpRequestForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    category: 'other', priority: 'medium', description: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/delegate/helpdesk', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-display font-bold text-navy mb-4">Submit Help Request</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="registration">Registration</option>
              <option value="accommodation">Accommodation</option>
              <option value="transport">Transport</option>
              <option value="technical">Technical</option>
              <option value="meals">Meals</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Priority</label>
            <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description *</label>
            <textarea required value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
              placeholder="Describe your issue..." />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ ANNOUNCEMENTS TAB ============
function AnnouncementsTab() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/public/news').then(setNews).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold text-navy">Conference News</h2>
      {news.length > 0 ? (
        <div className="space-y-3">
          {news.map(n => (
            <article key={n.id} className="bg-white rounded-xl border border-ink/10 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                  n.category === 'announcement' ? 'bg-red-100 text-red-700' :
                  n.category === 'news' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>{n.category}</span>
                <span className="text-xs text-ink-soft">{new Date(n.publish_date).toLocaleDateString()}</span>
              </div>
              <h3 className="text-lg font-display font-bold text-navy mb-2">{n.title}</h3>
              <p className="text-sm text-ink leading-relaxed">{n.content}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
          No announcements yet
        </div>
      )}
    </div>
  );
}

// ============ PAPER ITEM ============
function PaperItem({ initialPaper, onRefresh, domains = [], deadlineStatus = null }) {
  const [paper, setPaper] = useState(initialPaper);
  const [isEditing, setIsEditing] = useState(false);
  const [editDomain, setEditDomain] = useState(initialPaper.domain || '');
  const [editTitle, setEditTitle] = useState(initialPaper.title || '');
  const [editCoAuthors, setEditCoAuthors] = useState(initialPaper.co_authors ? initialPaper.co_authors.join(', ') : '');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  const fallbackDomains = [
    'Mining & Earth Observation',
    'Renewable Energy & Sustainability',
    'Environmental Science & Climate'
  ];
  
  const displayDomains = domains.length > 0 ? domains : fallbackDomains;

  // Is submission window closed?
  const submissionClosed = deadlineStatus !== null && !deadlineStatus.open;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const co_author_emails = editCoAuthors.split(',').map(e => e.trim()).filter(e => e);
      await request(`/papers/${paper.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          title: editTitle, 
          domain: editDomain, 
          abstract: '',
          co_author_emails
        })
      });
      setPaper({ ...paper, title: editTitle, domain: editDomain, co_authors: co_author_emails });
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    setUploadProgress(10);
    
    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem('nysc_token');
    xhr.open('PUT', `${API_BASE}/papers/${paper.id}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadProgress(100);
        setTimeout(() => { setUploadProgress(0); onRefresh(); }, 1000);
      } else {
        setUploadProgress(0);
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).detail || msg; } catch(err){}
        alert(msg);
      }
    };
    xhr.onerror = () => {
      setUploadProgress(0);
      alert('Network error during upload');
    };
    
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  };

  const statusConfig = {
    submitted: {
      label: 'Submitted',
      description: 'Your paper has been received and is awaiting review.',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-700',
      icon: '📬',
    },
    under_review: {
      label: 'Under Review',
      description: 'Your paper is currently being reviewed by the committee.',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-700',
      icon: '🔍',
    },
    accepted: {
      label: 'Accepted ✓',
      description: 'Congratulations! Your paper has been accepted for presentation.',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-700',
      icon: '🎉',
    },
    rejected: {
      label: 'Not Accepted',
      description: 'Your paper was not selected this time. You may reach out to the committee for feedback.',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-700',
      icon: '📋',
    },
  };

  const cfg = statusConfig[paper.status] || {
    label: paper.status?.replace('_', ' ') || 'Unknown',
    description: 'Status information is being updated.',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    icon: '📄',
  };

  return (
    <div className="rounded-xl border border-ink/10 overflow-hidden bg-white">
      {/* Paper Title Row */}
      <div className="flex items-start justify-between p-4 gap-4">
        {isEditing ? (
          <input className="flex-1 text-sm font-bold text-navy border border-ink/20 rounded px-2 py-1 bg-white" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
        ) : (
          <h4 className="text-sm font-bold text-navy flex-1">{paper.title}</h4>
        )}
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 ${cfg.badge}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Status Banner */}
      {!isEditing && (
        <div className={`mx-4 mb-3 px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border} flex items-start gap-3`}>
          <div className="flex-1">
            <p className="text-xs font-bold text-navy mb-0.5">Review Status: {cfg.label}</p>
            <p className="text-xs text-ink-soft">{cfg.description}</p>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {['submitted','under_review','accepted'].map((stage, i) => {
              const stages = ['submitted','under_review','accepted','rejected'];
              const currentIdx = stages.indexOf(paper.status);
              const stageIdx = stages.indexOf(stage);
              const isRejected = paper.status === 'rejected';
              const active = !isRejected && stageIdx <= currentIdx;
              return (
                <div
                  key={stage}
                  title={stage.replace('_',' ')}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isRejected ? 'bg-red-300' :
                    active ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Details / Edit */}
      <div className="px-4 pb-4">
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <select className="w-full text-sm border border-ink/20 rounded px-2 py-2 bg-white" value={editDomain} onChange={e => setEditDomain(e.target.value)}>
              <option value="">Select a domain</option>
              {displayDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              className="w-full text-sm border border-ink/20 rounded px-2 py-2 bg-white"
              placeholder="Co-author emails (comma separated)"
              value={editCoAuthors}
              onChange={e => setEditCoAuthors(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-ochre text-white text-xs font-bold rounded shadow-sm disabled:opacity-50">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 border border-ink/20 text-ink-soft text-xs font-bold rounded bg-white">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-ink-soft mb-1">Domain: <span className="font-medium text-navy">{paper.domain || 'Not set'}</span></p>
            {paper.co_authors && paper.co_authors.length > 0 && (
              <p className="text-xs text-ink-soft mb-2">Co-authors: <span className="font-medium text-navy">{paper.co_authors.join(', ')}</span></p>
            )}
            <p className="text-xs text-ink-soft mb-3">
              Submitted: <span className="font-medium text-navy">{paper.submitted_at ? new Date(paper.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 border border-ochre text-ochre text-xs font-bold rounded hover:bg-ochre/10 transition-colors bg-white">Edit Details</button>

              {submissionClosed ? (
                <span className="px-3 py-1.5 text-xs font-bold rounded bg-gray-100 text-gray-400 flex items-center gap-1.5 cursor-not-allowed" title={deadlineStatus?.message}>
                  🔒 {paper.has_file ? 'PDF Locked' : 'Upload Closed'}
                </span>
              ) : (
                <div className="relative overflow-hidden group">
                  <button className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
                    paper.has_file ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-navy hover:bg-navy/90 text-white'
                  }`}>
                    <Upload className="w-3.5 h-3.5" />
                    {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : (paper.has_file ? 'Update PDF' : 'Upload PDF')}
                  </button>
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              )}

              {paper.has_file ? (
                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> PDF Uploaded
                </span>
              ) : (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  ⚠ No PDF uploaded yet
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ CHECK-IN STATUS TAB ============
function CheckInTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/delegate/checkin-status').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load check-in status.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-8 text-center">
        <CheckCircle className={`w-20 h-20 mx-auto mb-4 ${data.checked_in ? 'text-green-600' : 'text-orange-500'}`} />
        <h2 className="text-2xl font-display font-bold text-navy mb-2">
          {data.checked_in ? 'Checked In' : 'Not Checked In'}
        </h2>
        <p className="text-ink mb-4">
          {data.checked_in 
            ? `You checked in on ${new Date(data.checkin_time).toLocaleString()}`
            : 'Please visit the registration desk to check in'}
        </p>
        {data.last_checkin && (
          <div className="mt-4 p-4 bg-atmosphere rounded-lg">
            <p className="text-sm text-ink">Last Check-in: {new Date(data.last_checkin).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ID CARD STATUS TAB ============
function IDCardTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/delegate/idcard-status').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load ID card status.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-8 text-center">
        {data.status === 'generated' ? (
          <>
            <Award className="w-20 h-20 mx-auto mb-4 text-ochre" />
            <h2 className="text-2xl font-display font-bold text-navy mb-2">ID Card Generated</h2>
            <p className="text-ink mb-4">Your ID card is ready for download</p>
            <button className="px-6 py-3 bg-ochre text-white rounded-lg font-medium hover:bg-ochre/90 transition-colors">
              Download ID Card
            </button>
          </>
        ) : (
          <>
            <Clock className="w-20 h-20 mx-auto mb-4 text-orange-500" />
            <h2 className="text-2xl font-display font-bold text-navy mb-2">ID Card Pending</h2>
            <p className="text-ink mb-4">Your ID card will be generated after check-in</p>
          </>
        )}
      </div>
    </div>
  );
}

// ============ QR CODE TAB ============
function QRCodeTab({ user }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    request('/delegate/qrcode').then(setQrData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!qrData) return <div className="text-center py-12 text-red-500">Failed to load QR code.</div>;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-8 text-center">
        <QrCode className="w-16 h-16 mx-auto mb-4 text-navy" />
        <h2 className="text-xl font-display font-bold text-navy mb-2">Your QR Code</h2>
        <p className="text-sm text-ink mb-6">Show this QR code for check-in and meal scanning</p>
        
        <div className="bg-atmosphere p-6 rounded-lg mb-4">
          <img 
            src={`data:image/svg+xml;base64,${btoa(qrData.svg || '<svg></svg>')}`} 
            alt="Your QR Code" 
            className="w-48 h-48 mx-auto"
          />
        </div>
        
        <p className="text-xs text-ink">
          Note: Your registration photo is NOT visible to you. It will only be shown to volunteers/admins when your QR code is scanned for verification.
        </p>
      </div>
    </div>
  );
}

// ============ PAPER UPLOAD TAB ============
function PaperUploadTab({ user }) {
  const [paperData, setPaperData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    request('/delegate/paper-status').then(setPaperData).finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('paper', file);
    
    setUploading(true);
    setError('');
    setSuccess(false);
    
    try {
      await request('/delegate/paper-upload', {
        method: 'POST',
        body: formData,
      });
      setSuccess(true);
      setPaperData(prev => ({ ...prev, status: 'uploaded', uploaded_at: new Date().toISOString() }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-8 h-8 text-ochre" />
          <div>
            <h2 className="text-xl font-display font-bold text-navy">Paper Upload & Tracking</h2>
            <p className="text-sm text-ink">Upload your research paper and track its review status</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8 p-6 bg-atmosphere rounded-lg">
          <label className="block text-sm font-medium text-navy mb-2">
            Upload Paper (PDF only)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-ink file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-ochre file:text-white hover:file:bg-ochre/90"
          />
          
          {file && (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink">
              <FileText className="w-4 h-4" />
              <span>{file.name}</span>
            </div>
          )}
          
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          {success && <p className="mt-2 text-sm text-green-600">✓ Upload successful!</p>}
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-4 px-6 py-2 bg-ochre text-white rounded-lg font-medium hover:bg-ochre/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Paper'}
          </button>
        </div>

        {/* Status Section */}
        {paperData && (
          <div className="space-y-4">
            <h3 className="font-display font-bold text-navy">Submission Status</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-atmosphere rounded-lg">
                <p className="text-xs text-ink mb-1">Current Status</p>
                <p className="font-medium text-navy capitalize">{paperData.status || 'Not Uploaded'}</p>
              </div>
              
              <div className="p-4 bg-atmosphere rounded-lg">
                <p className="text-xs text-ink mb-1">Uploaded On</p>
                <p className="font-medium text-navy">
                  {paperData.uploaded_at ? new Date(paperData.uploaded_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
            {paperData.review_comments && (
              <div className="p-4 bg-atmosphere rounded-lg">
                <p className="text-xs text-ink mb-1">Review Comments</p>
                <p className="text-sm text-navy">{paperData.review_comments}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ HELP DESK TAB ============
function HelpDeskTab({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    request('/delegate/tickets').then(setTickets).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await request('/delegate/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      });
      setShowForm(false);
      setSubject('');
      setMessage('');
      setTickets(prev => [{ id: Date.now(), subject, message, status: 'open', created_at: new Date().toISOString() }, ...prev]);
    } catch (err) {
      console.error('Failed to create ticket', err);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-ochre" />
            <div>
              <h2 className="text-xl font-display font-bold text-navy">Help Desk</h2>
              <p className="text-sm text-ink">Submit queries or report issues</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-ochre text-white rounded-lg text-sm font-medium hover:bg-ochre/90 transition-colors"
          >
            {showForm ? 'Cancel' : 'New Ticket'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-atmosphere rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-ink/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-ochre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="4"
                className="w-full px-4 py-2 border border-ink/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-ochre"
                required
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-ochre text-white rounded-lg font-medium hover:bg-ochre/90 transition-colors">
              Submit Ticket
            </button>
          </form>
        )}

        {/* Existing Tickets */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-navy">My Tickets</h3>
          {tickets.length === 0 ? (
            <p className="text-sm text-ink text-center py-8">No tickets submitted yet</p>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="p-4 border border-ink/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-navy">{ticket.subject}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    ticket.status === 'open' ? 'bg-green-100 text-green-700' :
                    ticket.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-ink mb-2">{ticket.message}</p>
                <p className="text-xs text-ink">Created: {new Date(ticket.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
