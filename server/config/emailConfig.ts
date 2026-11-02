export function isMockEmail(): boolean {
  return process.env.EMAIL_MODE?.trim().toLowerCase() === 'mock';
}

export function getSmtpUser(): string | undefined {
  const value = process.env.SMTP_USER?.trim();
  return value || undefined;
}

export function getSmtpPass(): string | undefined {
  const value = process.env.SMTP_PASS?.trim();
  return value || undefined;
}

export function getAppPublicUrl(): string | undefined {
  return process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, '') || undefined;
}

export function isEmailServiceConfigured(): boolean {
  if (isMockEmail()) return true;
  return Boolean(getSmtpUser() && getSmtpPass());
}

export function logEmailServiceStatus(): void {
  if (isMockEmail()) {
    console.log('Email service: mock');
    return;
  }
  if (isEmailServiceConfigured()) {
    console.log('Email service: configured');
    return;
  }

  const missing: string[] = [];
  if (!getSmtpUser()) missing.push('SMTP_USER');
  if (!getSmtpPass()) missing.push('SMTP_PASS');
  console.warn(`Email service: NOT configured - missing ${missing.join(' / ')}`);
}
