// tools/build.mjs — static site generator for tim-hortons-menu-canada.
// Reads data/menu.json + data/pages.json + shared templates/partials and writes:
//   index.html            (homepage with the full baked menu grid)
//   <slug>/index.html     (one file per entry in data/pages.json)
//   sitemap.xml           (every real URL on the site)
//
// Usage:  node tools/build.mjs     (or: npm run build — also rebuilds CSS)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://timhortons-menu.vercel.app';

const menu = JSON.parse(fs.readFileSync(path.join(root, 'data', 'menu.json'), 'utf8'));
const pagesData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'pages.json'), 'utf8'));
const homeTemplate = fs.readFileSync(path.join(root, 'src', 'home.template.html'), 'utf8');
const pageTemplate = fs.readFileSync(path.join(root, 'src', 'page.template.html'), 'utf8');
const headerPartial = fs.readFileSync(path.join(root, 'src', 'partials', 'header.html'), 'utf8');
const footerPartial = fs.readFileSync(path.join(root, 'src', 'partials', 'footer.html'), 'utf8');

/* ---------- helpers ---------- */

function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;');
}
function applyChrome(html) {
  return html.split('{{HEADER}}').join(headerPartial).split('{{FOOTER}}').join(footerPartial);
}

const CATEGORY_EMOJI = menu.categoryEmoji;

// Emoji fallback per item (same behaviour the original page used).
function getItemEmoji(item) {
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();

  if (name.includes('timbit')) return '🧆';
  if (name.includes('donut') || name.includes('fritter') || name.includes('eclair') || name.includes('cruller')) return '🍩';
  if (name.includes('bagel') || name.includes('cream cheese')) return '🥯';
  if (name.includes('muffin')) return '🧁';
  if (name.includes('cookie') || name.includes('brookie')) return '🍪';
  if (name.includes('croissant')) return '🥐';
  if (name.includes('brownie')) return '🍫';
  if (name.includes('tart')) return '🥧';
  if (name.includes('pinwheel') || name.includes('twist') || name.includes('pastry')) return '🥨';
  if (name.includes('biscuit')) return '🥮';
  if (name.includes('pizza')) return '🍕';
  if (name.includes('burger')) return '🍔';
  if (name.includes('nugget') || name.includes('chicken sandwich') || name.includes('crispy chicken')) return '🍗';
  if (name.includes('wrap')) return '🌯';
  if (name.includes('sandwich') || name.includes('melt') || name.includes('belt') || name.includes('blt') || name.includes('stack')) return '🥪';
  if (name.includes('bowl') || name.includes('box')) return '🥗';
  if (name.includes('soup') || name.includes('chili')) return '🥣';
  if (name.includes('hashbrown') || name.includes('wedges')) return '🥔';
  if (name.includes('omelette') || name.includes('egg')) return '🍳';
  if (name.includes('toast')) return '🍞';
  if (name.includes('parfait') || name.includes('yogurt')) return '🍨';

  if (name.includes('matcha')) return '🍵';
  if (name.includes('iced capp')) return '🍧';
  if (name.includes('cold brew')) return '🧋';
  if (name.includes('iced latte') || name.includes('iced americano') || name.includes('iced chai')) return '🧋';
  if (name.includes('latte') || name.includes('cappuccino') || name.includes('americano') || name.includes('espresso') || name.includes('mocha')) return '☕';
  if (name.includes('hot chocolate')) return '🍫';
  if (name.includes('french vanilla')) return '☕';
  if (name.includes('steeped tea') || name.includes('london fog') || name.includes('chai') || name.includes('tea')) return '🫖';
  if (name.includes('brewed') || name.includes('dark roast') || name.includes('double double') || name.includes('triple triple') || name.includes('original blend') || name.includes('coffee')) return '☕';
  if (name.includes('lemonade')) return '🍋';
  if (name.includes('quencher') || name.includes('cloud') || name.includes('slush')) return '🍹';
  if (name.includes('coke') || name.includes('soda') || name.includes('fountain') || name.includes('fuze') || name.includes('sprite')) return '🥤';
  if (name.includes('iced coffee')) return '🥤';
  if (name.includes('juice') || name.includes('milk') || name.includes('water') || name.includes('infusr')) return '🧃';

  if (name.includes('mug') || name.includes('ceramic') || name.includes('travel mug')) return '☕';
  if (name.includes('tumbler') || name.includes('bottle') || name.includes('cup')) return '🥤';
  if (name.includes('hat') || name.includes('cap') || name.includes('sock') || name.includes('t-shirt') || name.includes('tshirt')) return '🧢';
  if (name.includes('plush') || name.includes('toy')) return '🧸';
  if (name.includes('bag') || name.includes('cozy') || name.includes('pen') || name.includes('binder') || name.includes('card')) return '🛍️';
  if (name.includes('wand')) return '🪄';
  if (cat === 'tims-home' || name.includes('k-cup') || name.includes('can') || name.includes('bag')) return '🏠';

  return CATEGORY_EMOJI[cat] || '🍁';
}

/* ---------- homepage card + section templates (unchanged design) ---------- */

function buildCardHtml(item) {
  const itemEmoji = item.emoji || getItemEmoji(item);
  const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
  const isMerchandise = item.category === 'merchandise';
  const imageFile = item.imageFile || null;

  const mediaHtml = imageFile
    ? `        <div class="relative h-44 w-full bg-gradient-to-b from-stone-50 via-white to-stone-100/70 flex items-center justify-center p-3 border-b border-stone-100 overflow-hidden">
          <img src="/images/${escAttr(imageFile)}" alt="${escAttr(item.name)}" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain mx-auto my-auto block group-hover:scale-105 transition-transform duration-300 drop-shadow-sm select-none" onerror="handleImageError(this, '${itemEmoji}')" />
        </div>`
    : `        <div class="relative h-36 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 flex items-center justify-center border-b border-stone-100">
          <span class="text-6xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 select-none">${itemEmoji}</span>
        </div>`;

  let sizeTableHtml = '';
  if (hasSizes) {
    const rows = item.sizes
      .map(
        (s) => `                  <tr class="hover:bg-white/80 transition-colors">
                    <td class="py-2 px-2.5 font-medium text-stone-700"><span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-tims-red/60"></span><span>${escText(s.size)}</span></span></td>
                    <td class="py-2 px-2 text-center font-bold text-stone-900 font-display">$${s.price.toFixed(2)}</td>
                    <td class="py-2 px-2.5 text-right font-medium text-stone-600"><span class="bg-amber-100/60 text-amber-800 font-semibold px-1.5 py-0.5 rounded text-[10px]">${s.cals != null ? `${s.cals} cal` : '—'}</span></td>
                  </tr>`
      )
      .join('');
    sizeTableHtml = `
            <div class="mt-3.5 rounded-xl border border-stone-200/90 overflow-hidden bg-stone-50/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
              <table class="w-full text-[11px] leading-tight">
                <thead>
                  <tr class="bg-stone-100/90 text-stone-500 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200/80">
                    <th class="py-2 px-2.5 text-left font-semibold">Size</th>
                    <th class="py-2 px-2 text-center font-semibold">Price</th>
                    <th class="py-2 px-2.5 text-right font-semibold">Calories</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-200/50">
${rows}
                </tbody>
              </table>
            </div>`;
  }

  const calorieText = item.cals != null ? `${item.cals} Calories` : '';
  const displayPrice = hasSizes ? `From $${item.sizes[0].price.toFixed(2)}` : `$${(item.price ?? 0).toFixed(2)}`;
  const detailsHref = item.pageUrl || `#item-${item.id}`;

  return `        <div data-item-card data-menu-id="${escAttr(item.id)}" data-name="${escAttr(String(item.name).toLowerCase())}" class="cv-auto bg-white rounded-2xl border border-stone-200 shadow-card hover:shadow-cardHover hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
${mediaHtml}
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="font-display font-bold text-base sm:text-lg text-tims-coffee leading-snug group-hover:text-tims-red transition-colors">${escText(item.name)}</div>${sizeTableHtml}
            </div>
          </div>
          <div class="px-5 py-3.5 bg-stone-50/80 border-t border-stone-100 flex items-center ${isMerchandise ? 'justify-end' : 'justify-between'}">
            ${!isMerchandise && calorieText ? `<div class="flex items-center gap-1.5 text-xs font-semibold text-stone-500"><span>${calorieText}</span></div>` : !isMerchandise ? `<div class="text-xs font-medium text-stone-400">Calories vary</div>` : ''}
            <div class="bg-tims-red text-white font-display font-extrabold text-sm sm:text-base px-3.5 py-1.5 rounded-xl shadow-sm tracking-tight">${displayPrice}</div>
          </div>
          <div class="px-5 pb-3.5 pt-1 bg-stone-50/80">
            <a href="${escAttr(detailsHref)}" class="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700 hover:text-white bg-white hover:bg-stone-800 border border-stone-200 py-2 rounded-xl transition-all shadow-xs">
              <span>More details</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
        </div>`;
}

function subSectionKey(catDef, item) {
  if (item.subSection) return item.subSection;
  if (catDef.id === 'hot-drinks') return 'Hot Drinks';
  if (catDef.id === 'breakfast') return 'Breakfast';
  if (catDef.id === 'baked-goods') return 'Baked Goods';
  return '';
}

function renderCategorySection(catDef, items) {
  const catItems = items.filter((item) => item.category === catDef.id);
  if (catItems.length === 0) return '';

  let innerContent = '';

  if (catDef.subSections && catDef.subSections.length > 0) {
    const groups = catDef.subSections.map((secTitle) => {
      const secItems =
        catDef.id === 'featured'
          ? catItems
          : catItems.filter((item) => subSectionKey(catDef, item) === secTitle);
      return { secTitle, secItems };
    });

    // Never silently drop items whose subSection is not in the config list.
    const grouped = new Set(groups.flatMap((g) => g.secItems));
    const orphans = catItems.filter((item) => !grouped.has(item));
    if (orphans.length > 0 && catDef.id !== 'featured') {
      groups.push({ secTitle: 'More', secItems: orphans });
    }

    innerContent = groups
      .filter((g) => g.secItems.length > 0)
      .map((g) => `          <div data-item-group class="space-y-4 pt-2">
            <div class="flex items-center gap-3 pb-2 border-b border-stone-200">
              <h3 class="font-display font-bold text-xl sm:text-2xl text-stone-800 flex items-center gap-2">
                <span class="w-2 h-5 rounded-full ${catDef.color} inline-block"></span>
                <span>${escText(g.secTitle)}</span>
              </h3>
              <span class="text-[11px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full">${g.secItems.length} items</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
${g.secItems.map(buildCardHtml).join('\n')}
            </div>
          </div>`)
      .join('\n');
  } else {
    innerContent = `          <div data-item-group class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
${catItems.map(buildCardHtml).join('\n')}
          </div>`;
  }

  return `      <section id="category-section-${catDef.id}" data-menu-cat="${catDef.id}" class="space-y-6 pt-6 first:pt-0">
        <div class="bg-tims-red text-white p-4 sm:p-5 rounded-2xl shadow-md text-center">
          <h2 class="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">${escText(catDef.title)}</h2>
        </div>
        <div class="space-y-8 pl-1 sm:pl-2">
${innerContent}
        </div>
      </section>`;
}

/* ---------- homepage ---------- */

const sections = menu.categories.map((catDef) => renderCategorySection(catDef, menu.items)).filter(Boolean);
let grid = sections.join('\n      <hr class="item-sep border-t-2 border-dashed border-stone-200 my-8" />');
grid = grid.replace(/>\s+</g, '><');

if (!homeTemplate.includes('<!-- MENU_GRID -->')) throw new Error('MENU_GRID placeholder missing in home template');
const homeHtml = applyChrome(homeTemplate.replace('<!-- MENU_GRID -->', grid));
fs.writeFileSync(path.join(root, 'index.html'), homeHtml);
const homeCards = (grid.match(/data-item-card/g) || []).length;

/* ---------- inner pages ---------- */

const updated = pagesData.updatedAt;
for (const page of pagesData.pages) {
  const canonical = `${SITE_URL}/${page.slug}`;
  const html = pageTemplate
    .split('{{TITLE}}').join(escText(page.title))
    .split('{{TITLE_JSON}}').join(escAttr(page.title))
    .split('{{DESCRIPTION}}').join(escAttr(page.description))
    .split('{{CANONICAL}}').join(canonical)
    .split('{{BADGE}}').join(escText(page.badge))
    .split('{{UPDATED}}').join(escText(updated))
    .split('{{CONTENT}}').join(page.content);
  const outDir = path.join(root, page.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), applyChrome(html));
}

/* ---------- sitemap ---------- */

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE_URL}/`, freq: 'weekly', prio: '1.0' },
  ...pagesData.pages.map((p) => ({ loc: `${SITE_URL}/${p.slug}`, freq: 'monthly', prio: '0.8' })),
  { loc: `${SITE_URL}/gryffindor-strawberry-cheesecake`, freq: 'monthly', prio: '0.8' },
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.prio}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);

console.log(`index.html: ${sections.length} category sections, ${homeCards} cards`);
console.log(`pages: ${pagesData.pages.length} → ${pagesData.pages.map((p) => `/${p.slug}`).join(', ')}`);
console.log(`sitemap.xml: ${urls.length} URLs`);
if (homeCards !== menu.items.length) {
  console.warn(`WARNING: expected ${menu.items.length} cards, found ${homeCards}`);
}
