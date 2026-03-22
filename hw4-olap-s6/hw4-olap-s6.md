# HW4 - Seminar 6 - Data Warehousing and OLAP

## Exercise 1

### Schema

Star schema with one fact table and three dimension tables.

Fact table:

    Sales(product_id, store_id, date_id, sales_amount, sales_count)

- product_id FK -> Product
- store_id FK -> Store
- date_id FK -> DateDim
- sales_amount: total sales amount
- sales_count: number of transactions (needed to compute AVG correctly later)

Dimension tables:

    Product(product_id PK, product_name, brand)
    - hierarchy: product -> brand

    Store(store_id PK, store_name, province, country)
    - hierarchy: store -> province -> country

    DateDim(date_id PK, date, day_of_week, month, quarter, semester, year)
    - hierarchy: date -> month -> quarter -> semester -> year
    - independent: date -> day_of_week

### SQL:1999 query

We can't just do `GROUP BY CUBE(all attributes)` because that generates every possible subset, including ones that violate the hierarchy (like grouping by product_name without brand, or by month without year). Instead we use ROLLUP per dimension and GROUPING SETS for the branching time hierarchy:

```sql
SELECT p.product_name, p.brand,
       s.store_name, s.province, s.country,
       d.date, d.day_of_week, d.month, d.quarter, d.semester, d.year,
       SUM(f.sales_amount) AS total_sales,
       SUM(f.sales_amount) / SUM(f.sales_count) AS avg_sales
FROM Sales f
JOIN Product p ON f.product_id = p.product_id
JOIN Store s ON f.store_id = s.store_id
JOIN DateDim d ON f.date_id = d.date_id
GROUP BY
    ROLLUP(p.brand, p.product_name),
    ROLLUP(s.country, s.province, s.store_name),
    GROUPING SETS (
        ROLLUP(d.year, d.semester, d.quarter, d.month, d.date),
        (d.day_of_week),
        ()
    );
```

- ROLLUP(brand, product_name) -> (brand, product), (brand), ()
- ROLLUP(country, province, store_name) -> (country, province, store), (country, province), (country), ()
- For time, GROUPING SETS combines the main chain (year->semester->quarter->month->date) with the independent day_of_week branch

NULL values in the output mean "aggregated over this dimension".

### Multiple measures

SUM(sales_amount) is distributive - can be computed correctly from any partial aggregate, no problem.

AVG is algebraic. You can't just average a set of averages and get the right answer. That's why we store both sales_amount and sales_count in the fact table and compute avg = sum/count. This lets us derive the correct average from any materialized view at any level.

## Exercise 2

Sales(Product, Month, Store, Amount). 5 products (P1-P5), 12 months, 3 stores (S1-S3).

### (a) Dense

i. Every (product, month, store) combination has a tuple: 5 × 12 × 3 = **180**.

ii. The cube adds an ALL level for each dimension: (5+1) × (12+1) × (3+1) = 6 × 13 × 4 = **312**.

### (b) Sparse

Given:

| Product | Month | Store | Amount |
|---------|-------|-------|--------|
| P1      | Jan   | S1    | a1     |
| P1      | Jan   | S2    | a2     |
| P2      | Feb   | S2    | a3     |
| P2      | Feb   | S3    | a4     |
| P3      | Jan   | S1    | a5     |
| P3      | Feb   | S1    | a6     |
| P4      | Feb   | S1    | a7     |
| P5      | Jan   | S3    | a8     |

Non-empty cells per grouping:

- (Product, Month, Store): 8 base tuples
- (Product, Month): (P1,Jan), (P2,Feb), (P3,Jan), (P3,Feb), (P4,Feb), (P5,Jan) -> 6
- (Product, Store): (P1,S1), (P1,S2), (P2,S2), (P2,S3), (P3,S1), (P4,S1), (P5,S3) -> 7
- (Month, Store): (Jan,S1), (Jan,S2), (Jan,S3), (Feb,S1), (Feb,S2), (Feb,S3) -> 6
- Product only: P1,P2,P3,P4,P5 -> 5
- Month only: Jan, Feb -> 2
- Store only: S1, S2, S3 -> 3
- Grand total: 1

Total = 8 + 6 + 7 + 6 + 5 + 2 + 3 + 1 = **38**.

## Exercise 3

Data cube with dimensions Product and Date, measure Total Sales.

Hierarchy on Date (no hierarchy on Product):

    date -> week
    date -> month -> year

Week and year are incomparable - a week can span months, so week doesn't roll up to year.

Given: 100 products, 3 years, 1095 days, 157 weeks, 36 months. Dense cube.

### (a) View sizes

Date has 5 levels (Date, week, month, year, ALL), Product has 2 (Product, ALL), so 10 views total.

| View | Size |
|------|------|
| (Product, Date) | 100 × 1095 = 109,500 |
| (Product, week) | 100 × 157 = 15,700 |
| (Product, month) | 100 × 36 = 3,600 |
| (Product, year) | 100 × 3 = 300 |
| (Product, ALL) | 100 |
| (ALL, Date) | 1,095 |
| (ALL, week) | 157 |
| (ALL, month) | 36 |
| (ALL, year) | 3 |
| (ALL, ALL) | 1 |

### (b) Greedy algorithm - pick 2 views

(Product, Date) with size 109,500 is always materialized (it's the top).

Lattice edges:
- (Product, Date) -> (Product, month), (Product, week), (ALL, Date)
- (Product, month) -> (Product, year), (ALL, month)
- (Product, week) -> (Product, ALL), (ALL, week)
- (Product, year) -> (Product, ALL), (ALL, year)
- (ALL, Date) -> (ALL, month), (ALL, week)
- (ALL, month) -> (ALL, year)
- (ALL, week) -> (ALL, ALL)
- (Product, ALL) -> (ALL, ALL)
- (ALL, year) -> (ALL, ALL)

Since week and year are incomparable, (Product, week) does NOT go to (Product, year). Same for (ALL, week) not going to (ALL, year). But by transitivity, (Product, month) is an ancestor of (ALL, year) via (Product, month) -> (Product, year) -> (ALL, year).

**Step 1.** All views cost 109,500. Benefit = (number of descendants incl. self) × (109,500 - size).

| Candidate | Size | # desc. | Benefit |
|-----------|------|---------|---------|
| (P, month) | 3,600 | 6 | 6 × 105,900 = 635,400 |
| (ALL, Date) | 1,095 | 5 | 5 × 108,405 = 542,025 |
| (P, year) | 300 | 4 | 4 × 109,200 = 436,800 |
| (P, week) | 15,700 | 4 | 4 × 93,800 = 375,200 |
| (ALL, month) | 36 | 3 | 328,392 |
| (ALL, year) | 3 | 2 | 218,994 |
| (P, ALL) | 100 | 2 | 218,800 |
| (ALL, week) | 157 | 2 | 218,686 |
| (ALL, ALL) | 1 | 1 | 109,499 |

Winner: **(P, month)**, benefit 635,400.

**Step 2.** Materialized set: {(Product, Date), (Product, month)}.

Updated costs (size of smallest materialized ancestor):

| View | Best ancestor | Cost |
|------|---------------|------|
| (P, week) | (Product, Date) | 109,500 |
| (ALL, Date) | (Product, Date) | 109,500 |
| (ALL, week) | (Product, Date) | 109,500 |
| (P, year) | (P, month) | 3,600 |
| (ALL, month) | (P, month) | 3,600 |
| (P, ALL) | (P, month) | 3,600 |
| (ALL, year) | (P, month) | 3,600 |
| (ALL, ALL) | (P, month) | 3,600 |

Compute benefits. Best candidate: (ALL, Date), size 1,095.
- Saves for (ALL,Date): 109,500 - 1,095 = 108,405
- Saves for (ALL,month): 3,600 - 1,095 = 2,505
- Saves for (ALL,week): 109,500 - 1,095 = 108,405
- Saves for (ALL,year): 2,505
- Saves for (ALL,ALL): 2,505
- Total = 224,325

Runner-up: (P, week) with 2 × 93,800 = 187,600 (only helps itself and (ALL,week); its other descendants already cost 3,600 which is less than 15,700, so no savings there).

Winner: **(ALL, Date)**, benefit 224,325.

Greedy selects **(Product, month)** and **(ALL, Date)**.

### (c) Total benefit

635,400 + 224,325 = **859,725**.

Verification: without materialization, total cost = 9 × 109,500 = 985,500. After materializing both views:

| View | Cost |
|------|------|
| (P, month) | 3,600 |
| (P, week) | 109,500 |
| (ALL, Date) | 1,095 |
| (P, year) | 3,600 |
| (ALL, month) | 1,095 |
| (ALL, week) | 1,095 |
| (P, ALL) | 3,600 |
| (ALL, year) | 1,095 |
| (ALL, ALL) | 1,095 |

New total = 125,775. Benefit = 985,500 - 125,775 = 859,725. Matches.

## Exercise 4

Need to show: for any k, there exists a lattice where B_greedy/B_opt is arbitrarily close to 1 - ((k-1)/k)^k.

**Construction.** Fix k. Let M be arbitrarily large.

Top view T has size M. Below it, create k^(k+1) leaf views (size -> 0), divided into k groups of k^k leaves. Each leaf is indexed as (i, a_1, ..., a_k) with i in {1,...,k} (group) and each a_j in {0,...,k-1}.

Two sets of intermediate views (size -> 0):
- O_1, ..., O_k (the "optimal" views): O_i is ancestor of all k^k leaves in group i.
- G_1, ..., G_k (the "greedy" views): G_j is ancestor of all leaves (any group) with a_j = 0. So G_j covers k * k^(k-1) = k^k leaves.

**Optimal.** Materializing {O_1,...,O_k} covers all k^(k+1) leaves. B_opt ~ k^(k+1) * M.

**Greedy execution.** In round 1, both G_j and O_i cover k^k leaves each, so they tie. Adversarial tie-breaking picks G_1.

In round j: a leaf is already covered iff at least one of a_1,...,a_{j-1} equals 0. Fresh coverage of G_j (leaves with a_j = 0 but a_1,...,a_{j-1} all nonzero):
- Per group: (k-1)^(j-1) * k^(k-j)
- Across all k groups: k * (k-1)^(j-1) * k^(k-j)

O_i has the same count of uncovered leaves in group i, so the tie persists every round. Greedy picks G_1, G_2, ..., G_k.

**Result.** After all k rounds, a leaf is still uncovered iff a_1,...,a_k are all in {1,...,k-1}.

- Uncovered per group: (k-1)^k
- Total uncovered: k * (k-1)^k
- Covered: k^(k+1) - k*(k-1)^k = k * [k^k - (k-1)^k]

B_greedy / B_opt = k * [k^k - (k-1)^k] / (k * k^k) = 1 - ((k-1)/k)^k.

As k -> infinity, ((k-1)/k)^k -> 1/e, so the bound approaches (e-1)/e. This construction achieves the bound exactly (for M -> infinity), proving tightness.
