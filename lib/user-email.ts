import 'server-only';

import { compactInr, evidenceDate, wholeInr } from '@/lib/society-evidence';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function agentMailApiKey() {
  const direct = process.env.AGENTMAIL_API_KEY;
  if (direct) return direct;
  return Object.entries(process.env).find(
    ([name, value]) => name.endsWith('_AGENTMAIL_API_KEY') && Boolean(value),
  )?.[1];
}

export async function sendUserOtp(email: string, otp: string) {
  const apiKey = agentMailApiKey();
  const inboxId = process.env.AGENTMAIL_INBOX_ID;
  if (!apiKey || !inboxId)
    throw new Error('Email OTP delivery is not configured.');

  const response = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [email],
        subject: `${otp} is your FlatData sign-in code`,
        text: `Your FlatData verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#f6f1e8;padding:32px;color:#221b13">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d7cdbc;padding:32px">
              <p style="margin:0 0 24px"><span style="font-family:Georgia,serif;font-size:28px;letter-spacing:-1px">Flat</span><span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:-1px">Data</span></p>
              <h1 style="font-size:28px;margin:0 0 16px">Confirm your email</h1>
              <p style="font-size:42px;letter-spacing:8px;font-weight:700;margin:24px 0">${otp}</p>
              <p style="font-size:14px;line-height:1.6;color:#6b6258">This code expires in 10 minutes and can be used once. FlatData will never ask you to share this code.</p>
            </div>
          </div>
        `,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `AgentMail delivery failed (${response.status}): ${detail}`,
    );
  }
}

export async function sendContributionReviewEmail({
  email,
  society,
  status,
}: {
  email: string;
  society: string;
  status: 'approved' | 'rejected';
}) {
  const apiKey = agentMailApiKey();
  const inboxId = process.env.AGENTMAIL_INBOX_ID;
  if (!apiKey || !inboxId) {
    throw new Error('Owner notification delivery is not configured.');
  }

  const approved = status === 'approved';
  const heading = approved
    ? 'Your contribution was approved'
    : 'Your contribution was not approved';
  const body = approved
    ? `Your contribution for ${society} has been reviewed and approved. Its price now supports the public society and BHK benchmark. Your identity, email, floor, loan details, and private valuation are not published.`
    : `Your contribution for ${society} has been reviewed and was not approved for the public benchmark. Its price and your personal details are not published.`;

  const response = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [email],
        subject: `${heading} — FlatData`,
        text: `${heading}\n\n${body}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#f6f1e8;padding:32px;color:#221b13">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d7cdbc;padding:32px">
              <p style="margin:0 0 24px"><span style="font-family:Georgia,serif;font-size:28px;letter-spacing:-1px">Flat</span><span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:-1px">Data</span></p>
              <h1 style="font-size:28px;margin:0 0 16px">${heading}</h1>
              <p style="font-size:15px;line-height:1.7;color:#4e463d">${body}</p>
            </div>
          </div>
        `,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Owner notification failed (${response.status}): ${detail}`,
    );
  }
}

export async function sendSocietyPriceUpdateEmail({
  email,
  societyName,
  societySlug,
  eventType,
  medianPrice,
  latestPricePerSqFt,
  latestSalePrice,
  latestSaleDate,
  supportingSaleCount,
  publicOwnerContributionCount,
}: {
  email: string;
  societyName: string;
  societySlug: string;
  eventType: 'owner_benchmark_updated' | 'verified_transaction_updated';
  medianPrice: number | null;
  latestPricePerSqFt: number | null;
  latestSalePrice: number | null;
  latestSaleDate: string | null;
  supportingSaleCount: number;
  publicOwnerContributionCount: number;
}) {
  const apiKey = agentMailApiKey();
  const inboxId = process.env.AGENTMAIL_INBOX_ID;
  if (!apiKey || !inboxId) {
    throw new Error('Society price update delivery is not configured.');
  }

  const safeSocietyName = escapeHtml(societyName);
  const updateHeading =
    eventType === 'owner_benchmark_updated'
      ? 'New admin-approved owner pricing evidence'
      : 'New verified transaction pricing';
  const updateDetail =
    eventType === 'owner_benchmark_updated'
      ? `${publicOwnerContributionCount} admin-approved owner contributions now support the public society benchmark. Contributor identities, contact details, floor, loan details, and private valuations are not included.`
      : `FlatData has published updated registered-sale evidence for ${societyName}.`;
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.flatdata.in'
  ).replace(/\/$/, '');
  const societyUrl = `${baseUrl}/societies/${encodeURIComponent(societySlug)}`;

  const response = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [email],
        subject: `${societyName}: ${updateHeading} — FlatData`,
        text: `${updateHeading}\n\n${updateDetail}\n\n12-month median: ${compactInr(medianPrice)}\nLatest price / sq ft: ${wholeInr(latestPricePerSqFt)}\nLatest flat sold: ${compactInr(latestSalePrice)}\nLatest verified sale: ${evidenceDate(latestSaleDate)}\n12-month verified sales: ${supportingSaleCount}\n\nSee the evidence: ${societyUrl}\n\nNo spam. No calls. Your data is never sold. FlatData sends only price evidence for societies you follow. To stop updates, open the society page, sign in, and select “Stop updates.”`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#f6f1e8;padding:32px;color:#221b13">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d7cdbc;padding:32px">
              <p style="margin:0 0 24px"><span style="font-family:Georgia,serif;font-size:28px;letter-spacing:-1px">Flat</span><span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:-1px">Data</span></p>
              <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:1.4px;color:#27633a;margin:0 0 10px">PRICE EVIDENCE UPDATE</p>
              <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;margin:0 0 8px">${safeSocietyName}</h1>
              <h2 style="font-size:18px;margin:0 0 16px">${updateHeading}</h2>
              <p style="font-size:14px;line-height:1.7;color:#5e554c">${escapeHtml(updateDetail)}</p>
              <div style="background:#17120e;color:#ffffff;padding:22px;margin:24px 0">
                <p style="font-size:11px;letter-spacing:1px;color:#c9c1b8;margin:0">12-MONTH MEDIAN</p>
                <p style="font-family:Georgia,serif;font-size:34px;margin:8px 0 18px">${compactInr(medianPrice)}</p>
                <table role="presentation" style="width:100%;font-size:13px;color:#ded8d1">
                  <tr><td style="padding:6px 0">Latest / sq ft</td><td style="padding:6px 0;text-align:right;color:#ffffff">${wholeInr(latestPricePerSqFt)}</td></tr>
                  <tr><td style="padding:6px 0">Latest flat sold</td><td style="padding:6px 0;text-align:right;color:#ffffff">${compactInr(latestSalePrice)}</td></tr>
                  <tr><td style="padding:6px 0">Latest verified sale</td><td style="padding:6px 0;text-align:right;color:#ffffff">${evidenceDate(latestSaleDate)}</td></tr>
                  <tr><td style="padding:6px 0">12-month sales</td><td style="padding:6px 0;text-align:right;color:#ffffff">${supportingSaleCount}</td></tr>
                </table>
              </div>
              <a href="${societyUrl}" style="display:block;background:#17120e;color:#ffffff;text-decoration:none;text-align:center;padding:14px 18px;font-weight:700">See the latest evidence</a>
              <p style="font-size:12px;line-height:1.6;color:#6b6258;margin:22px 0 0">No spam. No calls. Your data is never sold. FlatData sends only price evidence for societies you follow. To stop updates, open this society page, sign in, and select “Stop updates.”</p>
            </div>
          </div>
        `,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Society price update failed (${response.status}): ${detail}`,
    );
  }
}
