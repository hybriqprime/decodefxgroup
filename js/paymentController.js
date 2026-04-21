const axios        = require('axios');
const User         = require('../models/User');
const Subscription = require('../models/Subscription');
const sendEmail    = require('../utils/sendEmail');

// ─────────────────────────────────────────
// EXCHANGE RATE (update periodically or wire to live API)
// ─────────────────────────────────────────
const NGN_PER_USD = parseInt(process.env.NGN_PER_USD || '1600', 10);

// ─────────────────────────────────────────
// HELPER: create or renew subscription after verified payment
// ─────────────────────────────────────────
const activateSubscription = async ({ userId, plan, amountUSD, amountNGN, paymentMethod, paymentReference }) => {
  const config = Subscription.planConfig(plan);
  if (!config) throw new Error(`Unknown plan: ${plan}`);

  const now       = new Date();
  const expiresAt = config.durationDays
    ? new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000)
    : null; // null = lifetime (academy)

  // Deactivate any existing subscription for this user (prevents duplicate actives)
  await Subscription.updateMany({ user: userId, isActive: true }, { isActive: false });

  // Create new subscription
  const subscription = await Subscription.create({
    user:             userId,
    plan,
    amountUSD,
    amountNGN,
    startedAt:        now,
    expiresAt,
    paymentMethod,
    paymentReference,
    paymentVerified:  true,
    paymentVerifiedAt: now,
    isActive:         true,
  });

  // Mark user as enrolled if it's the academy plan
  if (plan === 'academy') {
    await User.findByIdAndUpdate(userId, {
      isEnrolled: true,
      enrolledAt: now,
    });
  }

  return subscription;
};

// ─────────────────────────────────────────
// POST /api/payments/verify-paystack   (protected)
// Body: { reference, plan }
// ─────────────────────────────────────────
exports.verifyPaystack = async (req, res) => {
  try {
    const { reference, plan } = req.body;

    if (!reference || !plan) {
      return res.status(400).json({ success: false, message: 'reference and plan are required.' });
    }

    const config = Subscription.planConfig(plan);
    if (!config) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    // 1. Verify with Paystack API (server-side — cannot be spoofed)
    let paystackData;
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          timeout: 10000,
        }
      );
      paystackData = response.data;
    } catch (err) {
      console.error('Paystack API error:', err.response?.data || err.message);
      return res.status(502).json({ success: false, message: 'Could not reach Paystack. Please contact support.' });
    }

    // 2. Check transaction status
    if (paystackData.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment was not successful. Please try again.' });
    }

    // 3. Verify amount paid matches expected (allow ±1% tolerance for FX rounding)
    const paidKobo     = paystackData.data.amount; // Paystack uses kobo
    const expectedKobo = config.amountUSD * NGN_PER_USD * 100;
    const tolerance    = expectedKobo * 0.01; // 1%

    if (paidKobo < expectedKobo - tolerance) {
      console.warn(`Amount mismatch for ref ${reference}: paid ${paidKobo}, expected ${expectedKobo}`);
      return res.status(400).json({
        success: false,
        message: `Insufficient amount paid. Expected ₦${(expectedKobo / 100).toLocaleString()}.`,
      });
    }

    // 4. Check this reference hasn't been used before (idempotency)
    const existing = await Subscription.findOne({ paymentReference: reference });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This payment reference has already been used.' });
    }

    // 5. Activate subscription
    const subscription = await activateSubscription({
      userId:           req.user._id,
      plan,
      amountUSD:        config.amountUSD,
      amountNGN:        paidKobo / 100,
      paymentMethod:    'paystack',
      paymentReference: reference,
    });

    // 6. Send confirmation email (non-blocking)
    sendEmail({
      to:       req.user.email,
      subject:  `Payment Confirmed — ${config.label} ✅`,
      template: 'payment_confirmed',
      data: {
        name:      req.user.name,
        plan:      config.label,
        amount:    `$${config.amountUSD}`,
        reference,
        expiresAt: subscription.expiresAt
          ? subscription.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'Lifetime',
      },
    }).catch(err => console.error('Confirmation email failed:', err.message));

    res.json({
      success: true,
      message: `${config.label} activated successfully.`,
      subscription: {
        plan:      subscription.plan,
        expiresAt: subscription.expiresAt,
        startedAt: subscription.startedAt,
      },
    });
  } catch (err) {
    console.error('verifyPaystack error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed.' });
  }
};

// ─────────────────────────────────────────
// POST /api/payments/verify-paystack-webhook
// Called by Paystack webhooks (no auth required — verified by signature)
// ─────────────────────────────────────────
exports.paystackWebhook = async (req, res) => {
  try {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify webhook signature
    if (hash !== req.headers['x-paystack-signature']) {
      console.warn('Invalid Paystack webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    // Only handle successful charge events
    if (event.event === 'charge.success') {
      const data      = event.data;
      const reference = data.reference;
      const email     = data.customer?.email;

      // Find the user
      const user = await User.findOne({ email });
      if (!user) {
        console.warn(`Webhook: no user found for email ${email}`);
        return res.status(200).send('OK'); // Still 200 to stop Paystack retrying
      }

      // Parse plan from metadata (must be sent from frontend)
      const plan = data.metadata?.plan;
      if (!plan || !Subscription.planConfig(plan)) {
        console.warn(`Webhook: invalid plan in metadata: ${plan}`);
        return res.status(200).send('OK');
      }

      // Idempotency check
      const existing = await Subscription.findOne({ paymentReference: reference });
      if (existing) return res.status(200).send('OK'); // Already processed

      const config = Subscription.planConfig(plan);
      await activateSubscription({
        userId:           user._id,
        plan,
        amountUSD:        config.amountUSD,
        amountNGN:        data.amount / 100,
        paymentMethod:    'paystack',
        paymentReference: reference,
      });

      console.log(`✅ Webhook activated ${plan} for ${email} (ref: ${reference})`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('paystackWebhook error:', err);
    res.status(500).send('Error');
  }
};

// ─────────────────────────────────────────
// POST /api/payments/confirm-crypto   (protected)
// Body: { plan, txHash, amount }
// Creates a PENDING subscription — admin must verify manually or auto-verify
// ─────────────────────────────────────────
exports.confirmCrypto = async (req, res) => {
  try {
    const { plan, txHash, amount } = req.body;

    if (!plan || !txHash) {
      return res.status(400).json({ success: false, message: 'plan and txHash are required.' });
    }

    const config = Subscription.planConfig(plan);
    if (!config) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    // Create subscription in unverified state — admin confirms later
    await Subscription.updateMany({ user: req.user._id, isActive: true }, { isActive: false });

    const now = new Date();
    const subscription = await Subscription.create({
      user:             req.user._id,
      plan,
      amountUSD:        config.amountUSD,
      startedAt:        now,
      expiresAt:        config.durationDays
        ? new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000)
        : null,
      paymentMethod:    'crypto',
      paymentReference: txHash,
      paymentVerified:  false, // pending admin review
      isActive:         false, // not active until verified
      notes:            `Crypto payment submitted. Amount: ${amount} USDT. TxHash: ${txHash}`,
    });

    // Notify admin via email
    sendEmail({
      to:      process.env.CONTACT_EMAIL,
      subject: `🔔 Crypto Payment Pending — ${req.user.name} (${plan})`,
      template: 'admin_crypto_pending',
      data: {
        userName:  req.user.name,
        userEmail: req.user.email,
        plan:      config.label,
        amount:    `$${amount} USDT`,
        txHash,
        subId:     subscription._id.toString(),
      },
    }).catch(err => console.error('Admin notification failed:', err.message));

    res.json({
      success: true,
      message: 'Crypto payment submitted. Your account will be activated within 1 hour after confirmation.',
      reference: subscription._id,
    });
  } catch (err) {
    console.error('confirmCrypto error:', err);
    res.status(500).json({ success: false, message: 'Submission failed. Please contact support on WhatsApp.' });
  }
};

// ─────────────────────────────────────────
// POST /api/payments/manual-activate   (admin only)
// Body: { userId, plan, paymentMethod, notes }
// ─────────────────────────────────────────
exports.manualActivate = async (req, res) => {
  try {
    const { userId, plan, paymentMethod, notes } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({ success: false, message: 'userId and plan are required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const config = Subscription.planConfig(plan);
    if (!config) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    const subscription = await activateSubscription({
      userId,
      plan,
      amountUSD:        config.amountUSD,
      paymentMethod:    paymentMethod || 'manual',
      paymentReference: `MANUAL-${Date.now()}`,
    });

    if (notes) {
      subscription.notes = notes;
      await subscription.save();
    }

    // Notify user
    sendEmail({
      to:      user.email,
      subject: `Your ${config.label} is now active 🎓`,
      template: 'payment_confirmed',
      data: {
        name:      user.name,
        plan:      config.label,
        amount:    `$${config.amountUSD}`,
        reference: `MANUAL-${Date.now()}`,
        expiresAt: subscription.expiresAt
          ? subscription.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'Lifetime',
      },
    }).catch(err => console.error('Activation email failed:', err.message));

    res.json({
      success: true,
      message: `${config.label} manually activated for ${user.email}.`,
      subscription: {
        id:        subscription._id,
        plan:      subscription.plan,
        expiresAt: subscription.expiresAt,
      },
    });
  } catch (err) {
    console.error('manualActivate error:', err);
    res.status(500).json({ success: false, message: 'Manual activation failed.' });
  }
};

// ─────────────────────────────────────────
// GET /api/payments/exchange-rate
// Returns current USD→NGN rate
// ─────────────────────────────────────────
exports.getExchangeRate = async (req, res) => {
  res.json({
    success: true,
    rate:    NGN_PER_USD,
    pairs: {
      academy:  { usd: 300,  ngn: 300  * NGN_PER_USD },
      standard: { usd: 50,   ngn: 50   * NGN_PER_USD },
      vip:      { usd: 150,  ngn: 150  * NGN_PER_USD },
    },
  });
};
