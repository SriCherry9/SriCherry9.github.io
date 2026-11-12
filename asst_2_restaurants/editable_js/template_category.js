/**
 * CATEGORY VIEW - STUDENTS IMPLEMENT
 * Group data by categories
 */

/**
 * CATEGORY VIEW
 * Audience: a reporter (or anyone) comparing types of business.
 * Goal: which kinds of places have the most inspections, and which tend to fail the most checks?
 * Groups are ranked by the average number of "Out of Compliance" checks per inspection.
 */

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

function isMissing(value) {
  return value === undefined || value === null || value === '------' || value === 'N/A';
}

function orNotListed(value) {
  return isMissing(value) ? 'Not listed' : value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toTitleCase(text) {
  return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function countFailedChecks(inspection) {
  return CHECK_FIELDS.filter((field) => inspection[field] === 'Out of Compliance').length;
}

/**
 * Transformation: flat array of inspections -> array of groups.
 *
 * Before: [{ name: 'WINGSTOP', category: 'Fast Food - Chain', ... }, ...]
 * After:  [{ name: 'Fast Food - Chain', items: [...], count: 29, average: 0.45 }, ...]
 */
function buildGroups(data) {
  const byCategory = {};
  data.forEach((inspection) => {
    const key = orNotListed(inspection.category);
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(inspection);
  });

  return Object.entries(byCategory)
    .map(([name, items]) => {
      const totalFailed = items.reduce((sum, item) => sum + countFailedChecks(item), 0);
      return {
        name,
        count: items.length,
        average: totalFailed / items.length,
        // Newest inspection first inside each group
        items: [...items].sort((a, b) => String(b.inspection_date).localeCompare(String(a.inspection_date))),
      };
    })
    .sort((a, b) => b.average - a.average || b.count - a.count);
}

function renderItem(inspection) {
  const failed = countFailedChecks(inspection);
  const city = isMissing(inspection.city) ? 'Not listed' : toTitleCase(inspection.city);
  const date = isMissing(inspection.inspection_date) ? 'Not listed' : formatDate(inspection.inspection_date);

  return /*html*/ `
    <li class="category-item">
      <div>
        <strong>${escapeHtml(inspection.name)}</strong><br>
        <span class="item-detail">${escapeHtml(city)} · Inspected ${date}</span>
      </div>
      <div class="item-side">
        <span class="item-detail">${escapeHtml(orNotListed(inspection.inspection_results))}</span><br>
        <span class="failed-badge ${failed > 0 ? 'has-failures' : ''}">${failed} of ${CHECK_FIELDS.length} checks out of compliance</span>
      </div>
    </li>`;
}

function renderGroup(group, maxAverage) {
  const barWidth = maxAverage > 0 ? Math.round((group.average / maxAverage) * 100) : 0;

  return /*html*/ `
    <details class="category-section">
      <summary class="category-summary">
        <span class="category-name">
          <h3>${escapeHtml(group.name)}</h3>
          <span class="category-count">${group.count} inspection${group.count === 1 ? '' : 's'}</span>
        </span>
        <span class="category-average">
          <span>Average <strong>${group.average.toFixed(2)}</strong> checks out of compliance</span>
          <span class="avg-bar" aria-hidden="true"><span class="avg-bar-fill" style="width: ${barWidth}%"></span></span>
        </span>
      </summary>
      <ul class="category-items">
        ${group.items.map(renderItem).join('')}
      </ul>
    </details>`;
}

function showCategories(data) {
  const groups = buildGroups(data);
  const maxAverage = Math.max(...groups.map((group) => group.average));

  /*html*/
  return `
                <h2 class="view-title">📂 Category View</h2>
                <p class="view-description">
                    Types of business, ranked by the average number of food safety checks each inspection found out of compliance (out of ${CHECK_FIELDS.length}).
                    Open a group to see its inspections.
                </p>
                ${groups.map((group) => renderGroup(group, maxAverage)).join('')}
            `;
}

export default showCategories;