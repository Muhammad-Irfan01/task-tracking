interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Outgoing email. With `RESEND_API_KEY` and `MAIL_FROM` set, messages are sent
 * through Resend; otherwise they're written to the server log.
 *
 * Never throws: callers such as forgot-password must behave identically
 * whether or not delivery works, so failures are logged and reported as
 * `false` instead.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[mail] RESEND_API_KEY / MAIL_FROM not set — email was logged, not sent");
    }
    logMail(message);
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(10_000),
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
