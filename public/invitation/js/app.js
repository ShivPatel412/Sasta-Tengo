/**
 * app.js - Main Application Controller
 * Handles sound, countdown, RSVP choices, review and submission.
 */

(function () {
  'use strict';
  let requestId;
  let confirmed = false;
  const draftKey = 'birthday-rsvp-choices-v1';
  const requestKey = 'birthday-rsvp-request-v1';
  const choiceSelector = 'input[type=checkbox], input[type=radio]';

  function submissionId() {
    if (!requestId) {
      try { requestId = localStorage.getItem(requestKey); } catch {}
      requestId ||= crypto.randomUUID();
      try { localStorage.setItem(requestKey, requestId); } catch {}
    }
    return requestId;
  }

  function restoreDraft(form) {
    try {
      const choices = JSON.parse(sessionStorage.getItem(draftKey) || '{}');
      form.querySelectorAll(choiceSelector).forEach(input => {
        input.checked = Array.isArray(choices[input.name]) && choices[input.name].includes(input.value);
      });
    } catch {}
  }

  function saveDraft(form) {
    const choices = {};
    form.querySelectorAll(choiceSelector).forEach(input => {
      if (input.checked) (choices[input.name] ??= []).push(input.value);
    });
    try { sessionStorage.setItem(draftKey, JSON.stringify(choices)); } catch {}
  }

  // --- 1. WEB AUDIO SYNTHESIS ENGINE ---
  let audioCtx = null;
  let soundEnabled = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const partyDate = new Date('2026-11-28T18:00:00+05:30').getTime();

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPop() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  }

  function playCash() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      // High bell ping
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  function playPartyHorn() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.07);
        osc.stop(audioCtx.currentTime + i * 0.07 + 0.35);
      });
    } catch (e) {}
  }

  // --- 2. HAPTIC FEEDBACK ---
  function triggerHaptic(pattern = [25]) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // --- 3. CONFETTI PARTICLE SYSTEM ---
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  let confettiParticles = [];
  let confettiActive = false;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const confettiColors = ['#ec4899', '#a855f7', '#06b6d4', '#fbbf24', '#10b981', '#f43f5e', '#ffffff'];

  function fireConfetti(count = 70) {
    if (reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height * 0.3,
        w: Math.random() * 8 + 4,
        h: Math.random() * 14 + 6,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -10 - 4,
        gravity: 0.35,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }
    if (!confettiActive) {
      confettiActive = true;
      requestAnimationFrame(renderConfetti);
    }
  }

  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.opacity -= 0.007;

      if (p.opacity <= 0 || p.y > canvas.height) {
        confettiParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (confettiParticles.length > 0) {
      requestAnimationFrame(renderConfetti);
    } else {
      confettiActive = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // --- 4. COUNTDOWN TIMER ---
  function initCountdown() {
    const targetDate = partyDate;

    function update() {
      const now = Date.now();
      const diff = targetDate - now;
      const celebration = document.getElementById('successCountdown');
      if (celebration) {
        const minutes = Math.ceil(diff / 60000);
        celebration.textContent = minutes > 0
          ? Math.floor(minutes / 1440) + 'd ' + Math.floor(minutes / 60) % 24 + 'h ' + minutes % 60 + 'm'
          : 'The weekend has started';
      }

      const dEl = document.getElementById('cdDays');
      const hEl = document.getElementById('cdHours');
      const mEl = document.getElementById('cdMins');
      const sEl = document.getElementById('cdSecs');

      if (!dEl) return;

      if (diff <= 0) {
        dEl.innerText = '00';
        hEl.innerText = '00';
        mEl.innerText = '00';
        sEl.innerText = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      dEl.innerText = String(days).padStart(2, '0');
      hEl.innerText = String(hours).padStart(2, '0');
      mEl.innerText = String(mins).padStart(2, '0');
      sEl.innerText = String(secs).padStart(2, '0');
    }

    update();
    let timer = setInterval(update, 1000);
    window.addEventListener('pagehide', () => clearInterval(timer));
    window.addEventListener('pageshow', event => {
      if (event.persisted) { update(); timer = setInterval(update, 1000); }
    });
  }

  // --- 5. PROGRESS BAR & INTERACTIVE FEEDBACK ---
  function updateProgress() {
    const form = document.getElementById('partyForm');
    if (!form || confirmed) return;
    renderReviews(readChoices(form));

    let score = 0;
    const hasActivity = form.querySelectorAll('input[name="activities"]:checked').length > 0;
    const hasDinner = form.querySelector('input[name="dinner"]:checked') !== null || (form.customDinner && form.customDinner.value.trim().length > 0);
    const hasDessert = form.querySelector('input[name="dessert"]:checked') !== null || (form.customDessert && form.customDessert.value.trim().length > 0);
    const hasWishlist = (form.placeName && form.placeName.value.trim().length > 0) || (form.placeLink && form.placeLink.value.trim().length > 0);
    const hasBottle = form.querySelector('input[name="bottle"]:checked') !== null;

    if (hasActivity) score += 20;
    if (hasDinner) score += 20;
    if (hasDessert) score += 20;
    if (hasWishlist) score += 20;
    if (hasBottle) score += 20;

    const fillEl = document.getElementById('formProgress');
    const textEl = document.getElementById('progressText');

    if (fillEl) fillEl.style.width = `${score}%`;
    if (textEl) textEl.innerText = `${score / 20} / 5 picked`;
    document.querySelector('.progress-track')?.setAttribute('aria-valuenow', String(score));
  }

  // --- 7. MODAL DIALOG CONTROLLER (MODERN WEB GUIDANCE) ---
  const dialog = document.getElementById('sponsorshipModal');
  const openModalBtn = document.getElementById('openDisclaimerBtn');
  const closeModalBtn = document.getElementById('closeDialogBtn');
  const confirmRsvpBtn = document.getElementById('confirmRsvpBtn');

  function openDisclaimerModal() {
    if (confirmed || ExpiryManager.isExpired?.()) return;
    const form = document.getElementById('partyForm');
    const error = document.getElementById('formError');
    error.hidden = true;
    
    // Quick validation
    const hasActivity = form.querySelectorAll('input[name="activities"]:checked').length > 0;
    const hasBottle = form.querySelector('input[name="bottle"]:checked') !== null;

    if (!hasActivity) {
      const activityError = document.getElementById('activityError');
      activityError.hidden = false;
      activityError.focus();
      triggerHaptic([50, 50, 50]);
      return;
    }

    if (!hasBottle) {
      const bottleError = document.getElementById('bottleError');
      bottleError.hidden = false;
      bottleError.focus();
      triggerHaptic([50, 50, 50]);
      return;
    }

    const link = form.placeLink.value.trim();
    if (link && !safeLink(link)) {
      error.textContent = 'Use an HTTP or HTTPS link without credentials for your suggested place.';
      error.hidden = false;
      error.focus();
      return;
    }
    if (!form.reportValidity()) return;

    if (soundEnabled) initAudio();
    playCash();
    triggerHaptic([40, 30, 40]);

    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  function closeDisclaimerModal() {
    if (confirmRsvpBtn.disabled) return;
    if (dialog && typeof dialog.close === 'function') {
      dialog.close();
    }
  }

  // Light-dismiss support for dialog (clicks on backdrop close modal)
  if (dialog) {
    dialog.addEventListener('close', () => openModalBtn.focus());
    dialog.addEventListener('cancel', (event) => {
      if (confirmRsvpBtn.disabled) event.preventDefault();
    });
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog && !confirmRsvpBtn.disabled) {
        dialog.close();
      }
    });
  }

  function readChoices(form) {
    // Gather Activities
    const activities = Array.from(
      form.querySelectorAll('input[name="activities"]:checked')
    ).map(cb => cb.value);

    // Gather Dinner
    let dinner = form.querySelector('input[name="dinner"]:checked')?.value || '';
    const customDinner = form.customDinner?.value.trim();
    if (customDinner) {
      dinner = dinner ? `${dinner} (Custom: ${customDinner})` : customDinner;
    }

    // Gather Dessert
    let dessert = form.querySelector('input[name="dessert"]:checked')?.value || '';
    const customDessert = form.customDessert?.value.trim();
    if (customDessert) {
      dessert = dessert ? `${dessert} (Custom: ${customDessert})` : customDessert;
    }

    // Gather Wishlist Place (Reel / Profile / Maps link)
    const wishlistPlace = {
      name: form.placeName?.value.trim() || '',
      link: form.placeLink?.value.trim() || '',
      notes: form.placeNotes?.value.trim() || ''
    };

    // Gather Bottle
    const bottle = form.querySelector('input[name="bottle"]:checked')?.value || '';

    // Gather Bonus
    const blackout = form.querySelector('input[name="blackoutTime"]:checked')?.value || 'Unspecified';

    return {
      activities,
      dinner,
      dessert,
      wishlistPlace,
      bottle,
      answers: {
        blackoutPrediction: blackout
      }
    };
  }

  function safeLink(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
    } catch { return null; }
  }

  function timingLabel(value) {
    return ({
      '10:00 PM (Weakling)': '10 PM',
      'Midnight (Standard Soldier)': 'Midnight',
      '3:00 AM (Surviving on sheer spite)': '3 AM',
      'Never! I will be carrying everyone else home': 'I’ll play it by ear'
    })[value] || 'No preference';
  }

  function dessertLabel(value) {
    return value.replace(/^Drunk 1 AM Cheesecake Run(?=$| \(Custom:)/, 'Cheesecake Run');
  }

  function renderReviews(payload) {
    if (!document.createElement) return;
    const place = payload.wishlistPlace;
    const url = safeLink(place.link);
    const preview = document.getElementById('placePreview');
    preview.hidden = !url;
    if (url) {
      preview.href = url.href;
      preview.textContent = 'Open ' + url.hostname + ' ↗';
    } else {
      preview.removeAttribute('href');
    }
    const choices = [
      ['Activities', payload.activities.join(', ') || 'Choose an activity'],
      ['Dinner', payload.dinner || 'Host’s pick'],
      ['Dessert', dessertLabel(payload.dessert) || 'Host’s pick'],
      ['Place', [place.name, url?.hostname, place.notes].filter(Boolean).join(' · ') || 'No suggestion'],
      ['Bottle', payload.bottle || 'Choose a bottle'],
      ['Timing', timingLabel(payload.answers.blackoutPrediction)]
    ];
    for (const id of ['inlineReview', 'modalReview']) {
      const rows = choices.map(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'choice-row';
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        return row;
      });
      document.getElementById(id).replaceChildren(...rows);
    }
  }

  function showConfirmed() {
    confirmed = true;
    document.getElementById('confirmedNotice').hidden = false;
    document.getElementById('review').hidden = true;
    document.getElementById('partyForm').querySelectorAll('input').forEach(input => {
      input.disabled = true;
    });
    document.getElementById('progressText').textContent = 'RSVP confirmed';
  }

  async function handleFinalSubmission() {
    if (confirmRsvpBtn.disabled || confirmed || ExpiryManager.isExpired?.()) return;
    if (soundEnabled) initAudio();
    confirmRsvpBtn.disabled = true;
    document.getElementById('runawayBtn').disabled = true;
    confirmRsvpBtn.setAttribute('aria-busy', 'true');
    confirmRsvpBtn.textContent = 'SENDING YOUR RSVP…';
    const error = document.getElementById('submitError');
    error.hidden = true;
    const payload = readChoices(document.getElementById('partyForm'));

    try {
      const id = submissionId();
      const res = await fetch('/api/submit-rsvp', {
        method: 'POST',credentials:'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...payload,request_id:id}),
        signal: AbortSignal.timeout(15000)
      });
      const result = await res.json();
      if (!res.ok || result.accepted !== true || result.request_id !== id) {
        throw new Error('RSVP was not saved');
      }
    } catch (err) {
      error.textContent = 'Your RSVP could not be saved. Your choices are still here. Please retry or contact the host.';
      error.hidden = false;
      error.focus();
      confirmRsvpBtn.disabled = false;
      document.getElementById('runawayBtn').disabled = false;
      confirmRsvpBtn.removeAttribute('aria-busy');
      confirmRsvpBtn.textContent = 'TRY SENDING AGAIN ↗';
      return;
    }

    // Close Dialog
    dialog.close();

    // Mark link expired for this device!
    // A storage restriction must not hide an already saved RSVP.
    try { ExpiryManager.markAsExpired(); } catch (err) {}

    // Sound and celebration
    playPartyHorn();
    triggerHaptic([100, 50, 100, 50, 200]);
    fireConfetti(36);

    // Render Success Overlay
    showSuccessOverlay(payload);
    showConfirmed();
    try { sessionStorage.removeItem(draftKey); } catch {}
  }

  function showSuccessOverlay(payload) {
    const overlay = document.getElementById('successOverlay');
    const summaryEl = document.getElementById('successSummary');

    if (summaryEl) {
      const escapeHtml = (value) => String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[character]);
      const place = Object.values(payload.wishlistPlace).filter(Boolean).join(' · ');
      const placeHtml = place ? `
        <div class="success-item">
          <span class="success-label">📍 Requested Spot:</span>
          <span class="success-val">${escapeHtml(place)}</span>
        </div>
      ` : '';

      summaryEl.innerHTML = `
        <div class="success-item">
          <span class="success-label">🎯 Activities:</span>
          <span class="success-val">${escapeHtml(payload.activities.join(', '))}</span>
        </div>
        <div class="success-item">
          <span class="success-label">🥩 Dinner:</span>
          <span class="success-val">${escapeHtml(payload.dinner || 'Host Choice')}</span>
        </div>
        <div class="success-item">
          <span class="success-label">🍰 Dessert:</span>
          <span class="success-val">${escapeHtml(dessertLabel(payload.dessert) || 'Host’s pick')}</span>
        </div>
        ${placeHtml}
        <div class="success-item">
          <span class="success-label">🍾 Bottle:</span>
          <span class="success-val">${escapeHtml(payload.bottle)}</span>
        </div>
        <div class="success-item">
          <span class="success-label">Timing:</span>
          <span class="success-val">${escapeHtml(timingLabel(payload.answers.blackoutPrediction))}</span>
        </div>
      `;
    }

    if (overlay) {
      overlay.style.display = 'flex';
      document.getElementById('mainContent').inert = true;
      document.querySelector('.top-nav-bar').inert = true;
      overlay.focus();
    }
  }

  // --- 9. EVENT LISTENERS SETUP ---
  document.addEventListener('DOMContentLoaded', () => {
    if (ExpiryManager.isExpired?.()) showConfirmed();
    window.addEventListener('storage', event => {
      if (event.key !== 'birthday_rsvp_status_28nov' || !ExpiryManager.isExpired()) return;
      if (dialog.open && !confirmRsvpBtn.disabled) dialog.close();
      showConfirmed();
    });

    // Init countdown
    initCountdown();

    document.getElementById('runawayBtn').addEventListener('click', closeDisclaimerModal);

    // Sound Toggle
    const soundBtn = document.getElementById('soundToggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundBtn.setAttribute('aria-pressed', String(soundEnabled));
        if (soundEnabled) {
          initAudio();
          soundBtn.innerHTML = `<span id="soundIcon" aria-hidden="true">♫</span> Sound on`;
          playPop();
        } else {
          soundBtn.innerHTML = `<span id="soundIcon" aria-hidden="true">♫</span> Sound off`;
        }
      });
    }

    // Form Change listeners for sound & progress
    const form = document.getElementById('partyForm');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        openDisclaimerModal();
      });
      if (!confirmed) restoreDraft(form);
      updateProgress();
      form.addEventListener('change', () => {
        if (soundEnabled) initAudio();
        playPop();
        triggerHaptic([20]);
        saveDraft(form);
        const choices = readChoices(form);
        if (choices.activities.length) document.getElementById('activityError').hidden = true;
        if (choices.bottle) document.getElementById('bottleError').hidden = true;
        updateProgress();
      });

      // Also update progress on custom text input
      form.addEventListener('input', () => {
        updateProgress();
      });
    }

    // Modal Triggers
    document.getElementById('viewInvitation').addEventListener('click', () => {
      document.getElementById('successOverlay').style.display = 'none';
      document.getElementById('mainContent').inert = false;
      document.querySelector('.top-nav-bar').inert = false;
      document.getElementById('invitationHero').focus();
      window.scrollTo(0, 0);
    });
    if (openModalBtn) {
      openModalBtn.addEventListener('click', openDisclaimerModal);
    }
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeDisclaimerModal);
    }
    if (confirmRsvpBtn) {
      confirmRsvpBtn.addEventListener('click', handleFinalSubmission);
    }
  });

})();
