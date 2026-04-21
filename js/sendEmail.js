const nodemailer = require('nodemailer');

// ─────────────────────────────────────────
// TRANSPORTER (SMTP via Gmail or any provider)
// ─────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Gmail: use App Password, not account password
    },
  });
};

// ─────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────
const templates = {
  welcome: (data) => ({
    subject: 'Welcome to DecodeFXGroup 🎓',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0d1630;padding:32px;text-align:center;border-radius:6px 6px 0 0">
          <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:1px">DecodeFX<span style="color:#fff">Group</span></h1>
          <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:6px;letter-spacing:.1em">ELITE FOREX ACADEMY</p>
        </div>
        <div style="background:#f5f0e8;padding:36px 32px">
          <h2 style="color:#1a1f35;font-size:24px">Welcome, ${data.name} 👋</h2>
          <p style="color:#4b5563;line-height:1.75;font-size:15px">
            Your DecodeFXGroup account has been created. You're now part of an elite community of serious African traders.
          </p>
          <p style="color:#4b5563;line-height:1.75;font-size:15px">
            To get started with your course or signals, visit your dashboard and complete your enrollment payment.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${process.env.FRONTEND_URL}/enquiries.html"
               style="background:linear-gradient(135deg,#c9a84c,#a07c2e);color:#1a1f35;padding:14px 36px;border-radius:3px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase">
              🎓 Complete Enrollment
            </a>
          </div>
          <hr style="border:none;border-top:1px solid rgba(201,168,76,0.2);margin:24px 0">
          <p style="color:#6b7280;font-size:13px;line-height:1.6">
            Questions? Reach us on <a href="https://wa.me/2348173133453" style="color:#a07c2e">WhatsApp</a> or
            <a href="https://t.me/decodefxgroup" style="color:#a07c2e">Telegram</a>.
          </p>
        </div>
        <div style="background:#1a1f35;padding:16px 32px;border-radius:0 0 6px 6px;text-align:center">
          <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;line-height:1.6">
            © 2025 DecodeFXGroup · Risk Disclaimer: Forex trading involves significant risk of loss.
          </p>
        </div>
      </div>
    `,
  }),

  payment_confirmed: (data) => ({
    subject: `Payment Confirmed — ${data.plan} ✅`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0d1630;padding:32px;text-align:center;border-radius:6px 6px 0 0">
          <h1 style="color:#c9a84c;margin:0;font-size:28px">DecodeFX<span style="color:#fff">Group</span></h1>
        </div>
        <div style="background:#f5f0e8;padding:36px 32px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="width:64px;height:64px;background:rgba(76,175,138,0.15);border:2px solid rgba(76,175,138,0.4);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">✅</div>
          </div>
          <h2 style="color:#1a1f35;font-size:24px;text-align:center">Payment Confirmed!</h2>
          <p style="color:#4b5563;line-height:1.75;font-size:15px;text-align:center">
            Hi ${data.name}, your payment has been verified and your access is now active.
          </p>
          <div style="background:#fff;border:1px solid rgba(201,168,76,0.2);border-radius:6px;padding:20px 24px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr style="border-bottom:1px solid rgba(0,0,0,0.06)">
                <td style="padding:10px 0;color:#6b7280;font-size:13px">Plan</td>
                <td style="padding:10px 0;font-weight:600;text-align:right">${data.plan}</td>
              </tr>
              <tr style="border-bottom:1px solid rgba(0,0,0,0.06)">
                <td style="padding:10px 0;color:#6b7280;font-size:13px">Amount Paid</td>
                <td style="padding:10px 0;font-weight:600;text-align:right">${data.amount}</td>
              </tr>
              <tr style="border-bottom:1px solid rgba(0,0,0,0.06)">
                <td style="padding:10px 0;color:#6b7280;font-size:13px">Reference</td>
                <td style="padding:10px 0;font-family:monospace;font-size:12px;text-align:right">${data.reference}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#6b7280;font-size:13px">Access Until</td>
                <td style="padding:10px 0;font-weight:600;color:#a07c2e;text-align:right">${data.expiresAt}</td>
              </tr>
            </table>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="${process.env.FRONTEND_URL}/dashboard.html"
               style="background:linear-gradient(135deg,#c9a84c,#a07c2e);color:#1a1f35;padding:14px 36px;border-radius:3px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase">
              Access Dashboard →
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;text-align:center">
            Join the Telegram channel: <a href="https://t.me/decodefxgroup" style="color:#a07c2e">@decodefxgroup</a>
          </p>
        </div>
        <div style="background:#1a1f35;padding:16px 32px;border-radius:0 0 6px 6px;text-align:center">
          <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0">© 2025 DecodeFXGroup · All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  renewal_reminder: (data) => ({
    subject: `⏰ Your ${data.plan} expires in ${data.daysLeft} days`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0d1630;padding:32px;text-align:center;border-radius:6px 6px 0 0">
          <h1 style="color:#c9a84c;margin:0;font-size:28px">DecodeFX<span style="color:#fff">Group</span></h1>
        </div>
        <div style="background:#f5f0e8;padding:36px 32px">
          <h2 style="color:#1a1f35;font-size:22px">Hi ${data.name} — time to renew 🔔</h2>
          <p style="color:#4b5563;line-height:1.75;font-size:15px">
            Your <strong>${data.plan}</strong> subscription expires in <strong>${data.daysLeft} days</strong> on ${data.expiresAt}.
          </p>
          <p style="color:#4b5563;line-height:1.75;font-size:15px">
            Renew now to keep uninterrupted access to signals and the community.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${process.env.FRONTEND_URL}/account.html"
               style="background:linear-gradient(135deg,#c9a84c,#a07c2e);color:#1a1f35;padding:14px 36px;border-radius:3px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase">
              Renew Subscription →
            </a>
          </div>
        </div>
        <div style="background:#1a1f35;padding:16px 32px;border-radius:0 0 6px 6px;text-align:center">
          <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0">© 2025 DecodeFXGroup</p>
        </div>
      </div>
    `,
  }),

  admin_crypto_pending: (data) => ({
    subject: `🔔 Crypto Payment Pending — ${data.userName} (${data.plan})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f35">Crypto Payment Pending Verification</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Name</td><td style="padding:8px 0;font-weight:600">${data.userName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:8px 0">${data.userEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Plan</td><td style="padding:8px 0;font-weight:600">${data.plan}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Amount</td><td style="padding:8px 0">${data.amount}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">TxHash</td><td style="padding:8px 0;font-family:monospace;font-size:12px;word-break:break-all">${data.txHash}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Sub ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${data.subId}</td></tr>
        </table>
        <p style="margin-top:20px;color:#4b5563">Manually activate via: <code>POST /api/payments/manual-activate</code></p>
      </div>
    `,
  }),
};

// ─────────────────────────────────────────
// MAIN SEND FUNCTION
// Options: { to, subject?, template?, data?, html? }
// ─────────────────────────────────────────
const sendEmail = async ({ to, subject, template, data = {}, html }) => {
  // Skip if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured — email not sent to:', to);
    return;
  }

  const transporter = createTransporter();

  let emailHtml  = html;
  let emailSubject = subject;

  // Use template if provided
  if (template && templates[template]) {
    const rendered = templates[template](data);
    emailHtml    = rendered.html;
    emailSubject = subject || rendered.subject;
  }

  const mailOptions = {
    from:    `"DecodeFXGroup" <${process.env.SMTP_USER}>`,
    to,
    subject: emailSubject,
    html:    emailHtml,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
};

module.exports = sendEmail;
