import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Calendar, DollarSign, MapPin, Users, FileText, Plus, Trash2 } from 'lucide-react';
import { request, auth as apiAuth } from '../../lib/api';

export default function AdminSettings() {
  const user = apiAuth.getUser();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await request('/admin/settings');
      setSettings({
        ...data,
        important_dates: data.important_dates || []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleMealTimingChange = (meal, value) => {
    setSettings(prev => ({
      ...prev,
      meal_timings: { ...prev.meal_timings, [meal]: value }
    }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await request('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Success/Error Alerts */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-base text-green-700 font-medium">Settings saved successfully</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-base text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Conference Info */}
      <SectionCard title="Conference Information" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Conference Dates"
            value={settings.conference_dates}
            onChange={(v) => handleChange('conference_dates', v)}
            placeholder="e.g., Dec 17-18, 2026"
          />
          <div className="md:col-span-2">
            <InputField
              label="Venue"
              value={settings.venue}
              onChange={(v) => handleChange('venue', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard title="Registration Pricing" icon={DollarSign}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField
            label="Student Fee (₹)"
            type="number"
            value={settings.student_fee}
            onChange={(v) => handleChange('student_fee', parseInt(v) || 0)}
          />
          <InputField
            label="Professional Fee (₹)"
            type="number"
            value={settings.professional_fee}
            onChange={(v) => handleChange('professional_fee', parseInt(v) || 0)}
          />
        </div>
      </SectionCard>

      {/* ============ IMPORTANT DATES EDITOR ============ */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-navy">Important Dates</h3>
            <p className="text-xs text-ink-soft">These dates appear on the public Important Dates page</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({
              ...settings,
              important_dates: [...(settings.important_dates || []), { event: '', date: '', passed: false }]
            })}
            className="flex items-center gap-2 px-3 py-1.5 bg-ochre text-white text-xs font-bold rounded-lg hover:bg-ochre/90 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Date
          </button>
        </div>

        {settings.important_dates?.length > 0 ? (
          <div className="space-y-2">
            {settings.important_dates.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-atmosphere/50 rounded-lg border border-ink/5">
                <div className="col-span-12 md:col-span-5">
                  <input
                    type="text"
                    value={item.event}
                    onChange={(e) => {
                      const updated = [...settings.important_dates];
                      updated[idx] = { ...updated[idx], event: e.target.value };
                      setSettings({ ...settings, important_dates: updated });
                    }}
                    placeholder="Event name"
                    className="w-full px-3 py-2 text-sm border border-ink/15 rounded-lg focus:outline-none focus:border-ochre focus:ring-1 focus:ring-ochre/20"
                  />
                </div>
                <div className="col-span-8 md:col-span-4">
                  <input
                    type="text"
                    value={item.date}
                    onChange={(e) => {
                      const updated = [...settings.important_dates];
                      updated[idx] = { ...updated[idx], date: e.target.value };
                      setSettings({ ...settings, important_dates: updated });
                    }}
                    placeholder="e.g., March 15, 2026"
                    className="w-full px-3 py-2 text-sm border border-ink/15 rounded-lg focus:outline-none focus:border-ochre focus:ring-1 focus:ring-ochre/20"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.passed}
                      onChange={(e) => {
                        const updated = [...settings.important_dates];
                        updated[idx] = { ...updated[idx], passed: e.target.checked };
                        setSettings({ ...settings, important_dates: updated });
                      }}
                      className="w-4 h-4 accent-ochre rounded border-ink/20 focus:ring-ochre"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-soft group-hover:text-ink transition-colors">Passed</span>
                  </label>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = settings.important_dates.filter((_, i) => i !== idx);
                      setSettings({ ...settings, important_dates: updated });
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Date"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-atmosphere/30 rounded-lg border border-ink/5 border-dashed">
            <Calendar className="w-8 h-8 text-ink-soft mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-ink">No important dates added yet</p>
            <p className="text-xs text-ink-soft mt-1">Click "Add Date" to create one.</p>
          </div>
        )}
      </div>

      {/* ============ DEADLINES SECTION ============ */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Submission Deadlines</h3>
        <p className="text-xs text-ink-soft mb-4">
          After these deadlines, registrations and paper submissions will be automatically blocked.
        </p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-atmosphere/50 rounded-lg">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">
                Registration Deadline
              </label>
              <input
                type="datetime-local"
                value={settings.registration_deadline ? new Date(settings.registration_deadline).toISOString().slice(0, 16) : ''}
                onChange={(e) => setSettings({
                  ...settings,
                  registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : null
                })}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">
                Paper Submission Deadline
              </label>
              <input
                type="datetime-local"
                value={settings.paper_submission_deadline ? new Date(settings.paper_submission_deadline).toISOString().slice(0, 16) : ''}
                onChange={(e) => setSettings({
                  ...settings,
                  paper_submission_deadline: e.target.value ? new Date(e.target.value).toISOString() : null
                })}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg text-sm"
              />
            </div>
          </div>
          
          {/* Quick extend buttons (Super Admin only) */}
          {user?.role === 'super_admin' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-ink/10">
              <span className="text-xs text-ink-soft self-center mr-2">Quick extend:</span>
              {[
                { label: '+1 Day', days: 1 },
                { label: '+3 Days', days: 3 },
                { label: '+1 Week', days: 7 },
                { label: '+2 Weeks', days: 14 },
              ].map(ext => (
                <button
                  key={ext.label}
                  type="button"
                  onClick={() => {
                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() + ext.days);
                    newDate.setHours(23, 59, 0, 0);
                    setSettings({
                      ...settings,
                      registration_deadline: newDate.toISOString(),
                      paper_submission_deadline: newDate.toISOString()
                    });
                  }}
                  className="px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
                >
                  {ext.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Timings */}
      <SectionCard title="Meal Timings" icon={Users}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField
            label="Breakfast"
            value={settings.meal_timings?.breakfast || ''}
            onChange={(v) => handleMealTimingChange('breakfast', v)}
            placeholder="08:00-10:00"
          />
          <InputField
            label="Lunch"
            value={settings.meal_timings?.lunch || ''}
            onChange={(v) => handleMealTimingChange('lunch', v)}
            placeholder="12:30-14:30"
          />
          <InputField
            label="Dinner"
            value={settings.meal_timings?.dinner || ''}
            onChange={(v) => handleMealTimingChange('dinner', v)}
            placeholder="19:00-21:00"
          />
        </div>
        <p className="text-sm text-ink-soft mt-3">
          Format: HH:MM-HH:MM (24-hour). Used for meal claim validation.
        </p>
      </SectionCard>

      {/* Domains */}
      <SectionCard title="Paper Domains" icon={FileText}>
        <div className="space-y-3">
          {settings.domains?.map((domain, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => {
                  const newDomains = [...settings.domains];
                  newDomains[index] = e.target.value;
                  handleChange('domains', newDomains);
                }}
                className="flex-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
              />
              <button
                onClick={() => {
                  const newDomains = settings.domains.filter((_, i) => i !== index);
                  handleChange('domains', newDomains);
                }}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => handleChange('domains', [...(settings.domains || []), ''])}
            className="text-base text-ochre font-bold hover:underline"
          >
            + Add Domain
          </button>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div className="sticky bottom-4 bg-white border border-ink/10 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <p className="text-base text-ink-soft">
          Changes will be logged in the audit trail
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6">
      <h3 className="text-xl font-display font-bold text-navy mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-ochre rounded-full"></div>
        <Icon className="w-5 h-5 text-ochre" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold uppercase tracking-wider text-ink-soft">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/20 transition-all"
      />
    </div>
  );
}
