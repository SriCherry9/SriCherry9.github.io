/**
 * CHARTS VIEW - STUDENTS IMPLEMENT
 * Show patterns in your data as charts, using Chart.js
 *
 * This view has two parts:
 *   showCharts(data) returns the HTML: one <canvas> per chart, with a text alternative under each
 *   drawCharts(data) runs after that HTML is on the page, and draws a chart into each <canvas>
 *
 * Chart.js docs: https://www.chartjs.org/docs/latest/getting-started/
 */

// Keys are the field names in the data; values are readable labels for the chart
const CHECK_LABELS = {
  food_from_approved_source: 'Food from approved source',
  food_protected_from: 'Food protected from contamination',
  ill_workers_restricted: 'Ill workers restricted',
  proper_hand_washing: 'Proper hand washing',
  cooling_time_and_temperature: 'Cooling time and temperature',
  cold_holding_temperature: 'Cold holding temperature',
  hot_holding_temperature: 'Hot holding temperature',
  cooking_time_and_temperature: 'Cooking time and temperature',
  reheating_time_and_temperature: 'Reheating time and temperature',
  hot_and_cold_running_water: 'Hot and cold running water',
  proper_sewage_disposal: 'Proper sewage disposal',
  no_bare_hand_contact: 'No bare hand contact',
  adequate_hand_washing: 'Adequate hand washing facilities',
  rodent_and_insects: 'Rodents and insects',
  food_contact_surfaces_and: 'Food contact surfaces',
};
 
const PIE_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
];
 
// Splits a long label into short lines so it never gets cut off or collides with the axis title
function wrapLabel(text, max = 22) {
  const lines = [];
  let line = '';
  text.split(' ').forEach((word) => {
    if ((line + ' ' + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  });
  lines.push(line);
  return lines;
}
 
function isMissing(value) {
  return value === undefined || value === null || value === '------' || value === 'N/A';
}
 
function orNotListed(value) {
  return isMissing(value) ? 'Not listed' : value;
}
 
// Turns an array of records into [[label, count], ...], biggest first.
// getLabel says which label a record belongs to.
function countBy(data, getLabel) {
  const counts = {};
  data.forEach((item) => {
    const label = getLabel(item);
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
 
// Transformation: records -> chart-ready { labels, numbers } for each of the three charts
function buildChartData(data) {
  // Chart 1: inspections per type of business
  const byCategory = countBy(data, (item) => orNotListed(item.category));
 
  // Chart 2: inspections per result
  const byResult = countBy(data, (item) => orNotListed(item.inspection_results));
 
  // Chart 3: for each of the 15 checks, how many inspections were "Out of Compliance"?
  const failedChecks = Object.keys(CHECK_LABELS)
    .map((field) => [
      CHECK_LABELS[field],
      data.filter((item) => item[field] === 'Out of Compliance').length,
    ])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
 
  return {
    category: { labels: byCategory.map((row) => row[0]), numbers: byCategory.map((row) => row[1]) },
    result: { labels: byResult.map((row) => row[0]), numbers: byResult.map((row) => row[1]) },
    failed: { labels: failedChecks.map((row) => row[0]), numbers: failedChecks.map((row) => row[1]) },
  };
}
 
function showCharts(data) {
  const charts = buildChartData(data);
  const total = data.length;
 
  // Text alternatives are built from the same numbers the charts use, so they can never disagree
  const categorySummary = `${charts.category.labels[0]} had the most inspections: ${charts.category.numbers[0]} of ${total}, across ${charts.category.labels.length} types of business.`;
  const resultShare = Math.round((charts.result.numbers[0] / total) * 100);
  const resultSummary = `The most common inspection result was "${charts.result.labels[0]}": ${charts.result.numbers[0]} of ${total} inspections (${resultShare}%).`;
  const failedSummary = charts.failed.labels.length
    ? `"${charts.failed.labels[0]}" was the check most often out of compliance: ${charts.failed.numbers[0]} of ${total} inspections.`
    : 'No checks were out of compliance in these inspections.';
 
  // Horizontal bar charts need room for every label, so height grows with the number of bars
  const categoryHeight = charts.category.labels.length * 30 + 120;
  const failedHeight = Math.max(charts.failed.labels.length * 44 + 120, 420);
 
  /*html*/
  return `
                <h2 class="view-title">📈 Charts View</h2>
                <p class="view-description">Patterns in the data at a glance</p>
                <div class="charts-grid">
                    <figure class="chart-figure chart-tall">
                        <div class="chart-box" style="height: ${categoryHeight}px">
                            <canvas id="chart-one" role="img" aria-label="Bar chart: inspections by type of business"></canvas>
                        </div>
                        <figcaption class="chart-summary">${categorySummary}</figcaption>
                    </figure>
                    <figure class="chart-figure">
                        <div class="chart-box" style="height: 420px">
                            <canvas id="chart-two" role="img" aria-label="Pie chart: inspections by result"></canvas>
                        </div>
                        <figcaption class="chart-summary">${resultSummary}</figcaption>
                    </figure>
                    <figure class="chart-figure">
                        <div class="chart-box" style="height: ${failedHeight}px">
                            <canvas id="chart-three" role="img" aria-label="Bar chart: food safety checks most often out of compliance"></canvas>
                        </div>
                        <figcaption class="chart-summary">${failedSummary}</figcaption>
                    </figure>
                </div>
            `;
}
 
function drawCharts(data) {
  // Chart.js is loaded by a <script> tag in index.html. If it didn't load, say so instead of breaking.
  if (typeof Chart === 'undefined') {
    document.querySelector('.charts-grid').innerHTML =
      '<p class="error">Chart.js did not load, so the charts can\'t be drawn. Check the &lt;script&gt; tag in index.html.</p>';
    return;
  }
 
  const charts = buildChartData(data);
 
  // Chart 1: bar (horizontal, so long business-type names stay readable)
  new Chart(document.querySelector('#chart-one'), {
    type: 'bar',
    data: {
      labels: charts.category.labels.map((l) => wrapLabel(l)),
      datasets: [{ label: 'Number of inspections', data: charts.category.numbers, backgroundColor: '#007cba' }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: 'Inspections by type of business', font: { size: 16 } },
        legend: { display: false },
      },
      scales: {
        x: { title: { display: true, text: 'Number of inspections' }, beginAtZero: true, ticks: { precision: 0 } },
        y: { title: { display: true, text: 'Type of business', padding: { bottom: 8 } }, ticks: { autoSkip: false } },
      },
    },
  });
 
  // Chart 2: pie (a pie has no axes, so it only needs a title and a legend)
  new Chart(document.querySelector('#chart-two'), {
    type: 'pie',
    data: {
      labels: charts.result.labels,
      datasets: [
        {
          label: 'Inspections',
          data: charts.result.numbers,
          backgroundColor: charts.result.labels.map((_, index) => PIE_COLORS[index % PIE_COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: 'Inspections by result', font: { size: 16 } },
        legend: { position: 'bottom' },
      },
    },
  });
 
  // Chart 3: bar (horizontal), showing which checks fail most often
  new Chart(document.querySelector('#chart-three'), {
    type: 'bar',
    data: {
      labels: charts.failed.labels.map((l) => wrapLabel(l)),
      datasets: [{ label: 'Inspections with this check out of compliance', data: charts.failed.numbers, backgroundColor: '#c0392b' }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: 'Food safety checks most often out of compliance', font: { size: 16 } },
        legend: { display: false },
      },
      scales: {
        x: { title: { display: true, text: 'Inspections out of compliance' }, beginAtZero: true, ticks: { precision: 0 } },
        y: { title: { display: true, text: 'Food safety check', padding: { bottom: 8 } }, ticks: { autoSkip: false } },
      },
    },
  });
}
 
export { showCharts, drawCharts };
 