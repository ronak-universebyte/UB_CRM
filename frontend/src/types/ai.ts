export interface IAiStatus {
  isConfigured: boolean;
  provider: string;
  model: string;
  status: string;
  features: string[];
}

export interface ILeadScore {
  score: number;
  category: 'Hot' | 'Warm' | 'Cold';
  reasons: string[];
  suggestedPriority: 'Hot' | 'Warm' | 'Cold';
  isSuggestion: true;
  disclaimer: string;
}

export interface IFollowUpAdvice {
  nextBestAction: string;
  suggestedTiming: string;
  counsellingSuggestions: string[];
  callOpeningScript: string;
  isSuggestion: true;
  disclaimer: string;
}

export interface ILeadSummary {
  summary: string;
  keyCounsellingPoints: string[];
  unansweredQuestions: string[];
  recommendedNextStep: string;
  isSuggestion: true;
  disclaimer: string;
}

export interface IGenerateAiMessagePayload {
  leadId?: string;
  studentName: string;
  course?: string;
  scenario:
    | 'new_enquiry'
    | 'followup'
    | 'counselling'
    | 'demo'
    | 'admission'
    | 'discount_offer'
    | 'urgent_reminder';
  language: 'en' | 'hi' | 'hinglish';
  tone: 'friendly' | 'professional' | 'urgent' | 'motivational';
  extraInstructions?: string;
}

export interface IGenerateAiMessageResponse {
  messageBody: string;
  tone: string;
  language: string;
  callToAction: string;
  studentName: string;
  course?: string;
  isSuggestion: true;
  disclaimer: string;
}

export interface ILostLeadAnalysis {
  totalAnalyzed: number;
  primaryObjectionCategory: string;
  driverBreakdown: Array<{ reason: string; count: number; percentage: number }>;
  remediationStrategies: string[];
  reEngagementPotential: 'High' | 'Medium' | 'Low';
  isSuggestion: true;
  disclaimer: string;
}

