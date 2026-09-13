import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, FileText, CheckCircle, AlertCircle, CreditCard, User, Calendar, MapPin, LogOut, ArrowRight, Upload, XCircle } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { auth as apiAuth, registrations as apiReg, payments as apiPayments, loadRazorpay, papers as apiPapers, API_BASE } from '../lib/api';
import { isAdminRole } from '../lib/roles';

export default function Dashboard() {
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  const [myPaper, setMyPaper] = useState(null);
  
  const [editTitle, setEditTitle] = useState('');
  const [editAbstract, setEditAbstract] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editCoAuthors, setEditCoAuthors] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detailsSuccess, setDetailsSuccess] = useState(false);
  const [domains] = useState([
    'Mining & Earth Observation',
    'Renewable Energy & Sustainability',
    'Environmental Science & Climate'
  ]);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [newDraftTitle, setNewDraftTitle] = useState('');

  useEffect(() => {
    // 1. Check if user is logged in
    const user = apiAuth.getUser();
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // ✅ If user is an admin role, redirect to admin dashboard
    if (isAdminRole(user.role)) {
      navigate('/admin', { replace: true });
      return;
    }

    // 2. Fetch registration status
    const fetchStatus = async () => {
      try {
        const data = await apiReg.getMyRegistration();
        setRegistration(data);
      } catch (err) {
        if (err.message.includes('404')) {
          setError('No registration found. Please complete the registration form.');
        } else {
          setError(err.message || 'Failed to load dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Fetch paper details if the user is a presenter
    const fetchPaper = async () => {
      try {
        const p = await apiPapers.getMyPaper(); 
        if (p) {
          setMyPaper(p);
          setEditTitle(p.title || '');
          setEditAbstract(p.abstract || '');
          setEditDomain(p.domain || '');
          setEditCoAuthors(p.authors?.filter(a => !a.is_corresponding).map(a => a.email).join(', ') || '');
        }
      } catch (err) {
        // Ignore 404s for now, they might not have a draft
      }
    };

    fetchStatus();
    fetchPaper();
  }, [navigate]);

  const handleLogout = () => {
    apiAuth.logout();
    navigate('/');
    window.location.reload();
  };

  const registrationFee = registration?.category === 'student' ? 2999 : 4199;

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError('');

    try {
      const orderData = await apiPayments.createOrder(registration.id);

      const res = await loadRazorpay();
      if (!res) throw new Error('Razorpay SDK failed to load.');

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "NYSC-2026",
        description: "Conference Registration Fee",
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            await apiPayments.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            // Reload page to show the "Paid" dashboard state
            window.location.reload(); 
          } catch (err) {
            setPaymentError(err.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: apiAuth.getUser()?.name,
          email: apiAuth.getUser()?.email,
        },
        theme: { color: "#c47a2b" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
        setPaymentError(response.error.description || 'Payment failed.');
      });
      paymentObject.open();

    } catch (err) {
      setPaymentError(err.message || 'Failed to initialize payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <section className="py-20 md:py-28 bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-ochre/30 border-t-ochre rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-body text-ink-soft">Loading your dashboard...</p>
          </div>
        </section>
      </PageTransition>
    );
  }

  // State: User is logged in but hasn't started registration yet
  if (error && error.includes('No registration found')) {
    return (
      <PageTransition>
        <section className="py-20 md:py-28 bg-white min-h-screen flex items-center">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="bg-ochre/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-ochre" />
            </div>
            <h1 className="text-2xl font-display font-bold text-navy mb-3">Start Your Journey</h1>
            <p className="text-sm text-ink-soft mb-8">You haven't started your registration yet. Complete the form to secure your spot at NYSC-2026.</p>
            <button onClick={() => navigate('/register')} className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-body font-bold text-white bg-navy rounded-lg hover:bg-navy/90 transition-colors">
              Go to Registration <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <section className="py-20 md:py-28 bg-white min-h-screen flex items-center justify-center">
          <div className="text-center text-red-600 font-medium">{error}</div>
        </section>
      </PageTransition>
    );
  }

  const isPaid = registration.payment_status === 'paid';

  return (
    <PageTransition>
      <section className="py-20 md:py-28 bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8 md:px-6 md:py-12 lg:px-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-2">NYSC-2026</p>
              <h1 className="text-3xl font-display font-bold text-navy tracking-tight">Delegate Dashboard</h1>
              <p className="text-sm text-ink-soft mt-1">Welcome back, {apiAuth.getUser()?.name || 'Delegate'}.</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>

          {/* Quick Access for Volunteers */}
          {apiAuth.getUser()?.role === 'volunteer' && (
            <div className="mb-10">
              <button
                onClick={() => navigate('/volunteer/scanner')}
                className="w-full md:w-auto px-6 py-4 bg-ochre text-white rounded-xl hover:bg-ochre/90 transition-colors flex items-center justify-center gap-3 shadow-sm"
              >
                <QrCode className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-wider">Open QR Scanner</span>
              </button>
            </div>
          )}

          {/* --- STATE A: PENDING PAYMENT --- */}
          {!isPaid && (
            <div className="space-y-6">
              {/* Action Required Banner */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Action Required: Complete Your Payment</h3>
                  <p className="text-xs text-amber-700 mt-1">Your registration details are saved as a draft. Please complete the payment to generate your official QR ticket.</p>
                </div>
              </div>

              {/* Order Summary Card */}
              <div className="bg-white border border-ink/10 rounded-xl p-8 shadow-sm">
                <h2 className="text-xl font-display font-bold text-navy mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-ink/10 gap-1">
                    <span className="text-sm text-ink-soft">Delegate Category</span>
                    <span className="font-display font-bold text-navy capitalize">{registration.category === 'student' ? 'Student Delegate' : 'Working Professional'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-ink/10 gap-1">
                    <span className="text-sm text-ink-soft">Participation Type</span>
                    <span className="font-display font-bold text-navy capitalize">{registration.participation_type}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center py-3 gap-1">
                    <span className="font-display font-bold text-lg text-navy">Total Payable</span>
                    <span className="font-display font-bold text-2xl text-ochre">₹{registrationFee.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {paymentError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{paymentError}</div>
                )}

                <button 
                  onClick={handlePayment}
                  disabled={isProcessingPayment}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-body font-bold text-white rounded-lg transition-colors ${
                    isProcessingPayment ? 'bg-navy/50 cursor-not-allowed' : 'bg-ochre hover:bg-ochre/90'
                  }`}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Pay ₹{registrationFee.toLocaleString('en-IN')} Now
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* --- STATE B: PAID & COMPLETE --- */}
          {isPaid && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="p-4 bg-moss/10 border border-moss/20 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-moss flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-moss">Registration Complete!</h3>
                  <p className="text-xs text-moss/80 mt-1">Your payment was successful. Your official delegate pass is ready below.</p>
                </div>
              </div>

              {/* Delegate Pass Card */}
              <div className="bg-white border border-ink/10 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-navy p-6 text-white flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ochre mb-1">Official Delegate Pass</p>
                    <h2 className="text-2xl font-display font-bold">{registration.reg_code}</h2>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <QrCode className="w-8 h-8 text-navy" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 md:gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-ochre flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Delegate Name</p>
                        <p className="font-display font-bold text-navy">{apiAuth.getUser()?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-ochre flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Event Dates</p>
                        <p className="font-display font-bold text-navy">Dec 17 - 18, 2026</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-ochre flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Venue</p>
                        <p className="font-display font-bold text-navy">Central University of Karnataka</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-ink/10 pt-6 md:pt-0 md:pl-8 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-3">Scan at Entry</p>
                    {/* --- SECURE QR IMAGE RENDERING --- */}
                    {registration.qr_hash ? (
                      <img 
                        src={`${API_BASE}/static/qr_codes/${registration.qr_hash}.png`}
                        alt="Secure Delegate QR Code" 
                        className="w-32 h-32 object-contain border border-ink/10 rounded-lg p-1 bg-white"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-ink/5 border-2 border-dashed border-ink/20 rounded-lg flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-ink-soft/40" />
                      </div>
                    )}
                    {/* --------------------------------- */}
                    <p className="text-[10px] text-ink-soft mt-3">Present this QR code to volunteers at the venue.</p>
                  </div>
                </div>
              </div>

              {/* Paper Status (If Presenter) */}
              {registration.participation_type === 'presenter' && (
                <div className="space-y-6">
                  {!myPaper ? (
                    <div className="bg-white border border-ink/10 rounded-xl p-8 shadow-sm text-center">
                      {!isCreatingDraft ? (
                        <>
                          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                          <h2 className="text-xl font-display font-bold text-navy mb-2">Paper Submission Missing</h2>
                          <p className="text-sm text-ink-soft mb-6">We could not find your paper draft. Please create your paper draft first.</p>
                          <button onClick={() => setIsCreatingDraft(true)} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-ochre rounded-lg hover:bg-ochre/90 transition-colors">
                            Create Paper Draft
                          </button>
                        </>
                      ) : (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newDraftTitle.trim()) return alert("Title is required");
                          try {
                            await apiPapers.submitPaper({ paperTitle: newDraftTitle, track: '', abstract: '' });
                            window.location.reload();
                          } catch (err) {
                            alert(err.message || "Failed to create paper draft");
                          }
                        }} className="text-left max-w-md mx-auto">
                          <h2 className="text-xl font-display font-bold text-navy mb-4">Create Paper Draft</h2>
                          <div className="flex flex-col gap-1.5 mb-6">
                            <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Proposed Paper Title *</label>
                            <input 
                              type="text" value={newDraftTitle} onChange={(e) => setNewDraftTitle(e.target.value)} required
                              className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none focus:border-ochre/50"
                              placeholder="Enter your paper title"
                            />
                          </div>
                          <div className="flex gap-4">
                            <button type="button" onClick={() => setIsCreatingDraft(false)} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-navy border border-ink/15 rounded-lg hover:border-ochre/30 transition-colors w-full">
                              Cancel
                            </button>
                            <button type="submit" className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-ochre rounded-lg hover:bg-ochre/90 transition-colors w-full">
                              Submit
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* --- SECTION 1: PAPER METADATA (EDITABLE) --- */}
                      <div className="bg-white border border-ink/10 rounded-xl p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-display font-bold text-navy">Paper Details</h2>
                          {detailsSuccess && <span className="text-xs font-bold text-moss bg-moss/10 px-3 py-1 rounded-full">Saved</span>}
                        </div>
                        
                        <div className="space-y-6">
                          {/* Title */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Paper Title *</label>
                            <input 
                              type="text" 
                              value={editTitle} 
                              onChange={(e) => { setEditTitle(e.target.value); setDetailsSuccess(false); }}
                              className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none focus:border-ochre/50"
                              placeholder="Enter your paper title"
                            />
                          </div>

                          {/* Domain Dropdown */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Domain *</label>
                            <select 
                              value={editDomain} 
                              onChange={(e) => { setEditDomain(e.target.value); setDetailsSuccess(false); }}
                              className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none focus:border-ochre/50 bg-white"
                            >
                              <option value="">Select a domain</option>
                              {domains.map(domain => (
                                <option key={domain} value={domain}>{domain}</option>
                              ))}
                            </select>
                            <p className="text-xs text-ink-soft">Select the domain that best fits your paper</p>
                          </div>

                          {/* Abstract */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Abstract</label>
                            <textarea 
                              value={editAbstract} 
                              onChange={(e) => { setEditAbstract(e.target.value); setDetailsSuccess(false); }}
                              rows={6}
                              maxLength={3000}
                              className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none focus:border-ochre/50 resize-none"
                              placeholder="Enter your paper abstract (max 3000 characters)"
                            />
                            <p className="text-xs text-ink-soft text-right">{editAbstract.length}/3000 characters</p>
                          </div>

                          {/* Co-Authors */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Co-Authors (comma-separated emails)</label>
                            <input 
                              type="text" 
                              value={editCoAuthors} 
                              onChange={(e) => { setEditCoAuthors(e.target.value); setDetailsSuccess(false); }}
                              className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none focus:border-ochre/50"
                              placeholder="author1@edu.com, author2@edu.com"
                            />
                          </div>

                          {/* Save Button */}
                          <button 
                            onClick={async () => {
                              if (!editTitle || !editDomain) {
                                alert('Title and Domain are required');
                                return;
                              }
                              setIsSavingDetails(true);
                              try {
                                await apiPapers.updateDetails(myPaper.id, { 
                                  title: editTitle, 
                                  abstract: editAbstract,
                                  domain: editDomain,
                                  co_author_emails: editCoAuthors.split(',').map(e => e.trim()).filter(e => e)
                                });
                                setDetailsSuccess(true);
                                setTimeout(() => setDetailsSuccess(false), 3000);
                              } catch (err) { 
                                alert(err.message); 
                              } finally { 
                                setIsSavingDetails(false); 
                              }
                            }}
                            disabled={isSavingDetails}
                            className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-navy rounded-lg hover:bg-navy/90 disabled:opacity-50"
                          >
                            {isSavingDetails ? 'Saving...' : 'Update Details'}
                          </button>
                        </div>
                      </div>

                  {/* --- SECTION 2: FILE UPLOAD WITH PROGRESS --- */}
                  <div className="bg-white border border-ink/10 rounded-xl p-8 shadow-sm">
                    <h2 className="text-xl font-display font-bold text-navy mb-6">Full Paper Submission</h2>
                    
                    {myPaper?.file_url ? (
                      <div className="flex items-center gap-4 p-4 bg-moss/10 border border-moss/20 rounded-lg">
                        <FileText className="w-8 h-8 text-moss" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-navy">Paper Uploaded Successfully</p>
                          <p className="text-xs text-moss/80">Your PDF is securely stored.</p>
                        </div>
                        <a href={`${API_BASE}${myPaper.file_url.startsWith('/') ? '' : '/'}${myPaper.file_url}`} target="_blank" className="px-4 py-2 text-xs font-bold text-navy bg-white border border-ink/10 rounded-lg hover:bg-atmosphere">View PDF</a>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {uploadProgress > 0 && (
                          <div className="w-full bg-atmosphere rounded-full h-2.5">
                            <div className="bg-ochre h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            <p className="text-xs text-ink-soft mt-1 text-center">Uploading... {Math.round(uploadProgress)}%</p>
                          </div>
                        )}
                        
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const fileInput = e.target.elements.paperFile.files[0];
                          if (!fileInput) return alert('Select a PDF');
                          if (fileInput.type !== 'application/pdf') return alert('PDF only');
                          
                          setUploadProgress(1);
                          try {
                            await apiPapers.uploadFile(myPaper.id, fileInput, setUploadProgress);
                            setUploadProgress(100);
                            setTimeout(() => window.location.reload(), 1000);
                          } catch (err) { alert(err.message); setUploadProgress(0); }
                        }} className="border-2 border-dashed border-ink/20 rounded-lg p-8 text-center hover:border-ochre/50 transition-colors">
                          <input type="file" name="paperFile" accept="application/pdf" className="hidden" id="paper-upload" />
                          <label htmlFor="paper-upload" className="cursor-pointer block">
                            <Upload className="w-10 h-10 text-ochre mx-auto mb-3" />
                            <p className="text-sm font-bold text-navy mb-1">Click to select your full paper PDF</p>
                            <p className="text-xs text-ink-soft">Max 10MB. PDF format only.</p>
                          </label>
                          <button type="submit" disabled={uploadProgress > 0 && uploadProgress < 100} className="mt-6 px-8 py-3 text-sm font-bold text-white bg-ochre rounded-lg hover:bg-ochre/90 disabled:opacity-50">
                            {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Submit Paper'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* --- SECTION 3: REVIEW STATUS TRACKER --- */}
                  <div className="bg-white border border-ink/10 rounded-xl p-8 shadow-sm">
                    <h2 className="text-xl font-display font-bold text-navy mb-6">Peer Review Status</h2>
                    
                    {/* Status Timeline */}
                    <div className="flex items-center justify-between relative mb-8">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-ink/10 -translate-y-1/2 z-0"></div>
                      
                      {['Submitted', 'Under Review', myPaper?.review_status === 'accepted' ? 'Accepted' : myPaper?.review_status === 'rejected' ? 'Rejected' : 'Decision'].map((step, index) => {
                        const statusMap = {
                          'submitted': 0,
                          'under_review': 1,
                          'accepted': 2,
                          'rejected': 2
                        };
                        const currentStep = statusMap[myPaper?.review_status] || 0;
                        const isCompleted = index < currentStep || (index === 2 && currentStep === 2);
                        const isActive = index === currentStep && currentStep < 2;
                        
                        const isRejected = index === 2 && myPaper?.review_status === 'rejected';
                        
                        return (
                          <div key={index} className="relative z-10 flex flex-col items-center bg-white px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              isRejected ? 'bg-red-600 border-red-600 text-white' :
                              isCompleted ? 'bg-moss border-moss text-white' : 
                              isActive ? 'bg-ochre border-ochre text-white' : 
                              'bg-white border-ink/20 text-ink-soft'
                            }`}>
                              {isRejected ? <XCircle className="w-4 h-4" /> : 
                               isCompleted ? <CheckCircle className="w-4 h-4" /> : 
                               <span className="text-xs font-bold">{index + 1}</span>}
                            </div>
                            <p className={`text-xs font-bold mt-2 ${isRejected ? 'text-red-600' : isCompleted || isActive ? 'text-navy' : 'text-ink-soft'}`}>{step}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Current Status */}
                    <div className="bg-atmosphere/50 rounded-lg p-4 border border-ink/10">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-navy">Current Status</p>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          myPaper?.review_status === 'accepted' ? 'bg-green-100 text-green-700' :
                          myPaper?.review_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          myPaper?.review_status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {myPaper?.review_status?.replace('_', ' ').toUpperCase() || 'SUBMITTED'}
                        </span>
                      </div>

                      {/* Show decision if available */}
                      {(myPaper?.review_status === 'accepted' || myPaper?.review_status === 'rejected') && (
                        <div className="mt-4 pt-4 border-t border-ink/10">
                          <p className="text-sm font-bold text-navy mb-2">
                            {myPaper?.review_status === 'accepted' ? '🎉 Congratulations! Your paper has been accepted.' : 'Your paper was not accepted for this conference.'}
                          </p>
                          {myPaper?.comments_for_authors && (
                            <div className="mt-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">Reviewer Comments</p>
                              <p className="text-sm text-navy bg-white p-3 rounded-lg border border-ink/10">
                                {myPaper.comments_for_authors}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </PageTransition>
  );
}
