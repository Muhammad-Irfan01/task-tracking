interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Outgoing email. No provider is configured, so messages are written to the
 * server log. Swap the body for Resend/SES/Postmark/etc. to send for real.
 */
export async function sendMail(message: MailMessage) {
  console.info(
    `\n📧  [mail] To: ${message.to}\n    Subject: ${message.subject}\n\n${message.text
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")}\n`,
  );
}
