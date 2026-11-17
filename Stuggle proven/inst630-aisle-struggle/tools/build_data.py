#!/usr/bin/env python3
"""Convert food_ingredients_and_allergens.csv into data/products.json.

Usage: python3 tools/build_data.py <input.csv> <output.json>

- Removes exact duplicate rows (the CSV repeats many records verbatim).
- Splits multi-value cells on commas, ignoring commas inside parentheses
  (e.g. "Yogurt (milk, cultures)").
- Marks 24 hand-picked products as `featured` for the aisle grid.
- Derives rough dietary flags from the listed ingredients. These are estimates.
"""
import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])

# (name, allergens string as it appears in the CSV, category, package shape)
# Order here is the order of the aisle.
FEATURED = [
    ("Almond Cookies", "Almonds, Wheat, Dairy", "Bakery", "box"),
    ("Chicken Noodle Soup", "Chicken, Wheat, Celery", "Soup", "can"),
    ("Soy Milk", "Soybeans", "Drinks", "carton"),
    ("Peanut Butter", "Peanuts", "Pantry", "jar"),
    ("Fish Sticks", "Fish", "Seafood", "box"),
    ("Lemonade", "None", "Drinks", "bottle"),
    ("Cheddar Cheese", "Dairy", "Dairy", "box"),
    ("Tiramisu", "Wheat, Dairy", "Dessert", "bowl"),
    ("Miso Soup", "Soybeans", "Soup", "bowl"),
    ("Vanilla Ice Cream", "Milk", "Dessert", "jar"),
    ("Orange Juice", "None", "Drinks", "carton"),
    ("Egg Salad Sandwich", "Eggs, Mustard", "Deli", "bag"),
    ("Shrimp Scampi", "Shellfish, Dairy", "Seafood", "bowl"),
    ("Apple", "None", "Fresh", "bag"),
    ("Chocolate Cake", "Wheat, Dairy, Cocoa", "Bakery", "box"),
    ("Quinoa Salad", "None", "Fresh", "bowl"),
    ("Banana Bread", "Wheat, Dairy, Nuts", "Bakery", "bag"),
    ("Tuna Salad", "Fish, Eggs", "Deli", "can"),
    ("Gulab Jamun", "Dairy", "Dessert", "jar"),
    ("Pesto Chicken", "Pine nuts, Dairy", "Mains", "jar"),
    ("Masala Dosa", "None", "Mains", "bag"),
    ("Chicken Satay", "Peanuts", "Mains", "box"),
    ("Oatmeal", "Oats, Dairy", "Breakfast", "bag"),
    ("Lobster Roll", "Shellfish, Eggs", "Deli", "bag"),
]


def split_top(cell):
    """Split on commas that are not inside parentheses; drop 'None'."""
    cell = (cell or "").strip()
    if not cell or cell.lower() == "none":
        return []
    parts, depth, cur = [], 0, ""
    for ch in cell:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    parts.append(cur.strip())
    return [p[0].upper() + p[1:] for p in parts if p and p.lower() != "none"]


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def has(pattern, text):
    return re.search(pattern, text) is not None


MEAT = r"\b(chicken|beef|lamb|mutton|pork|bacon|ham|sausage|pancetta|ribs|meat|turkey|steak|pepperoni)\b"
SEAFOOD = r"\b(fish|salmon|tuna|cod|shrimp|prawns?|lobster|crab|shellfish|sushi|anchovies|anchovy)\b"
DAIRY = (r"\b(milk|butter|buttermilk|cheese|cream|yogurt|yoghurt|ghee|paneer|mascarpone|"
         r"mozzarella|parmesan|feta|brie|custard|lassi|whipped|dairy)\b")
NON_DAIRY = r"(peanut butter|cocoa butter|almond butter|coconut milk|almond milk|soy milk|oat milk|coconut cream)"
EGG_ETC = r"\b(eggs?|mayonnaise|honey|gelatin|marshmallows?)\b"
GLUTEN = (r"\b(wheat|flour|bread|breadcrumbs?|crumbs|pasta|noodles?|pastry|dough|tortillas?|croutons|"
          r"graham|ladyfingers|cookies?|shortcake|bun|pav|kulcha|naan|phyllo|couscous|semolina|"
          r"soy sauce|teriyaki|oats?|pizza|pie|cake|muffins?|pancakes?|spaghetti|fettuccine|ziti|"
          r"lasagna|crust|cobbler|crisp|sandwich|sandwiches|wrap|toast|rolls?|bagel)\b")


def dietary(name, main, sweet, fat, season, allergens):
    text = " ".join([name, main] + sweet + fat + season + allergens).lower()
    dairy_text = re.sub(NON_DAIRY, "", text)
    meat_or_fish = has(MEAT, text) or has(SEAFOOD, text)
    dairy = has(DAIRY, dairy_text)
    animal_other = has(EGG_ETC, text)
    return {
        "vegetarian": not meat_or_fish,
        "vegan": not meat_or_fish and not dairy and not animal_other,
        "dairyFree": not dairy,
        "glutenFree": not has(GLUTEN, text),
    }


rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
raw_count = len(rows)

seen, unique = set(), []
for r in rows:
    key = tuple((r[k] or "").strip() for k in r)
    # The one row with a blank Prediction duplicates a complete row; treat blank as a dupe-key wildcard.
    key_wild = key[:-1]
    if key_wild in seen:
        continue
    seen.add(key_wild)
    unique.append(r)

featured_lookup = {(n, a): (cat, shape, i) for i, (n, a, cat, shape) in enumerate(FEATURED)}
products, used = [], set()
for i, r in enumerate(unique, start=1):
    name = r["Food Product"].strip()
    allergen_cell = r["Allergens"].strip()
    main = r["Main Ingredient"].strip()
    sweet, fat, season = split_top(r["Sweetener"]), split_top(r["Fat/Oil"]), split_top(r["Seasoning"])
    allergens = split_top(allergen_cell)
    rec = {
        "id": f"{slug(name)}-{i}",
        "name": name,
        "featured": False,
        "category": None,
        "shape": None,
        "main": main,
        "sweetener": sweet,
        "fatOil": fat,
        "seasoning": season,
        "allergens": allergens,
        "dietary": dietary(name, main, sweet, fat, season, allergens),
        "prediction": r["Prediction"].strip() or None,
    }
    fk = (name, allergen_cell)
    if fk in featured_lookup and fk not in used:
        used.add(fk)
        cat, shape, order = featured_lookup[fk]
        rec.update(featured=True, category=cat, shape=shape, order=order)
    products.append(rec)

missing = [f for f in FEATURED if (f[0], f[1]) not in used]
assert not missing, f"Featured items not found in CSV: {missing}"

# Aisle order follows FEATURED order, not CSV order.
products.sort(key=lambda p: (0, p["order"]) if p["featured"] else (1, 0))
for p in products:
    p.pop("order", None)
# Keep featured first (aisle order), then the rest in CSV order (sort is stable).

mismatch = sum(1 for p in products if p["prediction"] == "Contains" and not p["allergens"])
mismatch2 = sum(1 for p in products if p["prediction"] == "Does not contain" and p["allergens"])

out = {
    "meta": {
        "source": "food_ingredients_and_allergens.csv (course-supplied dataset)",
        "generated": date.today().isoformat(),
        "rawRows": raw_count,
        "recordCount": len(products),
        "featuredCount": len(FEATURED),
        "note": ("Exact duplicate rows removed. Dietary flags are estimated from listed "
                 "ingredients. The CSV's 'Prediction' column is kept but not used."),
    },
    "products": products,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"raw rows: {raw_count}  unique records: {len(products)}  featured: {len(FEATURED)}")
print(f"prediction='Contains' but no allergens listed: {mismatch}")
print(f"prediction='Does not contain' but allergens listed: {mismatch2}")
print(f"output size: {OUT.stat().st_size/1024:.1f} KB")
