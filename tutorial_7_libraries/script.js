// ============================================
// TUTORIAL 7: YOUR DATA -> THE LIBRARY'S DATA
// Run this page with Live Server. TODO 1 is in index.html; TODOs 2-5 are below.
// ============================================
// Chart.js doesn't take your array of restaurants. Each kind of chart wants
// the data in its own shape. Most of the work is reshaping.
 
// Saved outside every function, so every button can use them
let restaurants = [];
let priceCounts = {};
let priceLabels = [];
let priceNumbers = [];
 
// ============================================
// TODO 1 is in index.html: add the <script> tag for Chart.js
// ============================================
 
// ============================================
// TODO 2: COUNT, THEN SPLIT INTO TWO LISTS
// ============================================
 
document.querySelector('#make-lists').addEventListener('click', () => {
  priceCounts = {};
 
  restaurants.forEach((restaurant) => {
    const price = restaurant.priceRange;
    priceCounts[price] = (priceCounts[price] || 0) + 1;
  });
 
  priceLabels = Object.keys(priceCounts);
  priceNumbers = Object.values(priceCounts);
 
  showShape('#lists-output', `labels  = ${toText(priceLabels)}\nnumbers = ${toText(priceNumbers)}`);
  setButton('#draw-bar', true);
  setButton('#order-bars', true);
});
 
// ============================================
// TODO 3: A BAR CHART, AND A SENTENCE FOR PEOPLE WHO CAN'T SEE IT
// ============================================
 
document.querySelector('#draw-bar').addEventListener('click', () => {
  drawChart('#bar-chart', {
    type: 'bar',
    data: {
      labels: priceLabels,
      datasets: [{ label: 'Restaurants', data: priceNumbers }]
    },
    options: {
      plugins: { title: { display: true, text: 'Number of restaurants by price range' } },
      scales: {
        x: { title: { display: true, text: 'Price range' } },
        y: {
          title: { display: true, text: 'Number of restaurants' },
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
 
  const total = priceNumbers.reduce((sum, n) => sum + n, 0);
  const parts = priceLabels.map((label, i) => `${priceNumbers[i]} at ${label}`).join(', ');
  document.querySelector('#bar-summary').textContent =
    `Bar chart of ${total} restaurants by price range: ${parts}.`;
});
 
// ============================================
// TODO 4: PUT THE BARS IN ORDER
// ============================================
 
document.querySelector('#order-bars').addEventListener('click', () => {
  const priceOrder = ['$', '$$', '$$$', '$$$$'];
 
  priceLabels = priceOrder;
  priceNumbers = priceOrder.map((price) => {
    return priceCounts[price] || 0;
  });
 
  showShape('#order-output', `labels  = ${toText(priceLabels)}\nnumbers = ${toText(priceNumbers)}`);
});
 
// ============================================
// TODO 5: ONE POINT PER RESTAURANT
// ============================================
 
document.querySelector('#draw-scatter').addEventListener('click', () => {
  const points = restaurants.map((restaurant) => {
    return { x: restaurant.priceRange.length, y: restaurant.rating };
  });
 
  showShape('#points-output', `points = ${toText(points)}`);
 
  drawChart('#scatter-chart', {
    type: 'scatter',
    data: { datasets: [{ label: 'Restaurants', data: points }] },
    options: {
      plugins: { title: { display: true, text: 'Rating by price level' } },
      scales: {
        x: {
          title: { display: true, text: 'Price level ($ signs)' },
          min: 0,
          max: 5,
          ticks: { stepSize: 1 }
        },
        y: {
          title: { display: true, text: 'Rating (out of 5)' },
          min: 3.5,
          max: 5
        }
      }
    }
  });
 
  const ratings = points.map((point) => point.y);
  const low = Math.min(...ratings);
  const high = Math.max(...ratings);
  document.querySelector('#scatter-summary').textContent =
    `Scatter chart of ${points.length} restaurants: ratings range from ${low} to ${high}, and the most expensive ($$$$) restaurant has the highest rating.`;
});
 
// ============================================
// HELPERS - PROVIDED, no need to change these
// ============================================
 
// Load the restaurants when the page opens (the async/await code from Tutorial 6)
async function loadRestaurants() {
  try {
    const response = await fetch('./restaurants.json');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    restaurants = await response.json();
    setButton('#make-lists', true);
    setButton('#draw-scatter', true);
    showShape('#data-status', `Loaded ${restaurants.length} restaurants`);
  } catch (error) {
    console.error('Loading failed:', error);
    showShape('#data-status', 'Could not load the restaurants. Is Live Server running?');
  }
}
 
// Say whether Chart.js has loaded (TODO 1)
function showLibraryStatus() {
  const status = document.querySelector('#library-status');
  if (typeof Chart === 'undefined') {
    status.textContent = "Chart.js isn't loaded yet. Add its <script> tag to index.html (TODO 1).";
    status.className = 'library-status missing';
  } else {
    status.textContent = `Chart.js ${Chart.version} is loaded.`;
    status.className = 'library-status loaded';
  }
}
 
// Draw a chart into a <canvas>, replacing any chart already there
function drawChart(canvasSelector, settings) {
  if (typeof Chart === 'undefined') {
    showLibraryStatus();
    return;
  }
  const canvas = document.querySelector(canvasSelector);
  const existing = Chart.getChart(canvas);
  if (existing) {
    existing.destroy();
  }
  new Chart(canvas, settings);
}
 
// Write a list or value the way it looks in code
function toText(value) {
  if (Array.isArray(value)) {
    return `[${value.map(toText).join(', ')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return `{ ${Object.keys(value).map((key) => `${key}: ${toText(value[key])}`).join(', ')} }`;
  }
  return typeof value === 'string' ? `'${value}'` : String(value);
}
 
function showShape(selector, text) {
  document.querySelector(selector).textContent = text;
}
 
function setButton(selector, enabled) {
  document.querySelector(selector).disabled = !enabled;
}
 
showLibraryStatus();
loadRestaurants();