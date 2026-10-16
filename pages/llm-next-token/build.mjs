// 图 2 · 下一个词试验台 —— 一篇科普「大模型怎么猜下一个词」的图文页
// Anatomy 技能（github.com/wheresryan22/anatomy）搭的示教机：
//   左：词块轨道。12 块「词」排在一条轨上，最右那块是当前的最后一块（提问）；
//       五根探针站在被读到的词块上，越高 = 注意力权重越大，最高的那根是提问自己。
//   中：三层处理塔。词块从下往上过三层，塔前地板上印着 6×6 的注意力矩阵示意图。
//   右上：概率板。9 根柱子 = 下一个词的概率，随温度与 top-k 截断当场重算；
//       背后的格板 10% 一道横线，被抽中的那根点着，被砍掉的候选落进旁边的废料盘。
// 尺度：1 世界单位 = 1 毫米。
// node build.mjs [--light] [--audit]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { kitScript } from "../../anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const W = 620;
const H = 452;

/* ── 模型 ─────────────────────────────────────────────────────────── */
// 下一个词的候选与分数（已按分数从大到小排好；温度只改分布，不改名次）
const WORDS = ["走", "吧", "一", "会", "到", "是", "的", "了", "我"];
const LOGITS = [4.2, 3.6, 3.1, 2.7, 2.3, 1.9, 1.5, 1.1, 0.6];
const SEED = 0.62;                       // 固定的那一次「掷骰子」，指针落点全靠它
const T0 = 0.9, K0 = 6;                  // 静止状态：温度 0.9、top-k 6
const T_MIN = 0.2, T_MAX = 2.0, K_MIN = 1, K_MAX = WORDS.length;

// 词块轨道（owner tokens）
const RAIL_PLINTH = { x: -122, y: -62, w: 150, d: 46, r: 8 }, RAIL_PLINTH_H = 5;
const RAIL = { x: -116, y: -50, w: 138, d: 22, r: 3 }, RAIL_Z = 5, RAIL_H = 5;
const TOKEN_W = 9.4, TOKEN_D = 15, TOKEN_H = 7, TOKEN_STEP = 12, TOKEN_X0 = -114, TOKEN_Y = -46;
const TOKEN_N = 12, QUERY_I = 11;                       // 最后一块 = 当前提问
const tokenPlan = (i) => ({ x: TOKEN_X0 + i * TOKEN_STEP, y: TOKEN_Y, w: TOKEN_W, d: TOKEN_D, r: 1.2 });
const TOKEN_TOP = RAIL_Z + RAIL_H + TOKEN_H;            // 16：词块顶面

// 注意力探针（owner heads）：站在被读到的词块上，高度 = 权重
const HEAD_AT = [1, 4, 7, 9, 11];
const HEAD_W = [0.35, 0.6, 0.3, 0.5, 1.0];
const HEAD_R = 2.0, HEAD_CAP_R = 3.2, HEAD_CAP_H = 1.4;
const headH = (w) => 5 + w * 20;

// 三层处理塔（owner stack）+ 概率板（owner bars）
const STACK_PLINTH = { x: -34, y: 2, w: 100, d: 54, r: 8 };
const LAYERS = [
  { x: -34, y: 8, w: 92, d: 42, r: 5, z0: 5, h: 6 },
  { x: -32, y: 10, w: 88, d: 38, r: 5, z0: 11, h: 7.5 },
  { x: -30, y: 12, w: 84, d: 34, r: 5, z0: 18.5, h: 5.5 },
];
const DECK_Z = 24, DECK_H = 1.4;                        // 第三层顶面 = 概率板的底板
const DECK_TOP = DECK_Z + DECK_H;
const BAR_N = WORDS.length, BAR_W = 5.2, BAR_D = 6.4, BAR_STEP = 9.2, BAR_X0 = -26, BAR_Y = 20;
const BAR_BASE = 3, BAR_GAIN = 60, BAR_AXIS = 0.5;                  // 尺子量到 50%，一根 1.0 的柱子会越顶
const BAR_MAX = BAR_BASE + BAR_GAIN;                                // 形状按最高可能记账
const barPlan = (i) => ({ x: BAR_X0 + i * BAR_STEP, y: BAR_Y, w: BAR_W, d: BAR_D, r: 0.7 });
const BAR_TOP = DECK_TOP + BAR_MAX;
// 概率板背后的格板：10% 一道横线，点着的那道标出最高的一根
const BOARD = { x: -28.4, y: BAR_Y - 2.4, w: (BAR_N - 1) * BAR_STEP + 11, d: 1.6, r: 0.4 };   // 柱子的里侧 = 屏幕上在柱子背后
const BOARD_H = BAR_BASE + BAR_AXIS * BAR_GAIN + 2;
const MARKER = { x0: -27.6, x1: -19.6 };
const BOARD_FRACS = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

// 注意力矩阵示意图（印在台面上的 back art）
const MATRIX = { x: -110, y: 4, w: 46, d: 24, r: 2 };
const MATRIX_CELLS = [0, 7, 14, 21, 28, 35, 6, 13, 20, 27, 34, 41];   // 对角线附近

// 面板（owner panel）／托盘（owner stand）
const PANEL = { x: -122, y: 34, w: 84, d: 26, r: 5 }, PANEL_H = 5, KNOB_R = 7.5;
const KNOBS = [[-100, 47], [-64, 47]];
const TRAY = { x: 76, y: -50, w: 40, d: 30, r: 3 };
const BLOCK_X = 81, BLOCK_Y = -44, BLOCK_W = 10, BLOCK_D = 11;
const BIN = { x: 70, y: 20, w: 44, d: 30, r: 4 };                       // 废料盘：被 top-k 砍掉的候选
const BIN_BLOCKS = [{ x: 76, y: 26, w: 12, d: 9, h: 5 }, { x: 92, y: 32, w: 15, d: 10, h: 4 }, { x: 82, y: 38, w: 10, d: 8, h: 3 }];
const BLOCKS = [3, 8, 13];
const LABEL = { x: -126, y: -14, w: 54, d: 16, r: 2.5 };

/* ── 台面 ─────────────────────────────────────────────────────────── */
const PLATE = { x: -130, y: -68, w: 256, d: 140, r: 10 };
const PLATE_H = 12, FOOT_H = 6;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(RAIL_PLINTH, 0, TOKEN_TOP + 1),
    [TOKEN_X0 + QUERY_I * TOKEN_STEP + TOKEN_W / 2, TOKEN_Y + TOKEN_D / 2, TOKEN_TOP + headH(1) + HEAD_CAP_H + 1],
    ...k.boxCorners(STACK_PLINTH, 0, DECK_Z),
    ...k.boxCorners(barPlan(0), DECK_Z, BAR_TOP + 1),
    [barPlan(BAR_N - 1).x + BAR_W, BAR_Y + BAR_D, BAR_TOP],
    ...k.boxCorners(BOARD, DECK_TOP, DECK_TOP + BOARD_H),
    ...k.boxCorners(MATRIX, 0, 1),
    ...k.boxCorners(PANEL, 0, PANEL_H + 12),
    ...k.boxCorners(TRAY, 0, 16),
    ...k.boxCorners(BIN, 0, 8),
    ...k.boxCorners(LABEL, 0, 1),
  ],
  W, H, { pad: 24, azimuth: 42, elevation: 29 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ── 记录器：每件画出来的东西都按真实形状报给审计 ─────────────────── */
const R = A.recorder(P);
const record = R.solid;
const items = [];
function put(name, ref, svg, shapes = [], { bias = 0, key, owner = "rig", ...rest } = {}) {
  for (const shape of shapes) if (shape) shape.owner = shape.owner ?? owner;
  const item = R.put({ name, at: ref, bias, key, svg, shapes, piece: "rig", ...rest });
  items.push(item);
  return item;
}
function slab(name, plan, z, height, style = {}, { steps = 8, bevel = 0, bias = 0, owner = "rig", ref, extra = "" } = {}) {
  const shape = record(A.slab(plan, z, height, { name, owner }, steps));
  put(name, ref ?? [plan.x + plan.w / 2, plan.y + plan.d / 2, z + height / 2], S(k.slabOf(plan, z, height, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias, owner });
  return shape;
}
function post(name, cx, cy, r, z, height, style = {}, { steps = 28, bevel = 0, bias = 0, owner = "rig", extra = "" } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, height, { name, owner }));
  put(name, [cx, cy, z + height / 2], S(k.cylinder(cx, cy, r, z, height, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias, owner });
  return shape;
}

/* ── 台面：底板、脚、光斑、铭牌、矩阵示意图 ──────────────────────── */
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", owner: "stand", ground: true }, 8));
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const plateScrews = k.corners(PLATE, 11);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
// 概率板在台面上留下的一片光
const glow = (points) => `<path class="iso-glow" d="${k.pathOf(points.map(([x, y]) => at([x, y, 0])), true)}"/>`;
back.push(glow([[-34, 12], [64, 12], [70, 56], [-28, 56]]));
back.push(glow([[-20, 2], [-6, 2], [-6, 40], [-20, 40]]));
// 铭牌
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
back.push(Ln([
  k.lineOnTop([LABEL.x + 5, -10], [LABEL.x + 30, -10], 0.8, P),
  k.lineOnTop([LABEL.x + 5, -5], [LABEL.x + 44, -5], 0.8, P),
  k.lineOnTop([LABEL.x + 5, -1], [LABEL.x + 24, -1], 0.8, P),
].join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 3, -12, 0.8]), at([LABEL.x + LABEL.w - 3, -1, 0.8])], { size: 0.45 }));
record(A.slab(LABEL, 0, 0.8, { name: "stand.label", owner: "stand" }, 4));
// 注意力矩阵示意图：6×6 格，斜向一带点着（每个词看几个词）
record(A.slab(MATRIX, 0, 0.7, { name: "stand.matrix", owner: "stand" }, 3));
back.push(S(k.slabOf(MATRIX, 0, 0.7, P, 4), { tone: "lo", crease: "none" }));
const cell = { w: MATRIX.w / 6, d: MATRIX.d / 6 };
const cellsAt = (indices) => indices.map((n) => {
  const col = n % 6, row = Math.floor(n / 6);
  return [MATRIX.x + cell.w * (col + 0.5), MATRIX.y + cell.d * (row + 0.5)];
});
back.push(Dots(cellsAt(MATRIX_CELLS).map(([x, y]) => at([x, y, 0.7])), { size: 1.5, tone: "mid" }));
back.push(Ln(cellsAt([0, 5, 30, 35]).map(([x, y]) => k.planOutline({ x: x - cell.w / 2 + 0.9, y: y - cell.d / 2 + 0.9, w: cell.w - 1.8, d: cell.d - 1.8, r: 0.6 }, 0.7, P, 3)).join(""), { tone: "lo" }));
back.push(Ln([1, 2, 3, 4, 5].map((n) => k.lineOnTop([MATRIX.x + cell.w * n, MATRIX.y], [MATRIX.x + cell.w * n, MATRIX.y + MATRIX.d], 0.7, P)).join(""), { tone: "faint" }));
back.push(Ln([1, 2, 3, 4, 5].map((n) => k.lineOnTop([MATRIX.x, MATRIX.y + cell.d * n], [MATRIX.x + MATRIX.w, MATRIX.y + cell.d * n], 0.7, P)).join(""), { tone: "faint" }));

/* ── 词块轨道 ─────────────────────────────────────────────────────── */
slab("rail.plinth", RAIL_PLINTH, 0, RAIL_PLINTH_H, { tone: "mid" }, {
  steps: 6, bevel: 0.8, owner: "tokens",
  extra: Ln(k.planOutline(k.insetPlan(RAIL_PLINTH, 4), RAIL_PLINTH_H, P, 6), { tone: "faint" })
    + Dots(k.corners(RAIL_PLINTH, 8).map(([x, y]) => at([x, y, RAIL_PLINTH_H])), { size: 0.5 }),
});
slab("rail.body", RAIL, RAIL_Z, RAIL_H, { tone: "mid" }, {
  steps: 4, bevel: 0.5, owner: "tokens",
  extra: Ln([1, 2, 3, 4, 5].map((n) => k.lineOnTop([RAIL.x + (RAIL.w / 6) * n, RAIL.y], [RAIL.x + (RAIL.w / 6) * n, RAIL.y + RAIL.d], RAIL_Z + RAIL_H, P)).join(""), { tone: "faint" }),
});
for (let i = 0; i < TOKEN_N; i++) {
  const plan = tokenPlan(i);
  const query = i === QUERY_I;
  slab(`token.${String(i).padStart(2, "0")}`, plan, RAIL_Z + RAIL_H, TOKEN_H, {
    tone: query ? "hi" : "mid", lit: query, crease: query ? "lo" : "faint",
  }, {
    steps: 3, bevel: 0.4, owner: "tokens", bias: i * 0.001,
    extra: Ln([
      k.lineOnTop([plan.x + 1.8, plan.y + 3.4], [plan.x + TOKEN_W - 1.8, plan.y + 3.4], TOKEN_TOP, P),
      k.lineOnTop([plan.x + 1.8, plan.y + TOKEN_D - 3.6], [plan.x + TOKEN_W - 2.6, plan.y + TOKEN_D - 3.6], TOKEN_TOP, P),
      k.lineOnTop([plan.x + 2.6, plan.y + TOKEN_D / 2], [plan.x + TOKEN_W - 1.8, plan.y + TOKEN_D / 2], TOKEN_TOP, P),
    ].join(""), { tone: query ? "mid" : "faint" }),
  });
}

/* ── 注意力探针：站在被读到的词块上，越高读得越重 ───────────────── */
HEAD_AT.forEach((index, order) => {
  const plan = tokenPlan(index);
  const cx = plan.x + TOKEN_W / 2, cy = plan.y + TOKEN_D / 2;
  const weight = HEAD_W[order];
  const h = headH(weight);
  const top = TOKEN_TOP + h;
  const lit = index === QUERY_I;
  post(`head.post${order}`, cx, cy, HEAD_R, TOKEN_TOP, h, { tone: lit ? "hi" : "mid", crease: lit ? "lo" : "faint" }, {
    steps: 20, owner: "heads", bias: 0.2,
    extra: Ln(k.sideArc(cx, cy, HEAD_R, TOKEN_TOP + h * 0.45, P, 14), { tone: "faint" }),
  });
  post(`head.cap${order}`, cx, cy, HEAD_CAP_R, top, HEAD_CAP_H, { tone: lit ? "hi" : "lo", lit }, {
    steps: 24, bevel: 0.3, owner: "heads", bias: 0.3,
    extra: Ln(k.knurl(cx, cy, HEAD_CAP_R, top + 0.3, top + HEAD_CAP_H - 0.3, 12, P), { tone: "lo" }),
  });
});

/* ── 处理塔：三层，越往上越小 ───────────────────────────────────── */
slab("stack.plinth", STACK_PLINTH, 0, RAIL_PLINTH_H, { tone: "mid" }, {
  steps: 6, bevel: 0.8, owner: "stack",
  extra: Ln(k.planOutline(k.insetPlan(STACK_PLINTH, 4), RAIL_PLINTH_H, P, 6), { tone: "faint" })
    + Dots(k.corners(STACK_PLINTH, 8).map(([x, y]) => at([x, y, RAIL_PLINTH_H])), { size: 0.5 }),
});
LAYERS.forEach((layer, index) => {
  const { x, y, w, d, r } = layer;
  const plan = { x, y, w, d, r };
  slab(`stack.layer${index}`, plan, layer.z0, layer.h, { tone: index === 1 ? "hi" : "mid", crease: index === 1 ? "lo" : "faint" }, {
    steps: 4, bevel: 0.6, owner: "stack", bias: 0.1 * index,
    extra: Ln(k.planOutline(k.insetPlan(plan, 2.4), layer.z0 + layer.h, P, 4), { tone: "faint" })
      + Ln(k.sideSeam(plan, layer.z0 + layer.h * 0.5, P, 4), { tone: "faint" })
      + Ln([1, 2, 3, 4, 5, 6].map((n) => k.lineOnTop([plan.x + 2.4, plan.y + (d - 4.8) / 6 * n + 2.4], [plan.x + w - 2.4, plan.y + (d - 4.8) / 6 * n + 2.4], layer.z0 + layer.h, P)).join(""), { tone: "faint" }),
  });
});

/* ── 概率板：9 根柱子 + 背后的百分比格板 ───────────────────────── */
const probAt = (T, keep) => {
  const exps = LOGITS.map((z) => Math.exp(z / T));
  const total = exps.reduce((sum, v) => sum + v, 0);
  const full = exps.map((v) => v / total);
  const kept = full.slice(0, keep);
  const mass = kept.reduce((sum, v) => sum + v, 0) || 1;
  return { full, kept: kept.map((v) => v / mass), mass };
};
const sampledIndex = (T, keep) => {
  const { kept } = probAt(T, Math.max(1, Math.round(keep)));
  let cum = 0;
  for (let i = 0; i < kept.length; i++) {
    cum += kept[i];
    if (cum >= SEED) return i;
  }
  return kept.length - 1;
};
const barHeight = (index, T, keep) => {
  const round = Math.max(1, Math.round(keep));
  if (index >= round) return 1.4;                                  // 被截断的那几根：只剩一个桩
  const { kept } = probAt(T, round);
  return BAR_BASE + kept[index] * BAR_GAIN;
};
const markerAt = (T, keep) => {
  const round = Math.max(1, Math.round(keep));
  const { kept } = probAt(T, round);
  const z = DECK_TOP + BAR_BASE + Math.max(0, Math.min(BAR_AXIS, kept[0])) * BAR_GAIN;
  return Ln(k.lineOnTop([MARKER.x0, BOARD.y], [MARKER.x1, BOARD.y], z, P), { tone: "lit", free: true });
};
const barsSvgAt = (T, keep) => {
  const round = Math.max(1, Math.round(keep));
  const sampled = sampledIndex(T, round);
  const out = [];
  for (let i = 0; i < BAR_N; i++) {
    const plan = barPlan(i);
    const h = barHeight(i, T, round);
    const cut = i >= round;
    const sampledHere = i === sampled;
    out.push(S(k.slabOf(plan, DECK_TOP, h, P, 2, 0.4), { tone: sampledHere ? "hi" : cut ? "lo" : "mid", lit: sampledHere, crease: cut ? "none" : "faint" }));
    out.push(Ln(k.planOutline(k.insetPlan(plan, 0.9), DECK_TOP + h, P, 2), { tone: cut ? "faint" : "mid" }));
    if (cut) out.push(Ln(k.planOutline(plan, DECK_TOP + h + 0.35, P, 2), { tone: "faint" }));
  }
  return out.join("");
};

slab("bars.deck", { x: BAR_X0 - 3.6, y: BAR_Y - 3, w: (BAR_N - 1) * BAR_STEP + BAR_W + 4.6, d: BAR_D + 6, r: 2 }, DECK_Z, DECK_H, { tone: "lo", crease: "none" }, {
  steps: 4, bevel: 0.3, owner: "bars", bias: 0.4,
  extra: Ln(Array.from({ length: BAR_N - 1 }, (_, n) => k.lineOnTop([BAR_X0 + (n + 1) * BAR_STEP - 1.5, BAR_Y - 3], [BAR_X0 + (n + 1) * BAR_STEP - 1.5, BAR_Y + BAR_D + 3], DECK_TOP, P)).join(""), { tone: "faint" }),
});
const boardLines = (f) => k.lineOnTop([BOARD.x + 1.2, BOARD.y], [BOARD.x + BOARD.w - 1.2, BOARD.y], DECK_TOP + BAR_BASE + f * BAR_GAIN, P);
slab("bars.board", BOARD, DECK_TOP, BOARD_H, { tone: "lo", crease: "none" }, {
  steps: 3, bevel: 0.3, owner: "bars", bias: 0.3,
  extra: Ln(BOARD_FRACS.map((f) => boardLines(f)).join(""), { tone: "faint" })
    + Ln(boardLines(0.25) + boardLines(BAR_AXIS), { tone: "mid" })
    + `<g data-part="marker"><g/></g>`,
});
put("bars.group", [BAR_X0 + 34, BAR_Y, DECK_TOP + 8], `<g data-part="bars">${barsSvgAt(T0, K0)}</g>`,
  Array.from({ length: BAR_N }, (_, i) => record(A.slab(barPlan(i), DECK_TOP, BAR_MAX, { name: `bars.bar${String(i).padStart(2, "0")}`, owner: "bars" }, 2))),
  { bias: 0.6, owner: "bars" });

/* ── 废料盘：被 top-k 砍掉的候选掉在这里 ─────────────────────────── */
slab("bin.floor", BIN, 0, 2.2, { tone: "lo" }, {
  steps: 4, bevel: 0.4, owner: "stand",
  extra: Ln(k.planOutline(k.insetPlan(BIN, 2), 2.2, P, 5), { tone: "faint" }),
});
const BIN_RIM = [
  { x: BIN.x, y: BIN.y, w: BIN.w, d: 2.4, r: 0.8 },
  { x: BIN.x, y: BIN.y + BIN.d - 2.4, w: BIN.w, d: 2.4, r: 0.8 },
  { x: BIN.x, y: BIN.y + 2.4, w: 2.4, d: BIN.d - 4.8, r: 0.8 },
  { x: BIN.x + BIN.w - 2.4, y: BIN.y + 2.4, w: 2.4, d: BIN.d - 4.8, r: 0.8 },
];
BIN_RIM.forEach((plan, index) => {
  slab(`bin.rim${index}`, plan, 2.2, 4.4, { tone: index % 2 ? "mid" : "lo", crease: "faint" }, { steps: 2, bevel: 0.3, owner: "stand" });
});
BIN_BLOCKS.forEach((block, index) => {
  const plan = { x: block.x, y: block.y, w: block.w, d: block.d, r: 0.8 };
  slab(`bin.trash${index}`, plan, 2.2, block.h, { tone: "mid", crease: "faint" }, {
    steps: 2, bevel: 0.3, owner: "stand",
    extra: Ln(k.planOutline(k.insetPlan(plan, 1.4), 2.2 + block.h, P, 2), { tone: "faint" }),
  });
});

/* ── 面板 ─────────────────────────────────────────────────────────── */
slab("panel", PANEL, 0, PANEL_H, { tone: "mid" }, {
  steps: 5, bevel: 1.0, owner: "panel",
  extra: Ln([PANEL.x + 7, PANEL.x + PANEL.w - 7].map((x) => k.ring(x, PANEL.y + PANEL.d / 2, 2.1, PANEL_H, P, 16)).join(""), { tone: "lo" })
    + Dots([at([PANEL.x + 7, PANEL.y + PANEL.d / 2, PANEL_H]), at([PANEL.x + PANEL.w - 7, PANEL.y + PANEL.d / 2, PANEL_H])], { size: 0.5 }),
});
KNOBS.forEach(([cx, cy], index) => {
  post(`knob.dial${index}`, cx, cy, 12.5, PANEL_H, 1.4, { tone: "lo" }, {
    steps: 44, owner: "panel",
    extra: Ln(k.radialTicks(cx, cy, 11, 24, 6, PANEL_H + 1.4, [1.4, 3], P).minor, { tone: "lo" })
      + Ln(k.radialTicks(cx, cy, 11, 24, 6, PANEL_H + 1.4, [1.4, 3], P).major, { tone: "mid" }),
  });
  post(`knob.body${index}`, cx, cy, KNOB_R, PANEL_H + 1.4, 7.6, { tone: "mid", crease: "lo" }, {
    steps: 40, bevel: 0.5, owner: "panel",
    extra: Ln(k.knurl(cx, cy, KNOB_R, PANEL_H + 1.8, PANEL_H + 8.4, 36, P), { tone: "lo" })
      + Ln(k.ring(cx, cy, 1.7, PANEL_H + 9, P, 16), { tone: "mid" })
      + `<g data-part="knob-${index}"></g>`,
  });
  post(`knob.stop${index}`, cx + 12.5 + 3.4, cy + 8, 1.6, PANEL_H, 3.4, { tone: "mid" }, { steps: 14, owner: "panel" });
});

/* ── 托盘：几叠语料 ─────────────────────────────────────────────── */
slab("tray", TRAY, 0, 2.4, { tone: "lo" }, {
  steps: 4, bevel: 0.5, owner: "stand",
  extra: Ln(k.planOutline(k.insetPlan(TRAY, 2), 2.4, P, 5), { tone: "faint" }),
});
BLOCKS.forEach((height, index) => {
  const plan = { x: BLOCK_X + index * 13.6, y: BLOCK_Y, w: BLOCK_W, d: BLOCK_D, r: 0.8 };
  slab(`tray.block${index}`, plan, 2.4, height, { tone: index === 1 ? "hi" : "mid", crease: index === 1 ? "lo" : "faint" }, {
    steps: 2, bevel: 0.35, owner: "stand",
    extra: Ln(k.planOutline(k.insetPlan(plan, 1.6), 2.4 + height, P, 2), { tone: "faint" })
      + Dots([at([plan.x + 1.6, plan.y + 1.6, 2.4 + height]), at([plan.x + plan.w - 1.6, plan.y + plan.d - 1.6, 2.4 + height])], { size: 0.35, tone: "faint" }),
  });
});

/* ── 组装 ─────────────────────────────────────────────────────────── */
A.settle(R, P);
items.sort((a, b) => a.key - b.key);

if (process.env.ROOMS) {
  const rows = items.map((item) => {
    const b = item.shapes?.[0] ? A.boundsOf(item.shapes[0]) : null;
    const c = b ? b.min.map((v, i) => (v + b.max[i]) / 2) : [0, 0, 0];
    const [sx, sy] = k.iso(c, P);
    return `${item.name.padEnd(24)} key ${item.key.toFixed(1).padStart(7)}  screen ${sx.toFixed(0).padStart(4)},${sy.toFixed(0).padStart(4)}`;
  });
  console.log(rows.join("\n"));
}
const layer = items.map((item) => `<g class="rig-item" data-name="${item.name}">${item.svg}</g>`);
const svg = k.figureSvg({
  width: W,
  height: H,
  label: "下一个词试验台：左边的词块轨道上是上下文，五根探针站在被读到的词块上，读得越重站得越高；中间三层处理塔把词块从下往上送过去，塔前地板上印着注意力矩阵；右边九根柱子是下一个词的概率，受温度和 top-k 截断控制，被抽中的那根点着。",
  body: [...back, ...layer],
});

/* ── 页面里的模型（与 build 同一份公式） ─────────────────────────── */
const DATA = {
  P, LOGITS, WORDS, SEED, T0, K0, T_MIN, T_MAX, K_MIN, K_MAX,
  RAIL_Z, RAIL_H, TOKEN_W, TOKEN_D, TOKEN_H, TOKEN_STEP, TOKEN_X0, TOKEN_Y, TOKEN_N, QUERY_I, TOKEN_TOP,
  HEAD_AT, HEAD_W, HEAD_R, HEAD_CAP_R, HEAD_CAP_H,
  DECK_Z, DECK_H, DECK_TOP, BAR_N, BAR_W, BAR_D, BAR_STEP, BAR_X0, BAR_Y, BAR_BASE, BAR_GAIN, BAR_AXIS, BAR_MAX, BOARD, BOARD_H, MARKER,
  PANEL_H, KNOB_R, KNOBS,
};
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const barPlan = (i) => ({ x: D.BAR_X0 + i * D.BAR_STEP, y: D.BAR_Y, w: D.BAR_W, d: D.BAR_D, r: 0.7 });
const headH = (w) => 5 + w * 20;
function probAt(T, keep) {
  const exps = D.LOGITS.map((z) => Math.exp(z / T));
  const total = exps.reduce((sum, v) => sum + v, 0);
  const full = exps.map((v) => v / total);
  const kept = full.slice(0, keep);
  const mass = kept.reduce((sum, v) => sum + v, 0) || 1;
  return { full, kept: kept.map((v) => v / mass), mass };
}
function sampledIndex(T, keep) {
  const { kept } = probAt(T, keep);
  let cum = 0;
  for (let i = 0; i < kept.length; i++) { cum += kept[i]; if (cum >= D.SEED) return i; }
  return kept.length - 1;
}
function barHeight(index, T, keep) {
  if (index >= keep) return 1.4;
  const { kept } = probAt(T, keep);
  return D.BAR_BASE + kept[index] * D.BAR_GAIN;
}
function barsSvg(T, keep) {
  const sampled = sampledIndex(T, keep);
  const out = [];
  for (let i = 0; i < D.BAR_N; i++) {
    const plan = barPlan(i);
    const h = barHeight(i, T, keep);
    const cut = i >= keep;
    const here = i === sampled;
    out.push(solidSvg(slabOf(plan, D.DECK_TOP, h, P, 2, 0.4), { tone: here ? "hi" : cut ? "lo" : "mid", lit: here, crease: cut ? "none" : "faint" }));
    out.push(lineSvg(planOutline(insetPlan(plan, 0.9), D.DECK_TOP + h, P, 2), { tone: cut ? "faint" : "mid" }));
    if (cut) out.push(lineSvg(planOutline(plan, D.DECK_TOP + h + 0.35, P, 2), { tone: "faint" }));
  }
  return out.join("");
}
function markerSvg(T, keep) {
  const { kept } = probAt(T, keep);
  const z = D.DECK_TOP + D.BAR_BASE + Math.max(0, Math.min(D.BAR_AXIS, kept[0])) * D.BAR_GAIN;
  return lineSvg(lineOnTop([D.MARKER.x0, D.BOARD.y], [D.MARKER.x1, D.BOARD.y], z, P), { tone: "lit", free: true });
}
function knobPointer([cx, cy], share) {
  const angle = -0.75 + share * 1.5;
  return lineSvg(lineOnTop([cx - 2.4, cy + 2.4], [cx - 2.4 + (D.KNOB_R - 1.6) * Math.cos(angle * Math.PI), cy + 2.4 - (D.KNOB_R - 1.6) * Math.sin(angle * Math.PI)], D.PANEL_H + 9, P), { tone: "lit", free: true });
}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const gaze = document.querySelector("[data-gaze]");
const barsHost = svg.querySelector('[data-part="bars"]');
const markerHost = svg.querySelector('[data-part="marker"]');
const knobs = D.KNOBS.map((_, index) => svg.querySelector('[data-part="knob-' + index + '"]'));
const still = matchMedia("(prefers-reduced-motion: reduce)");
let temp = D.T0, keep = D.K0, tempT = D.T0, keepT = D.K0;

function draw() {
  const kRound = Math.max(D.K_MIN, Math.min(D.K_MAX, Math.round(keep)));
  barsHost.innerHTML = barsSvg(temp, kRound);
  markerHost.innerHTML = markerSvg(temp, kRound);
  knobs[0].innerHTML = knobPointer(D.KNOBS[0], (temp - D.T_MIN) / (D.T_MAX - D.T_MIN));
  knobs[1].innerHTML = knobPointer(D.KNOBS[1], (kRound - D.K_MIN) / (D.K_MAX - D.K_MIN));
  const { kept } = probAt(temp, kRound);
  const pick = sampledIndex(temp, kRound);
  const squares = kept.reduce((sum, v) => sum + v * v, 0) || 1;
  const text = "抽到「" + D.WORDS[pick] + "」 p=" + Math.round(kept[pick] * 100) + "% · 温度 " + temp.toFixed(1) + " · top-k " + kRound + " · 有效候选 " + (1 / squares).toFixed(1);
  if (readout.textContent !== text) readout.textContent = text;
  if (gaze) gaze.textContent = "温度 " + temp.toFixed(1) + "、top-k " + kRound + "：概率最高的那个词现在是「" + D.WORDS[0] + "」，" + Math.round(kept[0] * 100) + "%";
  stage.setAttribute("aria-valuetext", text);
}
let clock = 0, last = 0, frame = 0, visible = false, touring = true, idle = 0;
const TOUR = [[0.6, 9], [1.9, 9], [1.9, 2], [0.6, 2], [1.0, 5]];
const tourAt = (t) => TOUR[Math.floor(t / 3.4) % TOUR.length];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; const target = tourAt(clock); tempT = target[0]; keepT = target[1]; }
  if (calm) { temp = tempT; keep = keepT; } else {
    temp += (tempT - temp) * (1 - Math.exp(-dt / 0.3));
    keep += (keepT - keep) * (1 - Math.exp(-dt / 0.3));
  }
  if (Math.abs(tempT - temp) < 0.02) temp = tempT;
  if (Math.abs(keepT - keep) < 0.02) keep = keepT;
  draw();
  const settled = !touring && temp === tempT && keep === keepT;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (t, m) => {
  touring = false;
  tempT = clamp(t, D.T_MIN, D.T_MAX);
  keepT = clamp(m, D.K_MIN, D.K_MAX);
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000);
  run();
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const fx = clamp((event.clientX - box.left) / box.width, 0, 1);
  const fy = clamp((event.clientY - box.top) / box.height, 0, 1);
  steer(D.T_MIN + fx * (D.T_MAX - D.T_MIN), D.K_MAX - fy * (D.K_MAX - D.K_MIN));
});
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.4 : 0.1;
  if (event.key === "ArrowRight") steer(tempT + step, keepT);
  else if (event.key === "ArrowLeft") steer(tempT - step, keepT);
  else if (event.key === "ArrowUp") steer(tempT, keepT + 1);
  else if (event.key === "ArrowDown") steer(tempT, keepT - 1);
  else if (event.key === "Home") steer(D.T_MIN, D.K_MAX);
  else if (event.key === "End") steer(D.T_MAX, D.K_MIN);
  else return;
  event.preventDefault();
});
draw();
`;

/* ── 页面 ─────────────────────────────────────────────────────────── */
const PAGE_CSS = `
body{font-family:ui-sans-serif,system-ui,-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif}
.iso-page{width:min(760px,100% - 32px)}
.iso-header h1{font-size:30px;line-height:1.35;margin:0 0 10px;color:var(--anatomy-strong);font-weight:600;letter-spacing:.2px}
.iso-header .lede{font-size:16px;line-height:1.85;margin:0 0 10px;color:var(--anatomy-text)}
.iso-header .meta{font-size:12.5px;color:var(--anatomy-muted);margin:0 0 30px}
.iso-article h2{font-size:19px;margin:44px 0 12px;color:var(--anatomy-strong);font-weight:600}
.iso-article h2 .num{color:var(--anatomy-muted);font-weight:400;margin-right:8px;font-variant-numeric:tabular-nums}
.iso-article p{margin:0 0 14px;line-height:1.9;font-size:15px}
.iso-article strong{color:var(--anatomy-strong);font-weight:600}
.iso-article ul{margin:0 0 16px;padding-left:20px}
.iso-article li{margin:0 0 8px;line-height:1.85;font-size:15px}
.iso-article code{font-family:var(--anatomy-mono);font-size:13px;color:var(--anatomy-strong)}
.iso-article table{width:100%;border-collapse:collapse;margin:6px 0 18px;font-size:14px}
.iso-article th,.iso-article td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--anatomy-faint)}
.iso-article th{color:var(--anatomy-strong);font-weight:600;border-bottom-color:var(--anatomy-lo)}
.iso-article td.num{font-variant-numeric:tabular-nums;color:var(--anatomy-strong)}
.iso-callout{border:1px solid var(--anatomy-lo);border-radius:10px;padding:16px 18px;margin:6px 0 22px;background:var(--anatomy-card)}
.iso-callout p{margin:0 0 8px;font-size:14.5px}
.iso-callout p:last-child{margin:0}
.iso-callout .tag{font-size:11.5px;letter-spacing:.16em;color:var(--anatomy-muted);display:block;margin:0 0 6px}
.iso-figure{margin:6px 0 40px}
.iso-foot{font-size:12.5px;color:var(--anatomy-muted);line-height:1.85;border-top:1px solid var(--anatomy-faint);margin-top:44px;padding-top:16px}
.iso-foot a{color:inherit}
.iso-glow{fill:var(--anatomy-lit);fill-opacity:.05;stroke:none}
@media (max-width:560px){
  .iso-header h1{font-size:23px}
  .iso-article h2{font-size:17px;margin-top:34px}
  .iso-article p,.iso-article li{font-size:14.2px}
  .iso-article table{font-size:12.6px}
  .iso-article th,.iso-article td{padding:7px 6px}
}
`;

const head = `
<style>${PAGE_CSS}</style>
<header class="iso-header">
  <h1>大模型是怎么猜下一个字的</h1>
  <p class="lede">它不「懂」你在问什么，它只是把上下文里的每个词都读一遍，然后给词表里每一个可能的下一词打分、算概率、抽一个。整台机器只有一个动作，重复了上万亿次。</p>
  <p class="meta">图 2 是一台可交互的示教机：鼠标移动 = 同时调温度与 top-k 截断，也可以用方向键（左右调温度，上下调候选数，Shift 加快）。柱子、格板与读数跑在同一份模型上。</p>
</header>
<article class="iso-article">
  <p>把一段话切成「词块」（token），让模型回答一个问题：<strong>下一个词块最可能是什么</strong>。它吐出的不是一个词，而是整个词表上的一个概率分布；抽中哪个，句子就往下长一个字，然后把这个字接回去，再猜下一个。这就是自回归，也是所有大模型唯一的输出方式。</p>
  <ul>
    <li><b>输入是词块，不是「意思」</b>：中文一个词块约 1–2 个字，英文约 0.75 个单词。模型看到的是一串编号。</li>
    <li><b>输出是概率，不是答案</b>：一次前向计算给出词表中每个词块的分数（logits），softmax 之后变成概率。</li>
    <li><b>「思考」发生在中间</b>：几十层处理塔里，每一层都让每个词块去读它上下文里的其他词块，再各自算一遍。</li>
  </ul>
`;

const rest = `
  <h2><span class="num">01</span>一次只做一件事：猜下一个词块</h2>
  <p>你按下回车时，模型做的事是：把prompt里的词块逐个送进处理塔，取<strong>最后一个位置</strong>的输出，投影到词表大小的一排分数上（比如 15 万分），softmax 成概率，抽一个，接回句子末尾。然后重复——每多一个字，就多跑一次前向计算。</p>
  <p>这也解释了几个日常现象。<b>它没有「修改」的能力</b>：写下的字已经写下了，只能影响后面的概率。<b>它没法倒回去重算</b>：一个词块切错了，整段的条件就变了。<b>同一个问题两次不一样的答案</b>，不是因为它在犹豫，而是因为最后那一步是<b>抽样</b>，不是查表（见第 03 节）。</p>

  <h2><span class="num">02</span>注意力：上下文里每个词都在投票</h2>
  <p>处理塔里每一层的核心是「注意力」。一层里，每个词块都会提出三个向量：<b>Query</b>（我在找什么）、<b>Key</b>（我是什么，用来被别人找）、<b>Value</b>（如果被找到，我贡献什么内容）。每个 Query 和上下文里所有 Key 两两点积，得到一组权重，再用权重把各自的 Value 加权求和——这就是「读到」。</p>
  <p>图 2 左边那排探针就是这件事的示意：五根探针站在被读到的词块上，<b>站得越高，权重越大</b>；最右边那根（当前的提问）通常最高，因为它要决定下一个词。多个「头」并行做这件事，各自关注不同的关系：有的头盯紧邻的词，有的头专门连到句首或主语，有的头负责配对括号。这也是一张模型图里真正的「结构」——</p>
  <ul>
    <li><b>长距离依赖是免费的</b>：第 1 个词和第 5000 个词之间的距离是一步，不像循环网络那样要一步步传。</li>
    <li><b>代价是平方级</b>：上下文长度翻倍，注意力要算的配对就翻四倍。这就是「上下文窗口」贵的原因。</li>
    <li><b>窗口外的东西它真的看不到</b>：超出上下文的内容不是「记性差」，而是根本不在这一次计算里。</li>
  </ul>

  <h2><span class="num">03</span>温度与截断：同一个模型，为什么既会写诗也会复读</h2>
  <p>模型给的是概率分布，<b>怎么从分布里挑一个</b>是另一件事，可以事后调：</p>
  <p><b>温度 T</b> 把分数先除以 T 再 softmax。T 小于 1 → 分布变尖，最像的那个词更容易被选中，文字稳、准、也更容易重复；T 大于 1 → 分布变平，冷门词的机会变大，文字更发散、更有想法、也更容易跑偏。图 2 里把温度从 0.6 拧到 1.9，柱子会当场从「一根独高」摊成「一片丘陵」：最高那个词从 <b>59% 掉到 25%</b>，读数里的「有效候选」从 <b>2.4 涨到 6.7</b>——那就是这个模型此刻真正在纠结的词有几个。</p>
  <p><b>top-k / top-p（核采样）</b> 则是先砍掉长尾：只保留概率最高的 k 个（或累积到 p 为止的若干个），重新归一化再抽样。图 2 里把 top-k 拧小，被砍掉的柱子只剩一个桩子、落进旁边的废料盘，抽签的范围就窄了——<b>顶部截断保证不出低级错误，底部截断保证不无聊</b>，两者是反方向的旋钮。</p>
  <div class="iso-callout">
    <span class="tag">一句话</span>
    <p>模型决定<b>可能性</b>，采样参数决定<b>从可能性里挑哪一个</b>。所以「同一个模型」可以有完全不同的性格。</p>
  </div>

  <h2><span class="num">04</span>它为什么一本正经地胡说</h2>
  <p>因为它的训练目标从头到尾只有一个：<b>让真实文本里下一个词块的概率更高</b>。它没有「真假」这个变量，只有「这个位置更常出现什么词」。于是：</p>
  <ul>
    <li><b>流畅与正确是两件事</b>：一个看起来像参考文献的格式，比一个诚实的「我不确定」更常出现在训练语料里——所以它更容易编出前者。</li>
    <li><b>它会替你把空格填满</b>：被追问时，它倾向于给出一个「像答案的答案」，因为「承认不知道」在语料里是少数。</li>
    <li><b>它不知道自己不知道</b>：模型内部没有一份「我记得的内容清单」，概率高不等于有依据。</li>
  </ul>
  <p>能改善的不是「让它更聪明」，而是<b>给它可核对的上下文</b>：把资料放进提示里（检索增强），要求给出来源，或者让它先写推理步骤再给结论。这些做法有一个共同的机制：<strong>把「靠记忆猜」换成「照着眼前的词读」</strong>——正好就是第 02 节那件事。</p>

  <h2><span class="num">05</span>为什么「大」有用：参数、数据、算力</h2>
  <p>这类模型的能力来自三个可以一起放大的量：<b>参数量</b>（多少可调的数）、<b>训练数据量</b>（读过多少词块）、<b>算力</b>（能把这些数据乘几遍）。经验规律是：在给定算力下，参数和数据要按比例一起涨，损失才最省——这就是 <b>scaling law</b>，也是这几年模型越做越大的直接原因。</p>
  <table>
    <thead><tr><th>旋钮</th><th>拧大之后</th><th>代价</th><th>典型用法</th></tr></thead>
    <tbody>
      <tr><td>温度 0.2–0.6</td><td class="num">几乎总选最像的词</td><td>重复、刻板</td><td>抽取、分类、写代码</td></tr>
      <tr><td>温度 0.7–1.0</td><td class="num">稳中带变</td><td>偶有小错</td><td>问答、总结、翻译</td></tr>
      <tr><td>温度 1.2–2.0</td><td class="num">明显发散</td><td>容易跑题、幻觉</td><td>起名、头脑风暴、写诗</td></tr>
      <tr><td>top-k 小 / top-p 低</td><td class="num">只在头部里挑</td><td>安全但无聊</td><td>事实性输出</td></tr>
      <tr><td>top-k 大 / top-p 高</td><td class="num">长尾也进候选</td><td>冷门与低级错误</td><td>创意写作</td></tr>
    </tbody>
  </table>
  <p>一个提醒：能力并不是「越大就越全面」的线性故事。有些任务在小模型上几乎为零、过了某个规模忽然能做，有些则是平滑变好。<b>唯一稳的说法是：规模提高的是「在很多任务上做对的概率」，不是「每一项都会」。</b></p>

  <h2><span class="num">06</span>把它当概率机器来用</h2>
  <p>拿图 2 的数据举个例：同一个模型、同一串上下文，<b>温度 0.3 + top-k 9</b> 时有 85% 的把握说「走」；<b>温度 1.9 + top-k 2</b> 时只剩 58%，而且只要那个固定的随机数落到 0.58 之后，出来的就是「吧」。参数不改模型，只改它「敢不敢选第二名以后」。</p>
  <p>把上面几节合起来，就得到一份很实用的心理模型：</p>
  <ul>
    <li><b>给它条件，别指望它检索</b>：把要用的材料放进提示，它的表现立刻不一样——因为那几步变成了「读」而不是「回忆」。</li>
    <li><b>按任务挑采样参数</b>：要准就低温 + 小 top-k；要花就高温 + 大 top-p。图 2 的两枚旋钮就是这个清单的可视版。</li>
    <li><b>把输出当草稿</b>：它是概率最高的续写，不是经过核验的结论。数字、引用、法条、API 名称，都值得再查一遍。</li>
    <li><b>分开「能力不足」和「信息不足」</b>：前者换更大的模型、把任务拆小；后者补上下文、补例子（few-shot）。这两件事的解法完全不同。</li>
  </ul>
  <p>至于「它是不是在思考」这类问题，图 2 给的答案很朴素：这台机器里没有意图，只有一层层加权求和、一次次抽样。<strong>它能写出让你觉得有思路的句子，是因为人类写下的文本里，那些句子本来就接在类似的前面。</strong></p>
</article>
<footer class="iso-foot">
  <p>图 2 用 <a href="https://github.com/wheresryan22/anatomy">Anatomy</a> 技能搭成：等距立体的 SVG，无依赖，几何、图形与读数都来自同一份模型。柱子的高度是 12 个候选词的 softmax 概率，温度与 top-k 会当场重算；探针的高度是示意用的注意力权重，不是某个具体模型的真实数值。</p>
  <p>文中对注意力、温度、top-k、scaling law 的描述是概念层面的简化：真实的模型还有位置编码、残差与归一化、多轮训练与对齐（RLHF/DPO）等环节，词块切分与概率数值也随模型而异。这里的目标是给出一个能自己动手验证的心智模型，不是复现任何一篇论文。</p>
`;

const figure = k.plateHtml({
  fig: "图 2",
  title: "下一个词试验台",
  hint: "鼠标移动或方向键：左右调温度，上下调 top-k 候选数",
  readout: `抽到「${WORDS[sampledIndex(T0, K0)]}」 p=${Math.round(probAt(T0, K0).kept[sampledIndex(T0, K0)] * 100)}% · 温度 ${T0.toFixed(1)} · top-k ${K0} · 有效候选 ${(1 / probAt(T0, K0).kept.reduce((s, v) => s + v * v, 0)).toFixed(1)}`,
  keys: [
    { mark: "lit", label: "被抽中的那个词：同一个随机数，温度越高越可能落到后面" },
    { mark: "raised", label: "探针：注意力权重，站在被读到的词块上" },
    { mark: "edge", label: "格板：每道横线 10%，点着的那道标出最高柱子的位置" },
  ],
  caption: "左：词块轨道。九块词块排成一串，最右边那块是当前的提问（点着的那个），五根探针站在被读到的词块上，越高的读得越重。中：三层处理塔，词块从下往上送，塔前地板上印着 6×6 的注意力矩阵示意图。中右：九根柱子是下一个词的概率分布，随温度与 top-k 当场重算，被抽中的那根点着，背后的格板每道横线 10%；被砍掉的候选落在右下角的废料盘里。",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="下一个词试验台：左右方向键调温度，上下方向键调 top-k 候选数" aria-valuemin="${T_MIN}" aria-valuemax="${T_MAX}"><span data-gaze aria-hidden="true" style="display:none"></span>${svg}</div>`,
});

// 运行时要用的圆件（车削件）也一起内联：kitScript() 只带 iso-kit
const latheSource = readFileSync(join(HERE, "..", "..", "anatomy", "kit", "lathe.mjs"), "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, solidOf, circleOf, arcOf, stepsFor, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf, radialOf };})();\n`;

const html = k.pageHtml({
  title: "大模型是怎么猜下一个字的",
  theme: THEME,
  body: `${head}${figure}${rest}`,
  script: kitScript() + latheScript + live,
  width: 760,
}).replace('<html lang="en">', '<html lang="zh-CN">');

const file = THEME === "light" ? "llm-next-token-light.html" : "llm-next-token.html";
writeFileSync(join(HERE, file), html);
A.auditOrExit(R, P, {});
console.log("wrote", file, `${(html.length / 1024).toFixed(0)} KB`);
