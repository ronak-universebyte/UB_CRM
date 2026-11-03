import { Types } from 'mongoose';
import { env } from '../config/env';
import { Lead } from '../models/lead.model';
import { FollowUp } from '../models/followup.model';
import { AiCache } from '../utils/ai-cache';
import { ApiError } from '../utils/api-error';
import { IAuthUser } from '../types';

export interface ILeadScoreResult {
  score: number;
  category: 'Hot' | 'Warm' | 'Cold';
  reasons: string[];
  suggestedPriority: 'Hot' | 'Warm' | 'Cold';
  isSuggestion: true;
  disclaimer: string;
}

export interface IFollowUpAdviceResult {
  nextBestAction: string;
  suggestedTiming: string;
  counsellingSuggestions: string[];
  callOpeningScript: string;
  isSuggestion: true;
  disclaimer: string;
}

export interface ILeadSummaryResult {
  summary: string;
  keyCounsellingPoints: string[];
  unansweredQuestions: string[];
  recommendedNextStep: string;
  isSuggestion: true;
  disclaimer: string;
}

export interface IGenerateAiMessageDto {
  leadId?: string;
  studentName: string;
  course?: string;
  scenario: string;
  language: 'en' | 'hi' | 'hinglish';
  tone: 'friendly' | 'professional' | 'urgent' | 'motivational';
  extraInstructions?: string;
}

export interface ILostLeadAnalysisResult {
  totalAnalyzed: number;
  primaryObjectionCategory: string;
  driverBreakdown: Array<{ reason: string; count: number; percentage: number }>;
  remediationStrategies: string[];
  reEngagementPotential: 'High' | 'Medium' | 'Low';
  isSuggestion: true;
  disclaimer: string;
}

export class AiService {
  /**
   * Get Groq AI configuration status
   */
  static getStatus() {
    const isConfigured = Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().startsWith('gsk_'));

    return {
      isConfigured,
      provider: 'Groq Cloud API',
      model: env.GROQ_MODEL,
      status: isConfigured ? 'Active & Ready' : 'Local Intelligent Heuristic Mode (Pending Groq API Key)',
      features: [
        'Lead Scoring (0-100, Hot/Warm/Cold categorization)',
        'AI Follow-up Next Best Action & Timing',
        'Multi-lingual WhatsApp Generator (Hindi, English, Hinglish)',
        'Lead Interaction Summary & Unanswered Questions',
        'Lost Lead Objections & Remediation Analysis',
      ],
    };
  }

  /**
   * Core Helper: Calls Groq API with timeout, error handling, and JSON format
   */
  private static async callGroq(
    systemPrompt: string,
    userPrompt: string,
    jsonFormat: boolean = true
  ): Promise<any> {
    if (!env.GROQ_API_KEY || !env.GROQ_API_KEY.trim().startsWith('gsk_')) {
      return null; // Signals fallback to local engine
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.GROQ_TIMEOUT_MS);

    try {
      const body: Record<string, unknown> = {
        model: env.GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      };

      if (jsonFormat) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Groq API returned error status ${res.status}:`, errText);
        return null;
      }

      const data: any = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) return null;

      return jsonFormat ? JSON.parse(content) : content;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Groq API invocation failed, falling back to local engine:', err.message);
      return null;
    }
  }

  /**
   * Data Sanitizer: Strips student PII (phone numbers, email, addresses) before sending to AI
   */
  private static sanitizeLeadContext(lead: any, followUps: any[]) {
    // Keep only first name for personalization, never full identity or contact info
    const firstName = lead.studentName ? lead.studentName.split(' ')[0] : 'Candidate';

    return {
      studentFirstName: firstName,
      interestedCourse: lead.interestedCourse || 'Not specified',
      qualification: lead.qualification || 'Not specified',
      graduationYear: lead.graduationYear || 'Not specified',
      city: lead.city || 'Not specified',
      leadSource: lead.leadSource || 'Direct',
      status: lead.status || 'New',
      priority: lead.priority || 'Warm',
      budget: lead.budget || 0,
      expectedAdmissionDate: lead.expectedAdmissionDate
        ? new Date(lead.expectedAdmissionDate).toISOString().slice(0, 10)
        : 'Immediate',
      interactionCount: followUps.length,
      recentNotes: followUps.slice(0, 5).map((f) => ({
        type: f.type,
        status: f.status,
        date: f.scheduledAt ? new Date(f.scheduledAt).toISOString().slice(0, 10) : 'Recent',
        counsellingNotes: f.counsellingNotes || f.completionRemarks || 'Interaction logged',
      })),
    };
  }

  /**
   * 1. AI Lead Scoring (0 to 100, Hot/Warm/Cold, reasons)
   */
  static async scoreLead(leadId: string, _actor: IAuthUser): Promise<ILeadScoreResult> {
    const lead = await Lead.findById(leadId);
    if (!lead || lead.isDeleted) {
      throw ApiError.notFound('Lead not found');
    }

    // Check cache
    const cacheKey = `score:${leadId}:${lead.updatedAt ? new Date(lead.updatedAt).getTime() : 'latest'}`;
    const cached = AiCache.get<ILeadScoreResult>(cacheKey);
    if (cached) return cached;

    const followUps = await FollowUp.find({ leadId: lead._id }).sort({ scheduledAt: -1 }).limit(10);
    const sanitized = this.sanitizeLeadContext(lead, followUps);

    const systemPrompt = `You are the Lead Scoring AI for UniverseByte IT Training CRM.
Analyze candidate profile, course enquiry, and interaction timeline to assign a predictive conversion score between 0 and 100.
Evaluate:
- High-intent indicators: Attended demo/counselling, clear graduation timeline, confirmed budget, frequent positive notes.
- Medium indicators: Interested but comparing institutes, requested syllabus, responded to calls.
- Low indicators: No answer, postponed dates, budget mismatch, dropped calls.

Return JSON strictly matching this structure:
{
  "score": number (0-100),
  "category": "Hot" | "Warm" | "Cold",
  "reasons": ["Reason 1", "Reason 2", "Reason 3"],
  "suggestedPriority": "Hot" | "Warm" | "Cold"
}`;

    const userPrompt = `Candidate context:\n${JSON.stringify(sanitized, null, 2)}`;

    let result = await this.callGroq(systemPrompt, userPrompt, true);

    // Heuristic Fallback Engine if Groq is unavailable
    if (!result || typeof result.score !== 'number') {
      let calcScore = 50;
      const reasons: string[] = [];

      if (['Admission Confirmed', 'Negotiation', 'Demo Scheduled', 'Counselling Scheduled'].includes(lead.status)) {
        calcScore += 30;
        reasons.push(`Advanced pipeline status (${lead.status}) indicates strong admission intent.`);
      } else if (lead.status === 'Interested') {
        calcScore += 15;
        reasons.push('Candidate showed active interest in course curriculum.');
      } else if (['Lost', 'Not Interested'].includes(lead.status)) {
        calcScore = 15;
        reasons.push(`Current status is ${lead.status}.`);
      }

      if (lead.priority === 'Hot') {
        calcScore += 15;
        reasons.push('Counselor marked priority as Hot.');
      } else if (lead.priority === 'Cold') {
        calcScore -= 15;
        reasons.push('Flagged as Cold priority with low responsiveness.');
      }

      if (followUps.some((f) => f.status === 'Completed')) {
        calcScore += 10;
        reasons.push('Candidate completed scheduled counselling follow-ups.');
      }

      calcScore = Math.max(5, Math.min(98, calcScore));
      const category: 'Hot' | 'Warm' | 'Cold' =
        calcScore >= 75 ? 'Hot' : calcScore >= 45 ? 'Warm' : 'Cold';

      result = {
        score: calcScore,
        category,
        reasons: reasons.slice(0, 3),
        suggestedPriority: category,
      };
    }

    const payload: ILeadScoreResult = {
      score: result.score,
      category: result.category,
      reasons: result.reasons || ['Evaluated based on enquiry source and pipeline history.'],
      suggestedPriority: result.suggestedPriority || result.category,
      isSuggestion: true,
      disclaimer: 'AI recommendation. Staff discretion required before taking action.',
    };

    AiCache.set(cacheKey, payload, 600);
    return payload;
  }

  /**
   * 2. AI Follow-up Assistant (Next best action, timing, counselling tips)
   */
  static async getFollowUpAdvice(leadId: string, _actor: IAuthUser): Promise<IFollowUpAdviceResult> {
    const lead = await Lead.findById(leadId);
    if (!lead || lead.isDeleted) {
      throw ApiError.notFound('Lead not found');
    }

    const cacheKey = `followup_advice:${leadId}:${lead.updatedAt ? new Date(lead.updatedAt).getTime() : 'latest'}`;
    const cached = AiCache.get<IFollowUpAdviceResult>(cacheKey);
    if (cached) return cached;

    const followUps = await FollowUp.find({ leadId: lead._id }).sort({ scheduledAt: -1 }).limit(10);
    const sanitized = this.sanitizeLeadContext(lead, followUps);

    const systemPrompt = `You are the AI Follow-up Coach for UniverseByte IT Institute counselors.
Recommend the exact next best action, optimum contact timing, and actionable counselling points to maximize conversion.
Return JSON strictly in this format:
{
  "nextBestAction": "String describing specific next action (e.g. Schedule Weekend Technical Demo)",
  "suggestedTiming": "String describing timing (e.g. Tomorrow between 4:30 PM - 6:00 PM)",
  "counsellingSuggestions": ["Point 1", "Point 2", "Point 3"],
  "callOpeningScript": "Concise natural opening greeting in Hinglish/English for counselor"
}`;

    const userPrompt = `Candidate context:\n${JSON.stringify(sanitized, null, 2)}`;
    let result = await this.callGroq(systemPrompt, userPrompt, true);

    // Heuristic Fallback
    if (!result || !result.nextBestAction) {
      result = {
        nextBestAction:
          lead.status === 'New'
            ? 'Conduct Welcome Discovery Call & Share Syllabus'
            : lead.status === 'Interested'
            ? 'Invite to Upcoming Free Technical Demo Class'
            : 'Schedule 1-on-1 Counselling with Senior Faculty',
        suggestedTiming: 'Tomorrow between 4:00 PM - 6:30 PM (optimal candidate contact window)',
        counsellingSuggestions: [
          `Highlight 100% placement track record and real-time live projects for ${lead.interestedCourse}.`,
          'Explain flexible weekday and weekend batch schedules.',
          'Discuss scholarship and installment fee payment options.',
        ],
        callOpeningScript: `Hello ${sanitized.studentFirstName}! Main UniverseByte se baat kar raha hoon regarding your inquiry for ${lead.interestedCourse}. Kya aapke paas 2 minute hain discuss karne ke liye?`,
      };
    }

    const payload: IFollowUpAdviceResult = {
      nextBestAction: result.nextBestAction,
      suggestedTiming: result.suggestedTiming,
      counsellingSuggestions: result.counsellingSuggestions || [],
      callOpeningScript: result.callOpeningScript || 'Hello! Calling from UniverseByte regarding your course inquiry.',
      isSuggestion: true,
      disclaimer: 'AI recommendation. Staff discretion required before taking action.',
    };

    AiCache.set(cacheKey, payload, 600);
    return payload;
  }

  /**
   * 3. AI WhatsApp Message Generator (Hindi, English, Hinglish)
   */
  static async generateAiMessage(dto: IGenerateAiMessageDto, actor: IAuthUser) {
    let leadCourse = dto.course;
    if (dto.leadId && !leadCourse) {
      const lead = await Lead.findById(dto.leadId).select('interestedCourse');
      if (lead) leadCourse = lead.interestedCourse;
    }

    const systemPrompt = `You are the AI WhatsApp Communication Specialist for UniverseByte (IT Training & Placement institute).
Brand tagline: "UniverseByte – Technology Redefined".
Generate high-converting, personalized WhatsApp messages.
Rules:
- Respect the requested language:
  * "en": Professional English
  * "hi": Pure Devanagari Hindi (नमस्ते, आदि)
  * "hinglish": Natural conversational Romanized Hindi/English (e.g. "Hello! Kaise hain aap? Upcoming batch mein...")
- Tone: ${dto.tone}
- Candidate Name: ${dto.studentName}
- Course: ${leadCourse || 'IT Training Program'}
- Counselor Name: ${actor.fullName || 'Career Counselor'}
- Never invent fake job guarantees; mention UniverseByte 100% placement assistance & live industry projects.

Return JSON:
{
  "messageBody": "Full rendered text of the WhatsApp message",
  "tone": "${dto.tone}",
  "language": "${dto.language}",
  "callToAction": "Expected candidate response prompt (e.g. Reply YES)"
}`;

    const userPrompt = `Scenario: ${dto.scenario}
Extra counselor instructions: ${dto.extraInstructions || 'None'}
Please generate a crisp, ready-to-send WhatsApp message.`;

    let result = await this.callGroq(systemPrompt, userPrompt, true);

    // Heuristic Fallback
    if (!result || !result.messageBody) {
      const course = leadCourse || 'Full Stack Program';
      const cName = actor.fullName || 'UniverseByte Team';

      let msg = '';
      if (dto.language === 'hi') {
        msg = `नमस्ते ${dto.studentName}, UniverseByte में ${course} के लिए आपकी रुचि के लिए धन्यवाद! हमारे आगामी बैच में सीमित सीटें उपलब्ध हैं। पूरा सिलेबस और लाइव प्रोजेक्ट्स की जानकारी के लिए हमें रिप्लाई करें। सादर, ${cName}, UniverseByte – Technology Redefined.`;
      } else if (dto.language === 'hinglish') {
        msg = `Hello ${dto.studentName}! UniverseByte mein ${course} ke upcoming batch ke liye seats fill ho rahi hain. Kya aap aaj ek quick 5-minute call schedule karna chahenge to discuss batch timings & placement roadmap? Regards, ${cName}, UniverseByte.`;
      } else {
        msg = `Hello ${dto.studentName}, thank you for your interest in ${course} at UniverseByte! We have limited seats in the upcoming cohort. Would you be free for a quick 5-minute call today to explore curriculum & placement support? Best regards, ${cName}, UniverseByte – Technology Redefined.`;
      }

      result = {
        messageBody: msg,
        tone: dto.tone,
        language: dto.language,
        callToAction: 'Reply to get batch details',
      };
    }

    return {
      ...result,
      studentName: dto.studentName,
      course: leadCourse,
      isSuggestion: true,
      disclaimer: 'AI generated message. Review or edit before sending.',
    };
  }

  /**
   * 4. AI Lead Summary (Summarizes timeline, notes, and highlights unanswered questions)
   */
  static async summarizeLead(leadId: string, _actor: IAuthUser): Promise<ILeadSummaryResult> {
    const lead = await Lead.findById(leadId);
    if (!lead || lead.isDeleted) {
      throw ApiError.notFound('Lead not found');
    }

    const cacheKey = `summary:${leadId}:${lead.updatedAt ? new Date(lead.updatedAt).getTime() : 'latest'}`;
    const cached = AiCache.get<ILeadSummaryResult>(cacheKey);
    if (cached) return cached;

    const followUps = await FollowUp.find({ leadId: lead._id }).sort({ scheduledAt: -1 }).limit(10);
    const sanitized = this.sanitizeLeadContext(lead, followUps);

    const systemPrompt = `You are the Lead Analysis AI for UniverseByte CRM.
Review candidate inquiry details and counselor interaction logs.
Provide a concise executive summary, extract key discussion points, identify any UNANSWERED questions or hesitations, and recommend the best next step.

Return JSON strictly as:
{
  "summary": "2-3 sentences summarizing candidate journey so far",
  "keyCounsellingPoints": ["Key point 1", "Key point 2"],
  "unansweredQuestions": ["Unresolved candidate doubt 1", "Unanswered query 2"],
  "recommendedNextStep": "Actionable next step for counselor"
}`;

    const userPrompt = `Candidate context:\n${JSON.stringify(sanitized, null, 2)}`;
    let result = await this.callGroq(systemPrompt, userPrompt, true);

    // Heuristic Fallback
    if (!result || !result.summary) {
      const notesTexts = sanitized.recentNotes.map((n) => n.counsellingNotes).join('; ');
      result = {
        summary: `${sanitized.studentFirstName} enquired for ${sanitized.interestedCourse} via ${sanitized.leadSource}. Current pipeline status is '${sanitized.status}' with ${sanitized.interactionCount} recorded interactions.`,
        keyCounsellingPoints: [
          `Interested in ${sanitized.interestedCourse} batch timings and practical projects.`,
          `Educational background: ${sanitized.qualification} (${sanitized.graduationYear}).`,
        ],
        unansweredQuestions: notesTexts.toLowerCase().includes('fee') || notesTexts.toLowerCase().includes('discount')
          ? ['Candidate has concerns regarding course fee installment structures.']
          : ['Specific preferred batch timing (weekday vs weekend) needs final confirmation.'],
        recommendedNextStep: `Schedule an interactive demo class to confirm enrollment for ${sanitized.interestedCourse}.`,
      };
    }

    const payload: ILeadSummaryResult = {
      summary: result.summary,
      keyCounsellingPoints: result.keyCounsellingPoints || [],
      unansweredQuestions: result.unansweredQuestions || [],
      recommendedNextStep: result.recommendedNextStep || 'Follow up with candidate.',
      isSuggestion: true,
      disclaimer: 'AI recommendation. Staff discretion required before taking action.',
    };

    AiCache.set(cacheKey, payload, 600);
    return payload;
  }

  /**
   * 5. Lost Lead Analysis (Analyzes recorded lost reasons & suggests remediation)
   */
  static async analyzeLostLeads(
    filter: { course?: string; source?: string; counsellorId?: string; limit?: number },
    _actor: IAuthUser
  ): Promise<ILostLeadAnalysisResult> {
    const match: Record<string, unknown> = {
      isDeleted: false,
      status: { $in: ['Lost', 'Not Interested'] },
    };

    if (filter.course) match.interestedCourse = filter.course;
    if (filter.source) match.leadSource = filter.source;
    if (filter.counsellorId) match.assignedCounsellor = new Types.ObjectId(filter.counsellorId);

    const lostLeads = await Lead.find(match)
      .sort({ updatedAt: -1 })
      .limit(filter.limit || 50)
      .select('interestedCourse leadSource remarks activityHistory');

    if (lostLeads.length === 0) {
      return {
        totalAnalyzed: 0,
        primaryObjectionCategory: 'No lost leads found in selected filter',
        driverBreakdown: [],
        remediationStrategies: ['Maintain proactive follow-up schedules to keep dropout rates minimal.'],
        reEngagementPotential: 'Low',
        isSuggestion: true,
        disclaimer: 'AI recommendation. Staff discretion required before taking action.',
      };
    }

    // Extract loss reasons & remarks
    const remarksSample = lostLeads.map((l) => ({
      course: l.interestedCourse,
      source: l.leadSource,
      remarks: l.remarks || 'No remarks provided',
    }));

    const systemPrompt = `You are the Lead Dropout & Churn Analytics AI for UniverseByte IT Institute.
Analyze the provided sample of lost lead remarks and dropouts.
Categorize the primary objections (e.g. Fees/Budget, Timing Mismatch, Location/Online preference, Already Joined Elsewhere, Not Interested).
Identify key drivers with counts, suggest concrete institute-level remediation strategies, and estimate re-engagement potential.

Return JSON strictly matching:
{
  "primaryObjectionCategory": "String (e.g. Course Fee & Financial Constraints)",
  "driverBreakdown": [
    { "reason": "High Fees / Budget Issue", "count": 12, "percentage": 40 },
    { "reason": "Timing / Work Conflict", "count": 8, "percentage": 26 }
  ],
  "remediationStrategies": [
    "Strategy 1 (e.g. Introduce No-Cost EMI loan options)",
    "Strategy 2 (e.g. Launch Flexible Weekend Self-Paced cohorts)"
  ],
  "reEngagementPotential": "High" | "Medium" | "Low"
}`;

    const userPrompt = `Sample of ${remarksSample.length} lost leads:\n${JSON.stringify(remarksSample.slice(0, 30), null, 2)}`;
    let result = await this.callGroq(systemPrompt, userPrompt, true);

    // Heuristic Fallback
    if (!result || !result.primaryObjectionCategory) {
      const counts: Record<string, number> = {
        'Fees / Budget Constraints': 0,
        'Batch Timing & Schedule Conflict': 0,
        'Joined Competitor / Other Institute': 0,
        'Personal / Academic Exam Delays': 0,
        'Unresponsive / Not Interested': 0,
      };

      for (const l of lostLeads) {
        const text = (l.remarks || '').toLowerCase();
        if (text.includes('fee') || text.includes('expensive') || text.includes('budget') || text.includes('cost')) {
          counts['Fees / Budget Constraints']++;
        } else if (text.includes('time') || text.includes('timing') || text.includes('evening') || text.includes('weekend') || text.includes('schedule')) {
          counts['Batch Timing & Schedule Conflict']++;
        } else if (text.includes('other') || text.includes('joined') || text.includes('competitor')) {
          counts['Joined Competitor / Other Institute']++;
        } else if (text.includes('exam') || text.includes('college') || text.includes('semester')) {
          counts['Personal / Academic Exam Delays']++;
        } else {
          counts['Unresponsive / Not Interested']++;
        }
      }

      const total = lostLeads.length;
      const breakdown = Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count);

      const topCategory = breakdown[0]?.reason || 'Diverse Objections';

      result = {
        primaryObjectionCategory: topCategory,
        driverBreakdown: breakdown,
        remediationStrategies: [
          'Introduce flexible multi-installment fee schedules and early bird registration concessions.',
          'Provide recorded live lectures and weekend cohorts for working professionals.',
          'Implement a 30-day re-engagement broadcast with special workshop passes.',
        ],
        reEngagementPotential: 'Medium',
      };
    }

    return {
      totalAnalyzed: lostLeads.length,
      primaryObjectionCategory: result.primaryObjectionCategory,
      driverBreakdown: result.driverBreakdown || [],
      remediationStrategies: result.remediationStrategies || [],
      reEngagementPotential: result.reEngagementPotential || 'Medium',
      isSuggestion: true,
      disclaimer: 'AI recommendation. Staff discretion required before taking action.',
    };
  }
}
