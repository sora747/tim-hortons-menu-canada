/* Tim Hortons Menu Canada — shared site behaviour (loaded on every page).
   Keep this file tiny and deferred: page content is static HTML. */
(function () {
  'use strict';

  // ---- Image fallback: try .webp / folder variants, then swap in a category emoji ----
  window.handleImageError = function (imgElement, fallbackEmoji) {
    if (!imgElement) return;

    const currentSrc = imgElement.getAttribute('src') || '';
    const tried = (imgElement.dataset.triedSrcs || '').split('|').filter(Boolean);
    if (!tried.includes(currentSrc)) tried.push(currentSrc);

    const candidates = [];

    // 1) Same file name but with a .webp extension (every photo in images/ is .webp)
    if (/\.(jpe?g|png|avif|gif)$/i.test(currentSrc)) {
      candidates.push(currentSrc.replace(/\.(jpe?g|png|avif|gif)$/i, '.webp'));
    }

    // 2) Alternate folder spelling: /images/ <-> /image/
    if (currentSrc.includes('/images/')) {
      candidates.push(currentSrc.replace('/images/', '/image/'));
    } else if (currentSrc.includes('/image/')) {
      candidates.push(currentSrc.replace('/image/', '/images/'));
    }

    const nextSrc = candidates.find((src) => src && !tried.includes(src));

    if (nextSrc) {
      imgElement.dataset.triedSrcs = tried.join('|');
      imgElement.src = nextSrc;
      return;
    }

    // Nothing left to try - replace the broken <img> with the category emoji
    const parent = imgElement.parentElement;
    if (parent) {
      parent.innerHTML = `
            <span class="text-6xl filter drop-shadow-sm select-none">
              ${fallbackEmoji || '🍁'}
            </span>
          `;
    }
  };

  // ---- Toast notification (never uses alert()) ----
  window.showToast = function (msg) {
    const toast = document.getElementById('toastNotification');
    const msgEl = document.getElementById('toastMessage');
    if (!toast || !msgEl) return;
    msgEl.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  };

  // ---- FAQ accordion ----
  window.toggleFaq = function (num) {
    const ans = document.getElementById(`faqAnswer-${num}`);
    const icon = document.getElementById(`faqIcon-${num}`);
    if (!ans) return;
    if (ans.classList.contains('hidden')) {
      ans.classList.remove('hidden');
      if (icon) icon.classList.add('rotate-180');
    } else {
      ans.classList.add('hidden');
      if (icon) icon.classList.remove('rotate-180');
    }
  };

  // ---- Mobile navigation drawer ----
  window.toggleMobileMenu = function () {
    const menu = document.getElementById('mobileMenuLinks');
    if (menu) menu.classList.toggle('hidden');
  };

  // ---- Back to top ----
  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.addEventListener('scroll', function () {
    const topBtn = document.getElementById('backToTopBtn');
    if (!topBtn) return;
    if (window.scrollY > 300) {
      topBtn.classList.remove('hidden');
    } else {
      topBtn.classList.add('hidden');
    }
  });
})();
