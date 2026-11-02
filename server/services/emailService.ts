import nodemailer from 'nodemailer';
import {
  getSmtpPass,
  getSmtpUser,
  isEmailServiceConfigured,
  isMockEmail,
} from '../config/emailConfig.js';

function formatReportDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}

function buildReviewEmailHtml(reviewUrl: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #111111; line-height: 1.5;">
      <p>Estimado/a:</p>
      <p>Se ha generado un Informe Diario de Operaciones que requiere su revisión.</p>
      <p>Se adjunta el documento en formato PDF.</p>
      <p>Para aprobar o rechazar el informe, acceda al siguiente enlace:</p>
      <p>
        <a href="${reviewUrl}" style="display: inline-block; padding: 10px 18px; background: #195a64; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Revisar informe</a>
      </p>
      <p>
        Saludos cordiales,<br />
        Área de Operaciones<br />
        RT RIOLOA - NOVANDINO
      </p>
    </div>
  `.trim();
}

function buildReviewEmailText(reviewUrl: string): string {
  return [
    'Estimado/a:',
    '',
    'Se ha generado un Informe Diario de Operaciones que requiere su revisión.',
    '',
    'Se adjunta el documento en formato PDF.',
    '',
    'Para aprobar o rechazar el informe, acceda al siguiente enlace:',
    '',
    reviewUrl,
    '',
    'Saludos cordiales,',
    'Área de Operaciones',
    'RT RIOLOA - NOVANDINO',
  ].join('\n');
}

function buildCopyEmailHtml(formattedDate: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #111111; line-height: 1.5;">
      <p>Estimados/as:</p>
      <p>
        Se adjunta, para su conocimiento, el Informe Diario de Operaciones con fecha
        <strong>${formattedDate}</strong>, enviado a revisión del supervisor.
      </p>
      <p>
        Saludos cordiales,<br />
        Área de Operaciones<br />
        RT RIOLOA - NOVANDINO
      </p>
    </div>
  `.trim();
}

function createTransporter() {
  const user = getSmtpUser();
  const pass = getSmtpPass();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

export async function verifySmtpConnection(): Promise<void> {
  if (isMockEmail() || !isEmailServiceConfigured()) return;

  const transporter = createTransporter();
  try {
    await transporter.verify();
    console.log('Email SMTP connection verified');
  } catch {
    console.warn('Email SMTP verification failed');
  }
}

interface ReportPdfAttachment {
  date: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

export interface SendReviewEmailInput extends ReportPdfAttachment {
  supervisorEmail: string;
  reviewUrl: string;
}

export interface SendCopyEmailInput extends ReportPdfAttachment {
  recipients: string[];
}

function attachmentFor(input: ReportPdfAttachment) {
  return { filename: input.pdfFilename, content: input.pdfBuffer, contentType: 'application/pdf' };
}

function getSender(): string {
  const smtpUser = getSmtpUser();
  if (!smtpUser || !getSmtpPass()) {
    throw new Error('Email service is not configured');
  }
  return `"Informe Diario de Operaciones" <${smtpUser}>`;
}

export async function sendReviewEmail(input: SendReviewEmailInput): Promise<void> {
  if (isMockEmail()) {
    console.log('Email mock: would send review request to the supervisor');
    return;
  }

  await createTransporter().sendMail({
    from: getSender(),
    to: input.supervisorEmail,
    subject: `Informe Diario de Operaciones pendiente de revisión – ${formatReportDate(input.date)}`,
    html: buildReviewEmailHtml(input.reviewUrl),
    text: buildReviewEmailText(input.reviewUrl),
    attachments: [attachmentFor(input)],
  });
}

/** Copies are a separate message: the review link must only ever reach the supervisor. */
export async function sendCopyEmail(input: SendCopyEmailInput): Promise<void> {
  if (isMockEmail()) {
    console.log(`Email mock: would send copy to ${input.recipients.length} recipient(s)`);
    return;
  }

  const formattedDate = formatReportDate(input.date);
  await createTransporter().sendMail({
    from: getSender(),
    to: input.recipients.join(', '),
    subject: `Informe Diario de Operaciones – ${formattedDate}`,
    html: buildCopyEmailHtml(formattedDate),
    attachments: [attachmentFor(input)],
  });
}
