// ============================================
// DATA LOADING - Students modify this
// ============================================
/**
 *
 * Save your slice of public data in this folder as a *.json file
 * with a new name - not "data"
 * and point fetch() at it.
 *
 * Remember: fetch() only works when the page is served (Live Server, or GitHub Pages),
 * not when you double-click index.html.
 */
async function loadData() {
  try {
    // inspections.json holds 150 Prince George's County food inspections
    const response = await fetch('./inspections.json');
    const data = await response.json();
    console.log('data loaded', data);
 
    return data;
  } catch (error) {
    console.error('Failed to load data:', error);
    throw new Error('Could not load data. Is the page running in Live Server?');
  }
}
 
export default loadData;
 