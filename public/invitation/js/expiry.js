/**
 * expiry.js - One-Time Click Expiry & Lockout Manager
 * Ensures each device can only submit once. Once submitted, the link expires
 * and shows the funny locked-out screen upon future visits.
 */

const ExpiryManager = (function () {
  const STORAGE_KEY = 'birthday_rsvp_status_28nov';
  const SUMMARY_KEY = 'birthday_rsvp_summary_28nov';

  function init() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Allow host/developer to reset for testing via URL query ?reset=1
    if (urlParams.get('reset') === '1' || urlParams.get('test') === '1') {
      resetExpiry();
      // Remove reset param from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (isExpired()) {
      showLockoutScreen();
    }

    // Attach click handler for reset button on lockout screen
    const resetBtn = document.getElementById('resetLockoutBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetExpiry();
        window.location.reload();
      });
    }
  }

  function isExpired() {
    return localStorage.getItem(STORAGE_KEY) === 'completed';
  }

  function markAsExpired(summaryData = {}) {
    localStorage.setItem(STORAGE_KEY, 'completed');
    localStorage.setItem(SUMMARY_KEY, JSON.stringify(summaryData));
    document.cookie = "party_rsvp_completed=true; max-age=2592000; path=/; SameSite=Lax";
  }

  function getSavedSummary() {
    try {
      const data = localStorage.getItem(SUMMARY_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function resetExpiry() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SUMMARY_KEY);
    document.cookie = "party_rsvp_completed=; max-age=0; path=/;";
    console.log('[ExpiryManager] Session cleared. Link is active again.');
  }

  function showLockoutScreen() {
    const mainContent = document.getElementById('mainContent');
    const lockoutScreen = document.getElementById('lockoutScreen');

    if (mainContent) mainContent.style.display = 'none';
    if (lockoutScreen) lockoutScreen.style.display = 'flex';

    // Start lockout countdown
    startLockoutTimer();
  }

  function startLockoutTimer() {
    const timerEl = document.getElementById('lockoutCountdown');
    if (!timerEl) return;

    // Target party date: Nov 28, 2026, 18:00:00 (Local time)
    const targetDate = new Date('2026-11-28T18:00:00+05:30').getTime();

    function update() {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        timerEl.innerText = "IT'S PARTY TIME! 🍻🔥";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.innerText = `${days}d ${hours}h ${mins}m ${secs}s`;
    }

    update();
    setInterval(update, 1000);
  }

  return {
    init,
    isExpired,
    markAsExpired,
    getSavedSummary,
    resetExpiry,
    showLockoutScreen
  };
})();
