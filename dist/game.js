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
// Shapes use a 100-unit scale, with y = 0 at floor level.
const figures = {
  B: [
    ["#e9ffff", [[-32,-41],[-31,-57],[-20,-72],[0,-78],[20,-72],[31,-57],[32,-41],[26,-41],[25,-55],[16,-66],[0,-71],[-16,-66],[-25,-55],[-26,-41]]],
    ["#e5a900", [[-38,-44],[38,-44],[28,-9],[19,-2],[-19,-2],[-28,-9]]],
    ["#fff600", [[-33,-42],[13,-39],[12,-4],[-19,-4],[-26,-10]]],
    ["#fff992", [[-38,-44],[-28,-51],[0,-55],[27,-51],[38,-44],[27,-37],[0,-33],[-27,-37]]],
    ["#352549", [[-28,-44],[-18,-48],[0,-50],[18,-48],[28,-44],[18,-40],[0,-38],[-18,-40]]],
  ],
  I: [
    ["#23fff1", [[-38,-49],[13,-42],[13,0],[-38,-8]]],
    ["#5395ff", [[13,-42],[40,-57],[40,-16],[13,0]]],
    ["#bcffff", [[-38,-49],[-12,-66],[40,-57],[13,-42]]],
    ["#ffffff", [[-28,-50],[-11,-60],[15,-56],[-9,-48]]],
    ["#9fffff", [[-29,-41],[-23,-40],[-23,-17],[-29,-18]]],
    ["#d2ffff", [[15,-35],[35,-48],[35,-43],[15,-30]]],
  ],
  D: [
    ["#137b53", [[-20,-58],[-61,-87],[-50,-58],[-69,-57],[-47,-42],[-58,-31],[-21,-39]]],
    ["#158654", [[-16,-13],[-48,-19],[-68,-32],[-80,-50],[-78,-28],[-63,-13],[-34,-6]]],
    ["#35ec62", [[-47,-24],[-48,-44],[-36,-60],[-13,-61],[3,-50],[12,-62],[15,-84],[29,-97],[44,-96],[53,-84],[74,-83],[77,-74],[69,-63],[43,-63],[38,-36],[23,-17],[14,-14],[20,-4],[0,0],[-8,-8],[-7,-20],[-24,-21],[-32,-7],[-51,-7],[-41,-16]]],
    ["#b9ff57", [[45,-63],[38,-36],[23,-17],[0,-15],[14,-29],[24,-52],[28,-69]]],
    ["#f8ffcf", [[28,-96],[28,-109],[38,-96]]],
    ["#10151d", [[42,-88],[49,-87],[48,-83],[42,-83]]],
    ["#10151d", [[53,-72],[75,-75],[73,-71],[55,-68]]],
  ],
  T: [
    ["#dd8c35", [[-15,0],[15,0],[9,-24],[9,-51],[16,-84],[5,-95],[-4,-73],[-8,-46],[-7,-18]]],
    ["#ffce57", [[-7,-7],[1,-4],[-1,-46],[5,-75],[10,-88],[5,-90],[-4,-68],[-7,-46]]],
    ["#168c49", [[9,-91],[-22,-114],[-51,-112],[-69,-90],[-43,-100],[-25,-97],[0,-79],[24,-82],[49,-94],[68,-84],[58,-104],[33,-108]]],
    ["#4cff35", [[9,-91],[-13,-116],[-35,-128],[-56,-124],[-32,-117],[-18,-98],[-39,-95],[-55,-74],[-32,-83],[-15,-82],[9,-94],[23,-113],[48,-122],[63,-114],[39,-113],[25,-91],[47,-85],[64,-63],[40,-75],[25,-75]]],
  ],
  E: [
    ["#39306b", [[-43,-67],[-58,-42],[-59,-9],[-45,-2],[-29,-10],[-30,-34],[-15,-59],[15,-62],[28,-42],[32,-9],[47,-1],[59,-12],[56,-47],[43,-73],[24,-88],[-25,-88]]],
    ["#8151d8", [[-44,-70],[-28,-86],[-21,-92],[-22,-106],[-12,-121],[9,-124],[24,-112],[26,-91],[41,-75],[46,-58],[33,-50],[28,-26],[28,-5],[12,0],[-2,-5],[-4,-25],[-19,-18],[-23,-4],[-43,0],[-44,-12],[-34,-29],[-38,-48],[-48,-53]]],
    ["#b089ef", [[-25,-72],[-9,-82],[12,-81],[29,-70],[25,-52],[15,-44],[-12,-44],[-27,-54]]],
    ["#c3a4fb", [[-17,-108],[-8,-112],[14,-112],[21,-103],[18,-90],[9,-85],[-9,-86],[-18,-94]]],
    ["#231837", [[-16,-107],[-3,-108],[0,-104],[-13,-103]]],
    ["#231837", [[4,-104],[8,-108],[19,-107],[18,-103]]],
    ["#4b3477", [[-8,-99],[11,-99],[15,-93],[10,-88],[-8,-89],[-12,-94]]],
    ["#201632", [[-5,-96],[8,-96],[7,-93],[-4,-93]]],
  ],
};
const bananaBunch = [
  ["#fff600", [[6,-89],[9,-73],[17,-65],[29,-67],[34,-74],[26,-72],[19,-74],[16,-83],[15,-91]]],
  ["#ffc129", [[13,-89],[19,-76],[28,-72],[39,-76],[42,-83],[33,-79],[26,-81],[22,-91]]],
];
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
  const size = 120 * .8 / depth;
  if (kind === "O") {
    const tip = Math.round(Math.sin(phase) * size * .25);
    polygon(view, [[px, py-size], [px+size*.68, py], [px, py+size], [px-size*.68, py]], colors.black);
    polygon(view, [[px, py-size*.8], [px+size*.55, py], [px, py+size*.8], [px+tip, py]], colors.blue);
    polygon(view, [[px, py-size*.8], [px-size*.55, py], [px, py+size*.8], [px+tip, py]], colors.cyan);
    centeredText(view, "CHROMA VAULT", px, py + size * 1.55, Math.round(size * .28), colors.black);
    return;
  }
  const [, floor] = project(lateral, .5, depth);
  if (kind === "E" && puzzle.fed) {
    centeredText(view, "EXIT OPEN", px, py, Math.max(6, Math.round(size * .22)), colors.yellow);
    return;
  }
  const scale = size / (kind === "E" ? 76 : 100);
  const parts = kind === "T" && puzzle.grown && !puzzle.picked
    ? [...figures.T, ...bananaBunch] : figures[kind];
  for (const [color, points] of parts) {
    polygon(view, points.map(([x, y]) => [
      Math.round(px + x * scale), Math.round(floor + y * scale),
    ]), color);
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
      if (Object.hasOwn(figures, feature) && !(feature === "B" && puzzle.bucket)
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
