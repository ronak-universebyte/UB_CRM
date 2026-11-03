import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  AlertTriangle,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { WhatsAppService } from '../../services/whatsapp.service';
import {
  IWhatsAppConfigStatus,
  IWhatsAppTemplate,
  IWhatsAppMessage,
  WhatsAppMethod,
  WhatsAppStatus,
} from '../../types/whatsapp';
import { IPagination } from '../../types/auth';
import { formatDate, cn } from '../../lib/utils';

export const WhatsAppSettingsPage: React.FC = () => {
  // Config & Templates State
  const [config, setConfig] = useState<IWhatsAppConfigStatus | null>(null);
  const [templates, setTemplates] = useState<IWhatsAppTemplate[]>([]);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<string>('new_enquiry');
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'hinglish'>('en');

  // Logs State
  const [logs, setLogs] = useState<IWhatsAppMessage[]>([]);
  const [pagination, setPagination] = useState<IPagination | null>(null);
  const [page, setPage] = useState<number>(1);
  const [methodFilter, setMethodFilter] = useState<WhatsAppMethod | ''>('');
  const [statusFilter, setStatusFilter] = useState<WhatsAppStatus | ''>('');
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load Config & Templates
  const loadConfigAndTemplates = useCallback(async () => {
    try {
      const [cfg, tpls] = await Promise.all([
        WhatsAppService.getConfigStatus(),
        WhatsAppService.getTemplates(),
      ]);
      setConfig(cfg);
      setTemplates(tpls);
    } catch (err) {
      console.error('Failed to load WhatsApp configuration:', err);
    }
  }, []);

  // Load Communication Logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await WhatsAppService.listLogs({
        page,
        limit: 10,
        method: methodFilter || undefined,
        status: statusFilter || undefined,
        phoneNumber: searchPhone || undefined,
      });
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load WhatsApp logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, methodFilter, statusFilter, searchPhone]);

  useEffect(() => {
    loadConfigAndTemplates();
  }, [loadConfigAndTemplates]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentTpl = templates.find((t) => t.id === selectedTemplateTab) || templates[0];
  const fullWebhookUrl = `${window.location.origin}${config?.webhookEndpoint || '/api/v1/whatsapp/webhook'}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            UniverseByte WhatsApp Hub
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            WhatsApp Integration & Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage Click-to-WhatsApp automation, Meta Cloud API configurations, and message delivery audit logs.
          </p>
        </div>

        <button
          onClick={() => {
            loadConfigAndTemplates();
            loadLogs();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Integration Status & Credentials Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Official Meta Cloud API Status</span>
              {config?.isConfigured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active & Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Pending Configuration
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Method A (Manual Click-to-WhatsApp) is fully functional immediately. Method B (Automated Meta Cloud API) activates once credentials are supplied in backend environment.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              API Version: {config?.apiVersion || 'v21.0'}
            </span>
          </div>
        </div>

        {/* Credentials Checklist Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Meta Token */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Meta Access Token</span>
              {config?.hasToken ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-800 dark:text-slate-200">
              {config?.hasToken ? '••••••••••••••••••••' : 'Not configured'}
            </p>
            <span className="text-[10px] text-slate-400">Set via WHATSAPP_TOKEN</span>
          </div>

          {/* 2. Phone Number ID */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Phone Number ID</span>
              {config?.hasPhoneNumberId ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
              {config?.phoneNumberId || 'Not configured'}
            </p>
            <span className="text-[10px] text-slate-400">Set via WHATSAPP_PHONE_NUMBER_ID</span>
          </div>

          {/* 3. WABA ID */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Business Account ID</span>
              {config?.hasBusinessAccountId ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
              {config?.businessAccountId || 'Not configured'}
            </p>
            <span className="text-[10px] text-slate-400">Set via WHATSAPP_BUSINESS_ACCOUNT_ID</span>
          </div>

          {/* 4. Webhook Verify Token */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Webhook Verify Token</span>
              <button
                onClick={() => copyToClipboard(config?.webhookVerifyToken || '', 'verify_token')}
                className="text-blue-600 hover:text-blue-700"
                title="Copy Token"
              >
                {copiedField === 'verify_token' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
              {config?.webhookVerifyToken || 'universebyte_webhook_verify_token_2026'}
            </p>
            <span className="text-[10px] text-slate-400">For Meta App Webhook setup</span>
          </div>
        </div>

        {/* Webhook Endpoint Banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-bold text-blue-900 dark:text-blue-200">
                Meta Cloud API Webhook Callback URL
              </span>
              <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-0.5">
                Paste this URL in your Meta App Dashboard under WhatsApp &rarr; Configuration &rarr; Webhook:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded-lg bg-white px-3 py-1 font-mono text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                  {fullWebhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(fullWebhookUrl, 'webhook_url')}
                  className="rounded-lg border border-blue-300 bg-white p-1 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
                  title="Copy Webhook URL"
                >
                  {copiedField === 'webhook_url' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="shrink-0">
              <span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Subscribed fields: messages, message_deliveries
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Setup Instructions Accordion */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span>Meta WhatsApp Cloud API Configuration Guide</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="font-bold text-slate-900 dark:text-white">Step 1: Meta App</span>
            <p className="mt-1 text-[11px]">
              Go to developers.facebook.com, create a Business App and add the <strong>WhatsApp</strong> product.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="font-bold text-slate-900 dark:text-white">Step 2: Obtain IDs</span>
            <p className="mt-1 text-[11px]">
              Copy your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong> from the Getting Started tab.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="font-bold text-slate-900 dark:text-white">Step 3: System Token</span>
            <p className="mt-1 text-[11px]">
              Generate a permanent System User Token with <code>whatsapp_business_messaging</code> permissions in Business Settings.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="font-bold text-slate-900 dark:text-white">Step 4: Register Webhook</span>
            <p className="mt-1 text-[11px]">
              In WhatsApp Configuration, paste the Callback URL and Verify Token shown above, then click <strong>Verify and Save</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Pre-built Templates Library */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Personalized Template Library (English, Hindi, Hinglish)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-lingual, high-converting WhatsApp messages with dynamic lead variable interpolation.
            </p>
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setSelectedLang('en')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                selectedLang === 'en'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              )}
            >
              English
            </button>
            <button
              onClick={() => setSelectedLang('hi')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                selectedLang === 'hi'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              )}
            >
              हिंदी (Hindi)
            </button>
            <button
              onClick={() => setSelectedLang('hinglish')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                selectedLang === 'hinglish'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              )}
            >
              Hinglish
            </button>
          </div>
        </div>

        {/* Template Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 pb-2 dark:border-slate-800">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateTab(t.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition-all',
                selectedTemplateTab === t.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* Template Preview Card */}
        {currentTpl && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currentTpl.title} — {currentTpl.description}
              </span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {selectedLang.toUpperCase()}
              </span>
            </div>
            <p className="rounded-xl border border-slate-200 bg-white p-3.5 leading-relaxed text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {currentTpl.languages[selectedLang] || currentTpl.languages.en}
            </p>
          </div>
        )}
      </div>

      {/* Communication Audit Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              WhatsApp Communication History & Delivery Logs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Separated audit logs for manual Click-to-WhatsApp attempts vs official Meta delivered messages.
            </p>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by phone..."
                value={searchPhone}
                onChange={(e) => {
                  setSearchPhone(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 w-40"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Methods</option>
              <option value="manual_click">Manual Click-to-Chat</option>
              <option value="meta_api">Official Meta Cloud API</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Statuses</option>
              <option value="attempted">Attempted (Manual)</option>
              <option value="sent">Sent (Official)</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-600" />
              Loading communication records...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-xs text-slate-400">
              No WhatsApp communication logs found.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="px-3 py-2.5">Date & Time</th>
                  <th className="px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Template</th>
                  <th className="px-3 py-2.5">Method</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((m) => {
                  const isManual = m.method === 'manual_click';
                  return (
                    <tr key={m.id || m._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                        {m.studentName}
                        {m.leadId?.leadId && (
                          <span className="block font-mono text-[10px] text-blue-600 dark:text-blue-400">
                            {m.leadId.leadId}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                        {m.phoneNumber}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.templateName}
                        </span>
                        <span className="ml-1 text-[10px] text-slate-400">({m.language || 'en'})</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-bold',
                            isManual
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          )}
                        >
                          {isManual ? 'Manual Click-to-Chat' : 'Official Meta API'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {m.status === 'attempted' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> Attempted
                          </span>
                        )}
                        {m.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            <Check className="h-3 w-3" /> Sent
                          </span>
                        )}
                        {m.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCheck className="h-3 w-3" /> Delivered
                          </span>
                        )}
                        {m.status === 'read' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                            <CheckCheck className="h-3 w-3" /> Read
                          </span>
                        )}
                        {m.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                        {m.senderId?.fullName || 'System / Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
            <span className="text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40 dark:border-slate-800"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40 dark:border-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
