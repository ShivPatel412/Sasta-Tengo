const ExpiryManager = (() => {
  const key = 'birthday_rsvp_status_28nov';
  return {
    isExpired() {
      try { return localStorage.getItem(key) === 'completed'; } catch { return false; }
    },
    markAsExpired() {
      try { localStorage.setItem(key, 'completed'); } catch {}
    }
  };
})();
