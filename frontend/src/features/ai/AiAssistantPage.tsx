import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Bot,
  Brain,
  TrendingDown,
  ShieldCheck,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { AiService } from '../../services/ai.service';
import {
  IAiStatus,
  ILostLeadAnalysis,
  IGenerateAiMessagePayload,
  IGenerateAiMessageResponse,
} from '../../types/ai';
import { cn } from '../../lib/utils';

export const AiAssistantPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lost-analysis' | 'message-generator' | 'governance'>('lost-analysis');

  // AI Status
  const [aiStatus, setAiStatus] = useState<IAiStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);

  // Lost Leads Analytics State
  const [lostAnalysis, setLostAnalysis] = useState<ILostLeadAnalysis | null>(null);
  const [loadingLostAnalysis, setLoadingLostAnalysis] = useState<boolean>(false);
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [limitFilter, setLimitFilter] = useState<number>(50);

  // Message Generator State
  const [generatorPayload, setGeneratorPayload] = useState<IGenerateAiMessagePayload>({
    studentName: 'Rahul Sharma',
    course: 'MERN Full Stack',
    scenario: 'followup',
    language: 'en',
    tone: 'friendly',
    extraInstructions: '',
  });
  const [generatedMessage, setGeneratedMessage] = useState<IGenerateAiMessageResponse | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<boolean>(false);
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);

  // Load System AI Status
  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const st = await AiService.getStatus();
      setAiStatus(st);
    } catch (err) {
      console.error('Failed to load AI status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Run Lost Lead Analysis
  const runLostAnalysis = useCallback(async () => {
    setLoadingLostAnalysis(true);
    try {
      const res = await AiService.analyzeLostLeads({
        course: courseFilter || undefined,
        source: sourceFilter || undefined,
        limit: limitFilter,
      });
      setLostAnalysis(res);
    } catch (err) {
      console.error('Failed to run lost leads analysis:', err);
    } finally {
      setLoadingLostAnalysis(false);
    }
  }, [courseFilter, sourceFilter, limitFilter]);

  useEffect(() => {
    loadStatus();
    runLostAnalysis();
  }, [loadStatus, runLostAnalysis]);

  // Generate Message Handler
  const handleGenerateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatorPayload.studentName) return;
    setLoadingMessage(true);
    try {
      const res = await AiService.generateAiMessage(generatorPayload);
      setGeneratedMessage(res);
    } catch (err: any) {
      console.error('Failed to generate message:', err);
      alert(err?.response?.data?.message || 'Error generating AI message');
    } finally {
      setLoadingMessage(false);
    }
  };

  const handleCopyMessage = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage.messageBody);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const courseOptions = [
    'MERN Full Stack',
    'Python',
    'Python with AI',
    'Java',
    'React JS',
    'Node JS',
    'PHP & Laravel',
    'Frontend',
    'Backend',
    'Data Science',
    'AI/ML',
    'Digital Marketing',
    'WordPress',
  ];

  const sourceOptions = [
    'Website',
    'WhatsApp',
    'Google Ads',
    'Facebook Ads',
    'Instagram',
    'Phone Call',
    'Walk-in',
    'Referral',
    'Justdial',
    'Other',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-indigo-300 animate-pulse" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                UniverseByte AI CRM Assistant
              </h1>
              <span className="rounded-full bg-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                Groq API
              </span>
            </div>
            <p className="text-xs text-indigo-200/90 md:text-sm max-w-2xl leading-relaxed">
              Predictive lead scoring, intelligent counselling scripts, multilingual WhatsApp communication & automated conversion drop-off analysis.
            </p>
          </div>

          {/* Engine Status Pill */}
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-md border border-white/15">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-xs">
              <div className="font-semibold text-white">
                {loadingStatus ? 'Checking AI Engine...' : aiStatus?.isConfigured ? 'Groq Cloud Engine Active' : 'Intelligent Rule Engine'}
              </div>
              <div className="text-[11px] text-indigo-200">
                Model: {aiStatus?.model || 'llama-3.3-70b-versatile'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Notice Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">AI Governance & Privacy Directives</p>
          <p className="text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
            All AI outputs are strictly advisory for staff discretion. The CRM never mutates lead pipeline statuses automatically. Student phone numbers, email addresses, and locations are strictly sanitized and never transmitted to external AI APIs.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('lost-analysis')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-all',
            activeTab === 'lost-analysis'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <TrendingDown className="h-4 w-4" />
          <span>Lost Leads Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab('message-generator')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-all',
            activeTab === 'message-generator'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Multilingual WhatsApp Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-all',
            activeTab === 'governance'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>AI Architecture & Privacy</span>
        </button>
      </div>

      {/* TAB 1: Lost Leads Intelligence */}
      {activeTab === 'lost-analysis' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Course Filter
                </label>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All Courses</option>
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Lead Source Filter
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All Sources</option>
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Sample Size
                </label>
                <select
                  value={limitFilter}
                  onChange={(e) => setLimitFilter(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value={20}>Last 20 Lost Leads</option>
                  <option value={50}>Last 50 Lost Leads</option>
                  <option value={100}>Last 100 Lost Leads</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={runLostAnalysis}
                  disabled={loadingLostAnalysis}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingLostAnalysis ? 'animate-spin' : ''}`} />
                  <span>{loadingLostAnalysis ? 'Analyzing...' : 'Run Intelligence Analysis'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {lostAnalysis && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dropped Leads Analyzed
                  </span>
                  <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {lostAnalysis.totalAnalyzed}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Historical lost & dropped inquiries
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Primary Conversion Blocker
                  </span>
                  <div className="mt-1 text-base font-bold text-rose-600 dark:text-rose-400 truncate">
                    {lostAnalysis.primaryObjectionCategory}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Most frequent reason cited by candidates
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Re-Engagement Opportunity
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-bold',
                        lostAnalysis.reEngagementPotential === 'High'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : lostAnalysis.reEngagementPotential === 'Medium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {lostAnalysis.reEngagementPotential} Potential
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Suitability for future recovery campaigns
                  </p>
                </div>
              </div>

              {/* Grid: Objection Breakdown & Remediation Strategies */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Driver Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Objection & Dropout Breakdown
                      </h3>
                    </div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Share of Lost Leads
                    </span>
                  </div>

                  <div className="space-y-3">
                    {lostAnalysis.driverBreakdown.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                          <span className="truncate max-w-[70%]">{item.reason}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.count} leads ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Remediation Strategies */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        AI Remediation Action Plan
                      </h3>
                    </div>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Groq Strategy
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {lostAnalysis.remediationStrategies.map((strategy, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{strategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Multilingual WhatsApp Message Generator */}
      {activeTab === 'message-generator' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Input Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Configure AI Message Parameters
              </h3>
              <p className="text-[11px] text-slate-500">
                Generate high-converting communication tailored to the candidate's stage and tone.
              </p>
            </div>

            <form onSubmit={handleGenerateMessage} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  required
                  value={generatorPayload.studentName}
                  onChange={(e) =>
                    setGeneratorPayload({ ...generatorPayload, studentName: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Interested Course
                </label>
                <select
                  value={generatorPayload.course || ''}
                  onChange={(e) =>
                    setGeneratorPayload({ ...generatorPayload, course: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Scenario / Stage
                  </label>
                  <select
                    value={generatorPayload.scenario}
                    onChange={(e) =>
                      setGeneratorPayload({
                        ...generatorPayload,
                        scenario: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="new_enquiry">New Enquiry</option>
                    <option value="followup">Follow-up</option>
                    <option value="counselling">1-on-1 Counselling</option>
                    <option value="demo">Demo Class</option>
                    <option value="admission">Admission Confirmed</option>
                    <option value="discount_offer">Special Fee Discount</option>
                    <option value="urgent_reminder">Urgent Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Language
                  </label>
                  <select
                    value={generatorPayload.language}
                    onChange={(e) =>
                      setGeneratorPayload({
                        ...generatorPayload,
                        language: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="en">English (Professional)</option>
                    <option value="hi">हिंदी (Devanagari)</option>
                    <option value="hinglish">Hinglish (Conversational)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Communication Tone
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['friendly', 'professional', 'urgent', 'motivational'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setGeneratorPayload({ ...generatorPayload, tone: t })}
                      className={cn(
                        'rounded-lg py-1.5 text-xs font-semibold capitalize transition-all border',
                        generatorPayload.tone === t
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Extra Specific Details / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={generatorPayload.extraInstructions || ''}
                  onChange={(e) =>
                    setGeneratorPayload({
                      ...generatorPayload,
                      extraInstructions: e.target.value,
                    })
                  }
                  placeholder="e.g. mention Saturday demo at 11 AM, 15% scholarship valid till tomorrow"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={loadingMessage}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {loadingMessage ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generating with Groq API...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Personalized WhatsApp Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Message Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Generated WhatsApp Message Preview
                  </h3>
                </div>
                {generatedMessage && (
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {generatedMessage ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Tone: {generatedMessage.tone}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Language: {generatedMessage.language}
                    </span>
                  </div>

                  {/* WhatsApp Chat Bubble Look */}
                  <div className="rounded-2xl rounded-tl-none border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      {generatedMessage.messageBody}
                    </p>
                  </div>

                  {generatedMessage.callToAction && (
                    <div className="text-[11px] text-slate-500">
                      <strong className="text-slate-700 dark:text-slate-300">Call to Action: </strong>
                      {generatedMessage.callToAction}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
                  <Sparkles className="h-8 w-8 text-indigo-300" />
                  <p className="text-xs">
                    Configure options on the left and click "Generate Personalized WhatsApp Message".
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Advisory Notice: Staff review recommended prior to dispatching messages.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI Architecture & Privacy */}
      {activeTab === 'governance' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                PII Privacy Safeguards
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Minimization:</strong> Phone numbers, email addresses, and home addresses are completely stripped before calling Groq API.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Anonymized Context:</strong> Only academic background, inquired course, and interaction timestamps are passed for lead conversion predictions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Server-side Exclusivity:</strong> All API keys are securely stored in server environment variables and never exposed to the frontend.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Brain className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Engine & Cache Architecture
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Llama 3.3 70B:</strong> High-speed token generation using Groq's LPU inference hardware.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>In-Memory TTL Caching:</strong> Lead scores and summaries are cached keyed by lead ID and update timestamp, preventing redundant LLM requests.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Intelligent Fallback:</strong> If external connectivity is interrupted, the CRM seamlessly activates a local domain rule engine.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
