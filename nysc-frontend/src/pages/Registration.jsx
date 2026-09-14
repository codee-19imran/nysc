import { auth as apiAuth, registrations as apiReg, payments as apiPayments, loadRazorpay } from '../lib/api';
import { useState, useMemo, useEffect } from 'react';
import { Check, X, Mail, Phone, MapPin, User, Upload, AlertCircle, Lock, CheckCircle, GraduationCap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { isAdminRole } from '../lib/roles';
import PhotoUpload from '../components/PhotoUpload';
import DeadlineCountdown from '../components/DeadlineCountdown';
import { request } from '../lib/api';

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [registrationId, setRegistrationId] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [deadlineData, setDeadlineData] = useState(null);

  useEffect(() => {
    request('/settings/public/deadlines').then(setDeadlineData).catch(console.error);
  }, []);

  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    fullName: '',
    email: '',
    phone: '',
    // Student specific fields
    institution: '',
    educationLevel: '',
    studentClass: '',
    graduationYear: '',
    // Common Address fields
    state: '',
    city: '',
    // Professional specific fields
    organization: '',
    designation: '',
    experience: '',
    // Account
    password: '',
    confirmPassword: '',
    // Agreements
    agreeTerms: false,
  });

  // Prevent admins from accessing registration
  useEffect(() => {
    const user = apiAuth.getUser();
    if (user && isAdminRole(user.role)) {
      navigate('/admin');
    }
  }, [navigate]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('nysc_registration_draft');
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Save to localStorage instantly
      localStorage.setItem('nysc_registration_draft', JSON.stringify(newData));

      return newData;
    });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    handleChange({ target: { name: 'phone', value: val } });
  };

  const passwordRules = useMemo(() => {
    const pwd = formData.password;
    return {
      length: pwd.length >= 6,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
  }, [formData.password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  
  // Simplified: All users go through same 2-step flow (Profile → Payment)
  const progressSteps = [
    { id: 1, label: 'Profile & Account' },
    { id: 2, label: 'Payment & Review' }
  ];

  // --- VALIDATION LOGIC ---
  const validateStep = (currentStep) => {
    let newErrors = {};
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (currentStep === 1) {
      if (!formData.category) { newErrors.category = "Please select a delegate category."; isValid = false; }
      if (formData.category === 'student' && !formData.subCategory) { newErrors.subCategory = "Please select a sub-category."; isValid = false; }
      if (!formData.fullName.trim()) { newErrors.fullName = "Full name is required."; isValid = false; }
      if (!photoFile) { newErrors.photoFile = "Profile photo is required."; isValid = false; }

      if (!formData.email.trim() || !emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address (e.g., name@institution.edu).";
        isValid = false;
      }

      if (!formData.phone.trim() || formData.phone.length < 10) { newErrors.phone = "Valid 10-digit phone number is required."; isValid = false; }

      if (!formData.password) { newErrors.password = "Password is required."; isValid = false; }
      else if (!isPasswordValid) { newErrors.password = "Password does not meet the required criteria."; isValid = false; }

      if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = "Passwords do not match."; isValid = false; }

      if (formData.category === 'student') {
        if (!formData.institution.trim()) { newErrors.institution = "School / University name is required."; isValid = false; }
        if (!formData.educationLevel) { newErrors.educationLevel = "Please select your education level."; isValid = false; }

        if (formData.educationLevel === 'School (Class 9-12)') {
          if (!formData.studentClass) { newErrors.studentClass = "Please select your class."; isValid = false; }
        } else {
          if (!formData.graduationYear) { newErrors.graduationYear = "Expected graduation year is required."; isValid = false; }
        }
      } else if (formData.category === 'professional') {
        if (!formData.organization.trim()) { newErrors.organization = "Organization is required."; isValid = false; }
        if (!formData.designation.trim()) { newErrors.designation = "Designation is required."; isValid = false; }
        if (!formData.experience) { newErrors.experience = "Years of experience is required."; isValid = false; }
      }

      // Common Address Validation for ALL
      if (!formData.state.trim()) { newErrors.state = "State is required."; isValid = false; }
      if (!formData.city.trim()) { newErrors.city = "City is required."; isValid = false; }
    }

    if (currentStep === 2) {
      if (!formData.agreeTerms) { newErrors.agreeTerms = "You must agree to the terms and conditions."; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  const nextStep = async () => {
    if (!validateStep(step)) return;

    if (step === 1) {
      try {
        const data = await request('/settings/public/deadlines');
        if (data.registration.status === 'closed') {
          alert('Registration has closed. Please contact admin if this is an error.');
          return;
        }
      } catch (err) {
        console.error('Deadline check failed:', err);
      }
    }

    setIsLoading(true);
    setApiError('');

    try {
      // --- STEP 1: Account Creation / Update ---
      if (step === 1) {
        let tokenToUse = localStorage.getItem('nysc_token');
        if (apiAuth.isAuthenticated()) {
          // User is already logged in (they went back to edit). Update their profile.
          await apiAuth.updateProfile(formData);

          // Update local storage user data in case they changed their name/email
          const updatedUser = { ...apiAuth.getUser(), name: formData.fullName, email: formData.email };
          apiAuth.saveAuth(tokenToUse, updatedUser);
        } else {
          // New user. Create the account.
          const response = await apiAuth.signup(formData);
          apiAuth.saveAuth(response.access_token, response.user);
          tokenToUse = response.access_token;
        }

        // Upload photo
        const photoFormData = new FormData();
        photoFormData.append('file', photoFile);
        
        const photoResponse = await fetch('http://127.0.0.1:8000/auth/upload-photo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tokenToUse}` },
          body: photoFormData
        });
        
        if (!photoResponse.ok) {
          const errorData = await photoResponse.json();
          throw new Error(errorData.detail || 'Failed to upload photo');
        }

        // Success! Move to payment step
        localStorage.removeItem('nysc_registration_draft');
        setStep(2);
      }

      // --- STEP 2: Just UI Navigation for Payment ---
      else {
        setStep(prev => prev + 1);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      setApiError(err.message || "Failed to save details. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setErrors({});
    setStep(prev => prev - 1);
  };

  const registrationFee = formData.category === 'student' ? 2999 : 4199;

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir",
    "Ladakh", "Puducherry"
  ];

  const handlePayment = async () => {
    if (!formData.agreeTerms) return;

    setIsProcessingPayment(true);
    setPaymentError('');

    try {
      // 1. Get the pending registration ID from the backend
      let currentRegId = registrationId;
      if (!currentRegId) {
        const regData = await apiReg.getMyRegistration();
        currentRegId = regData.id;
        setRegistrationId(currentRegId);

        if (regData.payment_status === 'paid') {
          setPaymentSuccess(true);
          return;
        }
      }

      // 2. Create Razorpay Order
      const orderData = await apiPayments.createOrder(currentRegId);

      // 3. Load Razorpay Script
      const res = await loadRazorpay();
      if (!res) {
        throw new Error('Razorpay SDK failed to load. Are you online?');
      }

      // 4. Open Razorpay Checkout Modal
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount, // Amount is in paise
        currency: orderData.currency,
        name: "NYSC-2026",
        description: "Conference Registration Fee",
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyData = await apiPayments.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setRegistrationData(verifyData);
            setPaymentSuccess(true);
            // Optional: Clear local draft since payment is done
            localStorage.removeItem('nysc_registration_draft');
          } catch (err) {
            setPaymentError(err.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#c47a2b", // Your brand's ochre color
        },
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

  return (
    <PageTransition>
      <section className="py-20 md:py-28 bg-white min-h-screen">
        <div className="max-w-4xl mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-3">NYSC-2026</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-navy tracking-tight leading-[1.1] mb-4">
              Delegate Registration
            </h1>
            <p className="text-base text-ink-soft font-body leading-relaxed max-w-2xl mx-auto">
              Secure your participation in the National Young Scientist Conference 2026.
              Please ensure all details match your official institutional identification.
            </p>
          </div>

          {/* Dynamic Progress Indicator */}
          <div className="flex items-center justify-center mb-12">
            {progressSteps.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${currentDisplayStep >= s.id ? 'bg-navy text-white' : 'bg-ink/10 text-ink-soft'
                    }`}>
                    {currentDisplayStep > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 hidden sm:block ${currentDisplayStep >= s.id ? 'text-navy' : 'text-ink-soft'
                    }`}>
                    {s.label}
                  </span>
                </div>
                {index < progressSteps.length - 1 && (
                  <div className={`w-16 md:w-24 h-px mx-2 mb-4 sm:mb-0 ${currentDisplayStep > s.id ? 'bg-navy' : 'bg-ink/10'
                    }`} />
                )}
              </div>
            ))}
          </div>

          {/* Form Container */}
          <div className="bg-white border border-ink/10 rounded-xl p-8 md:p-10 shadow-sm">
            <div className="mb-6">
              <DeadlineCountdown type="registration" />
            </div>
            {apiError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{apiError}</p>
              </div>
            )}

            {/* STEP 1: Profile & Account */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-display font-bold text-navy mb-1">Delegate Category</h2>
                  <p className="text-sm text-ink-soft mb-4">Select your registration tier.</p>

                  {errors.category && <p className="text-xs text-red-600 mb-2 font-medium">{errors.category}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <CategoryCard label="Student Delegate" price="₹2,999" isSelected={formData.category === 'student'} onSelect={() => handleChange({ target: { name: 'category', value: 'student' } })} />
                    <CategoryCard label="Working Professional" price="₹4,199" isSelected={formData.category === 'professional'} onSelect={() => handleChange({ target: { name: 'category', value: 'professional' } })} />
                  </div>

                  {formData.category === 'student' && (
                    <>
                      {errors.subCategory && <p className="text-xs text-red-600 mb-2 font-medium">{errors.subCategory}</p>}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <SubCategoryCard label="Paper Presenter" desc="Submit full paper via dashboard post-registration" isSelected={formData.subCategory === 'presenter'} onSelect={() => handleChange({ target: { name: 'subCategory', value: 'presenter' } })} />
                        <SubCategoryCard label="Attendee" desc="Observing sessions only" isSelected={formData.subCategory === 'attendee'} onSelect={() => handleChange({ target: { name: 'subCategory', value: 'attendee' } })} />
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-ink/10 pt-8">
                  <h2 className="text-xl font-display font-bold text-navy mb-6">Personal Details & Account</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="Full Name (as per ID)" name="fullName" value={formData.fullName} onChange={handleChange} required error={errors.fullName} />
                    <FormInput label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required error={errors.email} placeholder="name@institution.edu" />
                    <FormInput label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} required error={errors.phone} placeholder="10-digit number" />
                    
                    <div className="md:col-span-2">
                      <PhotoUpload onPhotoSelected={setPhotoFile} currentPhoto={photoFile ? URL.createObjectURL(photoFile) : null} />
                      {errors.photoFile && <p className="text-xs text-red-600 mt-2">{errors.photoFile}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                        Create Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2"><Lock className="w-4 h-4 text-ink-soft" /></div>
                        <input
                          type="password" name="password" value={formData.password} onChange={handleChange} required
                          className={`w-full border rounded-lg px-4 py-2.5 pl-10 text-sm font-body text-navy placeholder:text-ink-soft/60 focus:outline-none transition-colors ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                        <PasswordRule met={passwordRules.length} text="Min. 6 characters" />
                        <PasswordRule met={passwordRules.uppercase} text="1 Uppercase letter" />
                        <PasswordRule met={passwordRules.number} text="1 Number" />
                        <PasswordRule met={passwordRules.special} text="1 Special character" />
                      </div>
                      {errors.password && <p className="text-xs text-red-600 mt-0.5">{errors.password}</p>}
                    </div>

                    <FormInput label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required icon={<Lock className="w-4 h-4 text-ink-soft" />} error={errors.confirmPassword} />
                  </div>
                </div>

                <div className="border-t border-ink/10 pt-8">
                  <h2 className="text-xl font-display font-bold text-navy mb-6">
                    {formData.category === 'student' ? 'Academic Details' : 'Professional Details'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.category === 'student' ? (
                      <>
                        <FormInput label="School / University / Institute Name" name="institution" value={formData.institution} onChange={handleChange} required error={errors.institution} />

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Education Level <span className="text-red-500">*</span></label>
                          <select
                            name="educationLevel" value={formData.educationLevel} onChange={handleChange} required
                            className={`w-full border rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none transition-colors ${errors.educationLevel ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
                          >
                            <option value="">Select Level</option>
                            <option value="School (Class 9-12)">School (Class 9-12)</option>
                            <option value="Undergraduate">Undergraduate (B.Tech, B.Sc, etc.)</option>
                            <option value="Postgraduate">Postgraduate (M.Tech, M.Sc, etc.)</option>
                            <option value="PhD / Research Scholar">PhD / Research Scholar</option>
                          </select>
                          {errors.educationLevel && <p className="text-xs text-red-600 mt-0.5">{errors.educationLevel}</p>}
                        </div>

                        {formData.educationLevel === 'School (Class 9-12)' && (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Class / Grade <span className="text-red-500">*</span></label>
                              <select
                                name="studentClass" value={formData.studentClass} onChange={handleChange} required
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none transition-colors ${errors.studentClass ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
                              >
                                <option value="">Select Class</option>
                                {['9', '10', '11', '12'].map(cls => (
                                  <option key={cls} value={cls}>Class {cls}</option>
                                ))}
                              </select>
                              {errors.studentClass && <p className="text-xs text-red-600 mt-0.5">{errors.studentClass}</p>}
                            </div>
                          </>
                        )}

                        {formData.educationLevel !== 'School (Class 9-12)' && formData.educationLevel && (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">Expected Graduation Year <span className="text-red-500">*</span></label>
                              <select
                                name="graduationYear" value={formData.graduationYear} onChange={handleChange} required
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none transition-colors ${errors.graduationYear ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
                              >
                                <option value="">Select Year</option>
                                {Array.from({ length: 10 }, (_, i) => 2024 + i).map(year => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                              {errors.graduationYear && <p className="text-xs text-red-600 mt-0.5">{errors.graduationYear}</p>}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <FormInput label="Organization / Institute" name="organization" value={formData.organization} onChange={handleChange} required error={errors.organization} />
                        <FormInput label="Current Designation" name="designation" value={formData.designation} onChange={handleChange} required error={errors.designation} />
                        <FormInput label="Years of Experience" name="experience" type="number" value={formData.experience} onChange={handleChange} required error={errors.experience} />
                      </>
                    )}

                    {/* COMMON ADDRESS FIELDS (For Everyone) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">State <span className="text-red-500">*</span></label>
                      <select
                        name="state" value={formData.state} onChange={handleChange} required
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm font-body text-navy focus:outline-none transition-colors ${errors.state ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
                      >
                        <option value="">Select State</option>
                        {indianStates.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {errors.state && <p className="text-xs text-red-600 mt-0.5">{errors.state}</p>}
                    </div>

                    <FormInput label="City" name="city" value={formData.city} onChange={handleChange} required error={errors.city} placeholder="e.g., Ranchi" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Payment & Review */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-display font-bold text-navy mb-1">Review & Payment</h2>
                  <p className="text-sm text-ink-soft mb-6">
                    Please review your details before proceeding to payment. Paper submission will be done via your dashboard after registration.
                  </p>
                </div>

                <div className="border-t border-ink/10 pt-8">
                  <h3 className="text-lg font-display font-bold text-navy mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-ink-soft">Full Name:</span><br/><strong className="text-navy">{formData.fullName}</strong></div>
                    <div><span className="text-ink-soft">Email:</span><br/><strong className="text-navy">{formData.email}</strong></div>
                    <div><span className="text-ink-soft">Phone:</span><br/><strong className="text-navy">{formData.phone}</strong></div>
                    <div><span className="text-ink-soft">Category:</span><br/><strong className="text-navy capitalize">{formData.category === 'student' ? 'Student Delegate' : 'Working Professional'}</strong></div>
                    {formData.category === 'student' && (
                      <>
                        <div><span className="text-ink-soft">Institution:</span><br/><strong className="text-navy">{formData.institution}</strong></div>
                        <div><span className="text-ink-soft">Education Level:</span><br/><strong className="text-navy">{formData.educationLevel}</strong></div>
                      </>
                    )}
                    {formData.category === 'professional' && (
                      <>
                        <div><span className="text-ink-soft">Organization:</span><br/><strong className="text-navy">{formData.organization}</strong></div>
                        <div><span className="text-ink-soft">Designation:</span><br/><strong className="text-navy">{formData.designation}</strong></div>
                      </>
                    )}
                    <div><span className="text-ink-soft">State:</span><br/><strong className="text-navy">{formData.state}</strong></div>
                    <div><span className="text-ink-soft">City:</span><br/><strong className="text-navy">{formData.city}</strong></div>
                  </div>
                </div>

                <div className="border-t border-ink/10 pt-8 space-y-4">
                  {errors.agreeTerms && <p className="text-xs text-red-600 font-medium">{errors.agreeTerms}</p>}
                  <label className={`flex items-start gap-3 cursor-pointer p-4 border rounded-lg ${errors.agreeTerms ? 'border-red-300 bg-red-50' : 'border-ink/10 bg-atmosphere/50'}`}>
                    <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="mt-1 accent-ochre w-4 h-4" />
                    <span className="text-sm text-ink-soft leading-relaxed">
                      <strong className="text-navy">Terms and Conditions:</strong> I agree to abide by the conference rules, code of conduct, and understand that registration fees are non-refundable. I consent to the use of my provided data for conference-related communications only.
                    </span>
                  </label>
                </div>

                <div className="border-t border-ink/10 pt-8">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-sm text-ink-soft">Total Registration Fee</p>
                      <p className="text-2xl font-display font-bold text-navy">₹{registrationFee.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 font-medium">{paymentError}</p>
                    </div>
                  )}

                  <button
                    onClick={handlePayment}
                    disabled={isProcessingPayment || !formData.agreeTerms}
                    className={`w-full py-4 px-6 rounded-lg font-body font-bold text-white transition-all ${isProcessingPayment || !formData.agreeTerms
                        ? 'bg-ink/30 cursor-not-allowed'
                        : 'bg-ochre hover:bg-ochre/90 active:scale-[0.99]'
                      }`}
                  >
                    {isProcessingPayment ? 'Processing...' : `Pay ₹${registrationFee.toLocaleString('en-IN')}`}
                  </button>

                  {!formData.agreeTerms && (
                    <p className="text-xs text-center text-ink-soft mt-3">Please agree to the terms and conditions to proceed with payment.</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Payment & Review */}
            {step === 3 && (
              <div className="space-y-8">
                {paymentSuccess ? (
                  // --- SUCCESS STATE ---
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-moss/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-moss" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-navy mb-2">Payment Successful!</h2>
                    <p className="text-sm text-ink-soft mb-6">Your registration is complete.</p>

                    <br />
                    <button onClick={() => window.location.href = '/dashboard'} className="px-6 py-3 text-sm font-body font-bold text-white bg-navy rounded-lg hover:bg-navy/90 transition-colors">
                      Go to Dashboard
                    </button>
                  </div>
                ) : (
                  // --- PAYMENT STATE ---
                  <>
                    <div>
                      <h2 className="text-xl font-display font-bold text-navy mb-6">Order Summary</h2>
                      <div className="border border-ink/10 rounded-lg p-6 bg-atmosphere/50">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-ink/10">
                          <div>
                            <p className="text-sm text-ink-soft">Delegate Category</p>
                            <p className="font-display font-bold text-navy capitalize">{formData.category === 'student' ? 'Student Delegate' : 'Working Professional'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-display font-bold text-lg text-navy">Total Payable</span>
                          <span className="font-display font-bold text-2xl text-ochre">₹{registrationFee.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {paymentError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">{paymentError}</p>
                      </div>
                    )}

                    <div className="border-t border-ink/10 pt-8">
                      {errors.agreeTerms && <p className="text-xs text-red-600 mb-2 font-medium">{errors.agreeTerms}</p>}
                      <label className="flex items-start gap-3 cursor-pointer mb-6">
                        <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="mt-1 accent-ochre w-4 h-4" />
                        <span className="text-sm text-ink-soft leading-relaxed">
                          I agree to the NYSC-2026 Code of Conduct, Privacy Policy, and Refund Policy.
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={!formData.agreeTerms || isProcessingPayment}
                        className={`w-full flex items-center justify-center gap-2 px-8 py-4 text-sm font-body font-bold rounded-lg transition-all shadow-md ${formData.agreeTerms && !isProcessingPayment
                            ? 'bg-ochre text-white hover:bg-ochre/90 cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Pay ₹{registrationFee.toLocaleString('en-IN')} & Complete Registration
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            {!paymentSuccess && (
              <div className="flex justify-between mt-10 pt-6 border-t border-ink/10">
                {step > 1 ? (
                  <button type="button" onClick={prevStep} className="px-6 py-3 text-sm font-body font-medium text-navy border border-ink/15 rounded-lg hover:border-ochre/30 transition-colors">
                    Back
                  </button>
                ) : <div />}

                {step < 3 && (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={isLoading || (step === 1 && deadlineData?.registration?.status === 'closed')}
                    className={`px-6 py-3 text-sm font-body font-bold text-white bg-navy rounded-lg transition-colors ${(isLoading || (step === 1 && deadlineData?.registration?.status === 'closed')) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-navy/90'}`}
                  >
                    {step === 1 && deadlineData?.registration?.status === 'closed' ? 'Registration Closed' : (isLoading ? (step === 1 ? 'Creating Account...' : 'Saving...') : `Continue to ${step === 1 && isNonPresenter ? 'Payment' : 'Next Step'}`)}
                  </button>
                )}
              </div>
            )}

            <div className="mt-8 text-center text-sm font-body text-ink-soft">
              Already have an account?{' '}
              <Link to="/login" className="text-ochre font-bold hover:underline">
                Log in here
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

// --- Reusable UI Components ---

function PasswordRule({ met, text }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-moss' : 'text-ink-soft/60'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{text}</span>
    </div>
  );
}

function FormInput({ label, name, value, onChange, type = 'text', required = false, icon, multiline = false, error, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        {multiline ? (
          <textarea name={name} value={value} onChange={onChange} required={required} rows={3}
            className={`w-full border rounded-lg px-4 py-2.5 text-sm font-body text-navy placeholder:text-ink-soft/60 focus:outline-none transition-colors ${icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className={`w-full border rounded-lg px-4 py-2.5 text-sm font-body text-navy placeholder:text-ink-soft/60 focus:outline-none transition-colors ${icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:border-red-500' : 'border-ink/15 focus:border-ochre/50'}`}
          />
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}

function CategoryCard({ label, price, isSelected, onSelect }) {
  return (
    <div onClick={onSelect} className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${isSelected ? 'border-ochre bg-ochre/5 ring-1 ring-ochre' : 'border-ink/15 hover:border-ochre/30'}`}>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${isSelected ? 'border-ochre' : 'border-ink/30'}`}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-ochre" />}
      </div>
      <div>
        <span className="font-display font-bold text-navy block">{label}</span>
        <span className="text-sm text-ink-soft">{price}</span>
      </div>
    </div>
  );
}

function SubCategoryCard({ label, desc, isSelected, onSelect }) {
  return (
    <div onClick={onSelect} className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${isSelected ? 'border-ochre bg-ochre/5 ring-1 ring-ochre' : 'border-ink/15 hover:border-ochre/30'}`}>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${isSelected ? 'border-ochre' : 'border-ink/30'}`}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-ochre" />}
      </div>
      <div>
        <span className="font-display font-bold text-navy block">{label}</span>
        <span className="text-xs text-ink-soft">{desc}</span>
      </div>
    </div>
  );
}