/* ═══════════════════════════════════════════════════════════════
   Shared by every page:
   1. School status banner  (Content Manager → 🚦 School Status)
   2. Installable app       (service worker + "Install App" buttons)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1. SCHOOL STATUS BANNER ─────────────────────────────────── */
  var STATUS = {
    closed:          { icon: '⛔', label: 'School is closed today', bg: '#c0392b', fg: '#fff' },
    early_dismissal: { icon: '🕐', label: 'Early dismissal today',  bg: '#f0a500', fg: '#1b1300' },
    late_start:      { icon: '🕘', label: 'Late start today',       bg: '#f0a500', fg: '#1b1300' },
    alert:           { icon: '📢', label: 'Important notice',       bg: '#0e6fa0', fg: '#fff' }
  };

  function showStatus(s) {
    var t = STATUS[s && s.status];
    if (!t) return;                                             // "open" (or unknown) → no banner
    if (s.until && new Date(s.until) < new Date()) return;      // expired automatically
    var key = 'mcg-status-hidden:' + s.status + '|' + (s.message || '');
    try { if (sessionStorage.getItem(key)) return; } catch (e) {}

    var bottom = document.body.getAttribute('data-status-bar') === 'bottom';
    var bar = document.createElement('div');
    bar.className = 'mcg-status';
    bar.setAttribute('role', 'status');
    bar.style.cssText =
      'background:' + t.bg + ';color:' + t.fg + ';font:600 14px/1.45 "Figtree","Nunito",system-ui,sans-serif;' +
      'padding:10px 48px 10px 18px;text-align:center;position:' + (bottom ? 'fixed' : 'relative') + ';left:0;right:0;' +
      (bottom ? 'bottom:0;' : '') + 'z-index:1000;box-shadow:0 2px 12px rgba(0,0,0,.18)';
    var strong = document.createElement('strong');
    strong.textContent = t.icon + ' ' + t.label;
    bar.appendChild(strong);
    if (s.message) {
      var msg = document.createElement('span');
      msg.textContent = ' — ' + s.message;
      msg.style.fontWeight = '500';
      bar.appendChild(msg);
    }
    var x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', 'Hide this notice');
    x.textContent = '×';
    x.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:inherit;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;opacity:.8';
    x.onclick = function () {
      bar.remove();
      try { sessionStorage.setItem(key, '1'); } catch (e) {}
    };
    bar.appendChild(x);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  fetch('/_data/status.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(showStatus)
    .catch(function () {});

  /* ── 2. INSTALLABLE APP ──────────────────────────────────────── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferred = null;

  // Any element with [data-install-app] becomes an install button once installing is possible.
  function buttons() { return document.querySelectorAll('[data-install-app]'); }
  function reveal() { if (!standalone) buttons().forEach(function (b) { b.hidden = false; }); }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    reveal();
  });
  window.addEventListener('appinstalled', function () {
    buttons().forEach(function (b) { b.hidden = true; });
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-install-app]');
    if (!btn) return;
    e.preventDefault();
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; });
    } else if (isIOS) {
      alert('To install the McGrath app on your iPhone or iPad:\n\n1. Tap the Share button (the square with an arrow)\n2. Choose “Add to Home Screen”');
    }
  });

  // iOS Safari never fires beforeinstallprompt, so offer the manual steps there.
  document.addEventListener('DOMContentLoaded', function () { if (isIOS) reveal(); });
})();
