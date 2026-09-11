import React, { useState } from 'react';
import { UserPlus, Camera, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { attendanceApi } from '../../api/attendance';

export default function AddEmployeeForm({ sections = [], shifts = [], userRole, userSectionId, onSuccess }) {
  const [formData, setFormData] = useState({
    employeeCode: `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
    name: '',
    email: '',
    phone: '',
    sectionId: userRole === 'SECTION_ADMIN' ? userSectionId : (sections[0]?.id || ''),
    shiftId: shifts[0]?.id || '',
    password: 'employee123',
    photoBase64: null,
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        setFormData((prev) => ({ ...prev, photoBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await attendanceApi.createEmployee(formData);
      if (res.success) {
        setSuccess(`Employee ${res.data.name} (${res.data.employeeCode}) onboarded successfully!`);
        if (onSuccess) onSuccess(res.data);
      } else {
        setError(res.error || 'Failed to onboard employee.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to onboard employee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-xl mx-auto shadow-2xl">
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 mb-4">
        <UserPlus size={18} className="text-sky-400" />
        <h2 className="text-zinc-100 font-semibold text-sm font-mono">
          Onboard New Employee
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 mb-1">Employee ID / Code *</label>
            <input
              type="text"
              required
              value={formData.employeeCode}
              onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="alex.m@attendx.aero"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="+1-555-0199"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 mb-1">Section Assignment *</label>
            <select
              value={formData.sectionId}
              disabled={userRole === 'SECTION_ADMIN'}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Assigned Shift *</label>
            <select
              value={formData.shiftId}
              onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
            >
              {shifts.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 mb-1">Initial Password *</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Profile photo upload */}
        <div>
          <label className="block text-zinc-400 mb-1">Onboarding Profile Photo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-zinc-600" />
              )}
            </div>
            <label className="cursor-pointer py-2 px-3 border border-zinc-700 hover:bg-zinc-800 rounded text-zinc-300 text-xs font-mono flex items-center gap-2">
              <Upload size={13} /> Select Image File
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering Personnel...' : 'Create Employee Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
