# HW4 - Seminar 6 - Data Warehousing and OLAP

## Exercise 1

### Schema

Star schema with one fact table and three dimension tables.

**Fact table:**

$$Sales(\underline{product\_id},\; \underline{store\_id},\; \underline{date\_id},\; sales\_amount,\; sales\_count)$$

- $product\_id$ FK $\to$ Product
- $store\_id$ FK $\to$ Store
- $date\_id$ FK $\to$ DateDim
- $sales\_amount$: total sales amount
- $sales\_count$: number of transactions (needed to compute AVG correctly later)

**Dimension tables:**

$$Product(\underline{product\_id},\; product\_name,\; brand)$$

Hierarchy: $product \to brand$

$$Store(\underline{store\_id},\; store\_name,\; province,\; country)$$

Hierarchy: $store \to province \to country$

$$DateDim(\underline{date\_id},\; date,\; day\_of\_week,\; month,\; quarter,\; semester,\; year)$$

Hierarchies: $date \to month \to quarter \to semester \to year$ and $date \to day\_of\_week$

-----

### SQL:1999 query

We can't just do `GROUP BY CUBE(all attributes)` because that generates every possible subset, including ones that violate the hierarchy. Instead we use `ROLLUP` per dimension and `GROUPING SETS` for the branching time hierarchy:

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

- `ROLLUP(brand, product_name)` $\to$ (brand, product), (brand), ()
- `ROLLUP(country, province, store_name)` $\to$ (country, province, store), (country, province), (country), ()
- For time, `GROUPING SETS` combines the main chain ($year \to semester \to quarter \to month \to date$) with the independent $day\_of\_week$ branch

`NULL` values in the output mean "aggregated over this dimension".

-----

### Multiple measures

$SUM(sales\_amount)$ is **distributive** — can be computed correctly from any partial aggregate, no problem.

$AVG$ is **algebraic**. You can't just average a set of averages and get the right answer. That's why we store both $sales\_amount$ and $sales\_count$ in the fact table and compute $avg = sum / count$. This lets us derive the correct average from any materialized view at any level.

-----

## Exercise 2

$Sales(Product, Month, Store, Amount)$. 5 products ($P_1$–$P_5$), 12 months, 3 stores ($S_1$–$S_3$).

### (a) Dense

i. Every $(product, month, store)$ combination has a tuple: $5 \times 12 \times 3 = \mathbf{180}$.

ii. The cube adds an ALL level for each dimension: $(5+1) \times (12+1) \times (3+1) = 6 \times 13 \times 4 = \mathbf{312}$.

### (b) Sparse

Given:

| Product | Month | Store | Amount |
|---------|-------|-------|--------|
| $P_1$ | Jan | $S_1$ | $a_1$ |
| $P_1$ | Jan | $S_2$ | $a_2$ |
| $P_2$ | Feb | $S_2$ | $a_3$ |
| $P_2$ | Feb | $S_3$ | $a_4$ |
| $P_3$ | Jan | $S_1$ | $a_5$ |
| $P_3$ | Feb | $S_1$ | $a_6$ |
| $P_4$ | Feb | $S_1$ | $a_7$ |
| $P_5$ | Jan | $S_3$ | $a_8$ |

Non-empty cells per grouping:

| Grouping | Cells | Count |
|----------|-------|-------|
| $(Product, Month, Store)$ | base tuples | 8 |
| $(Product, Month)$ | $(P_1,Jan),(P_2,Feb),(P_3,Jan),(P_3,Feb),(P_4,Feb),(P_5,Jan)$ | 6 |
| $(Product, Store)$ | $(P_1,S_1),(P_1,S_2),(P_2,S_2),(P_2,S_3),(P_3,S_1),(P_4,S_1),(P_5,S_3)$ | 7 |
| $(Month, Store)$ | $(Jan,S_1),(Jan,S_2),(Jan,S_3),(Feb,S_1),(Feb,S_2),(Feb,S_3)$ | 6 |
| $(Product)$ | $P_1,P_2,P_3,P_4,P_5$ | 5 |
| $(Month)$ | $Jan, Feb$ | 2 |
| $(Store)$ | $S_1, S_2, S_3$ | 3 |
| $()$ | grand total | 1 |

$$Total = 8 + 6 + 7 + 6 + 5 + 2 + 3 + 1 = \mathbf{38}$$

-----

## Exercise 3

Data cube with dimensions **Product** and **Date**, measure **Total Sales**.

Hierarchy on Date (no hierarchy on Product):

$$Date \to month \to year, \qquad Date \to week$$

Week and year are incomparable — a week can span months, so $week$ doesn't roll up to $year$.

Given: 100 products, 3 years, 1095 days, 157 weeks, 36 months. Dense cube.

### (a) View sizes

Date has 5 levels ($Date$, $week$, $month$, $year$, $ALL$), Product has 2 ($Product$, $ALL$), so 10 views total.

| View | Size |
|------|------|
| $(Product, Date)$ | $100 \times 1095 = 109{,}500$ |
| $(Product, week)$ | $100 \times 157 = 15{,}700$ |
| $(Product, month)$ | $100 \times 36 = 3{,}600$ |
| $(Product, year)$ | $100 \times 3 = 300$ |
| $(Product, ALL)$ | $100$ |
| $(ALL, Date)$ | $1{,}095$ |
| $(ALL, week)$ | $157$ |
| $(ALL, month)$ | $36$ |
| $(ALL, year)$ | $3$ |
| $(ALL, ALL)$ | $1$ |

-----

### (b) Greedy algorithm — pick 2 views

$(Product, Date)$ with size $109{,}500$ is always materialized (it's the top).

**Step 1.** All views currently cost $109{,}500$. Benefit = (number of descendants incl. self) $\times$ ($109{,}500$ − size).

| Candidate | Size | Descendants | Benefit |
|-----------|------|-------------|---------|
| $(P, month)$ | $3{,}600$ | 6 | $6 \times 105{,}900 = 635{,}400$ |
| $(ALL, Date)$ | $1{,}095$ | 5 | $5 \times 108{,}405 = 542{,}025$ |
| $(P, year)$ | $300$ | 4 | $4 \times 109{,}200 = 436{,}800$ |
| $(P, week)$ | $15{,}700$ | 4 | $4 \times 93{,}800 = 375{,}200$ |
| $(ALL, month)$ | $36$ | 3 | $328{,}392$ |
| $(ALL, year)$ | $3$ | 2 | $218{,}994$ |
| $(P, ALL)$ | $100$ | 2 | $218{,}800$ |
| $(ALL, week)$ | $157$ | 2 | $218{,}686$ |
| $(ALL, ALL)$ | $1$ | 1 | $109{,}499$ |

Winner: $\mathbf{(Product,\, month)}$, benefit $635{,}400$.

-----

**Step 2.** Materialized set: $\{(Product, Date),\; (Product, month)\}$.

Updated costs (size of smallest materialized ancestor):

| View | Best ancestor | Cost |
|------|---------------|------|
| $(P, week)$ | $(Product, Date)$ | $109{,}500$ |
| $(ALL, Date)$ | $(Product, Date)$ | $109{,}500$ |
| $(ALL, week)$ | $(Product, Date)$ | $109{,}500$ |
| $(P, year)$ | $(P, month)$ | $3{,}600$ |
| $(ALL, month)$ | $(P, month)$ | $3{,}600$ |
| $(P, ALL)$ | $(P, month)$ | $3{,}600$ |
| $(ALL, year)$ | $(P, month)$ | $3{,}600$ |
| $(ALL, ALL)$ | $(P, month)$ | $3{,}600$ |

Best candidate: $(ALL, Date)$, size $1{,}095$.

- Saves for $(ALL,Date)$: $109{,}500 - 1{,}095 = 108{,}405$
- Saves for $(ALL,month)$: $3{,}600 - 1{,}095 = 2{,}505$
- Saves for $(ALL,week)$: $109{,}500 - 1{,}095 = 108{,}405$
- Saves for $(ALL,year)$: $2{,}505$
- Saves for $(ALL,ALL)$: $2{,}505$
- Total = $224{,}325$

Winner: $\mathbf{(ALL,\, Date)}$, benefit $224{,}325$.

Greedy selects $\mathbf{(Product,\, month)}$ and $\mathbf{(ALL,\, Date)}$.

-----

### (c) Total benefit

$$635{,}400 + 224{,}325 = \mathbf{859{,}725}$$

**Verification:** without materialization, total cost $= 9 \times 109{,}500 = 985{,}500$. After materializing both views:

| View | Cost |
|------|------|
| $(P, month)$ | $3{,}600$ |
| $(P, week)$ | $109{,}500$ |
| $(ALL, Date)$ | $1{,}095$ |
| $(P, year)$ | $3{,}600$ |
| $(ALL, month)$ | $1{,}095$ |
| $(ALL, week)$ | $1{,}095$ |
| $(P, ALL)$ | $3{,}600$ |
| $(ALL, year)$ | $1{,}095$ |
| $(ALL, ALL)$ | $1{,}095$ |

$$\text{New total} = 125{,}775. \qquad \text{Benefit} = 985{,}500 - 125{,}775 = \mathbf{859{,}725} \;\checkmark$$

-----

## Exercise 4

Need to show: for any $k$, there exists a lattice where $B_{greedy}/B_{opt}$ is arbitrarily close to $1 - \left(\frac{k-1}{k}\right)^k$.

**Construction.** Fix $k$. Let $M$ be arbitrarily large.

Top view $T$ has size $M$. Below it, create $k^{k+1}$ leaf views (size $\to 0$), divided into $k$ groups of $k^k$ leaves. Each leaf is indexed as $(i, a_1, \ldots, a_k)$ with $i \in \{1,\ldots,k\}$ (group) and each $a_j \in \{0,\ldots,k-1\}$.

Two sets of intermediate views (size $\to 0$):
- $O_1, \ldots, O_k$ (the "optimal" views): $O_i$ is ancestor of all $k^k$ leaves in group $i$.
- $G_1, \ldots, G_k$ (the "greedy" views): $G_j$ is ancestor of all leaves (any group) with $a_j = 0$. So $G_j$ covers $k \cdot k^{k-1} = k^k$ leaves.

**Optimal.** Materializing $\{O_1, \ldots, O_k\}$ covers all $k^{k+1}$ leaves.

$$B_{opt} \sim k^{k+1} \cdot M$$

**Greedy execution.** In round 1, both $G_j$ and $O_i$ cover $k^k$ leaves each, so they tie. Adversarial tie-breaking picks $G_1$.

In round $j$: a leaf is already covered iff at least one of $a_1, \ldots, a_{j-1}$ equals 0. Fresh coverage of $G_j$ (leaves with $a_j = 0$ but $a_1, \ldots, a_{j-1}$ all nonzero):

$$\text{Per group: } (k-1)^{j-1} \cdot k^{k-j}$$

$$\text{Across all } k \text{ groups: } k \cdot (k-1)^{j-1} \cdot k^{k-j}$$

$O_i$ has the same count of uncovered leaves in group $i$, so the tie persists every round. Greedy picks $G_1, G_2, \ldots, G_k$.

**Result.** After all $k$ rounds, a leaf is still uncovered iff $a_1, \ldots, a_k$ are all in $\{1, \ldots, k-1\}$.

$$\text{Uncovered per group: } (k-1)^k$$

$$\text{Total uncovered: } k \cdot (k-1)^k$$

$$\text{Covered: } k^{k+1} - k(k-1)^k = k\left[k^k - (k-1)^k\right]$$

$$\frac{B_{greedy}}{B_{opt}} = \frac{k\left[k^k - (k-1)^k\right]}{k \cdot k^k} = 1 - \left(\frac{k-1}{k}\right)^k$$

As $k \to \infty$, $\left(\frac{k-1}{k}\right)^k \to \frac{1}{e}$, so the bound approaches $\frac{e-1}{e}$. This construction achieves the bound exactly (for $M \to \infty$), proving tightness.
