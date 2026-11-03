import {
  WhatsAppLanguage,
  WhatsAppTemplateName,
} from '../models/whatsapp-message.model';

export interface ITemplateParams {
  studentName?: string;
  course?: string;
  counsellorName?: string;
  phone?: string;
  instituteName?: string;
  date?: string;
  time?: string;
}

export interface ITemplateDefinition {
  id: WhatsAppTemplateName;
  title: string;
  description: string;
  languages: Record<WhatsAppLanguage, string>;
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateName, ITemplateDefinition> = {
  new_enquiry: {
    id: 'new_enquiry',
    title: 'New Enquiry Welcome',
    description: 'Welcome new student and introduce course syllabus and placement assistance',
    languages: {
      en: 'Hello {{studentName}}, thank you for reaching out to UniverseByte regarding {{course}}! Our senior career counsellor will guide you through the syllabus, real-time live projects, and 100% placement support. Reply to this message to get started. Best regards, {{counsellorName}}, UniverseByte – Technology Redefined.',
      hi: 'नमस्ते {{studentName}}, UniverseByte में {{course}} के लिए आपकी रुचि के लिए धन्यवाद! हमारे करियर काउंसलर आपको पूरा सिलेबस, लाइव प्रोजेक्ट्स और 100% प्लेसमेंट सहायता की जानकारी देंगे। शुरू करने के लिए हमें रिप्लाई करें। सादर, {{counsellorName}}, UniverseByte – Technology Redefined.',
      hinglish: 'Hello {{studentName}}, UniverseByte mein {{course}} ke liye enquire karne ke liye shukriya! Hamare career counsellor aapko complete syllabus, practical projects aur 100% placement support ki poori jaankari denge. Details ke liye reply karein. Regards, {{counsellorName}}, UniverseByte – Technology Redefined.',
    },
  },
  followup: {
    id: 'followup',
    title: 'Follow-up & Discussion',
    description: 'Check in with prospective student about batch timings and queries',
    languages: {
      en: 'Hi {{studentName}}, this is {{counsellorName}} from UniverseByte following up on your enquiry for {{course}}. We have limited seats in the upcoming batch. Would you be free for a quick 5-minute call today to discuss your career goals?',
      hi: 'नमस्ते {{studentName}}, मैं UniverseByte से {{counsellorName}} बात कर रहा हूँ। {{course}} के बारे में आपसे चर्चा करना चाहते हैं। आने वाले नए बैच में सीमित सीटें उपलब्ध हैं। क्या हम आज 5 मिनट बात कर सकते हैं?',
      hinglish: 'Hi {{studentName}}, main UniverseByte se {{counsellorName}}. Aapke {{course}} enquiry ke regarding follow up kar raha tha. Upcoming batch mein seats limited hain. Kya hum aaj ek quick 5-minute call schedule kar sakte hain?',
    },
  },
  counselling: {
    id: 'counselling',
    title: '1-on-1 Career Counselling',
    description: 'Invite student for personal career counselling and roadmap session',
    languages: {
      en: 'Dear {{studentName}}, take the next step in your IT career! UniverseByte invites you for a dedicated 1-on-1 Career Counselling session for {{course}}. Learn about industry demands and curriculum roadmaps. Reply with your preferred date and time to reserve your slot.',
      hi: 'प्रिय {{studentName}}, IT इंडस्ट्री में शानदार करियर बनाएं! UniverseByte आपको {{course}} के लिए फ्री 1-on-1 करियर काउंसलिंग सेशन के लिए आमंत्रित करता है। अपना स्लॉट बुक करने के लिए अपनी सुविधा अनुसार समय रिप्लाई करें।',
      hinglish: 'Dear {{studentName}}, apne IT career ko boost karein! UniverseByte aapko {{course}} ke liye ek dedicated 1-on-1 career counselling session offer kar raha hai. Industry scope samajhne ke liye apna preferred time reply karein.',
    },
  },
  demo: {
    id: 'demo',
    title: 'Live Demo Class Invitation',
    description: 'Invite prospect to experience a live practical coding demo class',
    languages: {
      en: 'Hello {{studentName}}, we are excited to invite you to a FREE Live Demo Class for {{course}} with our Senior Technical Trainer. Experience hands-on practical learning. Reply "YES" to confirm your demo attendance.',
      hi: 'नमस्ते {{studentName}}, UniverseByte में {{course}} की फ्री लाइव डेमो क्लास के लिए आपको आमंत्रित किया जाता है। हमारे सीनियर ट्रेनर से सीधे सीखें। अपनी डेमो सीट सुरक्षित करने के लिए "YES" लिखकर भेजें।',
      hinglish: 'Hello {{studentName}}, aapke liye ek exclusive FREE Live Demo Class schedule ki gayi hai for {{course}} with industry experts. Real-time practical coding experience karein. Demo seat book karne ke liye "YES" reply karein.',
    },
  },
  admission: {
    id: 'admission',
    title: 'Admission Confirmation',
    description: 'Congratulate student on confirmed admission and share orientation details',
    languages: {
      en: 'Congratulations {{studentName}}! Your admission for {{course}} at UniverseByte has been officially confirmed. Welcome to UniverseByte – Technology Redefined! Your batch schedule, student portal credentials, and orientation kit will be shared shortly.',
      hi: 'बधाई हो {{studentName}}! UniverseByte में {{course}} के लिए आपका एडमिशन कन्फर्म हो गया है। UniverseByte परिवार में आपका स्वागत है! बैच का शेड्यूल और जरूरी जानकारी जल्द साझा की जाएगी।',
      hinglish: 'Congratulations {{studentName}}! UniverseByte mein {{course}} ke liye aapka admission confirm ho gaya hai. Welcome to UniverseByte – Technology Redefined! Batch schedule aur orientation details jald share ki jayengi.',
    },
  },
  custom: {
    id: 'custom',
    title: 'Custom Message',
    description: 'Send custom composed text to student',
    languages: {
      en: 'Hello {{studentName}}, regarding your {{course}} course at UniverseByte...',
      hi: 'नमस्ते {{studentName}}, UniverseByte में आपके {{course}} कोर्स के संबंध में...',
      hinglish: 'Hello {{studentName}}, UniverseByte mein aapke {{course}} course ke regarding...',
    },
  },
};

/**
 * Format phone number to E.164 without plus sign (e.g. 919876543210)
 */
export function formatWhatsAppPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return `91${digitsOnly.slice(1)}`;
  }
  return digitsOnly;
}

/**
 * Render message template by substituting parameters
 */
export function renderWhatsAppMessage(
  templateName: WhatsAppTemplateName,
  language: WhatsAppLanguage,
  params: ITemplateParams,
  customBody?: string
): string {
  if (templateName === 'custom' && customBody) {
    return substituteParams(customBody, params);
  }

  const templateDef = WHATSAPP_TEMPLATES[templateName] || WHATSAPP_TEMPLATES.new_enquiry;
  const rawText = templateDef.languages[language] || templateDef.languages.en;

  return substituteParams(rawText, params);
}

function substituteParams(text: string, params: ITemplateParams): string {
  const student = params.studentName || 'Student';
  const course = params.course || 'IT Training Program';
  const counsellor = params.counsellorName || 'UniverseByte Team';
  const institute = params.instituteName || 'UniverseByte';

  return text
    .replace(/\{\{studentName\}\}/g, student)
    .replace(/\{\{course\}\}/g, course)
    .replace(/\{\{counsellorName\}\}/g, counsellor)
    .replace(/\{\{instituteName\}\}/g, institute)
    .replace(/\{\{date\}\}/g, params.date || 'upcoming dates')
    .replace(/\{\{time\}\}/g, params.time || 'scheduled time');
}

/**
 * Generates Click-to-WhatsApp direct web/app link
 */
export function generateClickToWhatsAppUrl(phoneNumber: string, messageText: string): string {
  const cleanPhone = formatWhatsAppPhone(phoneNumber);
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

