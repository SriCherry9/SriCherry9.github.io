
/**
 * TABLE VIEW - STUDENTS IMPLEMENT
 * Display data in sortable rows - good for scanning specific information
 */

// The 15 food safety checks. Each is "In Compliance" or "Out of Compliance".
const CHECK_FIELDS = [
  'food_from_approved_source',
  'food_protected_from',
  'ill_workers_restricted',
  'proper_hand_washing',
  'cooling_time_and_temperature',
  'cold_holding_temperature',
  'hot_holding_temperature',
  'cooking_time_and_temperature',
  'reheating_time_and_temperature',
  'hot_and_cold_running_water',
  'proper_sewage_disposal',
  'no_bare_hand_contact',
  'adequate_hand_washing',
  'rodent_and_insects',
  'food_contact_surfaces_and',
];

// This dataset writes missing values as "------" or "N/A".
function isMissing(value) {
  return value === undefined || value === null || value === '------' || value === 'N/A';
}

function orNotListed(value) {
  return isMissing(value) ? 'Not listed' : value;
}

// Stops names like "FIVE GUYS BURGERS & FRIES" or "NATURE'S SMOOTHIES" from breaking the HTML
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "DISTRICT HTS" and "Riverdale" -> "District Hts" and "Riverdale"
function toTitleCase(text) {
  return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Transformation: one inspection record -> how many of its 15 checks were "Out of Compliance"
function countFailedChecks(inspection) {
  return CHECK_FIELDS.filter((field) => inspection[field] === 'Out of Compliance').length;
}

// Each column says how to get a sortable value and how to show it.
// A sortable value of null means "missing", and those rows always sort last.
const COLUMNS = [
  {
    key: 'name',
    label: 'Business',
    sortValue: (i) => i.name,
    show: (i) => escapeHtml(i.name),
    header: true,
  },
  {
    key: 'city',
    label: 'City',
    sortValue: (i) => (isMissing(i.city) ? null : i.city.toLowerCase()),
    show: (i) => escapeHtml(isMissing(i.city) ? 'Not listed' : toTitleCase(i.city)),
  },
  {
    key: 'category',
    label: 'Type of business',
    sortValue: (i) => (isMissing(i.category) ? null : i.category),
    show: (i) => escapeHtml(orNotListed(i.category)),
  },
  {
    key: 'date',
    label: 'Inspected',
    sortValue: (i) => (isMissing(i.inspection_date) ? null : i.inspection_date), // ISO strings sort correctly
    show: (i) => (isMissing(i.inspection_date) ? 'Not listed' : formatDate(i.inspection_date)),
  },
  {
    key: 'result',
    label: 'Result',
    sortValue: (i) => (isMissing(i.inspection_results) ? null : i.inspection_results),
    show: (i) => escapeHtml(orNotListed(i.inspection_results)),
  },
  {
    key: 'failed',
    label: 'Checks out of compliance',
    sortValue: (i) => countFailedChecks(i),
    show: (i) => `${countFailedChecks(i)} of ${CHECK_FIELDS.length}`,
  },
];

// Current sort: worst inspections first, which is what an inspector planning visits wants to see
let sortState = { key: 'failed', direction: 'desc' };
let currentData = [];

function sortRows(data) {
  const column = COLUMNS.find((c) => c.key === sortState.key);
  const factor = sortState.direction === 'asc' ? 1 : -1;

  return [...data].sort((a, b) => {
    const valueA = column.sortValue(a);
    const valueB = column.sortValue(b);

    // Missing values always go to the bottom, whichever way we sort
    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return 1;
    if (valueB === null) return -1;

    if (typeof valueA === 'number') return (valueA - valueB) * factor;
    return valueA.localeCompare(valueB) * factor;
  });
}

function sortDescription() {
  const column = COLUMNS.find((c) => c.key === sortState.key);
  const direction = sortState.direction === 'asc' ? 'low to high (A to Z, oldest first)' : 'high to low (Z to A, newest first)';
  return `Sorted by ${column.label.toLowerCase()}, ${direction}.`;
}

function buildTable(data) {
  const headerCells = COLUMNS.map((column) => {
    const isSorted = column.key === sortState.key;
    const ariaSort = isSorted ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : null;
    const arrow = isSorted ? (sortState.direction === 'asc' ? '▲' : '▼') : '↕';
    return /*html*/ `
      <th scope="col" ${ariaSort ? `aria-sort="${ariaSort}"` : ''}>
        <button type="button" class="sort-button" data-sort="${column.key}">
          ${column.label} <span aria-hidden="true">${arrow}</span>
        </button>
      </th>`;
  }).join('');

  const rows = sortRows(data)
    .map((inspection) => {
      const cells = COLUMNS.map((column) =>
        column.header
          ? `<th scope="row">${column.show(inspection)}</th>`
          : `<td>${column.show(inspection)}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return /*html*/ `
    <table class="restaurant-table">
      <caption>
        Food safety inspections in Prince George's County, one row per inspection (${data.length} in total).
        ${sortDescription()} Select a column heading to sort.
      </caption>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// script.js only calls showTable() and puts the returned HTML on the page,
// so the click handler for sorting is attached once to the container that already exists.
function attachSortListener() {
  const container = document.getElementById('data-display');
  if (!container || container.dataset.tableSortBound) return;
  container.dataset.tableSortBound = 'true';

  container.addEventListener('click', (event) => {
    const button = event.target.closest('.sort-button');
    if (!button) return;

    const key = button.dataset.sort;
    if (sortState.key === key) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Numbers and dates are most useful biggest/newest first; text is most useful A to Z
      sortState = { key, direction: key === 'failed' || key === 'date' ? 'desc' : 'asc' };
    }

    document.getElementById('table-wrapper').innerHTML = buildTable(currentData);
    document.getElementById('sort-status').textContent = sortDescription();

    // The table was redrawn, so put keyboard focus back on the heading the person just used
    const newButton = document.querySelector(`.sort-button[data-sort="${key}"]`);
    if (newButton) newButton.focus();
  });
}

function showTable(data) {
  currentData = data;
  sortState = { key: 'failed', direction: 'desc' };
  attachSortListener();

  /*html*/
  return `
                <h2 class="view-title">📊 Table View</h2>
                <p class="view-description">For planning inspection visits: sort to find the places with the most problems, or the oldest inspections.</p>
                <p id="sort-status" class="sr-only" aria-live="polite"></p>
                <div id="table-wrapper" class="table-scroll" tabindex="0" role="region" aria-label="Inspections table. Scrolls sideways on small screens.">
                    ${buildTable(data)}
                </div>
            `;
}

export default showTable;