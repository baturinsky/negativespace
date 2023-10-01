{
  type XY = [number, number];

  const wall = 9, flipper = 5,
    neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]] as XY[],
    sprites = { '_': ' ', '1': '+', '-1': '-', [flipper]: '*', '0': ' ', [wall]: ' ' };
  let
    cursorAt: XY,
    history = [],
    hand: Grid[] = [],
    neighborsplus = [[0, 0], ...neighbors] as XY[],
    rawPatterns: string[],
    seed = ~~(Math.random() * 1e9),
    turn = 1,
    lose = false,
    wheelLevel = 0,
    flipMode = 1,
    mouseAt: XY,
    draggingPoint: XY,
    draggedPattern: Grid,
    originalDraggedPattern: Grid,
    gridUnderCursor: Grid,
    patterns: Grid[],
    allpatterns: Grid[],
    boxpatterns: Grid[],
    lpatterns: Grid[],
    maxPatterns = 10,
    level = 0,
    lost = 0,
    instructions =
      `______________Cargo hold
________________________    
Dock____________________`;

  const rng = (n: number, pow?: number) => {
    seed = seed * 16807 % 2147483647;
    if (pow)
      return ~~((seed % (n ** pow)) ** (1 / pow));
    else
      return seed % n;
  }

  class Cell {
    constructor(public val: number | string, public grid: Grid) {
      if (val == "." || val == null)
        this.val = 0;
    }
    render([x, y]: XY, highlighted = 0, asis = false) {
      let hl = this.grid == gridUnderCursor || this.grid == draggedPattern;
      if (this.grid?.command)
        highlighted++;
      let bg = this.val == "X" ? "#f00" : highlighted ? `hsl(0 0% ${highlighted * 15}%)` : this.grid?.bgcolor(hl);
      if (y == 9)
        bg = "#000";
      if ([nextButton, gameOverButton].includes(this.grid) && highlighted <= 2 && handWeight() == 0 && !draggedPattern)
        bg = "#0f0"

      //if (!bg && this.val && this.grid == board)        bg = "#111";
      //return `<td id=${x}_${y} style="color:${this.pattern?.color || ''};background:${bg}">${this.val || '.'}</td>`
      return `<td id=${x}_${y} style="color:${this.grid?.color || ''};background:${bg}">${asis ? this.val : sprites[this.val] ?? this.val}</td>`
    }
    clone(o?) {
      let c = new Cell(this.val, this.grid);
      if (o) Object.assign(c, o);
      return c;
    }
    sub(other: Cell) {
      this.val = Math.max(0, this.val - other.val);
    }
    add(other: Cell) {
      this.val = this.val * 1 + (other.val==flipper?flipMode:other.val) * 1;
    }
  }

  class Grid {
    w: number
    h: number
    bits: Cell[][] = []
    len: number
    hue: number;
    at: XY = [0, 0];
    pattern: boolean;
    command: Function;
    val: number;

    constructor(o?) {
      Object.assign(this, o);
      this.len = this.w * this.h;
      if (this.len)
        this.fill(0);
    }
    get color() {
      return `hsl(${this.hue} 100% 50%)`
    }
    bgcolor(hl: boolean) {
      if (this.command) {
        return "#f00"
      }
      return `hsl(${this.hue} 100% ${hl ? 20 : 10}%)`
    }
    clone(val?, hue?: number) {
      let g = new Grid({ w: this.w, h: this.h })
      g.bits = [];
      g.hue = hue;
      g.val = val;
      for (let i = 0; i < this.len; i++) {
        let c = this.geti(i).clone();
        if (val && c.val) c.val = val;
        c.grid = g;
        g.seti(i, c);
      }
      return g;
    }
    overlap(other: Grid, at = this.at) {
      return overlap(at[0], this.w, other.at[0], other.w) && overlap(at[1], this.h, other.at[1], other.h)
    }
    hasInsideBorder(other: Grid, at: XY = other.at) {
      let inside = at[0] >= 0 && at[1] >= 0 && at[0] + other.w <= this.w && at[1] + other.h <= this.h
      return inside;
    }
    fromString(r: string) {
      let lines = r.trim().split("\n").map(l => l.trim());
      [this.w, this.h] = [lines[0].length, lines.length];
      this.bits = lines.map(s => [...s].map(l => new Cell(l == "_" ? " " : l, this)));
      this.len = this.w * this.h;
      return this;
    }
    toString() {
      return this.bits.map(row => row.map(v => v.val).join('')).join('\n')
    }
    fill(v = 0) {
      for (let i = 0; i < this.len; i++) {
        this.seti(i, new Cell(v instanceof Function ? v(i) : v, this))
      }
      return this;
    }
    values() {
      return incremental(this.len).map(i => this.toXY(i))
    }
    get(at: XY) {
      return (this.bits[at[1]] || [])[at[0]] || nullCell();
    }
    set(at: XY, v: Cell) {
      this.bits[at[1]] ||= [];
      this.bits[at[1]][at[0]] = v;
      return v;
    }
    geti(n: number) {
      return this.get(this.toXY(n))
    }
    seti(n: number, v: Cell) {
      return this.set(this.toXY(n), v);
    }
    toXY(n: number) {
      return [n % this.w, ~~(n / this.w)] as XY;
    }
    apply<T>(pattern: Grid, at: XY, f: (my: Cell, their: Cell, myAt?: XY, theirAt?: XY) => T, findTrue = false) {
      return pattern.each((v, patternAt) => {
        let gridAt = sum(patternAt, at);
        return f(this.get(gridAt), pattern.get(patternAt), gridAt, patternAt)
      }, findTrue)
    }
    checkIfFitsWithNeighbors(pattern: Grid, at: XY): boolean {
      return !this.apply(pattern, at,
        (me, p, at, pAt) =>
          !neighborsplus.find((delta) => pattern.get(sum(delta, pAt)).val && this.get(sum(delta, at)).val)
      )
    }
    _checkIfFits(pattern: Grid, at: XY): boolean {
      /*if(at[0]+pattern.w>this.w || at[1]+pattern[1]>this.h)
        return false;*/
      return !this.apply(pattern, at, (me, p) => (me.val || me.color) && p.val, true)
    }
    findWhereFits = (pattern: Grid, onRight = false) => {
      for (let i = 0; i < this.len; i++) {
        let x = ~~(i / this.h);
        if (onRight)
          x = this.w - 1 - x;
        let at = [x, i % this.h] as XY;
        if (this.checkIfFits(pattern, at)) {
          return at;
        }
      }
      return null;
    }

    checkIfFits(pattern: Grid, at: XY): boolean {
      if (!this.hasInsideBorder(pattern, at))
        return false;
      for (let o of hand) {
        if (pattern.overlap(o, at))
          return false;
      }
      return true;
    }

    insert(pattern: Grid, at: XY, changeOwner = false) {
      this.apply(pattern, at, (me, them, meAt, themAt) => {
        let v = this.set(meAt, them.clone())
        if (changeOwner)
          v.grid = this;
      });
      pattern.at = at;
      if (this == handBoard)
        hand.push(pattern);
    }

    sub(pattern: Grid, at: XY) {
      this.apply(pattern, at, (me, them, meAt, themAt) => me.sub(them));
    }


    place(pattern: Grid, at: XY) {
      this.apply(pattern, at, (me, them, meAt, themAt) => me.add(them));
    }

    canBePlaced(pattern: Grid, at: XY) {
      return !this.apply(pattern, at, (me, them, meAt, themAt) => ![0, 1].includes(me.val + (them.val==flipper?flipMode:them.val)), true);
    }


    remove(pattern: Grid, at: XY) {
      this.apply(pattern, at, (me, them, meAt, themAt) => this.set(meAt, new Cell(0, this)));
      hand = hand.filter(d => d != pattern);
    }

    advance() {
      let overflow = 0;
      this.each((cell, at) => {
        if (at[0] == 0) {
          overflow += cell.val
        } else {
          this.get([at[0] - 1, at[1]]).val = cell.val;
          cell.val = 0;
        }
      })
      return overflow;
    }
    each(f: (v: Cell, at: XY) => any, findTrue = false) {
      let a: any[] | boolean = findTrue ? false : [];
      for (let i = 0; i < this.len; i++) {
        let at = this.toXY(i);
        let v = f(this.geti(i), at)
        if (findTrue) {
          if (v)
            return true;
        } else
          (a as any[]).push(v);
      }
      return a
    }

    placeEnemies(n: number) {
      for (let i = 0; i < n; i++) {
        let at = [this.w - 10 + rng(10, 3), rng(this.h)] as XY;
        let cell = this.get(at);
        cell.val = 10;
      }
    }

    placeWalls(n: number) {
      this.each((cell, at) => {
        cell.val = at[0] < n ? wall : cell.val == wall ? 0 : cell.val;
      })
    }

    save() {
      let bits = board.bits.flat().map(c => c.val);
      return { w: this.w, h: this.h, bits } as { w: number, h: number, bits: number[] };
    }

    load({ w, h, bits }: { w: number, h: number, bits: number[] }) {
      this.w = w;
      this.h = h;
      this.bits = [];
      bits.forEach((v, i) => this.seti(i, new Cell(v, this)))
      return this
    }

  }

  const board = new Grid({ w: 24, h: 8 }),
    handBoard = new Grid({ w: board.w, h: 7 }),
    delimiter = new Grid({ w: board.w, h: 3 });
  let levels: { name: string, patterns: Grid[], walls: number, positive: number, negative: number, odd?: number }[];

  const overlap = (a, al, b, bl) => a + al > b && a < b + bl;
  const zeroCell = () => new Cell(0, null);
  const nullCell = () => new Cell(null, null);

  const saveState = () => {
    let bs = board.save();
    history.push({ board: bs, hand: [...hand] });
  }

  const loadState = () => {
    draggedPattern = null;
    if (history.length == 0)
      return;
    let state = history.pop();
    board.load(state.board)
    hand = [];
    handBoard.fill();
    for (let p of state.hand) {
      handBoard.insert(p, p.at);
    }
    renderBoard()
  }

  const nextLevel = () => {
    let nextLevel = (level + 1) % levels.length;
    playLevel(nextLevel);
  }

  const undoButton = new Grid({
    command: () => {
      loadState();
    }
  }).fromString(`Undo`),
    nextButton = new Grid({
      command: nextLevel
    }).fromString(`Take_off`),
    gameOverButton = new Grid({
      command: nextLevel
    }).fromString(`Start_over`);

  const incremental = (n: number) => [...new Array(n)].map((_, i) => i)
  const arrayOf = (n: number, v) => [...new Array(n)].map(() => v)
  const handWeight = () => (handBoard.each(v => v.val ? 1 : 0) as number[]).reduce((partialSum, a) => partialSum + a, 0)
  const sum = (a: XY, b: XY) => [a[0] + b[0], a[1] + b[1]] as XY
  const sub = (a: XY, b: XY) => [a[0] - b[0], a[1] - b[1]] as XY
  const renderBoard = () => {

    delimiter.insert(new Grid().fromString(`Leaving_${handWeight() + lost}t__`), [6, 2], true);

    U.innerHTML = `<table>${incremental(board.h + delimiter.h + handBoard.h).map(y => [`<tr>`,
      ...incremental(board.w).map(x => {
        let d = draggedCellAt([x, y]);
        let s = screenAt([x, y]);
        if (d && s && s.grid != handBoard) {
          s = s.clone();
          s.val += d.val==flipper?flipMode:d.val;
          if (![0, 1].includes(s.val) || d?.grid == delimiter || (s.grid == delimiter))
            s.val = "X";
          return s.render([x, y], true)
        }
        let rendered = (d || s || nullCell())
        let highlight = (s?.val == wall || d != null || y >= board.h && y < board.h + delimiter.h) ? 1 : 0;
        if (s?.grid == gridUnderCursor) {
          highlight++;
        }
        return rendered?.render([x, y], highlight, rendered.grid == delimiter)
      }
      ), `</tr>`]).flat().join('')}</table>`
  }
  const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        callback.apply(null, args);
      }, wait);
    };
  }
  const processTarget = e => {
    let element = e.target as HTMLElement;
    if (element?.nodeName != "TD")
      return [] as [XY, Grid];
    cursorAt = element.id.split("_").map(n => Number(n)) as XY;
    let pattern: Grid;
    if (cursorAt[1] < board.h) {
      pattern = board
    } else if (cursorAt[1] < board.h + delimiter.h) {
      pattern = delimiter.get([cursorAt[0], cursorAt[1] - board.h])?.grid;
    } else {
      pattern = handBoard.get([cursorAt[0], cursorAt[1] - board.h - delimiter.h])?.grid;
    }
    return [cursorAt, pattern] as [XY, Grid];
  }
  const screenAt = ([x, y]: XY) => {
    return y < board.h ? board.get([x, y]) :
      y < board.h + delimiter.h ? delimiter.get([x, y - board.h]) :
        handBoard.get([x, y - board.h - delimiter.h])
  }
  const draggedCellAt = (at: XY) => {
    if (!draggedPattern || !cursorAt)
      return;
    let cell = draggedPattern.get(sub(sum(at, draggingPoint), cursorAt));
    return cell.val ? cell : null;
  }
  const deckCoord = (at) => [at[0], at[1] - board.h - delimiter.h] as XY
  const givePatterns = (patterns: Grid[], n = 1, val = 1) => {
    let count = 0;
    for (let i = 0; i < n; i++) {
      let ind = patterns.length - 1 - ~~(rng(patterns.length, 2))
      let pattern = patterns[ind]
      let where = handBoard.findWhereFits(pattern, true);
      if (where) {
        let p = pattern.clone(val, where[0] * 30 + where[1] * 43 + patterns.length * 27);
        p.pattern = true;
        handBoard.insert(p, where);
        count++;
      }
    }
    return count;
  }
  const tryGivePatterns = (tries: number, ...args) => {
    while (tries-- > 0 && hand.length < maxPatterns)
      givePatterns(...args);
  }

  const drawNextLevelButton = () => {
    let lastLevel = level == levels.length - 1;
    delimiter.insert(new Grid({ w: 10, h: 1 }).fill(" "), [0, 0], true);
    delimiter.insert(lastLevel ? gameOverButton : nextButton, [0, 0]);
  }

  const canBePlaced = () => {
    let at = sub(mouseAt, draggingPoint);
    return (board.hasInsideBorder(draggedPattern, at) && board.canBePlaced(draggedPattern, at));
  }

  const playLevel = (l: number) => {
    level = l;
    let data = levels[l];
    if (l == 0) {
      board.fill();
      lost = 0;
    } else {
      lost += handWeight();
    }

    delimiter.insert(new Grid({ w: 24, h: 1 }).fill(" "), [0, 1], true);
    delimiter.insert(new Grid().fromString(`Planet ${level + 1}: ${data.name}`), [0, 1], true);

    hand = [];
    history = [];
    handBoard.fill();
    board.placeWalls(data.walls || 0);
    data.positive ||= 0;
    data.negative ||= 0;
    data.odd ||= 0;
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
  }

  const main = () => {
    delimiter.fromString(instructions);
    delimiter.insert(undoButton, [20, 2]);

    playLevel(0);

    let U = document.getElementById("U");

    U.onmousemove = e => {
      let oldHighlight = gridUnderCursor, oldAt = cursorAt;
      let [at, grid] = processTarget(e);
      gridUnderCursor = null;
      if (grid) {
        cursorAt = at;
        if (!draggedPattern && (grid.pattern || grid.command)) {
          gridUnderCursor = grid;
        }
        //console.log(gridUnderCursor.w);
        //if (gridUnderCursor != oldHighlight || draggedPattern && oldAt != cursorAt)

        if (grid==board && draggedPattern && draggedPattern.val == flipper) {
          if (!canBePlaced()) {
            flipMode = -flipMode;
            if(canBePlaced())
              debugger;
            else
              flipMode = - flipMode;
          }
        }
  
        debounce(renderBoard, 100)();
      }
  
    }

    const drop = () => {
      /*if (originalDraggedPattern) {
        deckBoard.insert(originalDraggedPattern, originalDraggedPattern.at);
        originalDraggedPattern = null;
      } else {
        deckBoard.insert(draggedPattern, draggedPattern.at);
      }
      */
      loadState();
    }

    U.onwheel = e => {
      if (!draggedPattern || level < wheelLevel)
        return;
      if (!originalDraggedPattern)
        originalDraggedPattern = draggedPattern;
      let o = draggedPattern;
      draggedPattern = new Grid({ w: o.h, h: o.w, val: o.val })
      o.each((v, at) => { draggedPattern.set(at.reverse() as XY, v) })
      draggingPoint = draggingPoint.reverse() as XY;
      renderBoard();
    }

    U.onmousedown = e => {
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
            let at = sub(mouseAt, draggingPoint);
            let p = draggedPattern;
            draggedPattern = null;
            board.place(p, at);
            hand = hand.filter(d => d != p);
            turn++;
          } else {
            drop();
          }
        } else {
          drop();
        }
      } else if (grid?.pattern) {
        saveState();
        draggedPattern = grid;
        draggingPoint = sub(deckCoord(at), grid.at);
        handBoard.remove(grid, grid.at);
        gridUnderCursor = null;
      } else if (grid?.command) {
        grid?.command();
      }

      renderBoard()
    }

    renderBoard();

  };

  allpatterns = [
    `
#
`,
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
`, `
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

  ].map(r => new Grid().fromString(r));

  lpatterns = [
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
  ].map(r => new Grid().fromString(r));

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
`
    ,
    `
##
##
##
##
`
    ,
    `
####
####
####
####
`

  ].map(r => new Grid().fromString(r));

  levels = [
    { name: "Load the boxes", patterns: boxpatterns.slice(1, 5), walls: 16, positive: 6, negative: 0 },
    { name: `"+" + "-"==" "`, patterns: boxpatterns, walls: 16, positive: 4, negative: 2 },
    { name: "Hold extended", patterns: allpatterns.slice(0, 12), walls: 8, positive: 12, negative: 4 },
    { name: "L's", patterns: lpatterns, walls: 8, positive: 12, negative: 12 },
    { name: "WHEEL is fixed", patterns: allpatterns.slice(0, 12), walls: 8, positive: 12, negative: 12 },
    { name: "A bigger boat", patterns: allpatterns.slice(0, 12), walls: 0, positive: 24, negative: 8 },
    { name: "Bigger boxes", patterns: allpatterns, walls: 0, positive: 16, negative: 16 },
  ]

  main();

}

console.log(1);