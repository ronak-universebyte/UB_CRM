import { Types } from 'mongoose';
import { env } from '../config/env';
import {
  WhatsAppMessage,
  IWhatsAppMessageDocument,
  WhatsAppLanguage,
  WhatsAppTemplateName,
} from '../models/whatsapp-message.model';
import { Lead } from '../models/lead.model';
import {
  WHATSAPP_TEMPLATES,
  renderWhatsAppMessage,
  generateClickToWhatsAppUrl,
  formatWhatsAppPhone,
} from '../utils/whatsapp-templates';
import { ApiError } from '../utils/api-error';
import { IAuthUser } from '../types';

export interface IGenerateMessageDto {
  leadId?: string;
  studentName: string;
  phoneNumber: string;
  course?: string;
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  customBody?: string;
}

export interface IRecordAttemptDto {
  leadId?: string;
  studentName: string;
  phoneNumber: string;
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  messageBody: string;
}

export interface ISendOfficialDto {
  leadId?: string;
  studentName: string;
  phoneNumber: string;
  course?: string;
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  customBody?: string;
}

export interface IListLogsFilter {
  leadId?: string;
  phoneNumber?: string;
  method?: 'manual_click' | 'meta_api';
  status?: string;
  page?: number;
  limit?: number;
}

export class WhatsAppService {
  /**
   * 1. Get WhatsApp Meta Cloud API configuration status
   */
  static getConfigStatus() {
    const isConfigured = Boolean(
      env.WHATSAPP_TOKEN &&
        env.WHATSAPP_TOKEN.trim().length > 10 &&
        !env.WHATSAPP_TOKEN.includes('...') &&
        env.WHATSAPP_PHONE_NUMBER_ID &&
        env.WHATSAPP_PHONE_NUMBER_ID.trim().length > 3
    );

    return {
      isConfigured,
      hasToken: Boolean(env.WHATSAPP_TOKEN),
      hasPhoneNumberId: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
      hasBusinessAccountId: Boolean(env.WHATSAPP_BUSINESS_ACCOUNT_ID),
      hasWebhookVerifyToken: Boolean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || undefined,
      businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID || undefined,
      webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      webhookEndpoint: `${env.API_PREFIX}/whatsapp/webhook`,
      apiVersion: env.WHATSAPP_API_VERSION,
      mode: isConfigured ? 'Meta Official Cloud API + Manual Click' : 'Manual Click-to-WhatsApp Only (Pending Configuration)',
    };
  }

  /**
   * 2. Get All Message Templates
   */
  static getTemplates() {
    return Object.values(WHATSAPP_TEMPLATES);
  }

  /**
   * 3. Generate Personalized Message and wa.me link
   */
  static async generateMessage(dto: IGenerateMessageDto, actor: IAuthUser) {
    const templateName = dto.templateName || 'new_enquiry';
    const language = dto.language || 'en';

    let leadCourse = dto.course;
    if (dto.leadId && !leadCourse) {
      const lead = await Lead.findById(dto.leadId).select('interestedCourse');
      if (lead) leadCourse = lead.interestedCourse;
    }

    const messageBody = renderWhatsAppMessage(
      templateName,
      language,
      {
        studentName: dto.studentName,
        course: leadCourse || 'IT Training Program',
        counsellorName: actor.fullName || 'UniverseByte Counsellor',
        instituteName: 'UniverseByte',
      },
      dto.customBody
    );

    const clickToWhatsAppUrl = generateClickToWhatsAppUrl(dto.phoneNumber, messageBody);

    return {
      studentName: dto.studentName,
      phoneNumber: formatWhatsAppPhone(dto.phoneNumber),
      templateName,
      language,
      messageBody,
      clickToWhatsAppUrl,
    };
  }

  /**
   * 4. Record Manual Click-to-WhatsApp Attempt (METHOD A)
   * Records communication attempt separately from confirmed delivered messages.
   */
  static async recordManualAttempt(dto: IRecordAttemptDto, actor: IAuthUser) {
    const formattedPhone = formatWhatsAppPhone(dto.phoneNumber);

    const message = await WhatsAppMessage.create({
      leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : undefined,
      studentName: dto.studentName,
      phoneNumber: formattedPhone,
      direction: 'outbound',
      method: 'manual_click',
      type: 'template',
      templateName: dto.templateName || 'new_enquiry',
      language: dto.language || 'en',
      messageBody: dto.messageBody,
      status: 'attempted',
      statusHistory: [
        {
          status: 'attempted',
          timestamp: new Date(),
          details: 'Manual Click-to-WhatsApp link opened in chat client',
        },
      ],
      senderId: new Types.ObjectId(actor.id),
      metadata: {
        channel: 'WhatsApp Web / Mobile App',
        counsellorName: actor.fullName,
      },
    });

    // Record in lead activity log if linked to a lead
    if (dto.leadId) {
      await Lead.findByIdAndUpdate(dto.leadId, {
        $push: {
          activityHistory: {
            action: 'WHATSAPP_ATTEMPT',
            changedBy: new Types.ObjectId(actor.id),
            notes: `Opened Click-to-WhatsApp chat for ${dto.templateName || 'new enquiry'} (${dto.language || 'en'})`,
            timestamp: new Date(),
          },
        },
      });
    }

    return message;
  }

  /**
   * 5. Send Official Message via Meta WhatsApp Cloud API (METHOD B)
   */
  static async sendOfficialMetaMessage(dto: ISendOfficialDto, actor: IAuthUser) {
    const isConfigured = Boolean(
      env.WHATSAPP_TOKEN &&
        env.WHATSAPP_TOKEN.trim().length > 10 &&
        !env.WHATSAPP_TOKEN.includes('...') &&
        env.WHATSAPP_PHONE_NUMBER_ID &&
        env.WHATSAPP_PHONE_NUMBER_ID.trim().length > 3
    );

    if (!isConfigured) {
      throw ApiError.badRequest(
        'Meta WhatsApp Cloud API is not configured. Please configure WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment settings, or use manual Click-to-WhatsApp.'
      );
    }

    const templateName = dto.templateName || 'new_enquiry';
    const language = dto.language || 'en';

    let leadCourse = dto.course;
    if (dto.leadId && !leadCourse) {
      const lead = await Lead.findById(dto.leadId).select('interestedCourse');
      if (lead) leadCourse = lead.interestedCourse;
    }

    const messageBody = renderWhatsAppMessage(
      templateName,
      language,
      {
        studentName: dto.studentName,
        course: leadCourse || 'IT Training Program',
        counsellorName: actor.fullName,
        instituteName: 'UniverseByte',
      },
      dto.customBody
    );

    const recipientPhone = formatWhatsAppPhone(dto.phoneNumber);

    const metaEndpoint = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    let metaResponseData: any;

    try {
      const response = await fetch(metaEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody,
          },
        }),
      });

      metaResponseData = await response.json();

      if (!response.ok) {
        const errorMsg =
          metaResponseData?.error?.message ||
          `Meta API error (${response.status} ${response.statusText})`;
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      // Record failed message in database
      await WhatsAppMessage.create({
        leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : undefined,
        studentName: dto.studentName,
        phoneNumber: recipientPhone,
        direction: 'outbound',
        method: 'meta_api',
        type: 'template',
        templateName,
        language,
        messageBody,
        status: 'failed',
        errorMessage: err.message,
        statusHistory: [
          {
            status: 'failed',
            timestamp: new Date(),
            details: err.message,
          },
        ],
        senderId: new Types.ObjectId(actor.id),
      });

      throw ApiError.badRequest(`Failed to dispatch message via Meta Cloud API: ${err.message}`);
    }

    const wamid = metaResponseData?.messages?.[0]?.id || `wamid.local.${Date.now()}`;

    // Record official sent message
    const message = await WhatsAppMessage.create({
      leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : undefined,
      studentName: dto.studentName,
      phoneNumber: recipientPhone,
      direction: 'outbound',
      method: 'meta_api',
      type: 'template',
      templateName,
      language,
      messageBody,
      metaMessageId: wamid,
      status: 'sent',
      statusHistory: [
        {
          status: 'sent',
          timestamp: new Date(),
          details: 'Dispatched successfully via Meta WhatsApp Cloud API',
        },
      ],
      senderId: new Types.ObjectId(actor.id),
      metadata: {
        metaResponse: metaResponseData,
      },
    });

    // Record in lead activity log
    if (dto.leadId) {
      await Lead.findByIdAndUpdate(dto.leadId, {
        $push: {
          activityHistory: {
            action: 'WHATSAPP_MESSAGE_SENT',
            changedBy: new Types.ObjectId(actor.id),
            notes: `Dispatched official WhatsApp template '${templateName}' (${language}) via Meta Cloud API [${wamid}]`,
            timestamp: new Date(),
          },
        },
      });
    }

    return message;
  }

  /**
   * 6. Webhook Verification (Meta Hub Challenge)
   */
  static verifyWebhook(mode?: string, token?: string, challenge?: string) {
    if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    throw ApiError.forbidden('Invalid webhook verification token or mode');
  }

  /**
   * 7. Webhook Ingestion & Status Tracking
   */
  static async processWebhook(payload: any) {
    if (!payload?.entry || !Array.isArray(payload.entry)) {
      return { processed: false, reason: 'Invalid payload structure' };
    }

    let processedStatuses = 0;
    let processedMessages = 0;

    for (const entry of payload.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val) continue;

        // A. Handle Status Updates (sent -> delivered -> read -> failed)
        if (val.statuses && Array.isArray(val.statuses)) {
          for (const s of val.statuses) {
            const wamid = s.id;
            const newStatus = s.status; // 'sent' | 'delivered' | 'read' | 'failed'

            const msg = await WhatsAppMessage.findOne({ metaMessageId: wamid });
            if (msg) {
              // Prevent duplicate status logging
              const alreadyHasStatus = msg.statusHistory.some((h) => h.status === newStatus);
              if (!alreadyHasStatus) {
                msg.status = newStatus;
                msg.statusHistory.push({
                  status: newStatus,
                  timestamp: new Date(Number(s.timestamp) * 1000 || Date.now()),
                  details: s.errors ? JSON.stringify(s.errors) : undefined,
                });
                if (s.errors && s.errors.length > 0) {
                  msg.errorMessage = s.errors[0].message || s.errors[0].title;
                }
                await msg.save();
                processedStatuses++;

                // Record delivery in lead activity history
                if (msg.leadId && (newStatus === 'delivered' || newStatus === 'read')) {
                  await Lead.findByIdAndUpdate(msg.leadId, {
                    $push: {
                      activityHistory: {
                        action: `WHATSAPP_MESSAGE_${newStatus.toUpperCase()}`,
                        notes: `WhatsApp message was ${newStatus} on student device`,
                        timestamp: new Date(),
                      },
                    },
                  });
                }
              }
            }
          }
        }

        // B. Handle Inbound Messages from Students
        if (val.messages && Array.isArray(val.messages)) {
          for (const m of val.messages) {
            const fromPhone = formatWhatsAppPhone(m.from || '');
            const body = m.text?.body || `[${m.type} message]`;
            const wamid = m.id;

            // Prevent duplicate message processing
            const existing = await WhatsAppMessage.findOne({ metaMessageId: wamid });
            if (!existing) {
              // Try to find matching lead
              const lead = await Lead.findOne({
                $or: [
                  { mobileNumber: fromPhone.slice(-10) },
                  { whatsappNumber: fromPhone.slice(-10) },
                ],
                isDeleted: false,
              }).select('_id studentName');

              await WhatsAppMessage.create({
                leadId: lead ? lead._id : undefined,
                studentName: lead ? lead.studentName : (val.contacts?.[0]?.profile?.name || 'WhatsApp Contact'),
                phoneNumber: fromPhone,
                direction: 'inbound',
                method: 'meta_api',
                type: 'text',
                messageBody: body,
                metaMessageId: wamid,
                status: 'delivered',
                statusHistory: [
                  {
                    status: 'delivered',
                    timestamp: new Date(Number(m.timestamp) * 1000 || Date.now()),
                    details: 'Received from student via WhatsApp',
                  },
                ],
              });

              if (lead) {
                await Lead.findByIdAndUpdate(lead._id, {
                  $push: {
                    activityHistory: {
                      action: 'WHATSAPP_MESSAGE_RECEIVED',
                      notes: `Student sent WhatsApp message: "${body.slice(0, 100)}"`,
                      timestamp: new Date(),
                    },
                  },
                });
              }

              processedMessages++;
            }
          }
        }
      }
    }

    return {
      processed: true,
      processedStatuses,
      processedMessages,
    };
  }

  /**
   * 8. Get Message History for a Lead
   */
  static async getMessageHistory(leadId: string): Promise<IWhatsAppMessageDocument[]> {
    return WhatsAppMessage.find({ leadId: new Types.ObjectId(leadId) })
      .sort({ createdAt: -1 })
      .populate('senderId', 'fullName email role');
  }

  /**
   * 9. List All WhatsApp Communication Logs (with pagination & filter)
   */
  static async listLogs(filter: IListLogsFilter, actor: IAuthUser) {
    const query: Record<string, unknown> = {};

    if (filter.leadId) {
      query.leadId = new Types.ObjectId(filter.leadId);
    }
    if (filter.phoneNumber) {
      query.phoneNumber = { $regex: filter.phoneNumber.replace(/\D/g, ''), $options: 'i' };
    }
    if (filter.method) {
      query.method = filter.method;
    }
    if (filter.status) {
      query.status = filter.status;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      WhatsAppMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('leadId', 'leadId studentName interestedCourse mobileNumber')
        .populate('senderId', 'fullName email role'),
      WhatsAppMessage.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: records,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
