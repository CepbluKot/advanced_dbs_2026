# HW2 - Seminar 4 - Datalog

## Exercise 1

```prolog
sibling(X,Y) :- parent(Z,X), parent(Z,Y), not(X=Y).

aunt(X,Y)  :- person(X,f), sibling(X,Z), parent(Z,Y).
uncle(X,Y) :- person(X,m), sibling(X,Z), parent(Z,Y).

ancestor(X,Y) :- parent(X,Y).
ancestor(X,Y) :- parent(X,Z), ancestor(Z,Y).
```

## Exercise 2

### Program 1

```prolog
sister(X,Y) :- parent(Z,X), parent(Z,Y), female(X), not(X=Y).
aunt(X,Y)   :- parent(Z,Y), sister(X,Z).
```

**Safe:** all variables appear in positive relational atoms. `not(X=Y)` is a built-in comparison, not negation of an IDB predicate.

**Stratified:** no negation on IDB predicates, no negative dependency edges.

**Strata:**

$$\{parent,\ female\} \;\to\; \{sister,\ aunt\}$$

### Program 2

```prolog
root(X) :- not(parent(Y,X)).
same_generation(X,Y) :- root(X), root(Y).
same_generation(X,Y) :- parent(V,X), parent(W,Y), same_generation(V,W).
```

**Unsafe:** in the `root` rule, $X$ and $Y$ only appear inside `not(parent(Y,X))` — neither is bound by a positive literal.

Would be stratified if it were safe (`root` negates only EDB `parent`, `same_generation` depends positively on `root` + itself, no negative cycles):

$$\{parent\} \;\to\; \{root\} \;\to\; \{same\_generation\}$$

### Program 3

```prolog
friend(X,Y) :- friend(Y,X).
friend(X,Y) :- friend(X,Z), friend(Z,Y).
enemy(X,Y) :- enemy(Y,X).
enemy(X,Y) :- friend(X,Z), enemy(Z,Y), not(friend(X,Y)).
connected_after(X,Y,U,V) :- friend(X,U), friend(Y,V).
connected_after(X,Y,U,V) :- friend(X,V), friend(Y,U).
connects_new_enemies(X,Y) :- connected_after(X,Y,U,V),
                              enemy(U,V), not(friend(U,V)).
potential_friend(X,Y) :- person(X), person(Y),
                          not(enemy(X,Y)),
                          not(connects_new_enemies(X,Y)).
```

**Safe:** all variables in negated literals are bound by positive atoms in the same rule. E.g. in the `enemy` rule with negation, $X$ from `friend(X,Z)` and $Y$ from `enemy(Z,Y)`. In `potential_friend`, $X, Y$ from `person`.

**Stratified:** no cycle involving negation. `enemy` negates `friend`, `connects_new_enemies` negates `friend`, `potential_friend` negates `enemy` and `connects_new_enemies`. `friend` never depends on anything that negates it.

**Strata:**

$$\{person\} \;\to\; \{friend,\ connected\_after\} \;\to\; \{enemy\} \;\to\; \{connects\_new\_enemies\} \;\to\; \{potential\_friend\}$$

## Exercise 3

```prolog
bi(X,Y) :- g(X,Y).
bi(Y,X) :- g(X,Y).
even(X,Y) :- bi(X,Z), bi(Z,Y).
even(X,Y) :- bi(X,U), bi(U,V), even(V,Y).
```

$g = \{(a,b),\,(b,c),\,(c,d)\}$

### Minimal model

No negation, so there is a unique minimal model.

**Symmetric closure:**

$$bi = \{(a,b),\,(b,a),\,(b,c),\,(c,b),\,(c,d),\,(d,c)\}$$

**even** — base rule gives all length-2 paths:

| $X$ | $Z$ | $Y$ | Result |
|-----|-----|-----|--------|
| $a$ | $b$ | $a$ | $(a,a)$ |
| $a$ | $b$ | $c$ | $(a,c)$ |
| $b$ | $a$ | $b$ | $(b,b)$ |
| $b$ | $c$ | $b$ | $(b,b)$ |
| $b$ | $c$ | $d$ | $(b,d)$ |
| $c$ | $b$ | $a$ | $(c,a)$ |
| $c$ | $b$ | $c$ | $(c,c)$ |
| $c$ | $d$ | $c$ | $(c,c)$ |
| $d$ | $c$ | $b$ | $(d,b)$ |
| $d$ | $c$ | $d$ | $(d,d)$ |

$$even = \{(a,a),\,(a,c),\,(b,b),\,(b,d),\,(c,a),\,(c,c),\,(d,b),\,(d,d)\}$$

Recursive rule: for each $(X,V)$ reachable in 2 bi-steps, compose with $even(V,Y)$. All resulting pairs are already in $even$. No new tuples, done.

**Minimal model:**

$$g = \{(a,b),\,(b,c),\,(c,d)\}$$

$$bi = \{(a,b),\,(b,a),\,(b,c),\,(c,b),\,(c,d),\,(d,c)\}$$

$$even = \{(a,a),\,(a,c),\,(b,b),\,(b,d),\,(c,a),\,(c,c),\,(d,b),\,(d,d)\}$$

### Adding onlyodd

```prolog
onlyodd(X,Y) :- not(even(X,Y)).
```

**Not safe:** $X$ and $Y$ only appear in the negated literal.

Fixed version — bind $X, Y$ to the active domain:

```prolog
node(X) :- g(X,Y).
node(Y) :- g(X,Y).
onlyodd(X,Y) :- node(X), node(Y), not(even(X,Y)).
```

$node = \{a, b, c, d\}$, so $node \times node = 16$ pairs. Subtracting $even$:

$$onlyodd = \{(a,b),\,(a,d),\,(b,a),\,(b,c),\,(c,b),\,(c,d),\,(d,a),\,(d,c)\}$$

This is the stratified model:

$$\{g\} \;\to\; \{bi,\ even,\ node\} \;\to\; \{onlyodd\}$$

Since $bi$/$even$ have no negation, they have a unique minimal model, and $onlyodd$ is determined from that.

Other minimal models exist in principle — inflating $even$ with extra tuples would shrink $onlyodd$. But stratified semantics computes $even$ minimally first, giving this unique answer.

## Exercise 4

$u = \{(a),\,(b),\,(c)\}$, $v = \{(b),\,(c),\,(d)\}$.

```prolog
t(X,Y) :- u(X), u(Y), not(v(X)).
r(X)   :- u(X), v(Y), not(t(X,Y)).
s(X)   :- r(Y), t(Y,X), not(r(X)).
```

### (a) Safety and stratification

**Safe:**
- $t$: $X$ bound by `u(X)`, $Y$ by `u(Y)`. Negated `v(X)` uses already-bound $X$.
- $r$: $X$ bound by `u(X)`, $Y$ by `v(Y)`. Both bound before `not(t(X,Y))`.
- $s$: $Y$ bound by `r(Y)`, $X$ by `t(Y,X)`. $X$ bound before `not(r(X))`.

**Stratified:** $t$ negates $v$ (EDB), $r$ negates $t$, $s$ negates $r$. No cycles.

$$\{u,\ v\} \;\to\; \{t\} \;\to\; \{r\} \;\to\; \{s\}$$

### (b) Stratified model

**Stratum 1 ($t$):** $X$ must be in $u$ but not $v$, so $X = a$. $Y$ ranges over $u$.

$$t = \{(a,a),\,(a,b),\,(a,c)\}$$

**Stratum 2 ($r$):** $r(X)$ holds if there exists $Y \in v$ such that $t(X,Y)$ is false.

- $X = a$: $t(a,b)$ and $t(a,c)$ exist, but $t(a,d)$ doesn't $\Rightarrow r(a)$
- $X = b$: no $t(b,*)$ at all $\Rightarrow r(b)$
- $X = c$: no $t(c,*)$ at all $\Rightarrow r(c)$

$$r = \{(a),\,(b),\,(c)\}$$

**Stratum 3 ($s$):** Need $r(Y)$, $t(Y,X)$, $\neg r(X)$. Only $Y = a$ has $t$-tuples: $t(a,a)$, $t(a,b)$, $t(a,c)$. But $X \in \{a,b,c\}$ are all in $r$, so $\neg r(X)$ always fails.

$$s = \emptyset$$

### (c) Another minimal model

Add $t(a,d)$ to $t$. This is not forced by the $t$-rule ($d \notin u$), but rules are one-directional — extra tuples don't violate anything.

With $t(a,d)$, every $Y \in v$ satisfies $t(a,Y)$, so $\neg t(a,Y)$ never holds for $X = a$, and $r(a)$ is not derived.

$$t = \{(a,a),\,(a,b),\,(a,c),\,(a,d)\}$$

$$r = \{(b),\,(c)\}$$

$$s = \emptyset$$

**Verification:**
1. $t$-rule: $t(a,a)$, $t(a,b)$, $t(a,c)$ forced. $t(a,d)$ is extra, doesn't violate.
2. $r$-rule: for $X = b$, $t(b,b)$ absent so $\neg t(b,b)$ holds $\Rightarrow r(b)$. Same for $c$. For $X = a$, all $t(a,Y)$ hold for $Y \in v$ $\Rightarrow r(a)$ not derived.
3. $s$-rule: $r(Y)$ with $Y \in \{b,c\}$, but no $t(b,*)$ or $t(c,*)$ exist $\Rightarrow$ body never satisfied.

**Minimal:** $t(a,d)$ can't be removed without forcing $r(a)$ (since $u(a)$, $v(d)$, $\neg t(a,d)$ would fire), but $r(a)$ is not in this model. So removing $t(a,d)$ alone breaks the $r$-rule.

## Exercise 5

```prolog
t(X) :- r(X).
t(X) :- not(r(X)).
p(X) :- not(t(X)).
```

**Unsafe:** `t(X) :- not(r(X))` has $X$ only in the negated literal, and `p(X) :- not(t(X))` similarly.

**Domain-independent:** for any $X$, either $r(X)$ holds or $\neg r(X)$ holds, so $t(X)$ is always true. Then $\neg t(X)$ is always false and $p$ is always empty regardless of the domain.
