/** How to reach the SMTP server: the same settings in the API and the worker. */
export interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpFrom: string;
  smtpUser: string;
  smtpPassword: string;
  smtpStartTls: boolean;
}
