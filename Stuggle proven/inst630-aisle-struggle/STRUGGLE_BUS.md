# Struggle bus: the compare visualisation (Chart.js 4.6.1)

**Library element:** Chart.js pie chart, used to compare two products' ingredients and allergens.
**Where:** `comparePie()` in `app.js` (STRUGGLE BUS comment block above the compare section). The same message is shown on the page, at the top of the compare overlay.

## What I want
A Venn diagram (or a matrix or heat map) that shows **which** ingredients and allergens two products share, with the overlap drawn as overlapping shapes.

## The problem
**Chart.js 4.6.1 has no Venn, matrix or heat-map chart type.**
[CONFIRM: this is from my knowledge of the library and from trying `type: 'matrix'` in an earlier version, which threw `"matrix" is not a registered controller.` I did not read the full docs or plugin list. Check the Chart.js docs before saying it in class.]

## What I show instead
The nearest built-in chart, a pie, with default options plus my palette (A red, both dark, B blue):
```js
new Chart(canvas, { type: 'pie', data: { labels, datasets: [{ data: [onlyA, both, onlyB], backgroundColor }] }, options: { responsive: true, maintainAspectRatio: false } });
```
No workarounds. A pie is a substitute, not a way of getting a Venn out of Chart.js.

## What the pie cannot do (seen in the browser)
- It shows **how many** items are only A, in both, and only B. It cannot name them, so the lists under each pie carry the "which".
- It cannot draw the overlap as overlapping shapes. The "shared" part is just another slice.
- Zero slices (for example "In both (0)") appear in the legend but draw nothing.
- Allergens: with two allergens in total, the pie is two half circles. A pie of 1 or 2 items adds little.

## Accessibility
A canvas has no keyboard focus and nothing for a screen reader. The pies are hidden from assistive tech and the lists carry the same data. [CONFIRM: I did not run a screen reader or keyboard-only pass.]

## Not verified
- [CONFIRM: re-test in your own browser and on a phone. I checked desktop width with scripted screenshots and saw no console errors on open, swap, product change and close. I took a 390px-wide screenshot but did not review it.]
