export type WhatsAppMethod = 'manual_click' | 'meta_api';
export type WhatsAppDirection = 'outbound' | 'inbound';
export type WhatsAppLanguage = 'en' | 'hi' | 'hinglish';
export type WhatsAppTemplateName =
  | 'new_enquiry'
  | 'followup'
  | 'counselling'
  | 'demo'
  | 'admission'
  | 'custom';

export type WhatsAppStatus =
  | 'attempted'
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface IWhatsAppConfigStatus {
  isConfigured: boolean;
  hasToken: boolean;
  hasPhoneNumberId: boolean;
  hasBusinessAccountId: boolean;
  hasWebhookVerifyToken: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookVerifyToken: string;
  webhookEndpoint: string;
  apiVersion: string;
  mode: string;
}

export interface IWhatsAppTemplate {
  id: WhatsAppTemplateName;
  title: string;
  description: string;
  languages: Record<WhatsAppLanguage, string>;
}

export interface IWhatsAppStatusHistory {
  status: WhatsAppStatus;
  timestamp: string;
  details?: string;
}

export interface IWhatsAppMessage {
  id: string;
  _id?: string;
  leadId?: {
    id: string;
    leadId: string;
    studentName: string;
    interestedCourse: string;
    mobileNumber: string;
  };
  studentName: string;
  phoneNumber: string;
  direction: WhatsAppDirection;
  method: WhatsAppMethod;
  type: 'template' | 'text' | 'interactive';
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  messageBody: string;
  metaMessageId?: string;
  status: WhatsAppStatus;
  statusHistory: IWhatsAppStatusHistory[];
  errorMessage?: string;
  senderId?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IGenerateMessagePayload {
  leadId?: string;
  studentName: string;
  phoneNumber: string;
  course?: string;
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  customBody?: string;
}

export interface IGenerateMessageResponse {
  studentName: string;
  phoneNumber: string;
  templateName: WhatsAppTemplateName;
  language: WhatsAppLanguage;
  messageBody: string;
  clickToWhatsAppUrl: string;
}

export interface IRecordAttemptPayload {
  leadId?: string;
  studentName: string;
  phoneNumber: string;
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  messageBody: string;
}

export interface ISendOfficialPayload {
  leadId?: string;
  studentName: string;
  phoneNumber: string;
  course?: string;
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  customBody?: string;
}

export interface IWhatsAppLogsFilter {
  leadId?: string;
  phoneNumber?: string;
  method?: WhatsAppMethod;
  status?: WhatsAppStatus;
  page?: number;
  limit?: number;
}

