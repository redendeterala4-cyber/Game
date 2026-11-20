// ===== Mathinik Quest — question variants =====
// Templates that build a brand-new question (fresh numbers, shuffled choices) every time they are used,
// so fights don't repeat. app.js mixes these with the fixed question bank (see pickQuestions).
// Topics and methods follow the ARAL Math worksheet sequence (Grade 7):
// Fractions → Decimals → Geometry (solids, area, surface area) → Speed → Outcomes → Integers.
// Each template: {topic, level, make()} → {topic, level, prompt, options[4], answer, explanation, variant:true}
const QuestionVariants = (() => {
  // ---------- helpers ----------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const nz = (a, b) => { let n; do n = rnd(a, b); while (n === 0); return n; };            // non-zero
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const n = v => v < 0 ? "−" + (-v) : String(v);                                           // −5 with a true minus sign
  const p = v => v < 0 ? `(${n(v)})` : n(v);                                               // (−5) inside expressions
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  // Fraction in lowest terms; improper fractions become mixed numbers (ARAL answer style): 17/12 → "1 5/12"
  function fr(num, den) {
    if (den < 0) { num = -num; den = -den; }
    const g = gcd(num, den); num /= g; den /= g;
    const neg = num < 0; num = Math.abs(num);
    let s;
    if (den === 1) s = String(num);
    else if (num > den) s = `${Math.floor(num / den)} ${num % den}/${den}`;
    else s = `${num}/${den}`;
    return (neg && num !== 0 ? "−" : "") + s;
  }
  const raw = (a, b) => `${a}/${b}`;
  const show = (a, b) => (raw(a, b) === fr(a, b) ? raw(a, b) : `${raw(a, b)} = ${fr(a, b)}`);   // "6/9 = 2/3"
  // Decimal without floating-point noise: 0.1 + 0.2 → "0.3"; trailing zeros dropped
  const dec = (x, places = 6) => n(Math.round(x * 10 ** places) / 10 ** places);
  const peso = x => "₱" + (Math.round(x * 100) / 100).toFixed(2);
  const clock = mins => { mins = ((mins % 1440) + 1440) % 1440; const h = Math.floor(mins / 60), m = mins % 60, h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

  // Builds a question: answer + wrong answers (strings); `more(k)` supplies extra wrong answers until there are 4 choices.
  function Q(topic, level, prompt, answer, wrongs, explanation, more) {
    const opts = [answer];
    for (const w of wrongs) if (w && !String(w).includes("NaN") && !opts.includes(w)) opts.push(w);
    for (let k = 1; opts.length < 4 && k < 60; k++) { const w = more && more(k); if (w && !opts.includes(w)) opts.push(w); }
    return { topic, level, prompt, options: shuffle(opts.slice(0, 4)), answer, explanation, variant: true };
  }
  const step = k => (k % 2 ? 1 : -1) * Math.ceil(k / 2);                                     // 1, −1, 2, −2, …
  const nearInt = (v, unit = "") => k => n(v + step(k)) + unit;

  const T = [
    // ================= FRACTIONS (WS 1–13) =================
    { topic: "Fractions", level: "Easy", make() {               // adding similar fractions
      const d = rnd(5, 12), a = rnd(1, d - 2), b = rnd(1, d - 1 - a), s = a + b;
      return Q(this.topic, this.level, `Add and write in lowest terms: ${a}/${d} + ${b}/${d}`, fr(s, d),
        [fr(s, 2 * d), fr(Math.abs(a - b) || 1, d), fr(a * b, d * d)],
        `Same denominator: add the numerators (${a} + ${b} = ${s}) and copy the denominator: ${show(s, d)}.`,
        k => fr(Math.max(1, s + step(k)), d));
    } },
    { topic: "Fractions", level: "Easy", make() {               // subtracting similar fractions
      const d = rnd(5, 12), a = rnd(3, d - 1), b = rnd(1, a - 1), s = a - b;
      return Q(this.topic, this.level, `Subtract and write in lowest terms: ${a}/${d} − ${b}/${d}`, fr(s, d),
        [fr(a + b, d), fr(s + 1, d), fr(s, d + 1)],
        `Same denominator: subtract the numerators (${a} − ${b} = ${s}) and copy the denominator: ${show(s, d)}.`,
        k => fr(Math.max(1, s + step(k) + 1), d));
    } },
    { topic: "Fractions", level: "Easy", make() {               // adding mixed numbers, same denominator
      const d = rnd(3, 9), a = rnd(1, d - 2), b = rnd(1, d - 1 - a), w1 = rnd(1, 7), w2 = rnd(1, 7), W = w1 + w2;
      return Q(this.topic, this.level, `Add: ${w1} ${a}/${d} + ${w2} ${b}/${d}`, fr(W * d + a + b, d),
        [fr((W + 1) * d + a + b, d), fr(W * 2 * d + a + b, 2 * d), fr((W - 1) * d + a + b, d)],
        `Add the whole numbers (${w1} + ${w2} = ${W}), then the fractions (${a}/${d} + ${b}/${d} = ${show(a + b, d)}): ${fr(W * d + a + b, d)}.`,
        k => fr(W * d + a + b + step(k), d));
    } },
    { topic: "Fractions", level: "Average", make() {            // adding dissimilar fractions
      let d1, d2; do { d1 = pick([2, 3, 4, 5, 6, 8, 10]); d2 = pick([2, 3, 4, 5, 6, 8, 10]); } while (d1 === d2 || d1 % d2 === 0 && d2 % d1 === 0);
      const a = rnd(1, d1 - 1), b = rnd(1, d2 - 1), L = lcm(d1, d2), A = a * L / d1, B = b * L / d2;
      return Q(this.topic, this.level, `Add: ${a}/${d1} + ${b}/${d2}`, fr(A + B, L),
        [fr(a + b, d1 + d2), fr(a * b, d1 * d2), fr(a + b, L)],
        `Make them similar using the LCD ${L}: ${a}/${d1} = ${A}/${L} and ${b}/${d2} = ${B}/${L}. ${A} + ${B} = ${A + B}, so ${show(A + B, L)}.`,
        k => fr(Math.max(1, A + B + step(k)), L));
    } },
    { topic: "Fractions", level: "Average", make() {            // subtracting dissimilar fractions
      let d1, d2, a, b, L, A, B;
      do { d1 = pick([2, 3, 4, 5, 6, 8, 9, 10]); d2 = pick([2, 3, 4, 5, 6, 8, 9, 10]); a = rnd(1, d1 - 1); b = rnd(1, d2 - 1); L = lcm(d1, d2); A = a * L / d1; B = b * L / d2; } while (d1 === d2 || A <= B);
      return Q(this.topic, this.level, `Subtract: ${a}/${d1} − ${b}/${d2}`, fr(A - B, L),
        [fr(Math.abs(a - b) || 1, Math.abs(d1 - d2) || 1), fr(A + B, L), fr(a - b > 0 ? a - b : 1, L)],
        `Make them similar using the LCD ${L}: ${a}/${d1} = ${A}/${L} and ${b}/${d2} = ${B}/${L}. ${A} − ${B} = ${A - B}, so ${show(A - B, L)}.`,
        k => fr(Math.max(1, A - B + step(k)), L));
    } },
    { topic: "Fractions", level: "Average", make() {            // multiplying fractions
      const b = rnd(2, 9), d = rnd(2, 9), a = rnd(1, b - 1), c = rnd(1, d - 1);
      return Q(this.topic, this.level, `Multiply and write in lowest terms: ${a}/${b} × ${c}/${d}`, fr(a * c, b * d),
        [fr(a * d, b * c), fr(a + c, b + d), fr(a * c, b + d)],
        `Multiply the numerators (${a} × ${c} = ${a * c}) and the denominators (${b} × ${d} = ${b * d}): ${show(a * c, b * d)}. Tip: cancel common factors first to skip simplifying.`,
        k => fr(Math.max(1, a * c + step(k)), b * d));
    } },
    { topic: "Fractions", level: "Difficult", make() {          // dividing fractions
      const b = rnd(2, 9), d = rnd(2, 9), a = rnd(1, b - 1), c = rnd(1, d - 1);
      return Q(this.topic, this.level, `Divide: ${a}/${b} ÷ ${c}/${d}`, fr(a * d, b * c),
        [fr(a * c, b * d), fr(b * c, a * d), fr(a * d + 1, b * c)],
        `Change the divisor to its reciprocal and multiply: ${a}/${b} × ${d}/${c} = ${show(a * d, b * c)}.`,
        k => fr(Math.max(1, a * d + step(k)), b * c));
    } },
    { topic: "Fractions", level: "Difficult", make() {          // multiplying mixed numbers
      const d1 = rnd(2, 5), d2 = rnd(2, 5), a1 = rnd(1, d1 - 1), a2 = rnd(1, d2 - 1), w1 = rnd(1, 3), w2 = rnd(1, 3);
      const N1 = w1 * d1 + a1, N2 = w2 * d2 + a2;
      return Q(this.topic, this.level, `Multiply: ${w1} ${a1}/${d1} × ${w2} ${a2}/${d2}`, fr(N1 * N2, d1 * d2),
        [fr(w1 * w2 * d1 * d2 + a1 * a2, d1 * d2), fr(N1 * d2 + N2 * d1, d1 * d2), fr(N1 * d2, d1 * N2)],
        `Change to improper fractions: ${N1}/${d1} × ${N2}/${d2}. Multiply: ${raw(N1 * N2, d1 * d2)} = ${fr(N1 * N2, d1 * d2)}.`,
        k => fr(N1 * N2 + step(k), d1 * d2));
    } },
    { topic: "Fractions", level: "Difficult", make() {          // word problems
      const kind = rnd(0, 2);
      if (kind === 0) {                                         // how many pieces → divide
        const q = pick([2, 3, 4, 5]), pp = rnd(1, q - 1), L = pp * rnd(2, 6), cnt = L * q / pp, thing = pick(["ribbon", "rope", "wire", "piece of cloth"]);
        return Q(this.topic, this.level, `A ${thing} ${L} m long is cut into pieces that are each ${pp}/${q} m long. How many pieces are there?`, String(cnt),
          [fr(L * pp, q), String(L * q), String(L + q)],
          `'How many ${pp}/${q} in ${L}' means divide: ${L} ÷ ${pp}/${q} = ${L} × ${q}/${pp} = ${cnt} pieces.`, nearInt(cnt));
      }
      if (kind === 1) {                                         // "of" → multiply
        const y = rnd(2, 8), x = rnd(1, y - 1), b = rnd(2, 6), a = rnd(1, b - 1), food = pick(["cake", "pizza", "leche flan", "bibingka"]), who = pick(["Ana", "Ben", "Carlo", "Dina", "Jun"]);
        return Q(this.topic, this.level, `There was ${x}/${y} of a ${food} left. ${who} ate ${a}/${b} of what was left. What part of the whole ${food} did ${who} eat?`, fr(a * x, b * y),
          [fr(a * y + b * x, b * y), fr(a * b, x * y), fr(Math.abs(x * b - a * y) || 1, b * y)],
          `'${a}/${b} of' means multiply: ${a}/${b} × ${x}/${y} = ${show(a * x, b * y)}.`, k => fr(Math.max(1, a * x + step(k)), b * y));
      }
      let d1, d2; do { d1 = pick([3, 4, 5, 6, 8, 10]); d2 = pick([3, 4, 5, 6, 8, 10]); } while (d1 === d2);  // "in all" → add
      const a = rnd(1, d1 - 1), b = rnd(1, d2 - 1), L = lcm(d1, d2), A = a * L / d1, B = b * L / d2, who = pick(["Lina", "Paolo", "Mika", "Rey"]);
      return Q(this.topic, this.level, `${who} walked ${a}/${d1} km in the morning and ${b}/${d2} km in the afternoon. How far did ${who} walk in all?`, fr(A + B, L) + " km",
        [fr(a + b, d1 + d2) + " km", fr(Math.abs(A - B) || 1, L) + " km", fr(a * b, d1 * d2) + " km"],
        `'In all' means add. LCD ${L}: ${A}/${L} + ${B}/${L} = ${show(A + B, L)} km.`, k => fr(Math.max(1, A + B + step(k)), L) + " km");
    } },

    // ================= DECIMALS (WS 14–26) =================
    { topic: "Decimals", level: "Easy", make() {                // adding (hundredths + tenths)
      const X = rnd(105, 9999), y1 = rnd(11, 999), tot = X + y1 * 10;
      return Q(this.topic, this.level, `Add: ${dec(X / 100)} + ${dec(y1 / 10)}`, dec(tot / 100),
        [dec((X + y1) / 100), dec((X + y1 * 100) / 100), dec((tot + 100) / 100)],
        `Line up the decimal points and fill empty places with zeros: ${(X / 100).toFixed(2)} + ${(y1 / 10).toFixed(2)} = ${dec(tot / 100)}.`,
        k => dec((tot + 10 * step(k)) / 100));
    } },
    { topic: "Decimals", level: "Easy", make() {                // subtracting
      const X = rnd(500, 9999); let y1; do y1 = rnd(11, 499); while (y1 * 10 >= X); const d = X - y1 * 10;
      return Q(this.topic, this.level, `Subtract: ${dec(X / 100)} − ${dec(y1 / 10)}`, dec(d / 100),
        [dec((X - y1) / 100), dec((X + y1 * 10) / 100), dec((d + 100) / 100)],
        `Line up the decimal points and fill empty places with zeros: ${(X / 100).toFixed(2)} − ${(y1 / 10).toFixed(2)} = ${dec(d / 100)}.`,
        k => dec((d + 10 * step(k)) / 100));
    } },
    { topic: "Decimals", level: "Easy", make() {                // ÷ 10, 100, 1000
      const X = rnd(11, 99999), x = X / 100, pw = rnd(1, 3), by = 10 ** pw;
      return Q(this.topic, this.level, `Divide: ${dec(x)} ÷ ${by.toLocaleString("en-US")}`, dec(X / (100 * by), 8),
        [dec(x * by), dec(X / (100 * by * 10), 9), dec(X * 10 / (100 * by), 8)],
        `Dividing by ${by.toLocaleString("en-US")} moves the decimal point ${pw} place${pw > 1 ? "s" : ""} to the LEFT: ${dec(x)} → ${dec(X / (100 * by), 8)}.`,
        k => dec(X / (100 * by * 10 ** (k + 1)), 10));
    } },
    { topic: "Decimals", level: "Average", make() {             // multiplying decimals
      const a = rnd(11, 99), b = rnd(2, 9), whole = Math.random() < .4, A = a / 10, B = whole ? b : b / 10, places = whole ? 1 : 2, prod = a * b;
      return Q(this.topic, this.level, `Multiply: ${dec(A)} × ${dec(B)}`, dec(prod / 10 ** places),
        [dec(prod / 10 ** (places - 1)), dec(prod / 10 ** (places + 1)), dec((prod + b) / 10 ** places)],
        `Multiply as whole numbers: ${a} × ${b} = ${prod}. The factors have ${places} decimal place${places > 1 ? "s" : ""} in all, so the answer is ${dec(prod / 10 ** places)}.`,
        k => dec((prod + step(k)) / 10 ** places));
    } },
    { topic: "Decimals", level: "Average", make() {             // decimal ÷ whole number (exact)
      const k = rnd(2, 9), Qh = rnd(11, 999), D = Qh * k;
      return Q(this.topic, this.level, `Divide: ${dec(D / 100)} ÷ ${k}`, dec(Qh / 100),
        [dec(Qh / 10), dec(Qh / 1000), dec((Qh + k) / 100)],
        `Divide as with whole numbers (${D} ÷ ${k} = ${Qh}) and put the decimal point straight above the point in the dividend: ${dec(Qh / 100)}.`,
        j => dec((Qh + step(j)) / 100));
    } },
    { topic: "Decimals", level: "Average", make() {             // ÷ 0.1, 0.01, 0.001
      const X = rnd(11, 9999), x = X / 10000, pw = rnd(1, 3), by = 10 ** -pw;
      return Q(this.topic, this.level, `Divide: ${dec(x, 8)} ÷ ${dec(by, 4)}`, dec(X / 10 ** (4 - pw), 8),
        [dec(X / 10 ** (4 + pw), 10), dec(X / 10 ** (4 - pw - 1), 8), dec(X / 10 ** (4 - pw + 1), 8)],
        `Dividing by ${dec(by, 4)} moves the decimal point ${pw} place${pw > 1 ? "s" : ""} to the RIGHT: ${dec(x, 8)} → ${dec(X / 10 ** (4 - pw), 8)}.`,
        k => dec(X / 10 ** (4 - pw + k + 1), 10));
    } },
    { topic: "Decimals", level: "Difficult", make() {           // dividing by a decimal (exact)
      const pw = rnd(1, 2), dv = rnd(2, 9), Qn = rnd(2, 99), divisor = dv / 10 ** pw, dividend = dv * Qn / 10 ** pw;
      return Q(this.topic, this.level, `Divide: ${dec(dividend)} ÷ ${dec(divisor)}`, String(Qn),
        [dec(Qn / 10), dec(Qn * 10), dec(Qn / 100)],
        `Move both decimal points ${pw} place${pw > 1 ? "s" : ""} to the right so the divisor is a whole number: ${dv * Qn} ÷ ${dv} = ${Qn}.`,
        nearInt(Qn));
    } },
    { topic: "Decimals", level: "Difficult", make() {           // money: change
      const c1 = rnd(1500, 9975), c2 = rnd(500, 4950), tot = c1 + c2, bill = [10000, 20000, 50000].find(b => b > tot), ch = bill - tot;
      const [i1, i2] = shuffle(["a notebook", "a pen", "a snack", "a ruler", "a drink", "a folder"]).slice(0, 2), who = pick(["Mia", "Josh", "Bea", "Nico"]);
      return Q(this.topic, this.level, `${who} bought ${i1} for ${peso(c1 / 100)} and ${i2} for ${peso(c2 / 100)}, and paid with ${peso(bill / 100)}. How much change did ${who} get?`, peso(ch / 100),
        [peso(tot / 100), peso((bill - c1) / 100), peso((ch + 100) / 100)],
        `Total cost: ${peso(c1 / 100)} + ${peso(c2 / 100)} = ${peso(tot / 100)}. Change: ${peso(bill / 100)} − ${peso(tot / 100)} = ${peso(ch / 100)}.`,
        k => peso((ch + 50 * step(k)) / 100));
    } },
    { topic: "Decimals", level: "Difficult", make() {           // multiplying hundredths × tenths
      const a = rnd(101, 999), b = rnd(2, 19), prod = a * b;
      return Q(this.topic, this.level, `Multiply: ${dec(a / 100)} × ${dec(b / 10)}`, dec(prod / 1000),
        [dec(prod / 100), dec(prod / 10000), dec((prod + 10) / 1000)],
        `${a} × ${b} = ${prod}. There are 2 + 1 = 3 decimal places in the factors: ${dec(prod / 1000)}.`,
        k => dec((prod + 10 * step(k)) / 1000));
    } },

    // ================= SHAPES & AREA (WS 27–34, 38–47) =================
    { topic: "Geometry", level: "Easy", make() {                // naming prisms and pyramids
      const shapes = [["triangle", "Triangular"], ["rectangle", "Rectangular"], ["pentagon", "Pentagonal"], ["hexagon", "Hexagonal"]];
      const [shape, adj] = pick(shapes), prism = Math.random() < .5, kind = prism ? "prism" : "pyramid", other = prism ? "pyramid" : "prism";
      const adj2 = pick(shapes.filter(s => s[1] !== adj))[1];
      const prompt = prism ? `A solid has two parallel ${shape} bases and rectangular lateral faces. What is it?`
                           : `A solid has one ${shape} base and triangular lateral faces that meet at a point. What is it?`;
      return Q(this.topic, this.level, prompt, `${adj} ${kind}`, [`${adj} ${other}`, `${adj2} ${kind}`, `${adj2} ${other}`],
        `${prism ? "Two parallel bases with rectangular lateral faces make a prism" : "One base with triangular faces meeting at the apex makes a pyramid"}. It is named after its ${shape} base: ${adj.toLowerCase()} ${kind}.`);
    } },
    { topic: "Geometry", level: "Easy", make() {                // counting lateral faces
      const [adj, sides] = pick([["triangular", 3], ["rectangular", 4], ["pentagonal", 5], ["hexagonal", 6]]), kind = pick(["prism", "pyramid"]);
      return Q(this.topic, this.level, `How many lateral faces does a ${adj} ${kind} have?`, String(sides),
        [String(sides + 2), String(sides + 1), String(2 * sides)],
        `A ${adj} base has ${sides} sides, and each side has one lateral face, so there are ${sides} lateral faces (${kind === "prism" ? "rectangles" : "triangles"}).`, nearInt(sides));
    } },
    { topic: "Geometry", level: "Easy", make() {                // solid vs plane
      const solids = ["Cube", "Sphere", "Cone", "Cylinder", "Pyramid", "Prism"], planes = ["Circle", "Square", "Triangle", "Rectangle", "Pentagon"];
      const wantSolid = Math.random() < .5, ans = pick(wantSolid ? solids : planes), others = shuffle((wantSolid ? planes : solids).slice()).slice(0, 3);
      return Q(this.topic, this.level, `Which of these is a ${wantSolid ? "solid (3-D)" : "plane (flat)"} figure?`, ans, others,
        `Plane figures are flat (circle, square, triangle, rectangle). Solid figures are 3-D (cube, sphere, cone, cylinder, pyramid, prism). ${ans} is a ${wantSolid ? "solid" : "plane"} figure.`);
    } },
    { topic: "Geometry", level: "Average", make() {             // cube surface area
      const s = rnd(2, 15), u = pick(["cm", "m"]);
      return Q(this.topic, this.level, `Find the surface area of a cube with side ${s} ${u}. (SA = 6s²)`, `${6 * s * s} ${u}²`,
        [`${s ** 3} ${u}²`, `${4 * s * s} ${u}²`, `${6 * s} ${u}²`],
        `SA = 6 × ${s} × ${s} = 6 × ${s * s} = ${6 * s * s} ${u}².`, k => `${6 * s * s + 6 * step(k)} ${u}²`);
    } },
    { topic: "Geometry", level: "Average", make() {             // rectangular prism surface area
      const l = rnd(4, 15), w = rnd(2, 10), h = rnd(2, 10), S = 2 * (l * w + l * h + w * h);
      return Q(this.topic, this.level, `Find the surface area of a rectangular prism with l = ${l} cm, w = ${w} cm and h = ${h} cm. (SA = 2(lw + lh + wh))`, `${S} cm²`,
        [`${S / 2} cm²`, `${l * w * h} cm²`, `${2 * (l + w + h)} cm²`],
        `lw = ${l * w}, lh = ${l * h}, wh = ${w * h}. SA = 2(${l * w} + ${l * h} + ${w * h}) = 2 × ${S / 2} = ${S} cm².`, k => `${S + 2 * step(k)} cm²`);
    } },
    { topic: "Geometry", level: "Average", make() {             // composite: rectangle + triangle, or square with a hole
      if (Math.random() < .5) {
        const l = 2 * rnd(2, 7), w = rnd(3, 10), h = rnd(2, 8), A = l * w + l * h / 2;
        return Q(this.topic, this.level, `A figure is a rectangle ${l} cm by ${w} cm with a triangle on top (base ${l} cm, height ${h} cm). What is its total area?`, `${A} cm²`,
          [`${l * w + l * h} cm²`, `${l * w} cm²`, `${l * w - l * h / 2} cm²`],
          `Split the figure. Rectangle: ${l} × ${w} = ${l * w} cm². Triangle: ½ × ${l} × ${h} = ${l * h / 2} cm². Total: ${A} cm².`, k => `${A + step(k)} cm²`);
      }
      const L = rnd(8, 16), s = rnd(2, L - 4), A = L * L - s * s;
      return Q(this.topic, this.level, `A square garden is ${L} m on each side. A square pond ${s} m on each side is inside it. What is the area of the garden without the pond?`, `${A} m²`,
        [`${L * L + s * s} m²`, `${L * L} m²`, `${(L - s) ** 2} m²`],
        `Subtract the hole: ${L} × ${L} − ${s} × ${s} = ${L * L} − ${s * s} = ${A} m².`, k => `${A + step(k)} m²`);
    } },
    { topic: "Geometry", level: "Difficult", make() {           // cylinder
      const r = rnd(1, 6), h = rnd(2, 10), bases = 2 * 3.14 * r * r, side = 2 * 3.14 * r * h;
      return Q(this.topic, this.level, `Find the surface area of a cylinder with r = ${r} cm and h = ${h} cm. (SA = 2πr² + 2πrh, π = 3.14)`, `${dec(bases + side, 2)} cm²`,
        [`${dec(side, 2)} cm²`, `${dec(bases / 2 + side, 2)} cm²`, `${dec(bases + side / 2, 2)} cm²`],
        `Two bases: 2 × 3.14 × ${r} × ${r} = ${dec(bases, 2)}. Side: 2 × 3.14 × ${r} × ${h} = ${dec(side, 2)}. Total: ${dec(bases + side, 2)} cm².`,
        k => `${dec(bases + side + 3.14 * step(k), 2)} cm²`);
    } },
    { topic: "Geometry", level: "Difficult", make() {           // sphere
      const r = rnd(1, 10), S = 4 * 3.14 * r * r;
      return Q(this.topic, this.level, `Find the surface area of a sphere with r = ${r} cm. (SA = 4πr², π = 3.14)`, `${dec(S, 2)} cm²`,
        [`${dec(3.14 * r * r, 2)} cm²`, `${dec(4 * 3.14 * r, 2)} cm²`, `${dec(2 * 3.14 * r * r, 2)} cm²`],
        `SA = 4 × 3.14 × ${r} × ${r} = 12.56 × ${r * r} = ${dec(S, 2)} cm².`, k => `${dec(S + 12.56 * step(k), 2)} cm²`);
    } },
    { topic: "Geometry", level: "Difficult", make() {           // cone
      const r = rnd(2, 8), s = r + rnd(2, 10), curved = 3.14 * r * s, base = 3.14 * r * r;
      return Q(this.topic, this.level, `Find the surface area of a cone with r = ${r} cm and slant height s = ${s} cm. (SA = πrs + πr², π = 3.14)`, `${dec(curved + base, 2)} cm²`,
        [`${dec(curved, 2)} cm²`, `${dec(2 * curved, 2)} cm²`, `${dec(curved + 2 * base, 2)} cm²`],
        `Curved surface: 3.14 × ${r} × ${s} = ${dec(curved, 2)}. Base: 3.14 × ${r} × ${r} = ${dec(base, 2)}. Total: ${dec(curved + base, 2)} cm².`,
        k => `${dec(curved + base + 3.14 * step(k), 2)} cm²`);
    } },
    { topic: "Geometry", level: "Difficult", make() {           // square pyramid
      const b = rnd(3, 12), h = rnd(3, 12), S = b * b + 2 * b * h;
      return Q(this.topic, this.level, `Find the surface area of a square pyramid with base edge b = ${b} cm and slant height h = ${h} cm. (SA = b² + 2bh)`, `${S} cm²`,
        [`${b * b + b * h} cm²`, `${4 * b * h} cm²`, `${b * b + 4 * b * h} cm²`],
        `Base: ${b} × ${b} = ${b * b}. Four triangles: 2 × ${b} × ${h} = ${2 * b * h}. Total: ${S} cm².`, k => `${S + step(k)} cm²`);
    } },

    // ================= SPEED, DISTANCE, TIME (WS 35–37) =================
    { topic: "Speed", level: "Easy", make() {                   // identify the quantity
      const items = [["Speed", [`${rnd(4, 18) * 5} km/h`, `${rnd(2, 30)} m/s`, `${rnd(5, 14) * 5} mph`]], ["Distance", [`${rnd(2, 99)} m`, `${rnd(2, 40) * 5} km`, `${dec(rnd(11, 99) / 10)} km`]], ["Time", [`${rnd(2, 12) * 5} minutes`, `${rnd(2, 9)} hours`, `${rnd(5, 59)} seconds`]]];
      const [ans, list] = pick(items), val = pick(list);
      return Q(this.topic, this.level, `Is ${val} a speed, a distance, or a time?`, ans, ["Speed", "Distance", "Time", "Area"].filter(x => x !== ans),
        `km/h, m/s and mph are units of speed; m and km are units of distance; seconds, minutes and hours are units of time. So ${val} is a ${ans.toLowerCase()}.`);
    } },
    { topic: "Speed", level: "Easy", make() {                   // S = D ÷ T
      const T = rnd(2, 6), S = rnd(2, 18) * 5, D = S * T, v = pick(["car", "bus", "jeepney", "truck", "van"]);
      return Q(this.topic, this.level, `A ${v} travels ${D} km in ${T} hours. What is its speed?`, `${S} km/h`,
        [`${D * T} km/h`, `${D + T} km/h`, `${D - T} km/h`],
        `S = D ÷ T = ${D} ÷ ${T} = ${S} km/h.`, nearInt(S, " km/h"));
    } },
    { topic: "Speed", level: "Average", make() {                // D = S × T
      const S = rnd(2, 8) * 10, T = pick([1.5, 2, 2.5, 3, 4]), D = S * T, v = pick(["bus", "jeepney", "tricycle", "car"]);
      return Q(this.topic, this.level, `A ${v} travels at ${S} km/h for ${dec(T)} hours. How far does it go?`, `${dec(D)} km`,
        [`${dec(S / T, 1)} km`, `${dec(S + T)} km`, `${dec(D * 2)} km`],
        `D = S × T = ${S} × ${dec(T)} = ${dec(D)} km.`, k => `${dec(D + 5 * step(k))} km`);
    } },
    { topic: "Speed", level: "Average", make() {                // T = D ÷ S (hours)
      const S = pick([20, 30, 40, 50, 60]), T = pick([0.5, 1.5, 2, 2.5, 3, 4]), D = S * T, v = pick(["cyclist", "bus", "boat", "jeepney"]);
      return Q(this.topic, this.level, `A ${v} travels ${dec(D)} km at ${S} km/h. How many hours does the trip take?`, `${dec(T)} hours`,
        [`${dec(D * S)} hours`, `${dec(S / D, 2)} hours`, `${dec(T + 1)} hours`],
        `T = D ÷ S = ${dec(D)} ÷ ${S} = ${dec(T)} hours.`, k => `${dec(Math.max(0.5, T + 0.5 * step(k)))} hours`);
    } },
    { topic: "Speed", level: "Average", make() {                // T in minutes
      let S, Tm, D; do { S = pick([12, 20, 24, 30, 36, 40, 48, 60]); Tm = pick([15, 20, 30, 45]); D = S * Tm / 60; } while (!Number.isInteger(D * 2));
      const who = pick(["Anna", "Jun", "Rosa", "Leo"]), how = pick(["walks", "bikes", "rides a tricycle"]);
      return Q(this.topic, this.level, `${who} ${how} ${dec(D)} km at ${S} km/h. How many minutes does it take?`, `${Tm} minutes`,
        [`${dec(D / S, 2)} minutes`, `${Tm + 10} minutes`, `${dec(D * 60 / S + 30)} minutes`],
        `T = D ÷ S = ${dec(D)} ÷ ${S} = ${dec(D / S, 3)} hour. × 60 = ${Tm} minutes.`, k => `${Tm + 5 * step(k)} minutes`);
    } },
    { topic: "Speed", level: "Difficult", make() {              // arrival time
      const dep = rnd(6, 10) * 60 + pick([0, 15, 30, 45]), Tm = pick([30, 45, 60, 75, 90, 105, 120]), S = pick([20, 40, 60]), D = S * Tm / 60, v = pick(["ferry", "bus", "van"]);
      const hrs = Tm / 60, wrongMin = Math.floor(hrs) * 60 + Math.round((hrs % 1) * 100);  // reading 1.25 h as 1 h 25 min
      return Q(this.topic, this.level, `A ${v} leaves at ${clock(dep)} and travels ${D} km at ${S} km/h. What time does it arrive?`, clock(dep + Tm),
        [clock(dep + wrongMin), clock(dep + Tm + 30), clock(dep + Tm - 15)],
        `T = ${D} ÷ ${S} = ${dec(hrs)} hour${hrs === 1 ? "" : "s"} = ${Tm} minutes. ${clock(dep)} + ${Tm} minutes = ${clock(dep + Tm)}.`,
        k => clock(dep + Tm + 15 * step(k)));
    } },
    { topic: "Speed", level: "Difficult", make() {              // average speed from clock times
      const dep = rnd(5, 9) * 60, H = rnd(2, 5), S = rnd(6, 16) * 5, D = S * H;
      return Q(this.topic, this.level, `A truck left at ${clock(dep)} and arrived at ${clock(dep + H * 60)} after traveling ${D} km. What was its average speed?`, `${S} km/h`,
        [`${dec(D / (H + 1), 1)} km/h`, `${dec(D / (H - 1 || 0.5), 1)} km/h`, `${D * H} km/h`],
        `${clock(dep)} to ${clock(dep + H * 60)} is ${H} hours. S = ${D} ÷ ${H} = ${S} km/h.`, nearInt(S, " km/h"));
    } },
    { topic: "Speed", level: "Difficult", make() {              // two-part trip
      const S1 = pick([30, 40, 50, 60]), T1 = pick([0.5, 1, 1.5, 2]), S2 = pick([20, 30, 40, 60]), T2 = pick([0.5, 1, 1.5, 2]), D1 = S1 * T1, D2 = S2 * T2, tot = T1 + T2;
      return Q(this.topic, this.level, `A car travels ${dec(D1)} km at ${S1} km/h, then ${dec(D2)} km at ${S2} km/h. How long is the whole trip?`, `${dec(tot)} hours`,
        [`${dec((D1 + D2) / (S1 + S2), 2)} hours`, `${dec(tot + 0.5)} hours`, `${dec(Math.max(T1, T2))} hours`],
        `Part 1: ${dec(D1)} ÷ ${S1} = ${dec(T1)} h. Part 2: ${dec(D2)} ÷ ${S2} = ${dec(T2)} h. Total: ${dec(tot)} hours.`,
        k => `${dec(Math.max(0.5, tot + 0.5 * step(k)))} hours`);
    } },

    // ================= LISTING OUTCOMES (WS 48–51) =================
    { topic: "Outcomes", level: "Easy", make() {                // pairs: a × b
      const [g1, g2] = pick([["shirts", "pants"], ["kinds of bread", "drinks"], ["skirts", "blouses"], ["sandwiches", "juices"], ["kinds of rice", "viands"]]), a = rnd(2, 5), b = rnd(2, 5), who = pick(["Rica", "Mateo", "Gela", "Paolo"]);
      return Q(this.topic, this.level, `${who} can choose from ${a} ${g1} and ${b} ${g2}. How many combinations of one of each are there?`, String(a * b),
        [String(a + b), String(a * b + a), String(Math.max(a, b))],
        `Each of the ${a} ${g1} pairs with each of the ${b} ${g2}: ${a} × ${b} = ${a * b} combinations.`, nearInt(a * b));
    } },
    { topic: "Outcomes", level: "Easy", make() {                // coin + spinner
      const k = rnd(3, 6), colors = ["red", "blue", "yellow", "green", "white", "orange"].slice(0, k);
      return Q(this.topic, this.level, `A coin is tossed and a spinner with ${k} colors (${colors.join(", ")}) is spun. How many outcomes are there?`, String(2 * k),
        [String(k + 2), String(k), String(k * k)],
        `Pair H with each of the ${k} colors, then T with each color: 2 × ${k} = ${2 * k} outcomes.`, nearInt(2 * k));
    } },
    { topic: "Outcomes", level: "Average", make() {             // tree diagram
      const a = rnd(2, 5), b = rnd(2, 5);
      return Q(this.topic, this.level, `A tree diagram starts with ${a} branches, and each of them splits into ${b} branches. How many outcomes are at the ends?`, String(a * b),
        [String(a + b), String(a), String(a * b + b)],
        `Each of the ${a} first branches ends in ${b} outcomes: ${a} × ${b} = ${a * b}.`, nearInt(a * b));
    } },
    { topic: "Outcomes", level: "Average", make() {             // two dice: sum
      const k = rnd(2, 12), cnt = 6 - Math.abs(k - 7), list = [];
      for (let i = 1; i <= 6; i++) { const j = k - i; if (j >= 1 && j <= 6) list.push(`(${i},${j})`); }
      return Q(this.topic, this.level, `Two dice are rolled. In how many outcomes is the sum ${k}?`, String(cnt),
        [String(k), String(36), String(cnt + 1)],
        `List them: ${list.join(", ")}. That is ${cnt} outcome${cnt > 1 ? "s" : ""}.`, nearInt(cnt));
    } },
    { topic: "Outcomes", level: "Average", make() {             // codes: letter + digit
      const L = rnd(2, 4), Dg = rnd(2, 5), letters = "ABCD".slice(0, L).split(""), digits = Array.from({ length: Dg }, (_, i) => i + 1);
      const sample = letters.flatMap(l => digits.map(d => l + d));
      return Q(this.topic, this.level, `A code uses 1 letter (${letters.join(", ")}) followed by 1 digit (${digits.join(", ")}). How many codes can be made?`, String(L * Dg),
        [String(L + Dg), String(L * Dg + L), String(Dg)],
        `List them: ${sample.slice(0, 4).join(", ")}, … That is ${L} × ${Dg} = ${L * Dg} codes.`, nearInt(L * Dg));
    } },
    { topic: "Outcomes", level: "Difficult", make() {           // three choices
      const a = rnd(2, 4), b = rnd(2, 4), c = rnd(2, 4);
      return Q(this.topic, this.level, `A halo-halo order has 1 of ${a} bases, 1 of ${b} toppings and 1 of ${c} cup sizes. How many different orders are possible?`, String(a * b * c),
        [String(a + b + c), String(a * b), String(a * b + c)],
        `Multiply the number of choices at each step: ${a} × ${b} × ${c} = ${a * b * c}.`, nearInt(a * b * c));
    } },
    { topic: "Outcomes", level: "Difficult", make() {           // coin tossed n times
      const t = rnd(2, 4), tot = 2 ** t;
      if (Math.random() < .5) {
        return Q(this.topic, this.level, `A coin is tossed ${t} times. How many outcomes are in the sample space?`, String(tot),
          [String(2 * t), String(t * t + (t === 2 ? 1 : 0)), String(tot - 2)],
          `Each toss has 2 outcomes: ${Array(t).fill(2).join(" × ")} = ${tot}.`, nearInt(tot));
      }
      const tt = rnd(3, 4), h = rnd(1, tt - 1), C = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]][tt][h];
      return Q(this.topic, this.level, `A coin is tossed ${tt} times. How many outcomes have exactly ${h} head${h > 1 ? "s" : ""}?`, String(C),
        [String(h), String(2 ** tt), String(tt)],
        `Out of ${2 ** tt} outcomes, count those with exactly ${h} H. There are ${C}.`, nearInt(C));
    } },
    { topic: "Outcomes", level: "Difficult", make() {           // reverse: find the missing count
      const a = rnd(2, 6), b = rnd(2, 8), tot = a * b;
      return Q(this.topic, this.level, `A snack stand sells ${a} drinks. There are ${tot} possible drink-and-snack combinations. How many snacks does it sell?`, String(b),
        [String(tot - a), String(tot + a), String(tot * a)],
        `Drinks × snacks = ${tot}, so snacks = ${tot} ÷ ${a} = ${b}.`, nearInt(b));
    } },

    // ================= INTEGERS (WS 52–67) =================
    { topic: "Integers", level: "Easy", make() {                // adding two negatives
      const a = rnd(2, 60), b = rnd(2, 60), s = -(a + b);
      return Q(this.topic, this.level, `Add: ${p(-a)} + ${p(-b)}`, n(s),
        [n(a + b), n(-Math.abs(a - b)), n(Math.abs(a - b))],
        `Same signs: add ${a} + ${b} = ${a + b} and keep the negative sign: ${n(s)}.`, nearInt(s));
    } },
    { topic: "Integers", level: "Easy", make() {                // adding different signs
      let a, b; do { a = rnd(2, 80); b = rnd(2, 80); } while (a === b);
      const negFirst = Math.random() < .5, x = negFirst ? -a : a, y = negFirst ? b : -b, s = x + y, big = Math.abs(x) > Math.abs(y) ? x : y;
      return Q(this.topic, this.level, `Add: ${p(x)} + ${p(y)}`, n(s),
        [n(-s), n(a + b), n(-(a + b))],
        `Different signs: subtract ${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(s)} and copy the sign of the larger number (${n(big)}): ${n(s)}.`, nearInt(s));
    } },
    { topic: "Integers", level: "Average", make() {             // subtracting
      const a = rnd(2, 40), b = rnd(2, 40), form = rnd(0, 3);
      const [x, y] = [[a, a + b], [-a, -b], [a, -b], [-a, b]][form], d = x - y;
      const forgot = x + y;                                     // didn't change the sign of the subtrahend
      return Q(this.topic, this.level, `Subtract: ${p(x)} − ${p(y)}`, n(d),
        [n(forgot), n(-d), n(-forgot)],
        `Add the opposite of the subtrahend: ${p(x)} + ${p(-y)} = ${n(d)}.`, nearInt(d));
    } },
    { topic: "Integers", level: "Average", make() {             // rewrite subtraction as addition
      const a = rnd(2, 30), b = rnd(2, 30), x = pick([a, -a]), y = pick([b, -b]);
      const right = `${p(x)} + ${p(-y)}`;
      return Q(this.topic, this.level, `Which addition is the same as ${p(x)} − ${p(y)}?`, right,
        [`${p(x)} + ${p(y)}`, `${p(-x)} + ${p(-y)}`, `${p(-x)} + ${p(y)}`],
        `To subtract, add the opposite of the subtrahend. The opposite of ${n(y)} is ${n(-y)}, so ${p(x)} − ${p(y)} = ${right}.`);
    } },
    { topic: "Integers", level: "Difficult", make() {           // multiplying
      let a = nz(-12, 12), b = nz(-12, 12); if (a > 0 && b > 0) a = -a;
      const s = a * b, same = (a < 0) === (b < 0);
      return Q(this.topic, this.level, `Multiply: ${p(a)} × ${p(b)}`, n(s),
        [n(-s), n(a + b), n(-(Math.abs(a) + Math.abs(b)))],
        `${same ? "Same signs give a positive" : "Different signs give a negative"} product: ${Math.abs(a)} × ${Math.abs(b)} = ${Math.abs(s)}, so ${n(s)}.`, nearInt(s));
    } },
    { topic: "Integers", level: "Difficult", make() {           // dividing
      let b = nz(-12, 12), q = nz(-15, 15); if (b > 0 && q > 0) q = -q;
      const a = b * q, same = (a < 0) === (b < 0);
      return Q(this.topic, this.level, `Divide: ${p(a)} ÷ ${p(b)}`, n(q),
        [n(-q), n(a - b), n(a + b)],
        `${same ? "Same signs give a positive" : "Different signs give a negative"} quotient: ${Math.abs(a)} ÷ ${Math.abs(b)} = ${Math.abs(q)}, so ${n(q)}.`, nearInt(q));
    } },
    { topic: "Integers", level: "Difficult", make() {           // three factors
      let f; do f = [nz(-9, 9), nz(-9, 9), nz(-9, 9)]; while (!f.some(x => x < 0));
      const s = f[0] * f[1] * f[2], negs = f.filter(x => x < 0).length;
      return Q(this.topic, this.level, `Multiply: ${f.map(p).join(" × ")}`, n(s),
        [n(-s), n(f[0] + f[1] + f[2]), n(f[0] * f[1] - f[2])],
        `There ${negs === 1 ? "is 1 negative factor" : `are ${negs} negative factors`} (${negs % 2 ? "odd" : "even"}), so the answer is ${negs % 2 ? "negative" : "positive"}: ${f.map(Math.abs).join(" × ")} = ${Math.abs(s)} → ${n(s)}.`, nearInt(s));
    } },
    { topic: "Integers", level: "Difficult", make() {           // multiplying signed fractions
      const b = rnd(2, 9), d = rnd(2, 9), a = rnd(1, b - 1), c = rnd(1, d - 1), sa = pick([1, -1]), sc = sa > 0 ? -1 : pick([1, -1]), sign = sa * sc;
      const fa = (sa < 0 ? "(−" : "") + `${a}/${b}` + (sa < 0 ? ")" : ""), fc = (sc < 0 ? "(−" : "") + `${c}/${d}` + (sc < 0 ? ")" : "");
      return Q(this.topic, this.level, `Multiply: ${fa} × ${fc}`, fr(sign * a * c, b * d),
        [fr(-sign * a * c, b * d), fr(sign * (a + c), b + d), fr(sign * a * d, b * c)],
        `${sign > 0 ? "Same signs give a positive" : "Different signs give a negative"} product. ${a} × ${c} = ${a * c} and ${b} × ${d} = ${b * d}: ${fr(sign * a * c, b * d)}.`,
        k => fr(sign * Math.max(1, a * c + step(k)), b * d));
    } }
  ];

  // A fresh question for each matching template, in random order.
  function make(topic, level, count) {
    const match = t => (topic === "Mixed" || t.topic === topic) && (level === "All levels" || t.level === level);
    const pool = shuffle(T.filter(match)), out = [], prompts = new Set();
    for (let tries = 0; out.length < count && pool.length && tries < count * 6; tries++) {
      const q = pool[tries % pool.length].make();
      if (!prompts.has(q.prompt)) { prompts.add(q.prompt); out.push(q); }
    }
    return out;
  }
  return { make, templates: T };
})();
