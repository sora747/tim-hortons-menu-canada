/* Tim Hortons Menu Canada — homepage-only behaviour.
   Menu catalog itself is static HTML; this script powers filtering + the meal calculator. */
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
    'harry-potter': '⚡',
    'featured': '⭐',
    'breakfast': '🍳',
    'lunch-dinner': '🍔',
    'hot-drinks': '☕',
    'cold-drinks': '🧊',
    'baked-goods': '🍩',
    'tims-home': '🏠',
    'merchandise': '🛍️'
  };

  // ---- Meal calculator / order tracker ----
  function addToCart(itemId, sizeOption = null) {
    const item = menuDatabase.find((i) => i.id === itemId);
    if (!item) return;

    const cartKey = sizeOption ? `${item.id}_${sizeOption.size}` : item.id;
    const itemName = sizeOption ? `${item.name} (${sizeOption.size})` : item.name;
    const itemPrice = sizeOption ? sizeOption.price : item.price;
    const itemCals = sizeOption ? (sizeOption.cals || 0) : (item.cals || 0);

    const existing = userCart.find((i) => i.cartKey === cartKey);
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
    userCart = userCart.filter((i) => (i.cartKey || i.id) !== cartKey);
    updateCartSummary();
  }

  function updateCartQty(cartKey, delta) {
    const existing = userCart.find((i) => (i.cartKey || i.id) === cartKey);
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
    showToast('Order Tracker cleared');
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
    const totalCals = userCart.reduce((sum, item) => sum + item.cals * item.qty, 0);
    const subtotal = userCart.reduce((sum, item) => sum + item.price * item.qty, 0);

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

    listEl.innerHTML = userCart
      .map((item) => {
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
      })
      .join('');
  }

  function copyOrderSummary() {
    if (userCart.length === 0) {
      showToast('Cart is empty to copy!');
      return;
    }

    let summaryText = `🍁 Tim Hortons Order (TimsMenu.ca Calorie Calculator):\n`;
    userCart.forEach((item) => {
      summaryText += `${item.qty}x ${item.name} - $${(item.price * item.qty).toFixed(2)} (${item.cals * item.qty} cals)\n`;
    });
    summaryText += `\nSubtotal: ${document.getElementById('summarySubtotal').innerText}\n`;
    summaryText += `Total with Estimated Tax: ${document.getElementById('summaryTotalWithTax').innerText}\n`;
    summaryText += `Total Calories: ${document.getElementById('summaryTotalCals').innerText}`;

    const tempInput = document.createElement('textarea');
    tempInput.value = summaryText;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    showToast('Order breakdown copied to clipboard!');
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

  // ---- Category pills & slider ----
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

    document.querySelectorAll('.cat-pill').forEach((btn) => {
      if (btn.getAttribute('data-cat') === cat) {
        btn.className = 'cat-pill active px-3.5 py-2 lg:px-3 lg:py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 bg-tims-red text-white shadow-sm text-xs md:text-sm font-semibold touch-manipulation';
        btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      } else {
        btn.className = 'cat-pill px-3.5 py-2 lg:px-3 lg:py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 text-xs md:text-sm font-semibold shadow-xs touch-manipulation';
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

  // ---- Expose handlers used by inline onclick attributes ----
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateCartQty = updateCartQty;
  window.clearCart = clearCart;
  window.copyOrderSummary = copyOrderSummary;
  window.scrollCategories = scrollCategories;
  window.updateCategoryScrollTrack = updateCategoryScrollTrack;
  window.filterCategory = filterCategory;
  window.resetFilters = resetFilters;

  // ---- Init (defer script: DOM is ready) ----
  updateCartSummary();
  updateCategoryScrollTrack();
  applyFilters();
})();
