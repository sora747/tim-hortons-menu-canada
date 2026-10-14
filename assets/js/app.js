/* Tim Hortons Menu Canada — homepage behaviour.
   Keep this file tiny and deferred: the menu catalog itself is static HTML. */
(function () {
  'use strict';

  // ---- State ----
  let userCart = [];
  let currentCategory = 'all';
  let searchQuery = '';
  const standardTaxRate = 0.13;
  const menuDatabase = window.MENU_DATA || []; // optional; only needed if add-to-cart is wired up

  // Category emoji for cart rows
  const categoryEmojiMap = {
  "harry-potter": "⚡",
  "featured": "⭐",
  "breakfast": "🍳",
  "lunch-dinner": "🍔",
  "hot-drinks": "☕",
  "cold-drinks": "🧊",
  "baked-goods": "🍩",
  "tims-home": "🏠",
  "merchandise": "🛍️"
};

    // Global image fallback handler attached directly to window to avoid scope ReferenceError in inline onerror attributes
    window.handleImageError = function(imgElement, fallbackEmoji) {
      if (!imgElement) return;

      const currentSrc = imgElement.getAttribute('src') || '';
      const tried = (imgElement.dataset.triedSrcs || '').split('|').filter(Boolean);
      if (!tried.includes(currentSrc)) tried.push(currentSrc);

      // Build the next candidate URLs to try, in order of likelihood
      const candidates = [];

      // 1) Same file name but with a .webp extension (every photo in images/ is .webp)
      if (/\.(jpe?g|png|avif|gif)$/i.test(currentSrc)) {
        candidates.push(currentSrc.replace(/\.(jpe?g|png|avif|gif)$/i, '.webp'));
      }

      // 2) Alternate folder spelling: ./images/ <-> ./image/
      if (currentSrc.includes('/images/')) {
        candidates.push(currentSrc.replace('/images/', '/image/'));
      } else if (currentSrc.includes('/image/')) {
        candidates.push(currentSrc.replace('/image/', '/images/'));
      }

      const nextSrc = candidates.find(src => src && !tried.includes(src));

      // Another source to try: swap it in and wait for its own onerror/success
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


    // Add To Cart supporting custom sized selections
    function addToCart(itemId, sizeOption = null) {
      const item = menuDatabase.find(i => i.id === itemId);
      if (!item) return;

      const cartKey = sizeOption ? `${item.id}_${sizeOption.size}` : item.id;
      const itemName = sizeOption ? `${item.name} (${sizeOption.size})` : item.name;
      const itemPrice = sizeOption ? sizeOption.price : item.price;
      const itemCals = sizeOption ? (sizeOption.cals || 0) : (item.cals || 0);

      const existing = userCart.find(i => i.cartKey === cartKey);
      if (existing) {
        existing.qty += 1;
      } else {
        userCart.push({
          cartKey: cartKey,
          id: item.id,
          name: itemName,
          category: item.category,
          price: itemPrice,
          cals: itemCals,
          qty: 1
        });
      }

      updateCartSummary();
      showToast(`Added "${itemName}" to Meal Tracker`);
    }

    function removeFromCart(cartKey) {
      userCart = userCart.filter(i => (i.cartKey || i.id) !== cartKey);
      updateCartSummary();
    }

    function updateCartQty(cartKey, delta) {
      const existing = userCart.find(i => (i.cartKey || i.id) === cartKey);
      if (!existing) return;
      existing.qty += delta;
      if (existing.qty <= 0) {
        removeFromCart(cartKey);
      } else {
        updateCartSummary();
      }
    }

    function clearCart() {
      userCart = [];
      updateCartSummary();
      showToast("Order Tracker cleared");
    }

    function updateCartSummary() {
      const listEl = document.getElementById('cartItemsList');
      const quickCount = document.getElementById('quickItemCount');
      const quickCals = document.getElementById('quickCalories');
      const quickCost = document.getElementById('quickCost');

      const sumCals = document.getElementById('summaryTotalCals');
      const sumSub = document.getElementById('summarySubtotal');
      const sumTax = document.getElementById('summaryTotalWithTax');
      const progBar = document.getElementById('calorieProgressBar');
      const progPercent = document.getElementById('caloriePercentage');

      const totalItems = userCart.reduce((sum, item) => sum + item.qty, 0);
      const totalCals = userCart.reduce((sum, item) => sum + (item.cals * item.qty), 0);
      const subtotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

      const totalWithTax = subtotal * (1 + standardTaxRate);

      if (quickCount) quickCount.innerText = `${totalItems} items`;
      if (quickCals) quickCals.innerText = `${totalCals} kcal`;
      if (quickCost) quickCost.innerText = `$${totalWithTax.toFixed(2)}`;

      if (sumCals) sumCals.innerText = `${totalCals} kcal`;
      if (sumSub) sumSub.innerText = `$${subtotal.toFixed(2)}`;
      if (sumTax) sumTax.innerText = `$${totalWithTax.toFixed(2)}`;

      const percentage = Math.min(Math.round((totalCals / 2000) * 100), 100);
      if (progBar) progBar.style.width = `${percentage}%`;
      if (progPercent) progPercent.innerText = `${percentage}%`;

      if (!listEl) return;

      if (userCart.length === 0) {
        listEl.innerHTML = `
          <div class="py-8 text-center text-stone-400 text-sm">
            No items selected yet. Click the <strong>"+ Add"</strong> button on any item card above!
          </div>
        `;
        return;
      }

      listEl.innerHTML = userCart.map(item => {
        const itemKey = item.cartKey || item.id;
        const categoryEmoji = categoryEmojiMap[item.category] || '🍁';
        return `
          <div class="py-2.5 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base">${categoryEmoji}</span>
              <div>
                <div class="font-bold text-stone-800 leading-tight">${item.name}</div>
                <div class="text-[11px] text-stone-400">${item.cals * item.qty} Cals · $${(item.price * item.qty).toFixed(2)}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="updateCartQty('${itemKey}', -1)" class="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center">-</button>
              <span class="font-bold text-stone-800 w-4 text-center">${item.qty}</span>
              <button onclick="updateCartQty('${itemKey}', 1)" class="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center">+</button>
              <button onclick="removeFromCart('${itemKey}')" class="text-stone-300 hover:text-red-500 ml-1 p-1">✕</button>
            </div>
          </div>
        `;
      }).join('');
    }


  // ---- Filtering over the static (pre-rendered) menu grid ----
  function applyFilters() {
    const grid = document.getElementById('menuItemsGrid');
    const emptyState = document.getElementById('noResultsState');
    if (!grid) return;

    const q = searchQuery.trim().toLowerCase();
    const cat = currentCategory;
    let visibleCards = 0;

    grid.querySelectorAll('section[data-menu-cat]').forEach((sec) => {
      const catMatch = cat === 'all' || sec.getAttribute('data-menu-cat') === cat;
      let secVisible = 0;

      sec.querySelectorAll('[data-item-card]').forEach((card) => {
        const nameMatch = q === '' || (card.getAttribute('data-name') || '').includes(q);
        const show = catMatch && nameMatch;
        card.classList.toggle('hidden', !show);
        if (show) {
          secVisible += 1;
          visibleCards += 1;
        }
      });

      // Hide sub-section wrappers that have no visible cards
      sec.querySelectorAll('[data-item-group]').forEach((group) => {
        group.classList.toggle('hidden', !group.querySelector('[data-item-card]:not(.hidden)'));
      });

      sec.classList.toggle('hidden', secVisible === 0);
    });

    // Hide separators whose neighbouring sections are hidden
    grid.querySelectorAll('hr.item-sep').forEach((hr) => {
      const prev = hr.previousElementSibling;
      const next = hr.nextElementSibling;
      const hide = !prev || !next || prev.classList.contains('hidden') || next.classList.contains('hidden');
      hr.classList.toggle('hidden', hide);
    });

    if (emptyState) emptyState.classList.toggle('hidden', visibleCards > 0);
  }

    // Category & Filter Handlers
    function scrollCategories(distance) {
      const container = document.getElementById('categoryTabsContainer');
      if (container) {
        container.scrollBy({ left: distance, behavior: 'smooth' });
        setTimeout(updateCategoryScrollTrack, 150);
      }
    }

    function updateCategoryScrollTrack() {
      const container = document.getElementById('categoryTabsContainer');
      const indicator = document.getElementById('categoryScrollIndicator');
      if (!container || !indicator) return;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        indicator.style.width = '100%';
        indicator.style.transform = 'translateX(0%)';
        return;
      }

      const scrollPercent = container.scrollLeft / maxScroll;
      const thumbWidthPercent = Math.max(20, Math.round((container.clientWidth / container.scrollWidth) * 100));
      indicator.style.width = `${thumbWidthPercent}%`;
      const availableTrack = 100 - thumbWidthPercent;
      indicator.style.transform = `translateX(${scrollPercent * (availableTrack / thumbWidthPercent) * 100}%)`;
    }

    function filterCategory(cat) {
      currentCategory = cat;

      document.querySelectorAll('.cat-pill').forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
          btn.className = "cat-pill active px-3.5 py-2 lg:px-3 lg:py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 bg-tims-red text-white shadow-sm text-xs md:text-sm font-semibold touch-manipulation";
          btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        } else {
          btn.className = "cat-pill px-3.5 py-2 lg:px-3 lg:py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 text-xs md:text-sm font-semibold shadow-xs touch-manipulation";
        }
      });
      applyFilters();
      updateCategoryScrollTrack();
    }

    function resetFilters() {
      currentCategory = 'all';
      searchQuery = '';
      filterCategory('all');
    }


    // Dynamic Page View Handler
    function showPageView(viewName) {
      const homeSections = document.getElementById('homePageSections');
      const pageContainer = document.getElementById('customPageViewContainer');
      const pageContent = document.getElementById('pageViewContent');
      const pageBadge = document.getElementById('pageViewBadge');

      if (viewName === 'home') {
        if (homeSections) homeSections.classList.remove('hidden');
        if (pageContainer) pageContainer.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (homeSections) homeSections.classList.add('hidden');
      if (pageContainer) pageContainer.classList.remove('hidden');

      const pages = {
        'about': {
          badge: 'About Us',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">About Us</h1>
                 <p class="text-stone-600 leading-relaxed">Welcome to our independent Tim Hortons Canada menu and nutrition resource. We are committed to providing Canadians with accurate, verified prices, allergen data, calorie information, and menu updates across all provinces.</p>
                 <div class="p-5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
                   <em>Content for this page can be updated and expanded anytime.</em>
                 </div>`
        },
        'contact': {
          badge: 'Contact Us',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Contact Us</h1>
                 <p class="text-stone-600 leading-relaxed">Have a correction, feedback, or a menu update for a Canadian location? We'd love to hear from you!</p>
                 <div class="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-sm text-stone-700 space-y-3">
                   <p class="font-semibold text-stone-900">Get in touch:</p>
                   <p class="text-xs text-stone-500">You can reach out with questions, updates, or price adjustments. You can customize this section anytime with your email or contact form.</p>
                 </div>`
        },
        'allergens': {
          badge: 'Allergen Information',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Allergen & Nutritional Information</h1>
                 <p class="text-stone-600">Tim Hortons stores prepare bakery products that contain wheat, milk, eggs, soy, peanuts, tree nuts, and sesame. Cross-contact between allergens can occur in the kitchen and prep stations.</p>
                 <div class="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">Please inform staff of any serious allergies when ordering in-restaurant.</div>`
        },
        'hours': {
          badge: 'Operating Hours',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Tim Hortons Store & Operating Hours</h1>
                 <p class="text-stone-600 leading-relaxed">Most Tim Hortons locations in Canada operate from <strong>5:00 AM or 6:00 AM to 10:00 PM or 11:00 PM</strong> daily, with numerous high-traffic highway and urban outlets open 24/7 for drive-thru and takeout.</p>
                 <div class="mt-4 grid sm:grid-cols-2 gap-4">
                   <div class="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                     <span class="font-bold text-stone-900 block mb-1">Standard Dine-in</span>
                     <span class="text-xs text-stone-600">Mon - Sun: 5:00 AM – 10:00 PM</span>
                   </div>
                   <div class="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                     <span class="font-bold text-stone-900 block mb-1">Drive-Thru</span>
                     <span class="text-xs text-stone-600">Mon - Sun: 5:00 AM – 11:00 PM / 24 Hours</span>
                   </div>
                 </div>`
        },
        'breakfast-hours': {
          badge: 'Breakfast Hours',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Tim Hortons Breakfast Hours Canada</h1>
                 <p class="text-stone-600 leading-relaxed">Tim Hortons Canada typically serves its full traditional breakfast menu starting from store opening at <strong>5:00 AM (or 6:00 AM Sundays) until 11:00 AM</strong>. After 11:00 AM, restaurants switch to the lunch menu, though select locations offer an all-day breakfast selection subject to local bakery availability.</p>
                 <div class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                   <span class="font-bold block">Breakfast Timings:</span>
                   <p>• Monday – Saturday: 5:00 AM – 11:00 AM</p>
                   <p>• Sunday: 6:00 AM – 11:00 AM</p>
                 </div>`
        },
        'lunch-hours': {
          badge: 'Lunch Hours',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Tim Hortons Lunch Hours Canada</h1>
                 <p class="text-stone-600 leading-relaxed">Lunch service officially begins immediately when the breakfast window concludes at <strong>11:00 AM and runs through 4:00 PM</strong>, transitioning into dinner offerings. Popular lunch selections include Flatbread Pizzas, Loaded Bowls, Craveable Wraps, Soups, and Chili.</p>
                 <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-tims-red space-y-1">
                   <span class="font-bold block text-stone-900">Lunch Timings:</span>
                   <p class="text-stone-700">• Daily: 11:00 AM – 4:00 PM</p>
                   <p class="text-stone-500 text-[11px]">*Wraps, sandwiches, soups, and chili often remain available well after 4:00 PM until closing.</p>
                 </div>`
        },
        'locations': {
          badge: 'Canada Locations',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Tim Hortons Locations Across Canada</h1>
                 <p class="text-stone-600">With over 4,000 restaurants across all 10 provinces and 3 territories, Tim Hortons serves Canadians from coast to coast.</p>`
        },
        'blog': {
          badge: 'News & Guides',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Tim Hortons Canada Blog & News</h1>
                 <p class="text-stone-600">Stay informed with the latest Canadian menu rollouts, Roll Up To Win updates, seasonal specialty drinks, and money-saving hacks.</p>
                 <div class="mt-6 grid sm:grid-cols-2 gap-4">
                   <div class="p-5 bg-stone-50 rounded-2xl border border-stone-200">
                     <span class="text-xs uppercase font-bold text-tims-red">Latest Guide</span>
                     <h3 class="font-display font-bold text-base text-stone-900 mt-1">Roll Up To Win: Canadian Prizes & Rules</h3>
                     <p class="text-xs text-stone-500 mt-1">How digital roll tracking works in the Tims App and prize redemptions.</p>
                   </div>
                   <div class="p-5 bg-stone-50 rounded-2xl border border-stone-200">
                     <span class="text-xs uppercase font-bold text-amber-600">Seasonal Special</span>
                     <h3 class="font-display font-bold text-base text-stone-900 mt-1">New Limited-Edition Drinks & Treats</h3>
                     <p class="text-xs text-stone-500 mt-1">Full pricing, calories, and review of this season's hottest releases.</p>
                   </div>
                 </div>`
        },
        'disclaimer': {
          badge: 'Legal Disclaimer',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Disclaimer Notice</h1>
                 <p class="text-stone-600 leading-relaxed">This website is an independent informational guide created for educational and community reference. We are <strong>not affiliated with, authorized, or endorsed by Tim Hortons® or The TDL Group Corp.</strong> All trademarks belong to their respective holders.</p>`
        },
        'privacy': {
          badge: 'Privacy Policy',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Privacy Policy</h1>
                 <p class="text-stone-600">We do not collect personal identification information. Any inputs to the calorie calculator remain strictly local to your browser session.</p>`
        },
        'terms': {
          badge: 'Terms of Service',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Terms of Use</h1>
                 <p class="text-stone-600">By browsing this educational portal, you agree that prices, calorie estimations, and nutrition specs are indicative averages and subject to regional franchise variance.</p>`
        },
        'cookie': {
          badge: 'Cookie Policy',
          html: `<h1 class="text-3xl font-display font-extrabold text-stone-900">Cookie Policy</h1>
                 <p class="text-stone-600">This website uses minimal essential client-side storage to preserve interface states such as your active category view and meal calculator entries.</p>`
        }
      };

      if (pages[viewName]) {
        if (pageBadge) pageBadge.innerText = pages[viewName].badge;
        if (pageContent) pageContent.innerHTML = pages[viewName].html;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    // Copy to clipboard without external alerts
    function copyOrderSummary() {
      if (userCart.length === 0) {
        showToast("Cart is empty to copy!");
        return;
      }

      let summaryText = `🍁 Tim Hortons Order (TimsMenu.ca Calorie Calculator):\n`;
      userCart.forEach(item => {
        summaryText += `- ${item.qty}x ${item.name} (${item.cals * item.qty} Cals) - $${(item.price * item.qty).toFixed(2)}\n`;
      });
      summaryText += `Subtotal: ${document.getElementById('summarySubtotal').innerText}\n`;
      summaryText += `Total with Estimated Tax: ${document.getElementById('summaryTotalWithTax').innerText}\n`;
      summaryText += `Total Calories: ${document.getElementById('summaryTotalCals').innerText}`;

      const tempInput = document.createElement("textarea");
      tempInput.value = summaryText;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);

      showToast("Order breakdown copied to clipboard!");
    }

    // Friendly Toast Box
    function showToast(msg) {
      const toast = document.getElementById('toastNotification');
      const msgEl = document.getElementById('toastMessage');
      if (!toast || !msgEl) return;
      msgEl.innerText = msg;
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }

    // FAQ Accordion
    function toggleFaq(num) {
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
    }

    // Mobile Navbar Toggles
    function toggleMobileMenu() {
      const menu = document.getElementById('mobileMenuLinks');
      if (menu) menu.classList.toggle('hidden');
    }

    // Scroll to Top Handler
    function scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    // Window Scroll Listener to Show / Hide Back-to-Top Button
    window.addEventListener('scroll', function() {
      const topBtn = document.getElementById('backToTopBtn');
      if (!topBtn) return;
      if (window.scrollY > 300) {
        topBtn.classList.remove('hidden');
      } else {
        topBtn.classList.add('hidden');
      }
    });


  // ---- Expose handlers used by inline onclick attributes ----
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateCartQty = updateCartQty;
  window.clearCart = clearCart;
  window.copyOrderSummary = copyOrderSummary;
  window.showToast = showToast;
  window.toggleFaq = toggleFaq;
  window.toggleMobileMenu = toggleMobileMenu;
  window.scrollToTop = scrollToTop;
  window.scrollCategories = scrollCategories;
  window.updateCategoryScrollTrack = updateCategoryScrollTrack;
  window.filterCategory = filterCategory;
  window.resetFilters = resetFilters;
  window.showPageView = showPageView;

  // ---- Init (defer script: DOM is ready) ----
  updateCartSummary();
  updateCategoryScrollTrack();
  applyFilters();
})();
