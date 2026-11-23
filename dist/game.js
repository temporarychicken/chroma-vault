"use strict";

const maze = [
  "###########",
  "#...#....E#",
  "#.#.#.###.#",
  "#S.O#.#...#",
  "#.#.#.#.#.#",
  "#B.I#..T#.#",
  "#.#####.#.#",
  "#D........#",
  "###########",
];
const directions = [
  { x: 0, y: -1, name: "NORTH" },
  { x: 1, y: 0, name: "EAST" },
  { x: 0, y: 1, name: "SOUTH" },
  { x: -1, y: 0, name: "WEST" },
];
const colors = {
  black: "#050406", blue: "#645cff", pink: "#ff42ee",
  yellow: "#fff600", cyan: "#23fff1", grid: "#b659af",
};
const view = document.querySelector("#view").getContext("2d");
const map = document.querySelector("#map").getContext("2d");
const heading = document.querySelector("#heading");
const status = document.querySelector("#status");
const form = document.querySelector("#console");
const input = document.querySelector("#command");
const inventory = document.querySelector("#inventory");
const actionButton = document.querySelector("#action");
const fontButton = document.querySelector('[data-command="font"]');
const nearClip = .12;
const firstCellDepth = 1.02;
// Transparent pixels are dots. The eight ink colours mirror the Model B palette.
const spriteInk = {
  k: "#000000", r: "#ff0000", g: "#00ff00", y: "#ffff00",
  b: "#0000ff", m: "#ff00ff", c: "#00ffff", w: "#ffffff",
};
const sprites = {
  B: { height: .72, rows: [
    "....wwww....",
    "...w....w...",
    "..w......w..",
    "..w......w..",
    ".yyyyyyyyyy.",
    ".ykkkkkkkky.",
    "..yyyyyyyy..",
    "..yyyyyyyy..",
    "..yyyyyyyy..",
    "...yyyyyy...",
    "...yyyyyy...",
    "....yyyy....",
  ] },
  I: { height: .66, rows: [
    "..cccccccc..",
    ".cwwccccccc.",
    "cwwccccccccc",
    "cwcccccccccc",
    "cccccccbcccc",
    "ccccccbbcccc",
    "cccccbcccccc",
    "cccccccccccc",
    ".cccccccccc.",
  ] },
  D: { height: 1.06, rows: [
    ".............w......",
    "............ggg.....",
    "....gg.....ggwgg....",
    "...gggg....gggggggg.",
    "..gggggg...gggkkgg..",
    "..ggggggg..ggg..r.rr",
    "...ggggggggggg...r..",
    "....gggggggggy......",
    ".g...ggggggggy......",
    "g...ggggggggg.......",
    "gggggggggggg........",
    ".gggggg..gg.........",
    ".....gg..gg.........",
    "....ggg..ggg........",
  ] },
  T: { height: 1.22, rows: [
    "....gg......gg....",
    "..gggggg..gggggg..",
    ".ggg..gggggg..ggg.",
    "gg...gggggggg...gg",
    "....ggg.gg.ggg....",
    "...gg...yy...gg...",
    "..g.....yy.....g..",
    "........yy........",
    ".......yy.........",
    ".......yy.........",
    ".......yy.........",
    "......yy..........",
    "......yy..........",
    ".....yyyy.........",
  ] },
  E: { height: 1.58, rows: [
    "......mmmm......",
    ".....mmmmmm.....",
    ".....mkmkmm.....",
    ".....mmkkmm.....",
    "....mmmmmmmm....",
    "..mmmmmmmmmmmm..",
    ".mmmmmmmmmmmmmm.",
    "mmmmmmmmmmmmmmmm",
    "mmm.mmmmmmmm.mmm",
    "mmm..mmmmmm..mmm",
    "mmm..mmmmmm..mmm",
    "mmmm.mmmmmmm.mmm",
    ".....mmm.mmm....",
    ".....mmm.mmm....",
    "....mmmm.mmmm...",
  ] },
  O: { height: 1.0, rows: [
    "......cc......",
    ".....cccc.....",
    "....cccccc....",
    "...cccccccc...",
    "..cccccccccc..",
    ".cccccccccccc.",
    "ccccccwwcccccc",
    ".cccccccccccc.",
    "..cccccccccc..",
    "...cccccccc...",
    "....cccccc....",
    ".....cccc.....",
    "......cc......",
  ] },
};
const ripePalm = {
  ...sprites.T,
  rows: sprites.T.rows.map((row, i) => ({
    4: "....ggg.ggyggg....",
    5: "...gg...yyyy.gg...",
    6: "..g.....yy.yy..g..",
    7: "........yy.y......",
  })[i] ?? row),
};
const visited = new Set();
const passages = new Map();
const start = maze.join("").indexOf("S");
let x, y, facing, escaped, puzzle, phase = 0;
const gameFonts = ["BBC Micro", "Chroma Brick", "CPC ASCII"];
let gameFont = gameFonts[0];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function tile(tx, ty) {
  return maze[ty]?.[tx] ?? "#";
}

function isWall(tx, ty) {
  return "#O".includes(tile(tx, ty));
}

function polygon(ctx, points, color, outline = false) {
  ctx.beginPath();
  points.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  if (outline) {
    ctx.strokeStyle = color;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function project(lateral, height, depth) {
  const scale = .8 / depth;
  return [
    Math.round(240 + lateral * 480 * scale),
    Math.round(132 + height * 264 * scale),
  ];
}

function centeredText(ctx, text, px, py, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "${gameFont}", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, px, py);
}

function drawFixture(kind, lateral, depth) {
  const [px, py] = project(lateral, 0, depth);
  const [, floor] = project(lateral, .5, depth);
  const size = 120 * .8 / depth;
  if (kind === "E" && puzzle.fed) {
    centeredText(view, "EXIT OPEN", px, py, Math.max(6, Math.round(size * .22)), colors.yellow);
    return;
  }
  const sprite = kind === "T" && puzzle.grown && !puzzle.picked ? ripePalm : sprites[kind];
  const scale = size * sprite.height / sprite.rows.length;
  const width = sprite.rows[0].length;
  const left = px - width * scale / 2;
  const top = (kind === "O" ? py + size * .45 : floor) - scale * sprite.rows.length;
  const beaconInk = Math.floor(phase) % 2 ? spriteInk.y : spriteInk.w;

  for (const [rowIndex, row] of sprite.rows.entries()) {
    const y0 = Math.round(top + rowIndex * scale);
    const y1 = Math.round(top + (rowIndex + 1) * scale);
    for (let column = 0; column < width; column++) {
      const pixel = row[column];
      if (pixel === ".") continue;
      const x0 = Math.round(left + column * scale);
      const x1 = Math.round(left + (column + 1) * scale);
      view.fillStyle = kind === "O" && pixel === "w" ? beaconInk : spriteInk[pixel];
      view.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  if (kind === "O") {
    centeredText(view, "CHROMA VAULT", px, py + size * 1.08, Math.round(size * .28), colors.black);
  }
}

function drawView() {
  view.fillStyle = colors.blue;
  view.fillRect(0, 0, 480, 132);
  view.fillStyle = colors.black;
  view.fillRect(0, 132, 480, 132);
  const forward = directions[facing];
  const right = directions[(facing + 1) % 4];
  for (let row = 6; row >= 0; row--) {
    for (const column of [-3, 3, -2, 2, -1, 1, 0]) {
      const tx = x + forward.x * row + right.x * column;
      const ty = y + forward.y * row + right.y * column;
      if (isWall(tx, ty)) continue;
      const far = firstCellDepth + row;
      // Clip the near edge without collapsing the cell the player is standing in.
      const near = Math.max(nearClip, far - 1);
      const left = column - .5;
      const rightEdge = column + .5;
      const leftTop = project(left, -.5, far);
      const rightTop = project(rightEdge, -.5, far);
      const leftBottom = project(left, .5, far);
      const rightBottom = project(rightEdge, .5, far);
      const nearLeft = project(left, .5, near);
      const nearRight = project(rightEdge, .5, near);
      view.beginPath();
      view.moveTo(...project(column, .5, far));
      view.lineTo(...project(column, .5, near));
      view.strokeStyle = colors.grid;
      view.stroke();
      polygon(view, [leftBottom, rightBottom, nearRight, nearLeft], colors.grid, true);
      const ahead = tile(tx + forward.x, ty + forward.y);
      if (ahead === "#" || ahead === "O") {
        polygon(view, [leftTop, rightTop, rightBottom, leftBottom], colors.pink);
        if (ahead === "O") drawFixture(ahead, column, far);
      }
      if (column >= 0 && isWall(tx - right.x, ty - right.y)) {
        polygon(view, [project(left, -.5, near), leftTop, leftBottom, nearLeft], colors.yellow);
      }
      if (column <= 0 && isWall(tx + right.x, ty + right.y)) {
        polygon(view, [rightTop, project(rightEdge, -.5, near), nearRight, rightBottom], colors.yellow);
      }
      const feature = tile(tx, ty);
      if (Object.hasOwn(sprites, feature) && feature !== "O" && !(feature === "B" && puzzle.bucket)
        && !(feature === "I" && puzzle.iceTaken)) {
        drawFixture(feature, column, far - (row === 0 ? .02 : .35));
      }
    }
  }
  if (escaped) {
    view.fillStyle = colors.black;
    view.fillRect(66, 88, 348, 88);
    centeredText(view, "VAULT OPEN", 240, 118, 30, colors.cyan);
    centeredText(view, "TYPE RESTART TO PLAY AGAIN", 240, 150, 12, colors.yellow);
  }
}

function drawMap() {
  map.fillStyle = colors.black;
  map.fillRect(0, 0, 96, 96);
  const point = (tx, ty) => [7 + tx * 7, 17 + ty * 8];
  map.strokeStyle = colors.blue;
  map.lineWidth = 1.5;
  map.beginPath();
  for (const [from, to] of passages.values()) {
    map.moveTo(...point(...from));
    map.lineTo(...point(...to));
  }
  map.stroke();
  for (const location of visited) {
    const [px, py] = point(...location.split(",").map(Number));
    map.fillStyle = colors.blue;
    map.fillRect(px - 1, py - 1, 3, 3);
  }
  const [px, py] = point(x, y);
  const direction = directions[facing];
  map.fillStyle = colors.pink;
  map.fillRect(px - 2, py - 2, 5, 5);
  map.fillStyle = colors.yellow;
  map.fillRect(px + direction.x * 3 - 1, py + direction.y * 3 - 1, 3, 3);
  polygon(map, [[82, 13], [87, 7], [92, 13], [90, 13], [87, 10], [84, 13]], colors.yellow);
  centeredText(map, "N", 87, 20, 10, colors.yellow);
}

function render() {
  heading.textContent = `LOOKING ${directions[facing].name}`;
  inventory.textContent = `CARRYING ${carriedItems().join(" / ") || "NOTHING"}`;
  actionButton.disabled = !localAction();
  drawView();
  drawMap();
}

function reset() {
  x = start % maze[0].length;
  y = Math.floor(start / maze[0].length);
  facing = 1;
  escaped = false;
  puzzle = { bucket: "", ice: false, iceTaken: false, grown: false, picked: false, bananas: false, fed: false };
  visited.clear();
  passages.clear();
  status.textContent = "A HUNGRY GORILLA GUARDS THE EXIT. ARROW KEYS TO MOVE.";
}

function carriedItems() {
  return [
    puzzle.bucket === "water" ? "BUCKET OF WATER" : puzzle.bucket === "empty" ? "EMPTY BUCKET" : "",
    puzzle.ice ? "ICE BLOCK" : "",
    puzzle.bananas ? "BANANAS" : "",
  ].filter(Boolean);
}

function atGorilla() {
  return directions.some(direction => tile(x + direction.x, y + direction.y) === "E");
}

function localAction() {
  switch (tile(x, y)) {
    case "B": if (!puzzle.bucket) return "TAKE BUCKET"; break;
    case "I": if (!puzzle.iceTaken) return "TAKE ICE"; break;
    case "D": return "MELT ICE";
    case "T":
      if (!puzzle.grown) return "WATER TREE";
      if (!puzzle.picked) return "TAKE BANANAS";
      break;
  }
  if (atGorilla() && !puzzle.fed) return "FEED GORILLA";
  return "";
}

function describeLocation() {
  const action = localAction();
  const descriptions = {
    "TAKE BUCKET": "AN EMPTY BUCKET. TYPE TAKE BUCKET.",
    "TAKE ICE": "A BLOCK OF ICE. TYPE TAKE ICE.",
    "MELT ICE": "THE DRAGON BURPS A LITTLE FLAME. TYPE MELT ICE.",
    "WATER TREE": "A THIRSTY PALM TREE. TYPE WATER TREE.",
    "TAKE BANANAS": "RIPE BANANAS! TYPE TAKE BANANAS.",
    "FEED GORILLA": "THE GORILLA WANTS LUNCH. TYPE FEED GORILLA.",
  };
  return descriptions[action] || "";
}

function useItem(command) {
  const here = tile(x, y);
  switch (command) {
    case "TAKE BUCKET":
      if (here !== "B" || puzzle.bucket) return "THERE IS NO BUCKET TO TAKE HERE.";
      puzzle.bucket = "empty";
      return "YOU PICK UP THE EMPTY BUCKET.";
    case "TAKE ICE":
      if (here !== "I" || puzzle.iceTaken) return "THERE IS NO ICE TO TAKE HERE.";
      puzzle.ice = puzzle.iceTaken = true;
      return "YOU PICK UP THE ICE. BRRR.";
    case "MELT ICE":
      if (here !== "D") return "FIND THE DRAGON FIRST.";
      if (!puzzle.ice || puzzle.bucket !== "empty") return "BRING ICE AND AN EMPTY BUCKET TO CATCH THE WATER.";
      puzzle.ice = false;
      puzzle.bucket = "water";
      return "THE DRAGON SNEEZES. THE ICE MELTS STRAIGHT INTO THE BUCKET.";
    case "WATER TREE":
      if (here !== "T") return "FIND THE PALM TREE FIRST.";
      if (puzzle.grown) return "THE PALM HAS HAD ITS DRINK.";
      if (puzzle.bucket !== "water") return "THE PALM NEEDS A BUCKET OF WATER.";
      puzzle.bucket = "empty";
      puzzle.grown = true;
      return "YOU POUR THE WATER ON THE PALM. BANANAS SPROUT!";
    case "TAKE BANANAS":
      if (here !== "T" || !puzzle.grown || puzzle.picked) return "THERE ARE NO RIPE BANANAS TO TAKE HERE.";
      puzzle.bananas = puzzle.picked = true;
      return "YOU PICK A BUNCH OF BANANAS.";
    case "FEED GORILLA":
      if (!atGorilla()) return "FIND THE GORILLA FIRST.";
      if (puzzle.fed) return "THE GORILLA IS BUSY PEELING BANANAS.";
      if (!puzzle.bananas) return "THE GORILLA HOLDS OUT AN EMPTY HAND.";
      puzzle.bananas = false;
      puzzle.fed = true;
      return "THE GORILLA TAKES THE BANANAS AND STEPS ASIDE.";
    default: return "UNKNOWN COMMAND. TYPE HELP.";
  }
}

function move(step) {
  const direction = directions[facing];
  const nx = x + direction.x * step;
  const ny = y + direction.y * step;
  if (isWall(nx, ny)) return "A WALL BLOCKS THE WAY.";
  if (tile(nx, ny) === "E" && !puzzle.fed) return "THE GORILLA BLOCKS THE EXIT. BRING BANANAS!";
  const from = [x, y], to = [nx, ny];
  passages.set([from.join(","), to.join(",")].sort().join("/"), [from, to]);
  x = nx;
  y = ny;
  if (tile(x, y) === "E") {
    escaped = true;
    return "YOU ESCAPED THE CHROMA VAULT.";
  }
  return describeLocation();
}

function execute(raw) {
  const [verb, ...args] = raw.trim().toUpperCase().split(/\s+/);
  const direction = directions[facing];
  if (!verb) return;
  if (verb === "RESTART") reset();
  else if (verb === "FONT") {
    gameFont = gameFonts[(gameFonts.indexOf(gameFont) + 1) % gameFonts.length];
    document.documentElement.style.setProperty("--game-font", `"${gameFont}"`);
    fontButton.setAttribute("aria-label", `Cycle font. Current font is ${gameFont}.`);
    status.textContent = `FONT ${gameFont.toUpperCase()}.`;
    loadGameFont();
  } else if (verb === "HELP") {
    status.textContent = "ARROWS TO MOVE. TRY LOOK, ACT, FONT, OR RESTART.";
  } else if (escaped) status.textContent = "TYPE RESTART TO PLAY AGAIN.";
  else {
    switch (verb) {
      case "L":
      case "LEFT": facing = (facing + 3) % 4; status.textContent = ""; break;
      case "R":
      case "RIGHT": facing = (facing + 1) % 4; status.textContent = ""; break;
      case "F":
      case "GO":
      case "FORWARD": status.textContent = move(1); break;
      case "B":
      case "BACK": status.textContent = move(-1); break;
      case "LOOK":
        status.textContent = describeLocation() || (isWall(x + direction.x, y + direction.y)
          ? "THERE IS A WALL AHEAD." : "THE PASSAGE CONTINUES.");
        break;
      case "ACT":
        status.textContent = localAction() ? useItem(localAction()) : "THERE IS NOTHING TO USE HERE.";
        break;
      default: status.textContent = useItem([verb, ...args].join(" "));
    }
  }
  visited.add(`${x},${y}`);
  render();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  execute(input.value);
  input.value = "";
});

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => execute(button.dataset.command));
});

const arrowCommands = { ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right" };
window.addEventListener("keydown", event => {
  const command = arrowCommands[event.key];
  if (!command || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || input.value) return;
  event.preventDefault();
  execute(command);
});

reset();
visited.add(`${x},${y}`);
render();
function loadGameFont() {
  document.fonts.load(`12px "${gameFont}"`).then(render, () => {});
}
loadGameFont();
function animate(time) {
  if (!reducedMotion.matches && !escaped) {
    phase = time / 600;
    drawView();
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
