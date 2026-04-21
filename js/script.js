/* ============================================================
   DecodeFXGroup - Main JavaScript
   Handles: navbar, auth, countdown, animations, modals, FAQ
   ============================================================ */

/* ── 1. NAVBAR — fullscreen mobile menu ──────────────────── */
(function initNavbar() {
  const navbar    = document.getElementById('navbar') || document.querySelector('.navbar');
  const hamburger = document.getElementById('hamburger');
  const overlay   = document.getElementById('mobileOverlay');
  const closeBtn  = document.getElementById('mobileClose');

  /* ── Scrolled state ───────────────────────────────────── */
  window.addEventListener('scroll', () => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }
  }, { passive: true });

  if (!hamburger || !overlay) return;

  /* ── Open menu ────────────────────────────────────────── */
  function openMenu() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('menu-open');
  }

  /* ── Close menu ───────────────────────────────────────── */
  function closeMenu() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
  }

  /* Expose globally so inline onclick="closeMobileMenu()" works */
  window.closeMobileMenu = closeMenu;

  /* ── Hamburger click ──────────────────────────────────── */
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  /* ── Close X button ───────────────────────────────────── */
  closeBtn && closeBtn.addEventListener('click', closeMenu);

  /* ── Close when any link inside menu is tapped ─────────── */
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  /* ── Close on Escape key ──────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  /* ── Close if screen resizes to desktop ──────────────────  */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  }, { passive: true });

})();


/* ── 2. AUTH STATE – simple localStorage based auth ─────── */
const Auth = {
  // Keys stored in localStorage
  USER_KEY: 'dfx_user',
  SUB_KEY:  'dfx_subscription',

  // Get logged in user
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); }
    catch { return null; }
  },

  // Check if subscription is active
  isSubscribed() {
    try {
      const sub = JSON.parse(localStorage.getItem(this.SUB_KEY));
      if (!sub) return false;
      return new Date(sub.expiresAt) > new Date();
    } catch { return false; }
  },

  // Login function (simulated – connects to backend in production)
  login(email, password) {
    // Simulate user object – replace with real API call
    const user = {
      id:       'usr_' + Date.now(),
      email,
      name:     email.split('@')[0],
      plan:     'standard',
      enrolledAt: new Date().toISOString()
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    // Give 30 days signals access after enrollment
    const sub = {
      plan:      'standard',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem(this.SUB_KEY, JSON.stringify(sub));
    return user;
  },

  // Logout
  logout() {
    localStorage.removeItem(this.USER_KEY);
    window.location.href = 'index.html';
  },

  // Guard – redirect to home if not logged in
  requireAuth() {
    if (!this.getUser()) {
      window.location.href = 'index.html?login=1';
    }
  }
};


/* ── 3. MODAL SYSTEM ─────────────────────────────────────── */
const Modal = {
  open(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }
};

// Click outside modal to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});

// Close button inside modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => Modal.closeAll());
});

// Open login modal
document.querySelectorAll('[data-modal="login"]').forEach(el => {
  el.addEventListener('click', () => Modal.open('loginModal'));
});

// Open register modal
document.querySelectorAll('[data-modal="register"]').forEach(el => {
  el.addEventListener('click', () => Modal.open('registerModal'));
});

// Switch between modals
document.querySelectorAll('[data-switch-modal]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const target = e.currentTarget.getAttribute('data-switch-modal');
    Modal.closeAll();
    setTimeout(() => Modal.open(target), 100);
  });
});

// Auto-open login if URL has ?login=1
if (window.location.search.includes('login=1')) {
  window.addEventListener('load', () => setTimeout(() => Modal.open('loginModal'), 500));
}


/* ── 4. LOGIN FORM HANDLER ──────────────────────────────── */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email    = loginForm.querySelector('[name="email"]').value;
    const password = loginForm.querySelector('[name="password"]').value;

    if (!email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    // Simulate API call – replace with fetch('/api/auth/login', ...)
    const btn = loginForm.querySelector('.btn');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    setTimeout(() => {
      Auth.login(email, password);
      Modal.closeAll();
      showToast('Welcome back! Redirecting...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }, 1200);
  });
}


/* ── 5. REGISTER FORM HANDLER ───────────────────────────── */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name     = registerForm.querySelector('[name="name"]').value;
    const email    = registerForm.querySelector('[name="email"]').value;
    const password = registerForm.querySelector('[name="password"]').value;

    if (!name || !email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    const btn = registerForm.querySelector('.btn');
    btn.textContent = 'Creating Account...';
    btn.disabled = true;

    // Simulate API registration then redirect to payment
    setTimeout(() => {
      Auth.login(email, password);
      Modal.closeAll();
      showToast('Account created! Proceeding to payment...', 'success');
      setTimeout(() => window.location.href = 'account.html?checkout=1', 1500);
    }, 1500);
  });
}


/* ── 6. ENROLL BUTTON ───────────────────────────────────── */
document.querySelectorAll('[data-action="enroll"]').forEach(btn => {
  btn.addEventListener('click', () => {
    const user = Auth.getUser();
    if (user) {
      window.location.href = 'account.html?checkout=1';
    } else {
      Modal.open('registerModal');
    }
  });
});


/* ── 7. COUNTDOWN TIMER ─────────────────────────────────── */
function initCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  // Target: 48 hours from now (simulated offer deadline)
  const storedTarget = localStorage.getItem('dfx_countdown_end');
  let target;

  if (storedTarget) {
    target = new Date(storedTarget);
  } else {
    target = new Date(Date.now() + 48 * 60 * 60 * 1000);
    localStorage.setItem('dfx_countdown_end', target.toISOString());
  }

  const units = {
    hours:   el.querySelector('[data-unit="hours"]'),
    minutes: el.querySelector('[data-unit="minutes"]'),
    seconds: el.querySelector('[data-unit="seconds"]')
  };

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      // Reset timer
      localStorage.removeItem('dfx_countdown_end');
      units.hours.textContent   = '00';
      units.minutes.textContent = '00';
      units.seconds.textContent = '00';
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (units.hours)   units.hours.textContent   = String(h).padStart(2,'0');
    if (units.minutes) units.minutes.textContent = String(m).padStart(2,'0');
    if (units.seconds) units.seconds.textContent = String(s).padStart(2,'0');
    setTimeout(tick, 1000);
  }
  tick();
}
initCountdown();


/* ── 8. SCROLL REVEAL ANIMATIONS ───────────────────────── */
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
})();


/* ── 9. FAQ ACCORDION ───────────────────────────────────── */
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Close all first
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // Toggle current
    if (!isOpen) item.classList.add('open');
  });
});


/* ── 10. CHART BAR ANIMATION DELAY ─────────────────────── */
document.querySelectorAll('.chart-bar').forEach((bar, i) => {
  bar.style.animationDelay = `${i * 0.1}s`;
  // Random heights for visual variety
  const heights = [55, 72, 48, 88, 65, 95, 78, 60, 83, 70];
  bar.style.height = heights[i % heights.length] + '%';
});


/* ── 11. TOAST NOTIFICATION ─────────────────────────────── */
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
// Expose globally
window.showToast = showToast;


/* ── 12. USER STATE – Update nav based on login ─────────── */
(function updateNavForUser() {
  const user = Auth.getUser();
  const navAuth = document.querySelector('.nav-auth-area');
  if (!navAuth) return;

  if (user) {
    navAuth.innerHTML = `
      <a href="dashboard.html" class="btn btn-outline" style="padding:10px 22px">Dashboard</a>
      <button class="btn btn-primary" style="padding:10px 22px" onclick="Auth.logout()">Logout</button>
    `;
  }
})();


/* ── 13. PAYSTACK PAYMENT ───────────────────────────────── */
function initPaystack(amount, email, onSuccess) {
  // amount in kobo (e.g. $300 → convert to NGN first, then kobo)
  // Placeholder for Paystack integration
  if (typeof PaystackPop === 'undefined') {
    showToast('Payment gateway loading... Please try again.', 'error');
    return;
  }

  const handler = PaystackPop.setup({
    key:       'pk_live_YOUR_PAYSTACK_PUBLIC_KEY', // ← Replace with real key
    email,
    amount,    // in kobo
    currency:  'NGN',
    ref:       'DFX_' + Date.now(),
    callback:  function(response) { onSuccess(response); },
    onClose:   function() { showToast('Payment cancelled.', 'error'); }
  });
  handler.openIframe();
}
window.initPaystack = initPaystack;


/* ── 14. SUBSCRIPTION STATUS (dashboard/account) ────────── */
function renderSubscriptionStatus() {
  const el = document.getElementById('subStatusDisplay');
  if (!el) return;

  const sub  = JSON.parse(localStorage.getItem('dfx_subscription') || '{}');
  const user = Auth.getUser();
  if (!user || !sub.expiresAt) {
    el.innerHTML = '<p class="gold">No active subscription found.</p>';
    return;
  }

  const expires = new Date(sub.expiresAt);
  const now     = new Date();
  const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
  const isActive = daysLeft > 0;

  el.innerHTML = `
    <div class="sub-status-card">
      <div class="sub-info">
        <h3>${isActive ? 'Active Subscription' : 'Subscription Expired'}</h3>
        <p>Plan: <strong>${sub.plan === 'vip' ? 'VIP' : 'Standard'}</strong>
           &nbsp;|&nbsp;
           ${isActive ? `<strong style="color:var(--success)">${daysLeft} days remaining</strong>`
                      : '<strong style="color:var(--danger)">Expired – please renew</strong>'}
        </p>
        <p style="margin-top:8px;font-size:0.82rem;color:var(--grey)">Expires: ${expires.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
      </div>
      <span class="sub-badge ${isActive ? 'active' : 'expired'}">${isActive ? '● Active' : '● Expired'}</span>
    </div>
  `;
}
renderSubscriptionStatus();


/* ── 15. SMOOTH ANCHOR LINKS ─────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ── 16. DASHBOARD SIDEBAR (mobile toggle) ───────────────── */
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar       = document.querySelector('.sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}


/* ── 17. COPY TO CLIPBOARD (payment details) ─────────────── */
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-copy');
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to clipboard!', 'success'))
      .catch(() => showToast('Could not copy. Please copy manually.', 'error'));
  });
});


/* ── 18. PROTECT DASHBOARD / ACADEMY PAGES ───────────────── */
(function guardPage() {
  const protectedPages = ['dashboard.html', 'academy.html'];
  const currentPage    = window.location.pathname.split('/').pop();
  if (protectedPages.includes(currentPage)) {
    Auth.requireAuth();
  }
})();
/* ── TESTIMONIAL AUTO-SLIDING CAROUSEL ──────────────────── */
(function initCarousel() {
  const track    = document.getElementById('testimonialTrack');
  const prevBtn  = document.getElementById('carouselPrev');
  const nextBtn  = document.getElementById('carouselNext');
  const dotsWrap = document.getElementById('carouselDots');

  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.testimonial-slide'));
  const total  = slides.length;
  let current  = 0;
  let autoTimer = null;

  /* ── Build dots ───────────────────────────────────────── */
  function buildDots() {
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    updateDots();
  }

  function updateDots() {
    dotsWrap.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
    });
  }

  /* ── Move to exact slide ──────────────────────────────── */
  function goTo(index) {
    // Wrap around both ends
    if (index >= total) index = 0;
    if (index < 0)      index = total - 1;
    current = index;

    // Move track by exactly one slide width at a time
    track.style.transform = `translateX(-${current * 100}%)`;
    updateDots();
  }

  /* ── Next and previous ────────────────────────────────── */
  function goNext() { goTo(current + 1); }
  function goPrev() { goTo(current - 1); }

  /* ── Auto slide every 3 seconds ──────────────────────── */
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(goNext, 3000);
  }
  function stopAuto() {
    clearInterval(autoTimer);
  }

  /* ── Button clicks ────────────────────────────────────── */
  if (nextBtn) nextBtn.addEventListener('click', () => { goNext(); startAuto(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { goPrev(); startAuto(); });

  /* ── Pause on hover ───────────────────────────────────── */
  track.addEventListener('mouseenter', stopAuto);
  track.addEventListener('mouseleave', startAuto);

  /* ── Touch swipe support ──────────────────────────────── */
  let touchStartX = 0;
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stopAuto();
  }, { passive: true });
  track.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
    startAuto();
  }, { passive: true });

  /* ── Start ────────────────────────────────────────────── */
  buildDots();
  goTo(0);
  startAuto();

})();
/* ── Show bank details in account.html ──────────────────── */
function showBankDetails() {
  const el      = document.getElementById('bankDetailsAccount');
  const cryptoEl = document.getElementById('cryptoDetails');

  // Close crypto if open
  if (cryptoEl) cryptoEl.style.display = 'none';

  // Toggle bank panel
  const isVisible = el.style.display === 'block';
  el.style.display = isVisible ? 'none' : 'block';

  if (!isVisible) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
window.showBankDetails = showBankDetails;