const express = require('express');
const { Webhook } = require('svix');
const { Resend } = require('resend');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Clerk sends raw body — must parse as raw buffer before this router
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Verify the Clerk webhook signature
  const wh = new Webhook(webhookSecret);
  let event;
  try {
    event = wh.verify(req.body, {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Only handle user creation
  if (event.type !== 'user.created') {
    return res.status(200).json({ received: true });
  }

  const { id, first_name, last_name, email_addresses } = event.data;
  const primaryEmail = email_addresses?.find(e => e.id === event.data.primary_email_address_id);
  const email = primaryEmail?.email_address;
  const firstName = first_name || 'there';
  const fullName  = [first_name, last_name].filter(Boolean).join(' ') || 'New User';

  if (!email) {
    console.warn('[Webhook] user.created has no email — skipping welcome email (userId:', id, ')');
    return res.status(200).json({ received: true });
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Ava <onboarding@resend.dev>',
      to: email,
      subject: `Welcome to MeetAva, ${firstName}!`,
      html: buildWelcomeEmail(firstName, fullName),
    });
    console.log(`[Webhook] Welcome email sent to ${email} (userId: ${id})`);
  } catch (err) {
    console.error('[Webhook] Failed to send welcome email:', err.message);
    // Don't fail the webhook — Clerk would retry on non-2xx
  }

  return res.status(200).json({ received: true });
});

function buildWelcomeEmail(firstName, fullName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to MeetAva</title>
</head>
<body style="margin:0;padding:0;background:#04040f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04040f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:linear-gradient(145deg,#0d0720,#0a0518);border-radius:24px;border:1px solid rgba(124,58,237,0.25);overflow:hidden;max-width:560px;width:100%;">

          <!-- Header gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#6d28d9,#a855f7,#ec4899);"></td>
          </tr>

          <!-- Logo / Avatar row -->
          <tr>
            <td align="center" style="padding:40px 40px 0;">
              <img src="https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png"
                alt="Ava" width="80" height="80"
                style="border-radius:50%;border:3px solid #7c3aed;display:block;" />
              <h1 style="color:#fff;font-size:28px;font-weight:900;margin:20px 0 8px;letter-spacing:-0.02em;">
                Welcome to MeetAva, ${firstName}!
              </h1>
              <p style="color:#a78bfa;font-size:15px;margin:0;">
                Your AI avatar companion is ready to chat.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Hi ${fullName},
              </p>
              <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
                You're all set! With your free MeetAva account you can:
              </p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                ${[
                  ['🎙️', 'Talk to Ava', 'Real-time voice conversations powered by Whisper + Claude'],
                  ['🎬', 'Animated Avatar', 'Lip-synced D-ID avatar that responds just like a real person'],
                  ['📜', 'Full History', 'Every conversation saved — review and revisit any time'],
                ].map(([icon, title, desc]) => `
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">${icon}</td>
                        <td>
                          <strong style="color:#e2e8f0;font-size:14px;">${title}</strong>
                          <br/>
                          <span style="color:#64748b;font-size:13px;">${desc}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'http://localhost:5173'}"
                      style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea);color:#fff;font-size:15px;font-weight:800;text-decoration:none;border-radius:14px;letter-spacing:0.01em;box-shadow:0 0 40px rgba(124,58,237,0.45);">
                      Start Chatting with Ava →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#334155;font-size:13px;line-height:1.6;margin:0;text-align:center;">
                Questions? Just reply to this email — we'd love to hear from you.
              </p>
            </td>
          </tr>

          <!-- Built by Muhib Anwar -->
          <tr>
            <td style="padding:24px 40px 0;border-top:1px solid rgba(255,255,255,0.06);">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color:#475569;font-size:12px;margin:0 0 8px;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Built by</p>
                    <p style="color:#a78bfa;font-size:15px;font-weight:800;margin:0 0 6px;letter-spacing:-0.01em;">Muhib Anwar</p>
                    <p style="color:#475569;font-size:12px;margin:0 0 12px;">Agentic AI Engineer · Karachi, Pakistan</p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="mailto:muhibanwar065@gmail.com"
                            style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);color:#a78bfa;font-size:12px;font-weight:600;text-decoration:none;">
                            ✉ muhibanwar065@gmail.com
                          </a>
                        </td>
                        <td>
                          <a href="https://www.linkedin.com/in/muhibanwar-djarian"
                            style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:rgba(10,102,194,0.1);border:1px solid rgba(10,102,194,0.3);color:#60a5fa;font-size:12px;font-weight:600;text-decoration:none;">
                            in LinkedIn
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;text-align:center;">
              <p style="color:#1e293b;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} MeetAva · You're receiving this because you signed up at MeetAva.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = router;
