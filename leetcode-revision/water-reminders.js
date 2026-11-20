(() => {
  'use strict';

  const enabledKey = 'recall_water_reminders_enabled';
  const dismissedKey = 'recall_water_reminder_dismissed';
  const enabled = document.getElementById('waterReminderEnabled');
  const prompt = document.getElementById('waterReminderPrompt');
  const dismiss = document.getElementById('waterReminderDismiss');
  let activeHour = '';

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch { /* The setting still works until reload. */ }
  }

  let dismissedHour = read(dismissedKey);

  function check() {
    const now = new Date();
    const hour = now.getHours();
    activeHour = enabled.checked && hour >= 7 && hour <= 21
      ? [now.getFullYear(), now.getMonth() + 1, now.getDate(), hour].join('-')
      : '';
    const due = Boolean(activeHour && activeHour !== dismissedHour);
    const message = due ? 'Time to drink some water.' : '';
    if (prompt.textContent !== message) prompt.textContent = message;
    dismiss.hidden = !due;

    if (due && now.getMinutes() < 5) {
      window.RecallNotifications.show('Drink water', message, 'recall-water-' + activeHour);
    }
  }

  enabled.checked = read(enabledKey) === '1';
  enabled.addEventListener('change', () => {
    save(enabledKey, enabled.checked ? '1' : '0');
    check();
  });
  dismiss.addEventListener('click', () => {
    dismissedHour = activeHour;
    save(dismissedKey, dismissedHour);
    check();
  });
  window.addEventListener('storage', event => {
    if (event.key === enabledKey) enabled.checked = event.newValue === '1';
    else if (event.key === dismissedKey) dismissedHour = event.newValue;
    else return;
    check();
  });
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 30000);
  check();
})();
