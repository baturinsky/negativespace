{
  const wall = 9, flipper = 5, neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]], sprites = { "_": " ", "1": "+", "-1": "-", [flipper]: "*", "0": " ", [wall]: " " };
  let cursorAt, history = [], hand = [], neighborsplus = [[0, 0], ...neighbors], rawPatterns, seed = ~~(Math.random() * 1e9), turn = 1, lose = false, wheelLevel = 4, flipLevel = 6, flipMode = 1, flipsLeft = 1, mouseAt, draggingPoint, draggedPattern, originalDraggedPattern, gridUnderCursor, patterns, allpatterns, boxpatterns, lpatterns, maxPatterns = 10, level = 0, lost = 0, instructions = `___________________Cargo
________________________    
Dock____________________`;
  const rng = (n, pow) => {
    seed = seed * 16807 % 2147483647;
    if (pow)
      return ~~((seed % n ** pow) ** (1 / pow));
    else
      return seed % n;
  };
  class Cell {
    constructor(val, grid) {
      this.val = val;
      this.grid = grid;
      if (val == "." || val == null)
        this.val = 0;
    }
    render([x, y], highlighted = 0, asis = false) {
      var _a, _b, _c, _d;
      let hl = this.grid == gridUnderCursor || this.grid == draggedPattern;
      if ((_a = this.grid) == null ? void 0 : _a.command)
        highlighted++;
      let bg = this.val == "X" ? "#f00" : highlighted ? `hsl(0 0% ${highlighted * 15}%)` : (_b = this.grid) == null ? void 0 : _b.bgcolor(hl);
      if (y == 9)
        bg = "#000";
      if ([nextButton, gameOverButton].includes(this.grid) && highlighted <= 2 && handWeight() == 0 && !draggedPattern)
        bg = "#0f0";
      return `<td id=${x}_${y} style="color:${((_c = this.grid) == null ? void 0 : _c.color) || ""};background:${bg}">${asis ? this.val : (_d = sprites[this.val]) != null ? _d : this.val}</td>`;
    }
    clone(o) {
      let c = new Cell(this.val, this.grid);
      if (o)
        Object.assign(c, o);
      return c;
    }
    sub(other) {
      this.val = Math.max(0, this.val - other.val);
    }
    add(other) {
      this.val = this.val * 1 + (other.val == flipper ? flipMode : other.val) * 1;
    }
  }
  class Grid {
    constructor(o) {
      this.bits = [];
      this.at = [0, 0];
      this.findWhereFits = (pattern, onRight = false) => {
        for (let i = 0; i < this.len; i++) {
          let x = ~~(i / this.h);
          if (onRight)
            x = this.w - 1 - x;
          let at = [x, i % this.h];
          if (this.checkIfFits(pattern, at)) {
            return at;
          }
        }
        return null;
      };
      Object.assign(this, o);
      this.len = this.w * this.h;
      if (this.len)
        this.fill(0);
    }
    get color() {
      return `hsl(${this.hue} 100% 50%)`;
    }
    bgcolor(hl) {
      if (this.command) {
        return "#f00";
      }
      return `hsl(${this.hue} 100% ${hl ? 20 : 10}%)`;
    }
    clone(val, hue) {
      let g = new Grid({ w: this.w, h: this.h });
      g.bits = [];
      g.hue = hue;
      g.val = val;
      for (let i = 0; i < this.len; i++) {
        let c = this.geti(i).clone();
        if (val && c.val)
          c.val = val;
        c.grid = g;
        g.seti(i, c);
      }
      return g;
    }
    overlap(other, at = this.at) {
      return overlap(at[0], this.w, other.at[0], other.w) && overlap(at[1], this.h, other.at[1], other.h);
    }
    hasInsideBorder(other, at = other.at) {
      let inside = at[0] >= 0 && at[1] >= 0 && at[0] + other.w <= this.w && at[1] + other.h <= this.h;
      return inside;
    }
    fromString(r) {
      let lines = r.trim().split("\n").map((l) => l.trim());
      [this.w, this.h] = [lines[0].length, lines.length];
      this.bits = lines.map((s) => [...s].map((l) => new Cell(l == "_" ? " " : l, this)));
      this.len = this.w * this.h;
      return this;
    }
    toString() {
      return this.bits.map((row) => row.map((v) => v.val).join("")).join("\n");
    }
    fill(v = 0) {
      for (let i = 0; i < this.len; i++) {
        this.seti(i, new Cell(v instanceof Function ? v(i) : v, this));
      }
      return this;
    }
    values() {
      return incremental(this.len).map((i) => this.toXY(i));
    }
    get(at) {
      return (this.bits[at[1]] || [])[at[0]] || nullCell();
    }
    set(at, v) {
      var _a, _b;
      (_a = this.bits)[_b = at[1]] || (_a[_b] = []);
      this.bits[at[1]][at[0]] = v;
      return v;
    }
    geti(n) {
      return this.get(this.toXY(n));
    }
    seti(n, v) {
      return this.set(this.toXY(n), v);
    }
    toXY(n) {
      return [n % this.w, ~~(n / this.w)];
    }
    apply(pattern, at, f, findTrue = false) {
      return pattern.each((v, patternAt) => {
        let gridAt = sum(patternAt, at);
        return f(this.get(gridAt), pattern.get(patternAt), gridAt, patternAt);
      }, findTrue);
    }
    checkIfFitsWithNeighbors(pattern, at) {
      return !this.apply(pattern, at, (me, p, at2, pAt) => !neighborsplus.find((delta) => pattern.get(sum(delta, pAt)).val && this.get(sum(delta, at2)).val));
    }
    _checkIfFits(pattern, at) {
      return !this.apply(pattern, at, (me, p) => (me.val || me.color) && p.val, true);
    }
    checkIfFits(pattern, at) {
      if (!this.hasInsideBorder(pattern, at))
        return false;
      for (let o of hand) {
        if (pattern.overlap(o, at))
          return false;
      }
      return true;
    }
    insert(pattern, at, changeOwner = false) {
      this.apply(pattern, at, (me, them, meAt, themAt) => {
        let v = this.set(meAt, them.clone());
        if (changeOwner)
          v.grid = this;
      });
      pattern.at = at;
      if (this == handBoard)
        hand.push(pattern);
    }
    sub(pattern, at) {
      this.apply(pattern, at, (me, them, meAt, themAt) => me.sub(them));
    }
    place(pattern, at) {
      this.apply(pattern, at, (me, them, meAt, themAt) => me.add(them));
    }
    canBePlaced(pattern, at) {
      return !this.apply(pattern, at, (me, them, meAt, themAt) => ![0, 1].includes(me.val + (them.val == flipper ? flipMode : them.val)), true);
    }
    remove(pattern, at) {
      this.apply(pattern, at, (me, them, meAt, themAt) => this.set(meAt, new Cell(0, this)));
      hand = hand.filter((d) => d != pattern);
    }
    advance() {
      let overflow = 0;
      this.each((cell, at) => {
        if (at[0] == 0) {
          overflow += cell.val;
        } else {
          this.get([at[0] - 1, at[1]]).val = cell.val;
          cell.val = 0;
        }
      });
      return overflow;
    }
    each(f, findTrue = false) {
      let a = findTrue ? false : [];
      for (let i = 0; i < this.len; i++) {
        let at = this.toXY(i);
        let v = f(this.geti(i), at);
        if (findTrue) {
          if (v)
            return true;
        } else
          a.push(v);
      }
      return a;
    }
    placeEnemies(n) {
      for (let i = 0; i < n; i++) {
        let at = [this.w - 10 + rng(10, 3), rng(this.h)];
        let cell = this.get(at);
        cell.val = 10;
      }
    }
    placeWalls(n) {
      this.each((cell, at) => {
        cell.val = at[0] < n ? wall : cell.val == wall ? 0 : cell.val;
      });
    }
    save() {
      let bits = board.bits.flat().map((c) => c.val);
      return { w: this.w, h: this.h, bits };
    }
    load({ w, h, bits }) {
      this.w = w;
      this.h = h;
      this.bits = [];
      bits.forEach((v, i) => this.seti(i, new Cell(v, this)));
      return this;
    }
  }
  const board = new Grid({ w: 24, h: 8 }), handBoard = new Grid({ w: board.w, h: 7 }), delimiter = new Grid({ w: board.w, h: 3 });
  let levels;
  const overlap = (a, al, b, bl) => a + al > b && a < b + bl;
  const zeroCell = () => new Cell(0, null);
  const nullCell = () => new Cell(null, null);
  const saveState = () => {
    let bs = board.save();
    history.push({ board: bs, hand: [...hand], flipsLeft });
  };
  const loadState = () => {
    draggedPattern = null;
    if (history.length == 0)
      return;
    let state = history.pop();
    board.load(state.board);
    flipsLeft = state.flipsLeft;
    hand = [];
    handBoard.fill();
    for (let p of state.hand) {
      handBoard.insert(p, p.at);
    }
    renderBoard();
  };
  const nextLevel = () => {
    let nextLevel2 = (level + 1) % levels.length;
    playLevel(nextLevel2);
  };
  const doTheFlip = () => {
    if (!(flipsLeft > 0))
      return;
    saveState();
    flipsLeft--;
    board.each((v, at) => {
      if (v.val == 1)
        v.val = 0;
      else if (v.val == 0)
        v.val = 1;
    });
  };
  const undoButton = new Grid({
    command: () => {
      loadState();
    }
  }).fromString(`Undo`), flipButton = new Grid({
    command: doTheFlip
  }).fromString(`Flip`), nextButton = new Grid({
    command: nextLevel
  }).fromString(`Take_off`), gameOverButton = new Grid({
    command: nextLevel
  }).fromString(`Start_over`);
  const incremental = (n) => [...new Array(n)].map((_, i) => i);
  const arrayOf = (n, v) => [...new Array(n)].map(() => v);
  const handWeight = () => handBoard.each((v) => v.val ? 1 : 0).reduce((partialSum, a) => partialSum + a, 0);
  const sum = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const renderBoard = () => {
    delimiter.insert(new Grid().fromString(`Leaving_${handWeight() + lost}t__`), [6, 2], true);
    if (flipsLeft > 0)
      delimiter.insert(flipButton, [11, 0]);
    else
      delimiter.insert(new Grid().fromString("____"), [11, 0]);
    U.innerHTML = `<table>${incremental(board.h + delimiter.h + handBoard.h).map((y) => [
      `<tr>`,
      ...incremental(board.w).map((x) => {
        let d = draggedCellAt([x, y]);
        let s = screenAt([x, y]);
        if (d && s && s.grid != handBoard) {
          s = s.clone();
          s.val += d.val == flipper ? flipMode : d.val;
          if (![0, 1].includes(s.val) || (d == null ? void 0 : d.grid) == delimiter || s.grid == delimiter)
            s.val = "X";
          return s.render([x, y], true);
        }
        let rendered = d || s || nullCell();
        let highlight = (s == null ? void 0 : s.val) == wall || d != null || y >= board.h && y < board.h + delimiter.h ? 1 : 0;
        if ((s == null ? void 0 : s.grid) == gridUnderCursor) {
          highlight++;
        }
        return rendered == null ? void 0 : rendered.render([x, y], highlight, rendered.grid == delimiter);
      }),
      `</tr>`
    ]).flat().join("")}</table>`;
  };
  const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        callback.apply(null, args);
      }, wait);
    };
  };
  const processTarget = (e) => {
    var _a, _b;
    let element = e.target;
    if ((element == null ? void 0 : element.nodeName) != "TD")
      return [];
    cursorAt = element.id.split("_").map((n) => Number(n));
    let pattern;
    if (cursorAt[1] < board.h) {
      pattern = board;
    } else if (cursorAt[1] < board.h + delimiter.h) {
      pattern = (_a = delimiter.get([cursorAt[0], cursorAt[1] - board.h])) == null ? void 0 : _a.grid;
    } else {
      pattern = (_b = handBoard.get([cursorAt[0], cursorAt[1] - board.h - delimiter.h])) == null ? void 0 : _b.grid;
    }
    return [cursorAt, pattern];
  };
  const screenAt = ([x, y]) => {
    return y < board.h ? board.get([x, y]) : y < board.h + delimiter.h ? delimiter.get([x, y - board.h]) : handBoard.get([x, y - board.h - delimiter.h]);
  };
  const draggedCellAt = (at) => {
    if (!draggedPattern || !cursorAt)
      return;
    let cell = draggedPattern.get(sub(sum(at, draggingPoint), cursorAt));
    return cell.val ? cell : null;
  };
  const deckCoord = (at) => [at[0], at[1] - board.h - delimiter.h];
  const givePatterns = (patterns2, n = 1, val = 1) => {
    let count = 0;
    for (let i = 0; i < n; i++) {
      let ind = patterns2.length - 1 - ~~rng(patterns2.length, 2);
      let pattern = patterns2[ind];
      let where = handBoard.findWhereFits(pattern, true);
      if (where) {
        let p = pattern.clone(val, where[0] * 30 + where[1] * 43 + patterns2.length * 27);
        p.pattern = true;
        handBoard.insert(p, where);
        count++;
      }
    }
    return count;
  };
  const tryGivePatterns = (tries, ...args) => {
    while (tries-- > 0 && hand.length < maxPatterns)
      givePatterns(...args);
  };
  const drawNextLevelButton = () => {
    let lastLevel = level == levels.length - 1;
    delimiter.insert(new Grid({ w: 10, h: 1 }).fill(" "), [0, 0], true);
    delimiter.insert(lastLevel ? gameOverButton : nextButton, [0, 0]);
  };
  const canBePlaced = () => {
    let at = sub(mouseAt, draggingPoint);
    return board.hasInsideBorder(draggedPattern, at) && board.canBePlaced(draggedPattern, at);
  };
  const playLevel = (l) => {
    level = l;
    let data = levels[l];
    if (l == 0) {
      board.fill();
      lost = 0;
    } else {
      lost += handWeight();
    }
    flipsLeft = level < flipLevel ? 0 : 1;
    delimiter.insert(new Grid({ w: 24, h: 1 }).fill(" "), [0, 1], true);
    delimiter.insert(new Grid().fromString(`Planet ${level + 1}: ${data.name}`), [0, 1], true);
    hand = [];
    history = [];
    handBoard.fill();
    board.placeWalls(data.walls || 0);
    data.positive || (data.positive = 0);
    data.negative || (data.negative = 0);
    data.odd || (data.odd = 0);
    for (let i = 0; i < Math.max(data.positive, data.negative, data.odd); i++) {
      if (i < data.positive)
        givePatterns(data.patterns, 1, 1);
      if (i < data.negative)
        givePatterns(data.patterns, 1, -1);
      if (i < data.odd)
        givePatterns(data.patterns, 1, flipper);
    }
    drawNextLevelButton();
    renderBoard();
  };
  const main = () => {
    delimiter.fromString(instructions);
    delimiter.insert(undoButton, [20, 2]);
    playLevel(0);
    let U2 = document.getElementById("U");
    U2.onmousemove = (e) => {
      let oldHighlight = gridUnderCursor, oldAt = cursorAt;
      let [at, grid] = processTarget(e);
      gridUnderCursor = null;
      if (grid) {
        cursorAt = at;
        if (!draggedPattern && (grid.pattern || grid.command)) {
          gridUnderCursor = grid;
        }
        if (grid == board && draggedPattern && draggedPattern.val == flipper) {
          if (!canBePlaced()) {
            flipMode = -flipMode;
            if (canBePlaced())
              debugger;
            else
              flipMode = -flipMode;
          }
        }
        debounce(renderBoard, 100)();
      }
    };
    const drop = () => {
      loadState();
    };
    U2.onwheel = (e) => {
      if (!draggedPattern || level < wheelLevel)
        return;
      if (!originalDraggedPattern)
        originalDraggedPattern = draggedPattern;
      let o = draggedPattern;
      draggedPattern = new Grid({ w: o.h, h: o.w, val: o.val });
      o.each((v, at) => {
        draggedPattern.set(at.reverse(), v);
      });
      draggingPoint = draggingPoint.reverse();
      renderBoard();
    };
    U2.onmousedown = (e) => {
      if (lose)
        return;
      let [at, grid] = processTarget(e);
      mouseAt = at;
      if (draggedPattern) {
        if (grid == handBoard) {
          at = sub(deckCoord(at), draggingPoint);
          if (handBoard.checkIfFits(draggedPattern, at)) {
            handBoard.insert(draggedPattern, at);
            draggedPattern = null;
          }
        } else if (grid == board) {
          if (canBePlaced()) {
            let at2 = sub(mouseAt, draggingPoint);
            let p = draggedPattern;
            draggedPattern = null;
            board.place(p, at2);
            hand = hand.filter((d) => d != p);
            turn++;
          } else {
            drop();
          }
        } else {
          drop();
        }
      } else if (grid == null ? void 0 : grid.pattern) {
        saveState();
        draggedPattern = grid;
        draggingPoint = sub(deckCoord(at), grid.at);
        handBoard.remove(grid, grid.at);
        gridUnderCursor = null;
      } else if (grid == null ? void 0 : grid.command) {
        grid == null ? void 0 : grid.command();
      }
      renderBoard();
    };
    renderBoard();
  };
  allpatterns = [
    `
##
`,
    `
#
#
`,
    `
###
`,
    `
#
#
#
`,
    `
##
##
`,
    `
###
###
###
`,
    `
#####
`,
    `
#
#
#
#
#
`,
    `
#.#
.#.
#.#
`,
    `
.#.
###
.#.
`,
    `
###
###
`,
    `
##
##
##
`,
    `
####
####
####
####
`,
    `
#####
#####
#####
#####
#####
`,
    `
..#..
..#..
#####
..#..
..#..
`,
    `
#.#.#
.#.#.
#.#.#
.#.#.
#.#.#
`,
    `
#.#
#.#
#.#
`,
    `
###
...
###
`,
    `
####
`,
    `
#
#
#
#
`
  ].map((r) => new Grid().fromString(r));
  lpatterns = [
    `
###
`,
    `
#
#
#
`,
    `
####
`,
    `
#
#
#
#
`,
    `
#####
`,
    `
#
#
#
#
#
`
  ].map((r) => new Grid().fromString(r));
  boxpatterns = [
    `
#
`,
    `
##
##
`,
    `
###
###
`,
    `
##
##
##
`,
    `
###
###
###
`,
    `
####
####
`,
    `
##
##
##
##
`,
    `
####
####
####
####
`
  ].map((r) => new Grid().fromString(r));
  levels = [
    { name: "Load the boxes", patterns: boxpatterns.slice(1, 5), walls: 16, positive: 6, negative: 0 },
    { name: `"+" + "-"==" "`, patterns: boxpatterns, walls: 16, positive: 4, negative: 2 },
    { name: "Hold extended", patterns: allpatterns.slice(0, 12), walls: 8, positive: 12, negative: 4 },
    { name: "L's", patterns: lpatterns, walls: 8, positive: 10, negative: 6 },
    { name: "WHEEL is fixed", patterns: allpatterns.slice(0, 12), walls: 8, positive: 12, negative: 12 },
    { name: "A bigger boat", patterns: allpatterns, walls: 0, positive: 24, negative: 8 },
    { name: "Do The Flip", patterns: allpatterns, walls: 0, positive: 12, negative: 12 },
    { name: "Final level", patterns: allpatterns, walls: 0, positive: 16, negative: 16 }
  ];
  main();
}
console.log(1);
