/* ================================================================
   script-ui.js — Wedding Digital Invitation
   UI logic only — NO Firebase dependency.
   This file runs in all environments including file:// and GitHub Pages.

   Sections:
     1. Envelope Animation + Background Music
     2. Language Toggle (EN ↔ AR)
     3. Music Mute Toggle
     4. Countdown Timer
     5. Scroll Reveal
     6. Add to Calendar (.ics download) — Church + Next Destination
     7. RSVP — Attend Toggle
     8. RSVP — Signature Canvas
================================================================ */


/* ────────────────────────────────────────────────────────────────
   1. ENVELOPE ANIMATION + BACKGROUND MUSIC
   Tap anywhere → flap CSS animation → overlay fades out.
   The tap is also the required user-gesture that lets the browser
   allow audio.play() — so the song starts at the same moment.
──────────────────────────────────────────────────────────────── */
const envScreen = document.getElementById('envelope-screen');
const envWrap   = document.getElementById('env-wrap');
const tapText   = document.getElementById('env-tap-text');
const bgMusic   = document.getElementById('bg-music');

let musicPlaying = false;

/* 🔧 Start the song at a specific point instead of 0:00.
   Format: seconds. e.g. 45 = start at 0:45, 90 = start at 1:30 */
const MUSIC_START_SECONDS = 19; // 0:18

// Jump to the start point once the file's metadata is ready (fires once)
if (bgMusic && MUSIC_START_SECONDS > 0) {
  bgMusic.addEventListener('loadedmetadata', () => {
    bgMusic.currentTime = MUSIC_START_SECONDS;
  }, { once: true });
}

envScreen.addEventListener('click', () => {
  envWrap.classList.add('open');                             // triggers CSS flap rotation
  setTimeout(() => envScreen.classList.add('hidden'), 700); // fade out after 700ms

  if (bgMusic) {
    bgMusic.play().then(() => {
      musicPlaying = true;
      updateMusicIcon();
    }).catch(() => { /* song file not added yet, or browser blocked it */ });
  }
});


/* ────────────────────────────────────────────────────────────────
   2. LANGUAGE TOGGLE  (English ↔ Arabic)
   Single button — always shows the OTHER language as label.
   Swaps all [data-en]/[data-ar] text and input placeholders.
   Flips document direction ltr ↔ rtl.
──────────────────────────────────────────────────────────────── */
// Exposed on window so script.js (Firebase module) can read the current language
window.currentLang = 'en';
let currentLang = window.currentLang;

function toggleLang() {
  currentLang        = currentLang === 'en' ? 'ar' : 'en';
  window.currentLang = currentLang; // keep window in sync for script.js
  const isAr  = currentLang === 'ar';

  document.documentElement.lang = currentLang;
  document.body.dir              = isAr ? 'rtl' : 'ltr';

  // Button always shows the other language
  document.getElementById('lang-btn').textContent = isAr ? 'English' : 'عربي';

  // Envelope tap hint
  tapText.textContent = isAr ? 'اضغط للفتح' : 'Tap to open';

  // Swap all translatable text nodes
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = isAr ? el.dataset.ar : el.dataset.en;
  });

  // Swap all input / textarea placeholders
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    el.placeholder = isAr ? el.dataset.placeholderAr : el.dataset.placeholderEn;
  });
}

// Expose globally — called via onclick="toggleLang()" in HTML
window.toggleLang = toggleLang;


/* ────────────────────────────────────────────────────────────────
   3. MUSIC MUTE TOGGLE
   Pauses/resumes the background song via the pill button.
──────────────────────────────────────────────────────────────── */
function updateMusicIcon() {
  const btn = document.getElementById('music-btn');
  if (btn) btn.textContent = musicPlaying ? '🔊' : '🔇';
}

function toggleMusic() {
  if (!bgMusic) return;
  if (musicPlaying) {
    bgMusic.pause();
  } else {
    bgMusic.play().catch(() => {});
  }
  musicPlaying = !musicPlaying;
  updateMusicIcon();
}

window.toggleMusic = toggleMusic;


/* ────────────────────────────────────────────────────────────────
   4. COUNTDOWN TIMER
   Counts down to the church ceremony (the first event of the day).
   Updates every second. Shows 🎉 when target date passes.
──────────────────────────────────────────────────────────────── */
const eventDate = new Date('2026-09-03T18:00:00');

function updateCountdown() {
  const diff = eventDate - new Date();

  if (diff <= 0) {
    const row = document.querySelector('.countdown-row');
    if (row) row.innerHTML =
      '<p style="text-align:center;font-family:\'Allura\',cursive;font-size:32px;color:var(--olive)">🎉</p>';
    return;
  }

  document.getElementById('cd-days').textContent  = String(Math.floor(diff / 86400000)).padStart(2, '0');
  document.getElementById('cd-hours').textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
  document.getElementById('cd-mins').textContent  = String(Math.floor((diff % 3600000)  / 60000)).padStart(2, '0');
  document.getElementById('cd-secs').textContent  = String(Math.floor((diff % 60000)    / 1000)).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);


/* ────────────────────────────────────────────────────────────────
   5. SCROLL REVEAL
   IntersectionObserver watches all .reveal elements.
   Adds .visible class when element enters viewport.
   Each element animates only once (observer is disconnected after).
──────────────────────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target); // fire once only
    }
  }),
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ────────────────────────────────────────────────────────────────
   6. ADD TO CALENDAR
   Generates a standard .ics file and triggers browser download.
   Church button exists on both pages. The reception button only
   exists in family.html, so its listener simply never attaches
   on index.html (the church-only, general-audience page).
──────────────────────────────────────────────────────────────── */
function downloadICS({ start, end, summary, location, description, filename }) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const link    = document.createElement('a');
  link.href     = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const calBtnChurch = document.getElementById('add-cal-btn-church');
if (calBtnChurch) {
  calBtnChurch.addEventListener('click', e => {
    e.preventDefault();
    downloadICS({
      start: '20260903T180000',
      end: '20260903T193000',
      summary: 'David & Sandy — Wedding Ceremony',
      location: 'St. Mark the Apostle Church\\, Cleopatra',
      description: 'Wedding ceremony of David & Sandy.',
      filename: 'david-sandy-church.ics'
    });
  });
}

const calBtnReception = document.getElementById('add-cal-btn-reception');
if (calBtnReception) {
  calBtnReception.addEventListener('click', e => {
    e.preventDefault();
    downloadICS({
      start: '20260903T200000',
      end: '20260904T000000',
      summary: 'David & Sandy — Wedding Reception',
      location: 'Le Méridien Cairo Airport',
      description: 'Wedding reception of David & Sandy.',
      filename: 'david-sandy-reception.ics'
    });
  });
}


/* ────────────────────────────────────────────────────────────────
   7. RSVP — ATTEND TOGGLE
   Yes / No buttons. Stores selection in `attending` variable.
   submitRSVP() in script.js reads this value on form submit.
──────────────────────────────────────────────────────────────── */
let attending = null; // 'yes' | 'no' | null

function selectAttend(val) {
  attending = val;
  document.getElementById('btn-yes').className = 'attend-btn' + (val === 'yes' ? ' sel-yes' : '');
  document.getElementById('btn-no').className  = 'attend-btn' + (val === 'no'  ? ' sel-no'  : '');
}

window.selectAttend = selectAttend;

// Expose attending value so script.js (Firebase) can read it
window.getAttending = () => attending;


/* ────────────────────────────────────────────────────────────────
   8. RSVP — SIGNATURE CANVAS
   Supports mouse (desktop) and touch (mobile).
   touch-action: none in CSS prevents page scroll while drawing.
   script.js reads the canvas via document.getElementById('sig-canvas').
──────────────────────────────────────────────────────────────── */
const sigCanvas = document.getElementById('sig-canvas');
const sigCtx    = sigCanvas.getContext('2d');
let   sigActive = false;

/* Set canvas resolution for sharp rendering on retina/HiDPI screens */
function initSigCanvas() {
  const dpr  = window.devicePixelRatio || 1;
  const rect = sigCanvas.getBoundingClientRect();
  sigCanvas.width  = rect.width  * dpr;
  sigCanvas.height = rect.height * dpr;
  sigCtx.scale(dpr, dpr);
  sigCtx.strokeStyle = '#3A3028';
  sigCtx.lineWidth   = 1.8;
  sigCtx.lineCap     = 'round';
  sigCtx.lineJoin    = 'round';
}
requestAnimationFrame(initSigCanvas);

/* Get pointer position relative to canvas top-left */
function getSigPos(e) {
  const rect = sigCanvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

// Mouse events
sigCanvas.addEventListener('mousedown',  e => {
  sigActive = true;
  const p = getSigPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
});
sigCanvas.addEventListener('mousemove',  e => {
  if (!sigActive) return;
  const p = getSigPos(e);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
});
sigCanvas.addEventListener('mouseup',    () => sigActive = false);
sigCanvas.addEventListener('mouseleave', () => sigActive = false);

// Touch events
sigCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  sigActive = true;
  const p = getSigPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
}, { passive: false });
sigCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!sigActive) return;
  const p = getSigPos(e);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
}, { passive: false });
sigCanvas.addEventListener('touchend', () => sigActive = false);

/* Clear the canvas */
function clearSig() {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}
window.clearSig = clearSig;

/* Returns true if no pixels have been drawn yet */
window.isSigEmpty = function() {
  const pixels = sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height).data;
  return !pixels.some((val, i) => i % 4 === 3 && val > 0);
};
