import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  MessageCircle,
  ExternalLink,
  Send,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Globe,
  FileText,
  History,
} from 'lucide-react';
import { WhatsAppService } from '../../services/whatsapp.service';
import { AiService } from '../../services/ai.service';
import {
  WhatsAppLanguage,
  WhatsAppTemplateName,
  IWhatsAppConfigStatus,
  IWhatsAppMessage,
} from '../../types/whatsapp';
import { formatDate, cn } from '../../lib/utils';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id?: string;
    _id?: string;
    leadId?: string;
    studentName: string;
    mobileNumber: string;
    whatsappNumber?: string;
    interestedCourse?: string;
  };
  onSuccess?: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [templateName, setTemplateName] = useState<WhatsAppTemplateName>('new_enquiry');
  const [language, setLanguage] = useState<WhatsAppLanguage>('en');
  const [messageBody, setMessageBody] = useState<string>('');
  const [customEditing, setCustomEditing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<boolean>(false);
  const [sendingOfficial, setSendingOfficial] = useState<boolean>(false);
  const [configStatus, setConfigStatus] = useState<IWhatsAppConfigStatus | null>(null);
  const [history, setHistory] = useState<IWhatsAppMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // AI Smart Compose State
  const [showAiComposer, setShowAiComposer] = useState<boolean>(false);
  const [aiTone, setAiTone] = useState<'friendly' | 'professional' | 'urgent' | 'motivational'>('friendly');
  const [aiPromptExtra, setAiPromptExtra] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const leadId = lead.id || lead._id;
  const phoneNumber = lead.whatsappNumber || lead.mobileNumber;

  // Load Config Status on Mount
  useEffect(() => {
    if (isOpen) {
      WhatsAppService.getConfigStatus()
        .then(setConfigStatus)
        .catch((err) => console.error('Failed to load WhatsApp config status', err));
    }
  }, [isOpen]);

  // Generate Message Text on Template / Language change
  const fetchGeneratedMessage = useCallback(async () => {
    if (!isOpen || customEditing) return;
    setLoadingText(true);
    try {
      const res = await WhatsAppService.generateMessage({
        leadId,
        studentName: lead.studentName,
        phoneNumber,
        course: lead.interestedCourse,
        templateName,
        language,
      });
      setMessageBody(res.messageBody);
    } catch (err) {
      console.error('Failed to generate template text:', err);
    } finally {
      setLoadingText(false);
    }
  }, [isOpen, leadId, lead.studentName, lead.interestedCourse, phoneNumber, templateName, language, customEditing]);

  useEffect(() => {
    if (!customEditing) {
      fetchGeneratedMessage();
    }
  }, [fetchGeneratedMessage, customEditing]);

  // Load Message History
  const loadLeadHistory = useCallback(async () => {
    if (!leadId) return;
    setLoadingHistory(true);
    try {
      const msgs = await WhatsAppService.getLeadMessages(leadId);
      setHistory(msgs);
    } catch (err) {
      console.error('Failed to load WhatsApp history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadLeadHistory();
    }
  }, [isOpen, activeTab, loadLeadHistory]);

  if (!isOpen) return null;

  // AI Smart Compose Handler
  const handleGenerateAiMessage = async () => {
    setLoadingAi(true);
    setAiNotice(null);
    try {
      const res = await AiService.generateAiMessage({
        leadId,
        studentName: lead.studentName,
        course: lead.interestedCourse,
        scenario: (templateName === 'custom' ? 'followup' : templateName) as any,
        language: language as 'en' | 'hi' | 'hinglish',
        tone: aiTone,
        extraInstructions: aiPromptExtra.trim() || undefined,
      });
      setMessageBody(res.messageBody);
      setCustomEditing(true);
      setAiNotice(`Drafted by Groq AI (${res.tone} tone • ${res.language.toUpperCase()})`);
    } catch (err: any) {
      console.error('Failed to generate AI message:', err);
      alert(err?.response?.data?.message || 'Could not generate AI message. Please try again.');
    } finally {
      setLoadingAi(false);
    }
  };

  // METHOD A: Open in WhatsApp & Record Manual Attempt
  const handleOpenClickToWhatsApp = async () => {
    try {
      // 1. Record Attempt in backend
      await WhatsAppService.recordAttempt({
        leadId,
        studentName: lead.studentName,
        phoneNumber,
        templateName,
        language,
        messageBody,
      });

      // 2. Open WhatsApp Web / App
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageBody)}`;
      window.open(url, '_blank');

      setStatusFeedback('Manual Click-to-WhatsApp attempt recorded successfully!');
      setTimeout(() => setStatusFeedback(null), 4000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to record manual attempt:', err);
      // Still open link even if recording fails
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(messageBody)}`, '_blank');
    }
  };

  // METHOD B: Send via Official Meta Cloud API
  const handleSendOfficial = async () => {
    if (!configStatus?.isConfigured) return;
    setSendingOfficial(true);
    try {
      await WhatsAppService.sendOfficialMessage({
        leadId,
        studentName: lead.studentName,
        phoneNumber,
        course: lead.interestedCourse,
        templateName,
        language,
        customBody: messageBody,
      });

      setStatusFeedback('Official template dispatched via Meta WhatsApp Cloud API!');
      setTimeout(() => setStatusFeedback(null), 4000);
      loadLeadHistory();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to send official message:', err);
      alert(err.response?.data?.message || err.message || 'Failed to dispatch via Meta API');
    } finally {
      setSendingOfficial(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  WhatsApp Communication
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {lead.leadId || 'Enquiry'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lead.studentName} • {phoneNumber} • {lead.interestedCourse || 'General'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-2 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('compose')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all',
              activeTab === 'compose'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Compose & Send</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all',
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <History className="h-4 w-4" />
            <span>Message History</span>
          </button>
        </div>

        {/* Feedback alert banner */}
        {statusFeedback && (
          <div className="mx-6 mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'compose' ? (
            <>
              {/* Language Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                  Select Message Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setCustomEditing(false);
                    }}
                    className={cn(
                      'rounded-xl border py-2 text-xs font-semibold transition-all',
                      language === 'en'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    English (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('hi');
                      setCustomEditing(false);
                    }}
                    className={cn(
                      'rounded-xl border py-2 text-xs font-semibold transition-all',
                      language === 'hi'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    हिंदी (Hindi)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('hinglish');
                      setCustomEditing(false);
                    }}
                    className={cn(
                      'rounded-xl border py-2 text-xs font-semibold transition-all',
                      language === 'hinglish'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    Hinglish (Chat)
                  </button>
                </div>
              </div>

              {/* Template Scenario Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Select Template Scenario
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'new_enquiry', label: 'New Enquiry' },
                      { id: 'followup', label: 'Follow-up' },
                      { id: 'counselling', label: '1-on-1 Counselling' },
                      { id: 'demo', label: 'Demo Class' },
                      { id: 'admission', label: 'Admission Confirmed' },
                      { id: 'custom', label: 'Custom Text' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTemplateName(t.id);
                        if (t.id === 'custom') setCustomEditing(true);
                        else setCustomEditing(false);
                      }}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        templateName === t.id
                          ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                          : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Smart Compose Panel */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      AI Smart Compose (Groq API)
                    </span>
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                      Llama 3.3
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiComposer(!showAiComposer)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {showAiComposer ? 'Hide AI Options' : 'Customize & Generate'}
                  </button>
                </div>

                {showAiComposer && (
                  <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/60 space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        Select Tone:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['friendly', 'professional', 'urgent', 'motivational'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setAiTone(t)}
                            className={cn(
                              'rounded-lg py-1 px-2 text-[11px] font-medium capitalize transition-all',
                              aiTone === t
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        Custom Angle / Instructions (Optional):
                      </label>
                      <input
                        type="text"
                        value={aiPromptExtra}
                        onChange={(e) => setAiPromptExtra(e.target.value)}
                        placeholder="e.g. mention weekend batch, offer 10% fee discount, emphasize job placement"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiMessage}
                      disabled={loadingAi}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                      {loadingAi ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating with Groq...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Generate AI Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Personalized Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Personalized Message Preview (Editable)
                    {aiNotice && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {aiNotice}
                      </span>
                    )}
                  </span>
                  {loadingText && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-600">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Generating...
                    </span>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={messageBody}
                  onChange={(e) => {
                    setMessageBody(e.target.value);
                    setCustomEditing(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:focus:bg-slate-900"
                  placeholder="Type message text here..."
                />
                <p className="text-[11px] text-slate-400">
                  Variables for student name, course, and counselor are automatically injected.
                </p>
              </div>

              {/* Communication Method Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                {/* METHOD A: Manual Click-to-WhatsApp */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                      <span>METHOD A: Click-to-WhatsApp</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                      Opens WhatsApp Web / Mobile directly with pre-filled personalized message. Records attempt separately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenClickToWhatsApp}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                  >
                    <span>Open in WhatsApp</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* METHOD B: Official Meta Cloud API */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300">
                        <Send className="h-4 w-4 text-blue-600" />
                        <span>METHOD B: Meta Cloud API</span>
                      </div>
                      {configStatus?.isConfigured ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Pending Config
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-400/80">
                      {configStatus?.isConfigured
                        ? 'Automated delivery via official Meta API with real-time delivery and read receipts.'
                        : 'Official credentials not configured in backend .env. Manual method is active.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!configStatus?.isConfigured || sendingOfficial}
                    onClick={handleSendOfficial}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{sendingOfficial ? 'Dispatching...' : 'Send via Meta Cloud API'}</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Timeline of WhatsApp Interactions for {lead.studentName}</span>
                <button
                  onClick={loadLeadHistory}
                  className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                >
                  <RefreshCw className={cn('h-3 w-3', loadingHistory && 'animate-spin')} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                  Loading message timeline...
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                  No WhatsApp messages recorded for this student yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((m) => {
                    const isManual = m.method === 'manual_click';
                    return (
                      <div
                        key={m.id || m._id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-bold',
                                isManual
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              )}
                            >
                              {isManual ? 'Manual Click-to-Chat' : 'Official Meta API'}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {m.templateName} ({m.language || 'en'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px]">
                            {m.status === 'attempted' && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" /> Attempted
                              </span>
                            )}
                            {m.status === 'sent' && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Check className="h-3 w-3" /> Sent
                              </span>
                            )}
                            {m.status === 'delivered' && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCheck className="h-3 w-3" /> Delivered
                              </span>
                            )}
                            {m.status === 'read' && (
                              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <CheckCheck className="h-3 w-3" /> Read
                              </span>
                            )}
                            {m.status === 'failed' && (
                              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-3 w-3" /> Failed
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="rounded-lg bg-white p-2.5 text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                          {m.messageBody}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            Counsellor: {m.senderId?.fullName || 'Assigned Staff'}
                          </span>
                          <span>{formatDate(m.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

