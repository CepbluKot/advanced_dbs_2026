# HW3 - Seminar 5 - Datalog

## Exercise 1

```prolog
s(X,Y) :- u(V,W), v(W,X), v(W,Y), not(X=Y).
r(X,Y) :- s(X,X), t(Y), not(s(Y,Y)).
```

**EDB:** `u(V,W)`, `v(A,B)`, `t(Y)` — **IDB:** `s`, `r`

**Stratification:** `s` only uses EDB and the built-in `not(X=Y)`. `r` negates `s`, but `s` does not depend on `r`. The strata are therefore:

$$\{t,\ u,\ v\} \;\to\; \{s\} \;\to\; \{r\}$$

-----

### Relational Algebra for `s(X,Y)`

Rename two copies of `v`:

$$V_1 = \rho_{W,X}(v), \qquad V_2 = \rho_{W,Y}(v)$$

$$s \;=\; \pi_{X,Y}\!\left(\, \sigma_{X \neq Y}\!\left( U \bowtie_W V_1 \bowtie_W V_2 \right) \right)$$

Join `u` with both copies on $W$, filter $X \neq Y$, then project onto $X, Y$.

-----

### Relational Algebra for `r(X,Y)`

`s(X,X)` is the diagonal of `s`; `not(s(Y,Y))` selects values in `t` that are not on the diagonal.

$$D \;=\; \pi_X\!\left(\, \sigma_{X=Y}(S) \right)$$

$$r \;=\; D \;\times\; (T - D)$$

-----

## Exercise 2

```prolog
bi(X,Y) :- g(X,Y).
bi(Y,X) :- g(X,Y).
even(X,Y) :- bi(X,Z), bi(Z,Y).
even(X,Y) :- bi(X,U), bi(U,V), even(V,Y).
```

$g = \{(a,b),(b,c),(c,d),(d,e),(e,f),(f,g)\}$ — a path $a$–$b$–$c$–$d$–$e$–$f$–$g$.

**Symmetric closure:**

$$bi = g \cup \rho_{Y,X}(g) = \{(a,b),(b,a),(b,c),(c,b),(c,d),(d,c),(d,e),(e,d),(e,f),(f,e),(f,g),(g,f)\}$$

**Relational algebra for the rules:**

$$E_1 = \pi_{X,Y}\!\left( BI(X,Z) \bowtie_Z BI(Z,Y) \right)$$

$$E_2 = \pi_{X,Y}\!\left( BI(X,U) \bowtie_U BI(U,V) \bowtie_V \mathit{EVEN}(V,Y) \right)$$

-----

### (a) Naive Recursion

**Iteration 0:** $\mathit{even}_0 = \emptyset$

**Iteration 1:** $\mathit{even}_0$ is empty, so $E_2$ produces nothing. Only $E_1$ fires. For each intermediate node $Z$, pairing $(X,Z) \in bi$ with $(Z,Y) \in bi$:

```
Z=a: (b,a) × (a,b)             → (b,b)
Z=b: (a,b),(c,b) × (b,a),(b,c) → (a,a),(a,c),(c,a),(c,c)
Z=c: (b,c),(d,c) × (c,b),(c,d) → (b,b),(b,d),(d,b),(d,d)
Z=d: (c,d),(e,d) × (d,c),(d,e) → (c,c),(c,e),(e,c),(e,e)
Z=e: (d,e),(f,e) × (e,d),(e,f) → (d,d),(d,f),(f,d),(f,f)
Z=f: (e,f),(g,f) × (f,e),(f,g) → (e,e),(e,g),(g,e),(g,g)
Z=g: (f,g)       × (g,f)       → (f,f)
```

$$\mathit{even}_1 = \{(a,a),(a,c),(b,b),(b,d),(c,a),(c,c),(c,e),(d,b),(d,d),(d,f),(e,c),(e,e),(e,g),(f,d),(f,f),(g,e),(g,g)\}$$

17 tuples — all pairs at distance 2.

**Iteration 2:** $E_1$ is independent of `even` and reproduces the same result. $E_2$ composes `bi`–`bi` paths with $\mathit{even}_1$, which is equivalent to composing $\mathit{even}_1$ with itself:

```
V=c: {a,c,e} × {a,c,e} → includes (a,e),(e,a)
V=d: {b,d,f} × {b,d,f} → includes (b,f),(f,b)
V=e: {c,e,g} × {c,e,g} → includes (c,g),(g,c)
```

New tuples: $\{(a,e),(e,a),(b,f),(f,b),(c,g),(g,c)\}$ — distance-4 pairs.

$$\mathit{even}_2 = \mathit{even}_1 \cup \{(a,e),(e,a),(b,f),(f,b),(c,g),(g,c)\}$$

**Iteration 3:** Composing $\mathit{even}_2$ with itself:

- $V = c$: sources $\{a,c,e,g\}$, targets $\{a,c,e,g\}$ $\Rightarrow$ $(a,g),(g,a)$ **NEW**
- All other $V$: no new tuples.

$$\mathit{even}_3 = \mathit{even}_2 \cup \{(a,g),(g,a)\}$$

Distance-6 pairs ($a$ and $g$ are 6 apart).

**Iteration 4:** $(a,g)$ composed with $(g,*) = \{a,c,e,g\}$ — all already known. No new tuples. **Stop.**

$$\mathit{even} = \{(a,a),(a,c),(a,e),(a,g),(b,b),(b,d),(b,f),(c,a),(c,c),(c,e),(c,g),(d,b),(d,d),(d,f),(e,a),(e,c),(e,e),(e,g),(f,b),(f,d),(f,f),(g,a),(g,c),(g,e),(g,g)\}$$

**25 tuples total.**

-----

### (b) Semi-Naive Evaluation

**Step 1 (base):**

$$\Delta^1 = \pi_{X,Y}\!\left( BI(X,Z) \bowtie_Z BI(Z,Y) \right), \qquad \mathit{even}^1 = \Delta^1$$

**For $i \geq 1$:**

$$\Delta^{i+1} = \pi_{X,Y}\!\left( BI(X,U) \bowtie_U BI(U,V) \bowtie_V \Delta^i(V,Y) \right) - \mathit{even}^i$$

$$\mathit{even}^{i+1} = \mathit{even}^i \cup \Delta^{i+1}$$

Iterate until $\Delta^{i+1} = \emptyset$.

**Step 0:** $\mathit{EVEN} = E_1$ = 17 tuples (identical to naive iteration 1). $\Delta = \mathit{EVEN}$.

**Step 1:** Join $BI$–$BI$ with all 17 $\Delta$ tuples. After subtracting $\mathit{EVEN}$:

$$\Delta = \{(a,e),(e,a),(b,f),(f,b),(c,g),(g,c)\}, \qquad |\mathit{EVEN}| = 23$$

**Step 2:** Only 6 tuples in $\Delta$. For each new $(V,Y)$, find all $X$ that reach $V$ via `bi`–`bi`:

- $(e,a)$: sources of $e = \{c,e,g\}$ $\Rightarrow$ $(g,a)$ **NEW**
- $(c,g)$: sources of $c = \{a,c,e\}$ $\Rightarrow$ $(a,g)$ **NEW**
- All others produce only known tuples.

$$\Delta = \{(g,a),(a,g)\}, \qquad |\mathit{EVEN}| = 25$$

**Step 3:** Only 2 tuples. $(g,a)$ and $(a,g)$ produce no new results. $\Delta = \emptyset$. **Stop.**

-----

## Exercise 3

```prolog
reach(X,Y) :- g(X,Y).
reach(X,Y) :- g(X,Z), reach(Z,Y).
```

$g = \{(a,b),(b,c),(c,d),(d,e),(f,g),(g,h),(h,i),(b,i)\}$

-----

### (a) Why Semi-Naive is Inefficient for `reach(c,Y)`

Semi-naive computes the full transitive closure of $g$ — i.e., all reachable pairs from every node. For this graph it would compute many irrelevant facts (paths from $a$, $b$, $f$, etc.), while only paths starting at $c$ are needed. The answer is simply $\{d, e\}$, yet semi-naive produces 18 tuples in total.

-----

### (b) Top-Down Evaluation of `reach(c,Y)`

- **Goal:** `reach(c,Y)`.
- **Rule 1:** `g(c,Y)` $\Rightarrow$ $Y = d$. Found `reach(c,d)`.
- **Rule 2:** `g(c,Z)` $\Rightarrow$ $Z = d$; subgoal `reach(d,Y)`.
  - **Rule 1:** `g(d,Y)` $\Rightarrow$ $Y = e$. Found `reach(c,e)`.
  - **Rule 2:** `g(d,Z)` $\Rightarrow$ $Z = e$; subgoal `reach(e,Y)`.
    - No `g(e,*)`. Fail.

**Answers:** $Y \in \{d, e\}$.

Only the path $c \to d \to e$ was explored; nodes $a$, $b$, $f$, $g$, $h$, $i$ were never touched.

-----

### (c) Magic Sets for `reach(c,Y)` — Pattern: bound/free (bf)

$X$ bound to $c$, $Y$ free. The magic predicate tracks needed $X$ values:

```prolog
m(c).
m(Z) :- m(X), g(X,Z).

reach(X,Y) :- m(X), g(X,Y).
reach(X,Y) :- m(X), g(X,Z), reach(Z,Y).
```

**Computing $m$:** $m(c)$; $g(c,d) \Rightarrow m(d)$; $g(d,e) \Rightarrow m(e)$; no $g(e,*)$.

$$m = \{c,\ d,\ e\}$$

**Computing `reach`:**

- Base: $m(c), g(c,d) \Rightarrow (c,d)$; $m(d), g(d,e) \Rightarrow (d,e)$. So $\mathit{reach} = \{(c,d),(d,e)\}$.
- Iteration 1: $m(c), g(c,d), \mathit{reach}(d,e) \Rightarrow (c,e)$.
- Iteration 2: no new tuples. Stop.

$$\mathit{reach} = \{(c,d),\ (d,e),\ (c,e)\} \qquad \text{Answer: } Y \in \{d,\ e\}$$

-----

### (d) Magic Sets for `reach(c,e)` — Pattern: bound/bound (bb)

Both arguments bound. In rule 2, $Z$ comes from $g(X,Z)$ and $Y$ is bound from the head, so the recursive call is also bb. The magic predicate tracks $(X,Y)$ pairs:

```prolog
m(c,e).
m(Z,Y) :- m(X,Y), g(X,Z).

reach(X,Y) :- m(X,Y), g(X,Y).
reach(X,Y) :- m(X,Y), g(X,Z), reach(Z,Y).
```

**Computing $m$:** $m(c,e)$; $g(c,d) \Rightarrow m(d,e)$; $g(d,e) \Rightarrow m(e,e)$; no $g(e,*)$.

$$m = \{(c,e),\ (d,e),\ (e,e)\}$$

**Base** (check $m(X,Y)$ and $g(X,Y)$): $m(d,e), g(d,e) \Rightarrow \mathit{reach}(d,e)$.

**Iteration:** $m(c,e), g(c,d), \mathit{reach}(d,e) \Rightarrow \mathit{reach}(c,e)$. Next iteration: no new tuples. Stop.

**Answer:** `reach(c,e)` = **YES**.

-----

### (e) Magic Sets for `reach(X,e)` — Pattern: free/bound (fb)

$X$ free, $Y$ bound to $e$. The recursive call also has $Y$ bound and $X$ free (fb). Since $Y = e$ never changes, the magic set is trivial:

```prolog
m(e).

reach(X,Y) :- m(Y), g(X,Y).
reach(X,Y) :- m(Y), g(X,Z), reach(Z,Y).
```

$$m = \{e\}$$

**Computing `reach`:**

- Base: $g(d,e) \Rightarrow \mathit{reach}(d,e)$.
- Iteration 1: $g(c,d), \mathit{reach}(d,e) \Rightarrow \mathit{reach}(c,e)$.
- Iteration 2: $g(b,c), \mathit{reach}(c,e) \Rightarrow \mathit{reach}(b,e)$.
- Iteration 3: $g(a,b), \mathit{reach}(b,e) \Rightarrow \mathit{reach}(a,e)$.
- Iteration 4: no $g(*,a)$. Stop.

**Answer:** $X \in \{a,\ b,\ c,\ d\}$.
