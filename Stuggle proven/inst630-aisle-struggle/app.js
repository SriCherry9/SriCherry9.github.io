/* ==========================================================
   The Allergen Aisle  -  app.js
   Libraries: Chart.js (charts), GSAP (motion).
   Data: data/products.json, loaded with fetch + async/await.
   ========================================================== */
'use strict';

const DATA_URL = 'data/products.json';

/* Tile colours are borrowed from the reference poster's flat palette.
   Each set: background, package body, package label. */
const PALETTE = [
  { bg: '#f25c45', pack: '#f6e9d2', label: '#2f7fa0' },
  { bg: '#f7b955', pack: '#e8463a', label: '#f6e9d2' },
  { bg: '#5ba3ac', pack: '#f6e9d2', label: '#e8463a' },
  { bg: '#34b06a', pack: '#ece6d2', label: '#e8463a' },
  { bg: '#f5806a', pack: '#3d9a55', label: '#f6e9d2' },
  { bg: '#8a4560', pack: '#3b9b66', label: '#f6e9d2' },
  { bg: '#8fd6cf', pack: '#8fa4d6', label: '#e8463a' },
  { bg: '#f22e4a', pack: '#f7b955', label: '#8a4560' },
];

/* The dataset lists allergens by many names. Group the common ones so the
   filter chips and charts speak in familiar terms. */
const ALLERGEN_GROUPS = {
  'Dairy': ['Dairy', 'Milk', 'Ghee'],
  'Wheat': ['Wheat'],
  'Eggs': ['Eggs'],
  'Fish': ['Fish', 'Anchovies'],
  'Shellfish': ['Shellfish'],
  'Peanuts': ['Peanuts'],
  'Tree nuts': ['Almonds', 'Nuts', 'Pine nuts'],
  'Soybeans': ['Soybeans'],
};
const FILTER_KEYS = Object.keys(ALLERGEN_GROUPS);

const DIET_LABELS = {
  vegetarian: ['Vegetarian', 'Not vegetarian'],
  vegan: ['Vegan', 'Not vegan'],
  dairyFree: ['Dairy-free', 'Contains dairy'],
  glutenFree: ['No gluten source listed', 'May contain gluten'],
};

const state = {
  all: [],          // every unique record (used for statistics)
  aisle: [],        // featured products shown on the shelves
  stats: null,
  avoid: new Set(), // allergen keys the shopper wants to avoid
  index: 0,         // product currently open in the overlay
  opener: null,     // element to return focus to
  compareOpener: null, // element to return focus to after the compare overlay
  charts: {},
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const $ = (id) => document.getElementById(id);
const hasGsap = () => typeof window.gsap !== 'undefined';
const canAnimate = () => hasGsap() && !state.reducedMotion;

/* ---------- Data ---------- */

async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`The data request failed (${response.status} ${response.statusText}).`);
  }
  return response.json();
}

async function init() {
  try {
    const data = await loadData();
    state.all = data.products;
    state.aisle = data.products.filter((p) => p.featured);
    state.stats = computeStats(state.all);

    renderFilters();
    renderAisle();
    bindOverlays();

    $('loading').hidden = true;
    $('aisle').hidden = false;
    announce(`${state.aisle.length} products on the shelves.`);

    if (canAnimate()) {
      gsap.from('.tile-item', {
        opacity: 0, y: 24, scale: 0.96,
        duration: 0.45, ease: 'power2.out',
        stagger: { each: 0.025, from: 'start' },
        clearProps: 'all',
      });
    }
  } catch (err) {
    console.error(err);
    $('loading').hidden = true;
    const box = $('error');
    box.hidden = false;
    box.textContent =
      `Sorry, the aisle could not be loaded. ${err.message} ` +
      'If you opened index.html straight from a folder, serve it over http instead ' +
      '(for example: python3 -m http.server).';
  }
}

/* ---------- Allergen helpers ---------- */

function allergenKey(name) {
  const lower = name.toLowerCase();
  for (const [group, members] of Object.entries(ALLERGEN_GROUPS)) {
    if (members.some((m) => m.toLowerCase() === lower)) return group;
  }
  return name;
}

function allergenKeys(product) {
  return [...new Set(product.allergens.map(allergenKey))];
}

/* ---------- Ingredient helpers ---------- */

/* The dataset splits ingredients across four columns. For "show me everything"
   and for comparing two products, flatten them into one list per product. */
const ROLE_LABELS = {
  main: 'Main ingredient',
  sweetener: 'Sweetener',
  fatOil: 'Fat / oil',
  seasoning: 'Seasoning & extras',
};

/* Comparison key: lower-case, and drop one trailing "s" so "Eggs" matches "Egg".
   Deliberately simple. "Lemon" and "Lemon juice" stay different. */
function ingredientKey(name) {
  const k = name.trim().toLowerCase();
  return k.length > 3 && k.endsWith('s') && !k.endsWith('ss') ? k.slice(0, -1) : k;
}

function ingredientList(product) {
  const out = [];
  const seen = new Set();
  const add = (name, role) => {
    if (!name) return;
    const key = ingredientKey(name);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name, key, role });
  };
  add(product.main, 'main');
  product.sweetener.forEach((n) => add(n, 'sweetener'));
  product.fatOil.forEach((n) => add(n, 'fatOil'));
  product.seasoning.forEach((n) => add(n, 'seasoning'));
  return out;
}

/* Split two lists of {name, key} into: in both / only in A / only in B. */
function compareSets(listA, listB) {
  const keysA = new Set(listA.map((i) => i.key));
  const keysB = new Set(listB.map((i) => i.key));
  return {
    both: listA.filter((i) => keysB.has(i.key)),
    onlyA: listA.filter((i) => !keysB.has(i.key)),
    onlyB: listB.filter((i) => !keysA.has(i.key)),
  };
}

const allergenItems = (product) => allergenKeys(product).map((k) => ({ name: k, key: k }));

function computeStats(records) {
  const counts = {};
  let withAllergen = 0;
  records.forEach((r) => {
    const keys = allergenKeys(r);
    if (keys.length) withAllergen += 1;
    keys.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
  });
  return { n: records.length, counts, withAllergen };
}

const pct = (count) => Math.round((count / state.stats.n) * 100);
const list = (items) => items.join(', ');

function announce(message) {
  const el = $('status');
  el.textContent = '';
  // a tick later so repeated messages are still announced
  setTimeout(() => { el.textContent = message; }, 30);
}

/* ---------- Package illustrations (original, generic) ---------- */

function packageSvg(shape, c) {
  const shadow = '<ellipse cx="108" cy="178" rx="64" ry="9" fill="#2a1a1f" opacity=".22"/>';
  const lines = (x, y) =>
    `<rect x="${x}" y="${y}" width="52" height="6" rx="3" fill="${c.pack}"/>` +
    `<rect x="${x}" y="${y + 14}" width="34" height="6" rx="3" fill="${c.pack}" opacity=".75"/>`;
  let body = '';

  switch (shape) {
    case 'can':
      body =
        `<rect x="62" y="44" width="76" height="126" rx="10" fill="${c.pack}"/>` +
        `<ellipse cx="100" cy="46" rx="38" ry="8" fill="#2a1a1f" opacity=".14"/>` +
        `<rect x="62" y="80" width="76" height="56" fill="${c.label}"/>` + lines(74, 94);
      break;
    case 'box':
      body =
        `<rect x="52" y="34" width="96" height="136" rx="6" fill="${c.pack}"/>` +
        `<rect x="52" y="34" width="96" height="22" rx="6" fill="${c.label}"/>` +
        `<circle cx="100" cy="102" r="27" fill="${c.label}"/>` +
        `<rect x="72" y="146" width="56" height="7" rx="3.5" fill="${c.label}"/>`;
      break;
    case 'jar':
      body =
        `<rect x="66" y="32" width="68" height="24" rx="5" fill="${c.label}"/>` +
        `<rect x="56" y="54" width="88" height="116" rx="16" fill="${c.pack}"/>` +
        `<rect x="56" y="84" width="88" height="58" fill="${c.label}"/>` + lines(74, 100);
      break;
    case 'bottle':
      body =
        `<rect x="89" y="20" width="22" height="16" rx="3" fill="${c.label}"/>` +
        `<path d="M92 36h16v22c0 10 24 18 24 40v66c0 6-4 10-10 10H78c-6 0-10-4-10-10V98c0-22 24-30 24-40z" fill="${c.pack}"/>` +
        `<rect x="68" y="98" width="64" height="52" fill="${c.label}"/>` +
        `<circle cx="100" cy="124" r="14" fill="${c.pack}"/>`;
      break;
    case 'carton':
      body =
        `<path d="M62 64 L100 30 L138 64 V170 H62 Z" fill="${c.pack}"/>` +
        `<path d="M62 64 H138" stroke="#2a1a1f" stroke-opacity=".18" stroke-width="3"/>` +
        `<circle cx="100" cy="48" r="7" fill="${c.label}"/>` +
        `<rect x="62" y="92" width="76" height="48" fill="${c.label}"/>` + lines(74, 106);
      break;
    case 'bowl':
      body =
        `<path d="M82 90c-8-10 8-14 0-26M104 90c-8-10 8-14 0-26M126 90c-8-10 8-14 0-26" stroke="${c.pack}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
        `<path d="M38 102H162C162 146 134 172 100 172C66 172 38 146 38 102Z" fill="${c.pack}"/>` +
        `<ellipse cx="100" cy="102" rx="62" ry="12" fill="${c.label}"/>` +
        `<rect x="76" y="132" width="48" height="7" rx="3.5" fill="${c.label}"/>`;
      break;
    case 'bag':
    default:
      body =
        `<path d="M54 52L62 40 70 52 78 40 86 52 94 40 102 52 110 40 118 52 126 40 134 52 142 40 146 52 156 170H44Z" fill="${c.pack}"/>` +
        `<rect x="52" y="52" width="96" height="14" fill="${c.label}"/>` +
        `<circle cx="100" cy="116" r="25" fill="${c.label}"/>`;
  }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" focusable="false">${shadow}${body}</svg>`;
}

const paletteFor = (index) => PALETTE[index % PALETTE.length];

/* ---------- Aisle ---------- */

function renderAisle() {
  const aisle = $('aisle');
  aisle.textContent = '';

  state.aisle.forEach((product, index) => {
    const colors = paletteFor(index);

    const li = document.createElement('li');
    li.className = 'tile-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.index = String(index);
    btn.style.setProperty('--tile-bg', colors.bg);
    btn.setAttribute('aria-haspopup', 'dialog');

    const art = document.createElement('span');
    art.className = 'tile-art';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = packageSvg(product.shape, colors);

    const flag = document.createElement('span');
    flag.className = 'tile-flag';
    flag.hidden = true;

    const name = document.createElement('span');
    name.className = 'tile-name';
    name.textContent = product.name;

    btn.append(art, flag, name);
    btn.addEventListener('click', () => openProduct(index, btn));
    li.append(btn);
    aisle.append(li);
  });
}

function renderFilters() {
  const wrap = $('filter-chips');
  FILTER_KEYS.forEach((key) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('aria-pressed', 'false');
    chip.innerHTML = '<span class="chip-mark" aria-hidden="true">&#10003;</span>';
    chip.append(document.createTextNode(key));
    chip.addEventListener('click', () => {
      const on = !state.avoid.has(key);
      on ? state.avoid.add(key) : state.avoid.delete(key);
      chip.setAttribute('aria-pressed', String(on));
      applyFilters();
    });
    wrap.append(chip);
  });
}

function applyFilters() {
  let clear = 0;
  document.querySelectorAll('.tile').forEach((tile) => {
    const product = state.aisle[Number(tile.dataset.index)];
    const hits = allergenKeys(product).filter((k) => state.avoid.has(k));
    const flag = tile.querySelector('.tile-flag');
    tile.classList.toggle('is-flagged', hits.length > 0);
    flag.hidden = hits.length === 0;
    flag.textContent = hits.length ? `Contains ${list(hits)}` : '';
    if (!hits.length) clear += 1;
  });

  if (state.avoid.size === 0) {
    announce('Showing all products.');
  } else {
    announce(
      `${clear} of ${state.aisle.length} products have none of the allergens you chose to avoid: ` +
      `${list([...state.avoid])}.`
    );
  }
}

/* ---------- Dialog plumbing (shared) ---------- */

function openDialog(dialog, panelId) {
  dialog.dataset.closing = '';
  dialog.showModal();
  if (canAnimate()) {
    gsap.fromTo(`#${panelId}`,
      { opacity: 0, y: 28, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'all' });
  }
}

function closeDialog(dialog, panelId) {
  if (!dialog.open || dialog.dataset.closing === 'true') return;
  dialog.dataset.closing = 'true';
  const finish = () => dialog.close();
  if (canAnimate()) {
    gsap.to(`#${panelId}`, { opacity: 0, y: 16, duration: 0.18, ease: 'power1.in', onComplete: finish });
  } else {
    finish();
  }
}

function wireDialog(dialog, panelId, closeBtn, onClosed) {
  closeBtn.addEventListener('click', () => closeDialog(dialog, panelId));
  // Esc: take over so the close animation runs
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dialog, panelId); });
  // click on the dimmed backdrop
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(dialog, panelId); });
  dialog.addEventListener('close', () => {
    if (hasGsap()) gsap.set(`#${panelId}`, { clearProps: 'all' });
    onClosed();
  });
}

function destroyChart(name) {
  if (state.charts[name]) {
    state.charts[name].destroy();
    delete state.charts[name];
  }
}

function barChart(name, canvasId, labels, values, { max = 100, color = '#2a1a1f' } = {}) {
  destroyChart(name);
  if (typeof Chart === 'undefined') return; // list below the chart still carries the data
  state.charts[name] = new Chart($(canvasId), {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4, barThickness: 22 }] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: state.reducedMotion ? false : { duration: 600 },
      scales: {
        x: {
          min: 0, max,
          ticks: { callback: (v) => `${v}%`, color: '#2a1a1f' },
          grid: { color: 'rgba(42,26,31,.12)' },
        },
        y: { grid: { display: false }, ticks: { color: '#2a1a1f', font: { weight: '700' } } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x}% of recipes` } },
      },
    },
  });
}

/* ---------- Product overlay ---------- */

function bindOverlays() {
  const dialog = $('product-dialog');
  wireDialog(dialog, 'pd-panel', $('pd-close'), () => {
    destroyChart('product');
    if (state.opener) state.opener.focus();
  });

  $('pd-compare').addEventListener('click', () => openCompare(state.index, $('pd-compare')));
  $('pd-prev').addEventListener('click', () => step(-1));
  $('pd-next').addEventListener('click', () => step(1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  const insights = $('insights-dialog');
  wireDialog(insights, 'in-panel', $('in-close'), () => {
    destroyChart('allergens');
    destroyChart('split');
    $('insights-btn').focus();
  });
  $('insights-btn').addEventListener('click', openInsights);

  const compare = $('compare-dialog');
  wireDialog(compare, 'cp-panel', $('cp-close'), () => {
    destroyChart('matrix');
    destroyChart('radar');
    if (state.compareOpener) state.compareOpener.focus();
  });
  $('compare-btn').addEventListener('click', () => openCompare(null, $('compare-btn')));
  $('cp-a').addEventListener('change', () => renderCompare(true));
  $('cp-b').addEventListener('change', () => renderCompare(true));
  $('cp-swap').addEventListener('click', () => {
    const a = $('cp-a').value;
    $('cp-a').value = $('cp-b').value;
    $('cp-b').value = a;
    renderCompare(true);
  });
}

function openProduct(index, trigger) {
  state.index = index;
  state.opener = trigger;
  renderProduct(0);
  openDialog($('product-dialog'), 'pd-panel');
  $('pd-title').focus();
}

function step(direction) {
  const n = state.aisle.length;
  state.index = (state.index + direction + n) % n;
  renderProduct(direction);
  const p = state.aisle[state.index];
  $('pd-live').textContent = `${p.name}, product ${state.index + 1} of ${n}.`;
}

function chip(text, cls) {
  const el = document.createElement('li');
  el.className = cls;
  el.textContent = text;
  return el;
}

function ingredientRow(label, items) {
  const row = document.createElement('div');
  row.className = 'ing-row';
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  if (items.length === 0) {
    const none = document.createElement('span');
    none.className = 'ing-none';
    none.textContent = 'None listed';
    dd.append(none);
  } else {
    items.forEach((text) => {
      const span = document.createElement('span');
      span.className = 'ing-chip';
      span.textContent = text;
      dd.append(span);
    });
  }
  row.append(dt, dd);
  return row;
}

function renderProduct(direction) {
  const n = state.aisle.length;
  const i = state.index;
  const p = state.aisle[i];
  const colors = paletteFor(i);

  $('pd-counter').textContent = `Product ${i + 1} of ${n}`;
  $('pd-category').textContent = p.category || '';
  $('pd-title').textContent = p.name;

  const ingCount = ingredientList(p).length;
  $('pd-h-ingredients').textContent = `Ingredients (${ingCount})`;
  $('pd-ing-note').textContent = ingCount === 1
    ? 'Only 1 ingredient is listed for this product in the dataset.'
    : `All ${ingCount} ingredients listed in the dataset, grouped by its own columns.`;

  const art = $('pd-art');
  art.style.setProperty('--tile-bg', colors.bg);
  art.innerHTML = packageSvg(p.shape, colors);

  // ingredients
  const dl = $('pd-ingredients');
  dl.textContent = '';
  dl.append(
    ingredientRow('Main ingredient', p.main ? [p.main] : []),
    ingredientRow('Sweetener', p.sweetener),
    ingredientRow('Fat / oil', p.fatOil),
    ingredientRow('Seasoning & extras', p.seasoning),
  );

  // allergens
  const allergens = $('pd-allergens');
  allergens.textContent = '';
  if (p.allergens.length === 0) {
    allergens.append(chip('No allergens listed in this dataset', 'badge badge--neutral'));
  } else {
    p.allergens.forEach((a) => allergens.append(chip(`⚠ ${a}`, 'badge badge--warn')));
  }

  // dietary facts
  const diet = $('pd-diet');
  diet.textContent = '';
  Object.entries(DIET_LABELS).forEach(([key, [yes, no]]) => {
    const ok = p.dietary[key];
    diet.append(chip(`${ok ? '✓' : '✕'} ${ok ? yes : no}`, `badge ${ok ? 'badge--yes' : 'badge--no'}`));
  });

  renderCommon(p);

  // prev / next labels
  $('pd-prev-name').textContent = state.aisle[(i - 1 + n) % n].name;
  $('pd-next-name').textContent = state.aisle[(i + 1) % n].name;
  $('pd-prev').setAttribute('aria-label', `Previous product: ${state.aisle[(i - 1 + n) % n].name}`);
  $('pd-next').setAttribute('aria-label', `Next product: ${state.aisle[(i + 1) % n].name}`);

  if (direction !== 0 && canAnimate()) {
    gsap.fromTo('#pd-content', { opacity: 0, x: direction * 40 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
    gsap.fromTo('#pd-art svg', { opacity: 0, rotate: direction * -6, scale: 0.9 }, { opacity: 1, rotate: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)', clearProps: 'all' });
    $('pd-scroll').scrollTop = 0;
  }
}

function renderCommon(product) {
  const keys = allergenKeys(product);
  const box = $('pd-chart-box');
  const listEl = $('pd-common-list');
  const intro = $('pd-common-intro');
  listEl.textContent = '';

  if (keys.length === 0) {
    intro.textContent = 'This product lists no allergens, so there is nothing to compare.';
    box.hidden = true;
    destroyChart('product');
    return;
  }

  const rows = keys
    .map((key) => ({ key, count: state.stats.counts[key] || 0 }))
    .sort((a, b) => b.count - a.count);

  intro.textContent = `Share of the ${state.stats.n} recipes in the dataset that list each of this product's allergens.`;
  box.hidden = false;
  box.style.height = `${Math.max(96, rows.length * 38 + 48)}px`;

  barChart('product', 'pd-chart', rows.map((r) => r.key), rows.map((r) => pct(r.count)));

  rows.forEach((r) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><span class="num"></span>';
    li.children[0].textContent = r.key;
    li.children[1].textContent = `${pct(r.count)}% (${r.count} of ${state.stats.n})`;
    listEl.append(li);
  });
}

/* ==========================================================
   STRUGGLE BUS: the compare charts (Chart.js 4.6.1)
   Full write-up: STRUGGLE_BUS.md

   WHAT I WANT: a Venn diagram (or a matrix / heat map) that shows WHICH
   ingredients and allergens two products share.
   WHAT CHART.JS HAS: no Venn, matrix or heat-map chart type. The page says so.
   WHAT I SHOW INSTEAD: the nearest built-in chart, a pie. It can only show HOW
   MANY items are shared / only A / only B, never WHICH ones, and it cannot show
   the overlap as overlapping shapes. The lists under each pie carry the
   "which". The pie is a substitute, not a way of getting the Venn out of
   Chart.js. No workarounds are used.

   [open] Canvas is a bitmap: no keyboard focus, nothing for a screen reader.
          The canvases are aria-hidden and the lists carry the same data.
   ========================================================== */

/* ---------- Compare overlay ---------- */

const COLOR = { a: '#e8463a', b: '#2f7fa0', both: '#2a1a1f', ink: '#2a1a1f' };

function fillPickers() {
  ['cp-a', 'cp-b'].forEach((id) => {
    const sel = $(id);
    sel.textContent = '';
    state.aisle.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = p.name;
      sel.append(opt);
    });
  });
}

/* A product cannot be compared with itself, so grey it out in the other list. */
function syncPickerOptions() {
  const a = $('cp-a').value;
  const b = $('cp-b').value;
  [...$('cp-a').options].forEach((o) => { o.disabled = o.value === b; });
  [...$('cp-b').options].forEach((o) => { o.disabled = o.value === a; });
}

function openCompare(aIndex, trigger) {
  const n = state.aisle.length;
  state.compareOpener = trigger;
  if (!$('cp-a').options.length) {
    fillPickers();
    $('cp-a').value = '0';
    $('cp-b').value = '1';
  }
  if (aIndex !== null && aIndex !== undefined) {
    $('cp-a').value = String(aIndex);
    if ($('cp-b').value === String(aIndex)) $('cp-b').value = String((aIndex + 1) % n);
  }
  openDialog($('compare-dialog'), 'cp-panel');   // open first: Chart.js needs a visible canvas to measure
  renderCompare(false);
  $('cp-title').focus();
}

function setColumn(kind, title, items) {
  const col = document.createElement('section');
  col.className = `set set--${kind}`;
  const h = document.createElement('h4');
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  h.append(mark, document.createTextNode(`${title} (${items.length})`));
  const ul = document.createElement('ul');
  if (items.length === 0) {
    const none = document.createElement('li');
    none.className = 'none';
    none.textContent = 'None';
    ul.append(none);
  } else {
    items.forEach((i) => {
      const li = document.createElement('li');
      li.className = 'ing-chip';
      li.textContent = i.name;
      ul.append(li);
    });
  }
  col.append(h, ul);
  return col;
}

function renderSets(container, a, b, sets) {
  container.textContent = '';
  container.append(
    setColumn('a', `Only in ${a.name}`, sets.onlyA),
    setColumn('both', 'In both', sets.both),
    setColumn('b', `Only in ${b.name}`, sets.onlyB),
  );
}

function renderCompare(animate) {
  syncPickerOptions();
  const a = state.aisle[Number($('cp-a').value)];
  const b = state.aisle[Number($('cp-b').value)];

  const ing = compareSets(ingredientList(a), ingredientList(b));
  const all = compareSets(allergenItems(a), allergenItems(b));
  const ingTotal = ing.both.length + ing.onlyA.length + ing.onlyB.length;
  const allTotal = all.both.length + all.onlyA.length + all.onlyB.length;

  $('cp-summary').textContent =
    `${a.name} and ${b.name} share ${ing.both.length} of ${ingTotal} ingredients` +
    (allTotal === 0
      ? ' and neither lists any allergens.'
      : ` and ${all.both.length} of ${allTotal} allergens.`);

  renderSets($('cp-ing-sets'), a, b, ing);
  renderSets($('cp-all-sets'), a, b, all);
  ingredientMatrix(a, b, ing);
  allergenRadar(a, b, all);

  if (animate && canAnimate()) {
    gsap.fromTo('#cp-content .set li',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.012, clearProps: 'all' });
  }
}

/* Chart.js will not wrap a long category label by itself, and on a narrow
   screen it drops or tilts it. Break the name into lines ourselves. */
/* One pie for a comparison: only A / in both / only B, by count.
   Built-in 'pie' type, default options apart from my palette and legend text. */
function comparePie(key, canvasId, a, b, sets) {
  destroyChart(key);
  if (typeof Chart === 'undefined') return;
  const counts = [sets.onlyA.length, sets.both.length, sets.onlyB.length];
  const labels = [`Only ${a.name}`, 'In both', `Only ${b.name}`];
  state.charts[key] = new Chart($(canvasId), {
    type: 'pie',
    data: {
      labels: labels.map((l, i) => `${l} (${counts[i]})`),
      datasets: [{ data: counts, backgroundColor: [COLOR.a, COLOR.both, COLOR.b] }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function ingredientMatrix(a, b, sets) {
  comparePie('matrix', 'cp-matrix', a, b, sets);
}

function allergenRadar(a, b, sets) {
  destroyChart('radar');
  const box = $('cp-radar-box');
  const note = $('cp-all-note');
  const total = sets.both.length + sets.onlyA.length + sets.onlyB.length;
  if (total === 0) {
    note.textContent = 'Neither product lists an allergen, so there is nothing to chart.';
    box.hidden = true;
    return;
  }
  note.textContent = 'Pie slices show how many allergens are shared or unique to each product, not which ones.';
  box.hidden = false;
  comparePie('radar', 'cp-radar', a, b, sets);
}

/* ---------- Insights overlay ---------- */

function openInsights() {
  const { n, counts, withAllergen } = state.stats;
  $('in-intro').textContent =
    `${n} unique recipes after removing exact duplicates. ${state.aisle.length} are on the shelves.`;

  const rows = FILTER_KEYS
    .map((key) => ({ key, count: counts[key] || 0 }))
    .sort((a, b) => b.count - a.count);

  openDialog($('insights-dialog'), 'in-panel');

  barChart('allergens', 'in-chart-allergens', rows.map((r) => r.key), rows.map((r) => pct(r.count)), { color: '#e8463a' });

  const al = $('in-allergen-list');
  al.textContent = '';
  rows.forEach((r) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><span class="num"></span>';
    li.children[0].textContent = r.key;
    li.children[1].textContent = `${pct(r.count)}% (${r.count})`;
    al.append(li);
  });

  const none = n - withAllergen;
  destroyChart('split');
  if (typeof Chart !== 'undefined') {
    state.charts.split = new Chart($('in-chart-split'), {
      type: 'doughnut',
      data: {
        labels: ['Lists at least one allergen', 'No allergens listed'],
        datasets: [{ data: [withAllergen, none], backgroundColor: ['#2a1a1f', '#f7b955'], borderColor: '#f6e9d2', borderWidth: 3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        animation: state.reducedMotion ? false : { duration: 600 },
        plugins: { legend: { position: 'right', labels: { color: '#2a1a1f', font: { weight: '700' } } } },
      },
    });
  }

  const sp = $('in-split-list');
  sp.textContent = '';
  [['Lists at least one allergen', withAllergen], ['No allergens listed', none]].forEach(([label, value]) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><span class="num"></span>';
    li.children[0].textContent = label;
    li.children[1].textContent = `${Math.round((value / n) * 100)}% (${value})`;
    sp.append(li);
  });

  $('in-title').focus();
}

init();
