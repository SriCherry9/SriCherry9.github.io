# The Allergen Aisle (INST 630, Project 4)

A single-page site: a full-screen grid of products. Click one to open an overlay with
ingredients, allergens, dietary facts and a Chart.js view; use the arrows (or the
left/right keys) to move to the next or previous product.

**Compare:** "Compare two products" (top bar) or "Compare with..." (inside a product) opens a
side-by-side view with plain lists of shared / only-A / only-B ingredients and allergens, plus a pie chart
of each. The page states that I want a Venn / matrix / heat map and that Chart.js has none of those
(the struggle-bus point). The product overlay also shows the full ingredient count.

## Run it

`fetch()` does not work from `file://`, so serve the folder over http:

    cd inst630-aisle
    python3 -m http.server 8000      # then open http://localhost:8000

(or use VS Code "Live Server", or deploy the folder to Vercel).

## Files

    index.html          structure + ARIA
    styles.css          all styling (Flexbox layout, responsive)
    app.js              async/await data load, rendering, Chart.js, GSAP
    data/products.json  308 unique records, about 133 KB (limit is 1 MB)
    STRUGGLE_BUS.md     struggle-bus write-up: Chart.js has no Venn/matrix/heat map, so a pie is shown
    vendor/             chart.umd.js (Chart.js 4), gsap.min.js (GSAP 3), served locally
    tools/build_data.py CSV -> JSON converter (re-run if the CSV changes)

Rebuild the data:

    python3 tools/build_data.py food_ingredients_and_allergens.csv data/products.json

## Data notes

- Source CSV: 399 rows. Exact duplicate rows removed -> 308 records. 24 are "featured" on the shelves.
- The CSV has no nutrition values, so there is no nutrient breakdown. The chart shows how common
  each of the product's allergens is across the whole dataset instead.
- Dietary flags are estimated by keyword from the listed ingredients (see `dietary()` in the script).
- The CSV's `Prediction` column is kept in the JSON but not used: 5 rows say "Contains" while
  listing no allergen.
- Ingredient matching in Compare: lower-cased, trailing "s" stripped, so "Almond"/"Almonds" count as shared.
  Different wording for the same thing (e.g. "milk" vs "skim milk") is not merged.
