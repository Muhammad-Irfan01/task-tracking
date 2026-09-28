import nodemailer from "nodemailer";

interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/**
 * Outgoing email, through the first provider that's configured:
 *
 * 1. SMTP (`SMTP_USER` + `SMTP_PASS`) via Nodemailer — defaults to Gmail, so a
 *    Gmail address and an App Password are enough. `SMTP_HOST` / `SMTP_PORT`
 *    point it at any other SMTP server.
 * 2. Resend (`RESEND_API_KEY` + `MAIL_FROM`).
 * 3. Otherwise the message is written to the server log.
 *
 * Never throws: callers such as forgot-password must behave identically
 * whether or not delivery works, so failures are logged and reported as
 * `false` instead.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return sendSmtp(message);
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) return sendResend(message);

  if (process.env.NODE_ENV === "production") {
    console.warn("[mail] No email provider configured (SMTP_USER/SMTP_PASS or RESEND_API_KEY/MAIL_FROM) — email was logged, not sent");
  }
  logMail(message);
  return false;
}

async function sendSmtp(message: MailMessage) {
  const user = process.env.SMTP_USER!;
  const port = Number(process.env.SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    // 465 is TLS from the start; 587 upgrades with STARTTLS.
    secure: port === 465,
    // Gmail shows App Passwords in groups of four; the spaces aren't part of it.
    auth: { user, pass: process.env.SMTP_PASS!.replace(/\s+/g, "") },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });

  try {
    await transport.sendMail({
      // Gmail rewrites any other sender to the signed-in account, so default to it.
      from: process.env.SMTP_FROM || `Support Desk <${user}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return true;
  } catch (error) {
    console.error(`[mail] SMTP could not send "${message.subject}":`, error instanceof Error ? error.message : error);
    return false;
  } finally {
    transport.close();
  }
}

async function sendResend(message: MailMessage) {
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[mail] Resend rejected "${message.subject}" (${response.status}): ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[mail] Could not reach Resend for "${message.subject}"`, error);
    return false;
  }
}

function logMail(message: MailMessage) {
  console.info(
    `\n📧  [mail] To: ${message.to}\n    Subject: ${message.subject}\n\n${message.text
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")}\n`,
  );
}
