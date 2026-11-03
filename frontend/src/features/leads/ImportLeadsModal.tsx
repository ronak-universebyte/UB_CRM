import React, { useState } from 'react';
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { LeadService } from '../../services/lead.service';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalProcessed: number;
    successCount: number;
    failedRows: Array<{ row: number; mobileNumber?: string; reason: string }>;
  } | null>(null);

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const headers = [
      'studentName',
      'mobileNumber',
      'whatsappNumber',
      'email',
      'city',
      'college',
      'qualification',
      'graduationYear',
      'interestedCourse',
      'leadSource',
      'campaign',
      'budget',
      'remarks',
    ];
    const sampleRow = [
      'John Student',
      '9876501234',
      '9876501234',
      'john.student@example.com',
      'Bengaluru',
      'BMS College',
      'B.Tech',
      '2025',
      'MERN Full Stack',
      'Website',
      'DiwaliCampaign',
      '45000',
      'Interested in classroom batch',
    ];
    const csvData = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'universebyte_lead_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text || '');
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
      const obj: Record<string, any> = {};
      headers.forEach((h, index) => {
        obj[h] = values[index] || undefined;
      });
      records.push(obj);
    }
    return records;
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please choose a CSV file or paste CSV content.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedRows = parseCsv(csvText);
      if (parsedRows.length === 0) {
        setError('CSV must contain a header row and at least one data row.');
        setLoading(false);
        return;
      }

      const res = await LeadService.importLeads(parsedRows);
      setResult(res);
      if (res.successCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error processing lead import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Import Leads from CSV
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Upload a CSV file containing enquiry leads. Duplicates are rejected automatically.
          </p>
          <button
            onClick={downloadSampleTemplate}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            Sample CSV
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Results summary */}
        {result && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                Successfully imported <strong>{result.successCount}</strong> of{' '}
                <strong>{result.totalProcessed}</strong> leads.
              </span>
            </div>

            {result.failedRows.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 max-h-40 overflow-y-auto dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {result.failedRows.length} rows skipped:
                </p>
                <ul className="space-y-1 pl-4 list-disc text-[11px]">
                  {result.failedRows.map((f, i) => (
                    <li key={i}>
                      Row {f.row} {f.mobileNumber ? `(${f.mobileNumber})` : ''}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upload Drop Area */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3">
          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-slate-800/40">
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {fileName ? fileName : 'Choose CSV file to upload'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1">.csv format supported</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Or paste CSV raw content:
            </label>
            <textarea
              rows={5}
              placeholder="studentName,mobileNumber,interestedCourse,leadSource...&#10;Amit,9876543210,Python,Website"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || !csvText.trim()}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
