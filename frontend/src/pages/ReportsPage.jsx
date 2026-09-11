import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Building2,
  Layers,
  Activity,
  CheckCircle,
  Clock,
  Search,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import OpsLayout from '../components/layout/OpsLayout';

export default function ReportsPage() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState('attendance'); // 'attendance' | 'activity' | 'department' | 'floor'
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [departments, setDepartments] = useState([]);
  const [floors, setFloors] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');

  // Load org data for filter dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        const [dRes, fRes] = await Promise.all([
          fetch('/api/organization/departments', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/organization/floors', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const dJson = await dRes.json();
        const fJson = await fRes.json();
        if (dJson.success) setDepartments(dJson.departments);
        if (fJson.success) setFloors(fJson.floors);
      } catch (e) {}
    }
    loadMeta();
  }, [token]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        date,
        ...(selectedDept ? { departmentId: selectedDept } : {}),
        ...(selectedFloor ? { floorId: selectedFloor } : {}),
      });

      const res = await fetch(`/api/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setReports(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, date, selectedDept, selectedFloor]);

  const handleDownloadCsv = () => {
    const params = new URLSearchParams({
      type: reportType,
      date,
      ...(selectedDept ? { departmentId: selectedDept } : {}),
      ...(selectedFloor ? { floorId: selectedFloor } : {}),
    });
    window.open(`/api/reports/export/csv?${params.toString()}&token=${token}`, '_blank');
  };

  return (
    <OpsLayout activeSection="reports">
      <div className="space-y-4 font-mono">
        {/* Header */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-app-text">ENTERPRISE REPORTS &amp; EXPORT</h1>
              <p className="text-xs text-app-muted">Attendance, activity time metrics, department and floor reports with CSV export</p>
            </div>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Download size={15} />
            <span>Export to CSV</span>
          </button>
        </div>

        {/* Report Type Switcher & Filters */}
        <div className="bg-app-surface border border-app-border rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-lg border border-app-border">
            {[
              { id: 'attendance', label: 'Attendance Report' },
              { id: 'activity', label: 'Activity & Times' },
              { id: 'department', label: 'Department Report' },
              { id: 'floor', label: 'Floor Report' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  reportType === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Calendar size={13} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-900 border border-app-border rounded px-2.5 py-1 text-xs text-app-text"
              />
            </div>

            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-zinc-900 border border-app-border rounded px-2.5 py-1 text-xs text-app-text"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}

            {floors.length > 0 && (
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="bg-zinc-900 border border-app-border rounded px-2.5 py-1 text-xs text-app-text"
              >
                <option value="">All Floors</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-app-surface border border-app-border rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-12 text-center text-zinc-500 text-xs">Generating report data...</div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">No records found matching criteria.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-app-border bg-zinc-900/80 text-[10px] uppercase text-app-muted">
                    {Object.keys(reports[0]).map((col) => (
                      <th key={col} className="p-3 font-mono">
                        {col.replace(/([A-Z])/g, ' $1')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {reports.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                      {Object.keys(row).map((col) => (
                        <td key={col} className="p-3 font-mono text-zinc-300">
                          {String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </OpsLayout>
  );
}
