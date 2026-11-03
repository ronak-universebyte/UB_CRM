import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Flame,
  Snowflake,
  SunMedium,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Clock,
  RotateCw,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { AiService } from '../../services/ai.service';
import { ILeadScore, IFollowUpAdvice, ILeadSummary } from '../../types/ai';

interface AiLeadInsightsCardProps {
  leadId: string;
}

export const AiLeadInsightsCard: React.FC<AiLeadInsightsCardProps> = ({ leadId }) => {
  const [score, setScore] = useState<ILeadScore | null>(null);
  const [advice, setAdvice] = useState<IFollowUpAdvice | null>(null);
  const [summary, setSummary] = useState<ILeadSummary | null>(null);

  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copiedScript, setCopiedScript] = useState(false);
  const [showSummarySection, setShowSummarySection] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!leadId) return;
    setLoadingInsights(true);
    setError(null);
    try {
      const [scoreRes, adviceRes] = await Promise.all([
        AiService.scoreLead(leadId),
        AiService.getFollowUpAdvice(leadId),
      ]);
      setScore(scoreRes);
      setAdvice(adviceRes);
    } catch (err: any) {
      console.error('Failed to load AI insights:', err);
      setError(
        err?.response?.data?.message || 'Could not load AI recommendations at this moment.'
      );
    } finally {
      setLoadingInsights(false);
    }
  }, [leadId]);

  const fetchSummary = async () => {
    if (!leadId) return;
    setLoadingSummary(true);
    try {
      const summaryRes = await AiService.summarizeLead(leadId);
      setSummary(summaryRes);
      setShowSummarySection(true);
    } catch (err: any) {
      console.error('Failed to load AI summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleCopyScript = (scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const getScoreColor = (category?: 'Hot' | 'Warm' | 'Cold') => {
    switch (category) {
      case 'Hot':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          border: 'border-rose-200 dark:border-rose-900',
          text: 'text-rose-700 dark:text-rose-400',
          badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
          progressBg: 'bg-gradient-to-r from-orange-500 to-rose-600',
          icon: <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        };
      case 'Warm':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-900',
          text: 'text-amber-700 dark:text-amber-400',
          badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
          progressBg: 'bg-gradient-to-r from-yellow-500 to-amber-600',
          icon: <SunMedium className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        };
      default:
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/30',
          border: 'border-sky-200 dark:border-sky-900',
          text: 'text-sky-700 dark:text-sky-400',
          badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
          progressBg: 'bg-gradient-to-r from-blue-400 to-sky-600',
          icon: <Snowflake className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        };
    }
  };

  const scoreTheme = getScoreColor(score?.category);

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-4 shadow-sm dark:border-indigo-950/60 dark:from-slate-900/90 dark:to-slate-900">
      {/* Header with Title, AI Badge, and Refresh */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100/70 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              Groq AI Assistant
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                Llama 3.3
              </span>
            </h4>
            <p className="text-[10px] text-slate-500">
              Live predictive scoring & counselling guidance
            </p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loadingInsights}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-xs disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-all"
          title="Refresh AI Insights"
        >
          <RotateCw className={`h-3 w-3 ${loadingInsights ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Advisory Banner */}
      <div className="my-2.5 flex items-center gap-1.5 rounded-lg bg-indigo-50/80 px-2.5 py-1 text-[10px] text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
        <AlertTriangle className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span>
          <strong>Advisory Only:</strong> AI recommendations are suggestions for staff discretion. Lead statuses are never modified automatically.
        </span>
      </div>

      {error && (
        <div className="my-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </div>
      )}

      {loadingInsights && !score && (
        <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-2">
          <RotateCw className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs">Analyzing lead profile & interactions with Groq AI...</p>
        </div>
      )}

      {score && (
        <div className="mt-3 space-y-3">
          {/* Lead Scoring Box */}
          <div className={`rounded-xl border ${scoreTheme.border} ${scoreTheme.bg} p-3 transition-colors`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {scoreTheme.icon}
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Conversion Score:
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${scoreTheme.badgeBg}`}>
                  {score.category} Lead ({score.score}/100)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Priority: {score.suggestedPriority}
              </span>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700">
              <div
                className={`h-full ${scoreTheme.progressBg} transition-all duration-700 rounded-full`}
                style={{ width: `${Math.min(Math.max(score.score, 5), 100)}%` }}
              />
            </div>

            {/* Key Scoring Factors / Reasons */}
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setExpandedReasons(!expandedReasons)}
                className="flex w-full items-center justify-between text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span>Scoring Factors ({score.reasons?.length || 0})</span>
                {expandedReasons ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {expandedReasons && (
                <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {score.reasons?.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Follow-up Strategy & Best Timing */}
          {advice && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Next Best Action
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Clock className="h-3 w-3" />
                  {advice.suggestedTiming}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                {advice.nextBestAction}
              </p>

              {/* Counselling Suggestions */}
              {advice.counsellingSuggestions?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Counselling Guidance:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {advice.counsellingSuggestions.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Call Opening Script */}
              {advice.callOpeningScript && (
                <div className="mt-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-semibold uppercase text-indigo-700 dark:text-indigo-300">
                      Suggested Call Opener
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyScript(advice.callOpeningScript)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Copy script"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] italic text-slate-700 dark:text-slate-300 leading-relaxed">
                    "{advice.callOpeningScript}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Executive Summary & Unanswered Questions Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/40">
            {!showSummarySection ? (
              <button
                type="button"
                onClick={fetchSummary}
                disabled={loadingSummary}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/60 hover:text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40 transition-colors"
              >
                {loadingSummary ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Synthesizing Lead History...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span>Generate AI Lead Summary & Hesitations</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    Lead Summary
                  </span>
                  <button
                    onClick={() => setShowSummarySection(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Hide
                  </button>
                </div>

                {summary && (
                  <>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {summary.summary}
                    </p>

                    {summary.unansweredQuestions?.length > 0 && (
                      <div className="rounded-lg bg-amber-50/70 p-2.5 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1 mb-1">
                          <HelpCircle className="h-3 w-3" />
                          Hesitations / Unanswered Questions:
                        </span>
                        <ul className="space-y-1 text-[11px] text-amber-900 dark:text-amber-300">
                          {summary.unansweredQuestions.map((q, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.recommendedNextStep && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-800 dark:text-slate-100">Recommended Next Step: </strong>
                        {summary.recommendedNextStep}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

