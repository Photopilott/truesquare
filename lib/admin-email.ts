import 'server-only';

import { ADMIN_EMAIL } from '@/lib/admin-auth';

function agentMailApiKey() {
  const direct = process.env.AGENTMAIL_API_KEY;
  if (direct) return direct;
  return Object.entries(process.env).find(
    ([name, value]) => name.endsWith('_AGENTMAIL_API_KEY') && Boolean(value),
  )?.[1];
}

export async function sendAdminOtp(otp: string) {
  const apiKey = agentMailApiKey();
  const inboxId = process.env.AGENTMAIL_INBOX_ID;
  if (!apiKey || !inboxId) {
    throw new Error('AgentMail delivery is not configured.');
  }

  const response = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [ADMIN_EMAIL],
        subject: `${otp} is your TrueSquare admin code`,
        text: `Your TrueSquare admin verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
        html: `
      <div style="font-family:Arial,sans-serif;background:#f6f1e8;padding:32px;color:#221b13">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d7cdbc;padding:32px">
          <p style="font-size:12px;letter-spacing:1.5px;margin:0 0 24px">TRUESQUARE ADMIN</p>
          <h1 style="font-size:28px;margin:0 0 16px">Your verification code</h1>
          <p style="font-size:42px;letter-spacing:8px;font-weight:700;margin:24px 0">${otp}</p>
          <p style="font-size:14px;line-height:1.6;color:#6b6258">This code expires in 10 minutes and can be used once. If you did not request it, ignore this email.</p>
        </div>
      </div>
        `,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AgentMail delivery failed (${response.status}): ${detail}`);
  }
}
