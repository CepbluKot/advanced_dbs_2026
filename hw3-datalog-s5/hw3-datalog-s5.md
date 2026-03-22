# HW3 - Seminar 5 - Datalog

## Exercise 1

```
s(X,Y) :- u(V,W), v(W,X), v(W,Y), not(X=Y).
r(X,Y) :- s(X,X), t(Y), not(s(Y,Y)).
```

EDB: `u(V,W)`, `v(A,B)`, `t(Y)`. IDB: `s`, `r`.

**Stratification:** `s` only uses EDB + built-in `not(X=Y)`. `r` negates `s`, but `s` doesn't depend on `r`.

Strata: {t, u, v} -> {s} -> {r}.

**RA for `s(X,Y)`:**

Rename two copies of v:
- V1 = ρ_{W,X}(v)
- V2 = ρ_{W,Y}(v)

```
s = π_{X,Y}( σ_{X ≠ Y}( U ⋈_W V1 ⋈_W V2 ))
```

Join u with both copies on W, filter X ≠ Y, project on X, Y.

**RA for `r(X,Y)`:**

`s(X,X)` = diagonal of s, `not(s(Y,Y))` = values in t not on the diagonal.

```
D = π_X( σ_{X=Y}(S) )
r = D × (T - D)
```

## Exercise 2

```
bi(X,Y) :- g(X,Y).
bi(Y,X) :- g(X,Y).
even(X,Y) :- bi(X,Z), bi(Z,Y).
even(X,Y) :- bi(X,U), bi(U,V), even(V,Y).
```

g = {(a,b), (b,c), (c,d), (d,e), (e,f), (f,g)} - a path a-b-c-d-e-f-g.

Symmetric closure:

```
bi = g ∪ ρ_{Y,X}(g)
   = {(a,b), (b,a), (b,c), (c,b), (c,d), (d,c),
      (d,e), (e,d), (e,f), (f,e), (f,g), (g,f)}
```

RA for the rules:

```
E1 = π_{X,Y}( BI(X,Z) ⋈_Z BI(Z,Y) )
E2 = π_{X,Y}( BI(X,U) ⋈_U BI(U,V) ⋈_V EVEN(V,Y) )
```

### (a) Naive recursion

**Iteration 0:** even_0 = {}

**Iteration 1:** even_0 is empty so E2 produces nothing. Only E1 fires.

For each Z, pair (X,Z) with (Z,Y) tuples:

```
Z=a: (b,a) × (a,b) -> (b,b)
Z=b: (a,b),(c,b) × (b,a),(b,c) -> (a,a),(a,c),(c,a),(c,c)
Z=c: (b,c),(d,c) × (c,b),(c,d) -> (b,b),(b,d),(d,b),(d,d)
Z=d: (c,d),(e,d) × (d,c),(d,e) -> (c,c),(c,e),(e,c),(e,e)
Z=e: (d,e),(f,e) × (e,d),(e,f) -> (d,d),(d,f),(f,d),(f,f)
Z=f: (e,f),(g,f) × (f,e),(f,g) -> (e,e),(e,g),(g,e),(g,g)
Z=g: (f,g) × (g,f) -> (f,f)
```

```
even_1 = {(a,a),(a,c),(b,b),(b,d),(c,a),(c,c),(c,e),
          (d,b),(d,d),(d,f),(e,c),(e,e),(e,g),
          (f,d),(f,f),(g,e),(g,g)}
```

17 tuples - all pairs at distance 2.

**Iteration 2:** E1 doesn't depend on even, produces same as before. E2 composes bi-bi paths with even_1, which is equivalent to composing even_1 with even_1.

```
V=a: {a,c} × {a,c} -> (a,a),(a,c),(c,a),(c,c)
V=b: {b,d} × {b,d} -> (b,b),(b,d),(d,b),(d,d)
V=c: {a,c,e} × {a,c,e} -> includes (a,e),(e,a)
V=d: {b,d,f} × {b,d,f} -> includes (b,f),(f,b)
V=e: {c,e,g} × {c,e,g} -> includes (c,g),(g,c)
V=f: {d,f} × {d,f} -> all known
V=g: {e,g} × {e,g} -> all known
```

New tuples: {(a,e), (e,a), (b,f), (f,b), (c,g), (g,c)} - distance-4 pairs.

```
even_2 = even_1 ∪ {(a,e),(e,a),(b,f),(f,b),(c,g),(g,c)}
```

**Iteration 3:** Composing even_2 with even_2:

- V=c: sources {a,c,e,g}, targets {a,c,e,g} -> (a,g),(g,a) NEW
- V=e: same sources/targets -> same pairs, already found
- All other V: no new tuples

```
even_3 = even_2 ∪ {(a,g),(g,a)}
```

Distance-6 pairs (a and g are 6 apart).

**Iteration 4:** (a,g) composed with (g,*) = {a,c,e,g} - all known. No new tuples. **Stop.**

```
even = {(a,a),(a,c),(a,e),(a,g),
        (b,b),(b,d),(b,f),
        (c,a),(c,c),(c,e),(c,g),
        (d,b),(d,d),(d,f),
        (e,a),(e,c),(e,e),(e,g),
        (f,b),(f,d),(f,f),
        (g,a),(g,c),(g,e),(g,g)}
```

25 tuples total.

### (b) Semi-naive

**Step 1:**
```
Δ1 = π_{X,Y}( BI(X,Z) ⋈_Z BI(Z,Y) )
even1 = Δ1
```

**For i ≥ 1:**
```
Δ^{i+1} = π_{X,Y}( BI(X,U) ⋈_U BI(U,V) ⋈_V Δ^i(V,Y) ) - even^i
even^{i+1} = even^i ∪ Δ^{i+1}
```
Iterate until Δ^{i+1} = ∅.

**Step 0:** EVEN = E1 = 17 tuples (same as iteration 1 of naive). Δ = EVEN.

**Step 1:** Join BI-BI with all 17 Δ tuples. After subtracting EVEN:

Δ = {(a,e),(e,a),(b,f),(f,b),(c,g),(g,c)}, EVEN = 23 tuples.

**Step 2:** Only 6 tuples in Δ. For each new (V,Y), find all X that reach V via bi-bi:

- (e,a): sources of e = {c,e,g} -> (g,a) NEW
- (c,g): sources of c = {a,c,e} -> (a,g) NEW
- Others produce only known tuples.

Δ = {(g,a),(a,g)}, EVEN = 25 tuples.

**Step 3:** Only 2 tuples. (g,a) and (a,g) produce no new results. Δ = {}. **Stop.**

## Exercise 3

```
reach(X,Y) :- g(X,Y).
reach(X,Y) :- g(X,Z), reach(Z,Y).
```

g = {(a,b), (b,c), (c,d), (d,e), (f,g), (g,h), (h,i), (b,i)}.

### (a) Semi-naive is inefficient for `reach(c,Y)`

Semi-naive computes the full transitive closure of g, i.e., all reachable pairs from every node. For this graph it would compute many irrelevant facts (paths from a, b, f, etc.), while only paths starting at c are needed. The answer is just {d, e}, but semi-naive produces 18 tuples total.

### (b) Top-down evaluation of `reach(c,Y)`

- Goal: reach(c,Y).
- Rule 1: g(c,Y) -> Y = d. Found reach(c,d).
- Rule 2: g(c,Z) -> Z = d, subgoal reach(d,Y).
  - Rule 1: g(d,Y) -> Y = e. Found reach(c,e).
  - Rule 2: g(d,Z) -> Z = e, subgoal reach(e,Y).
    - No g(e,*). Fail.

Answers: Y = d and Y = e.

Only explored c -> d -> e, never touched a, b, f, g, h, i.

### (c) Magic sets for `reach(c,Y)`

X bound to c, Y free. Magic predicate tracks needed X values:

```
m(c).
m(Z) :- m(X), g(X,Z).

reach(X,Y) :- m(X), g(X,Y).
reach(X,Y) :- m(X), g(X,Z), reach(Z,Y).
```

Computing m:
- m(c)
- g(c,d) -> m(d)
- g(d,e) -> m(e)
- g(e,*) -> nothing.

m = {c, d, e}.

Computing reach:
- Base: m(c),g(c,d) -> (c,d). m(d),g(d,e) -> (d,e). reach = {(c,d),(d,e)}.
- Iter 1: m(c),g(c,d),reach(d,e) -> (c,e). Rest: nothing.
- Iter 2: no new tuples. Stop.

reach = {(c,d), (d,e), (c,e)}. Answer: Y in {d, e}.

### (d) Magic sets for `?reach(c,e)`

Both arguments bound. In rule 2, Z comes from g(X,Z) and Y is bound from the head, so the recursive call is also bb. Magic predicate tracks (X,Y) pairs:

```
m(c,e).
m(Z,Y) :- m(X,Y), g(X,Z).

reach(X,Y) :- m(X,Y), g(X,Y).
reach(X,Y) :- m(X,Y), g(X,Z), reach(Z,Y).
```

Computing m:
- m(c,e)
- g(c,d) -> m(d,e)
- g(d,e) -> m(e,e)
- g(e,*) -> nothing.

m = {(c,e), (d,e), (e,e)}.

Base (check m(X,Y) and g(X,Y)):
- m(d,e), g(d,e) -> reach(d,e). Others don't match.

Iteration:
- m(c,e), g(c,d), reach(d,e) -> reach(c,e).
- Next iteration: no new. Stop.

Answer: reach(c,e) = YES.

### (e) Magic sets for `?reach(X,e)`

X free, Y bound to e. The recursive call also has Y bound and X free (fb). Since Y = e never changes, the magic set is trivial:

```
m(e).

reach(X,Y) :- m(Y), g(X,Y).
reach(X,Y) :- m(Y), g(X,Z), reach(Z,Y).
```

m = {e}.

- Base: g(d,e) -> reach(d,e).
- Iter 1: g(c,d), reach(d,e) -> reach(c,e).
- Iter 2: g(b,c), reach(c,e) -> reach(b,e).
- Iter 3: g(a,b), reach(b,e) -> reach(a,e).
- Iter 4: no g(*,a). Stop.

Answer: X in {a, b, c, d}.
