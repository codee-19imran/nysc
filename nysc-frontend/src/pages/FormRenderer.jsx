import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { request, auth as apiAuth } from '../lib/api';

export default function FormRenderer() {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const data = await request(`/public/forms/${formId}`);
      setForm(data);
      
      // Initialize form data with empty values
      const initialData = {};
      data.fields.forEach(field => {
        initialData[field.label] = field.field_type === 'checkbox' ? false : '';
      });
      setFormData(initialData);
    } catch (err) {
      setError(err.message || 'Form not found');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors = {};
    form.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.label];
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors[field.label] = 'This field is required';
        }
      }
      
      // Email validation
      if (field.field_type === 'email' && formData[field.label]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.label])) {
          errors[field.label] = 'Invalid email address';
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      const user = apiAuth.getUser();
      await request(`/public/forms/${formId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          data: formData,
          user_email: user?.email || null
        })
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.label] || '';
    const errorMsg = validationErrors[field.label];
    
    const baseClasses = `w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-ochre ${
      errorMsg ? 'border-red-500' : 'border-ink/15'
    }`;
    
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.field_type}
            value={value}
            onChange={(e) => setFormData({...formData, [field.label]: e.target.value})}
            placeholder={field.placeholder || ''}
            className={baseClasses}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setFormData({...formData, [field.label]: e.target.value})}
            placeholder={field.placeholder || ''}
            rows={4}
            className={baseClasses}
          />
        );
      
      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => setFormData({...formData, [field.label]: e.target.value})}
            className={baseClasses}
          >
            <option value="">— Select —</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="mt-2 space-y-2">
            {(field.options || []).map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.label}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => setFormData({...formData, [field.label]: e.target.value})}
                  className="w-4 h-4 accent-ochre"
                />
                <span className="text-sm text-navy">{opt}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFormData({...formData, [field.label]: e.target.checked})}
              className="w-4 h-4 accent-ochre"
            />
            <span className="text-sm text-navy">{field.label}</span>
          </label>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setFormData({...formData, [field.label]: e.target.value})}
            className={baseClasses}
          />
        );
      
      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => setFormData({...formData, [field.label]: e.target.files[0]?.name || ''})}
            className={baseClasses}
          />
        );
      
      default:
        return <div className="text-ink-soft">Unsupported field type</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ochre animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-navy mb-2">Form Unavailable</h1>
          <p className="text-ink-soft mb-6">{error}</p>
          <Link to="/" className="px-6 py-2 bg-ochre text-white font-bold rounded-lg">Go Home</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-navy mb-2">Submission Successful!</h1>
          <p className="text-ink-soft mb-6">Thank you for completing the form.</p>
          <Link to="/" className="px-6 py-2 bg-ochre text-white font-bold rounded-lg">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-atmosphere py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <header className="mb-6 border-b border-ink/10 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-ochre" />
              <h1 className="text-3xl font-display font-bold text-navy">{form.name}</h1>
            </div>
            {form.description && (
              <p className="text-ink-soft">{form.description}</p>
            )}
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {form.fields.map(field => (
              <div key={field.id}>
                <label className="text-sm font-bold text-navy">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
                {validationErrors[field.label] && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors[field.label]}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
