// 图 1 · 薄肌测试台 —— 一篇科普「薄肌」的图文页
// Anatomy 技能（github.com/wheresryan22/anatomy）搭的示教机：
//   左站：皮褶卡尺。上下两片薄颚夹住一块「皮肤 + 皮下脂肪」的试样：
//         皮肤 1.5 毫米不变，脂肪层随旋钮增减，两片颚的内表面净空 = 皮褶毫米数，
//         表盘跟着转（1 圈 = 8 毫米）。
//   右站：探针深度计。探针从导套里伸下来，压在腰部竖脊肌的脊顶，读厘米。
//   面板两枚旋钮分别改皮褶厚度与肌肉高度；皮褶代进同一个截面模型得到腰围。
// 尺度：1 世界单位 = 1 毫米（模型是实物大小），UNIT = 3.4 单位/厘米。
// node build.mjs [--light] [--audit]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { kitScript } from "../../anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = (process.argv.includes("--light") || process.argv.includes("--record")) ? "light" : "dark";
const RECORD = process.argv.includes("--record");   // 录制版：1920×1080 演播布局 + 自动时间轴

const W = 620;
const H = 452;

/* ── 模型 ─────────────────────────────────────────────────────────── */
const UNIT = 3.4;                 // 世界单位/厘米
const FAT0 = 11.5, MUS0 = 0.55;
const FAT_MIN = 3, FAT_MAX = 18;  // 皮褶：毫米（= 世界单位）
const CORE_W = 56, CORE_D = 40, CORE_R = 9;
const padUnits = (fat) => fat;
const coreUnits = (mus) => 6 + mus * 4.4;
const moundUnits = (mus) => 25 + mus * 40;
const perimeter = (w, d, r) => 2 * (w + d) - 8 * r + 2 * Math.PI * r;
const waistCm = (fat) => perimeter(CORE_W + 2 * fat, CORE_D + 2 * fat, CORE_R + fat * 0.5) / UNIT;
const erectorCm = (mus) => moundUnits(mus) / 10;

/* ── 台面 ─────────────────────────────────────────────────────────── */
const PLATE = { x: -130, y: -68, w: 256, d: 140, r: 10 };
const PLATE_H = 12, FOOT_H = 6;

// 左站：皮褶卡尺（owner caliper）／试样 = 肌肉底座 + 脂肪层（owner fat）
const F_PLINTH = { x: -92, y: -58, w: 66, d: 50, r: 9 };
const F_PLINTH_H = 5;
const F_CORE = { x: -86, y: -52, w: CORE_W, d: CORE_D, r: CORE_R };   // x -86..-30
const PAD_BASE = { x: -90, y: -55, w: 56, d: 40, r: 12 };
const padPlan = () => k.insetPlan(PAD_BASE, -3.2);                    // x -93.2..-30.8
const CAL = [-118, -32];                                              // C 形框的立柱
const CAL_FOOT_H = 7, CAL_COL_R = 4.4, CAL_LOW_TOP = 13, CAL_COL_TOP = 57, COLLAR_Z = 51, COLLAR_H = 6;
const DIAL_Z = 60, DIAL_R = 14, DIAL_H = 9, DIAL_TOP = DIAL_Z + DIAL_H;
const JAW_X0 = -108, JAW_TIP_X = -86, JAW_TOP_TIP_X = -70;              // 下颚尖端顶到核心块左缘；上颚压在试样上面
const JAW_Y = { from: -52, to: -12 };
const CARRIAGE = { x: -126, y: -56, w: 18, d: 44, r: 3.4 };
const coreTop0 = F_PLINTH_H + coreUnits(MUS0);                        // 11.4：脂肪层的底面 = 下颚内表面
const ANVIL_Y = -32;
const BRIDGE = { x: -113.5, y: ANVIL_Y - 6, w: 14.5, d: 12, r: 2 };   // 底桥：立柱侧面 → 下颌支柱
const JAW_POST = [-101.5, ANVIL_Y, 3.4];
const JAW_LOW_Z = coreTop0 - 3.2;                                     // 下颚根部底面；尖端更薄，顶面 = 试样底面
const padTop = (fat) => coreTop0 + padUnits(fat);
const SKIN_T = 1.5;                                                    // 皮肤层：几乎不随减脂变化
const skinTop = (fat) => padTop(fat) + SKIN_T;
const carriageTop = (fat) => skinTop(fat) + 11.6;
const skinfoldMm = (fat) => fat + SKIN_T;                              // 卡尺读到的皮褶（皮肤 + 皮下脂肪）

// 右站：竖脊肌 + 探针深度计（owner mus / gauge）
const M_PLINTH = { x: -24, y: -56, w: 76, d: 56, r: 9 };              // x -24..52
const RIDGE_X0 = -20, RIDGE_X1 = 26;
const LOBE_HW = 9.5;
const LOBE_FAR_Y = -39.5, LOBE_NEAR_Y = -16.5;                        // 两团竖脊肌的脊线
const TRENCH_Y = -28, TRENCH_D = 4;
const POST = [40, -48], POST_R = 5.4, POST_TOP = 88;
const COLLAR2_Z = 88, COLLAR2_H = 7;
const ARM_Z = 82, ARM_TOP = 88;
const NOSE = { x: 4, y: -33, w: 16, d: 16, r: 3 }, NOSE_Z = 70;
const BUSH_Z = 66, BUSH_R = 5;
const PROBE = [12, LOBE_NEAR_Y], PROBE_R = 2.2;
const moundTop0 = F_PLINTH_H + moundUnits(MUS0);
const SCALE_X = POST[0] + POST_R + 0.45, SCALE_TOP = 60, SCALE_BOT = 12;

// 侧光灯（owner lamp）：从右前方沿 -x 擦过沟口
const LAMP = { x: 54, y: -74, w: 44, d: 30, r: 4 }, LAMP_H = 30;
const SHADE_O = [64, -71, 18];
const LAMP_DIR = G.unit3([-0.85, 0.5, -0.17]);
const LAMP_LEN = 15;

// 面板（owner panel）／试样盘（owner stand）
const PANEL = { x: 40, y: 38, w: 90, d: 26, r: 5 }, PANEL_H = 5, KNOB_R = 7.5;
const KNOBS = [[62, 51], [106, 51]];
const TRAY = { x: -124, y: 6, w: 42, d: 32, r: 3 };
const BLOCK_X = -119.5, BLOCK_Y = 14, BLOCK_W = 10, BLOCK_D = 11;
const BLOCKS = [3, 8, 13];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(F_PLINTH, 0, padTop(FAT_MAX) + 1),
    [CAL[0], CAL[1], DIAL_TOP + 2],
    [CAL[0] - DIAL_R, CAL[1], DIAL_TOP],
    [CAL[0] + DIAL_R + 6, CAL[1], DIAL_Z],
    [CAL[0] - 8, JAW_Y.from, padTop(FAT_MAX) + 2], [JAW_TIP_X, JAW_Y.to, padTop(FAT_MAX) + 1],
    [RIDGE_X0, LOBE_FAR_Y, moundTop0 + 1], [RIDGE_X1, LOBE_NEAR_Y, moundTop0 + 1],
    [POST[0] + POST_R, POST[1], POST_TOP + 4],
    ...k.boxCorners(LAMP, 0, LAMP_H),
    [SHADE_O[0] + LAMP_DIR[0] * LAMP_LEN, SHADE_O[1] + 12, SHADE_O[2] + LAMP_DIR[2] * LAMP_LEN],
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
function slab(name, plan, z, height, style = {}, { steps = 8, bevel = 0, bias = 0, owner = "rig", ref, meta = {}, extra = "" } = {}) {
  const shape = record(A.slab(plan, z, height, { name, owner, ...meta }, steps));
  put(name, ref ?? [plan.x + plan.w / 2, plan.y + plan.d / 2, z + height / 2], S(k.slabOf(plan, z, height, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias, owner });
  return shape;
}
function post(name, cx, cy, r, z, height, style = {}, { steps = 28, bevel = 0, bias = 0, owner = "rig", extra = "" } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, height, { name, owner }));
  put(name, [cx, cy, z + height / 2], S(k.cylinder(cx, cy, r, z, height, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias, owner });
  return shape;
}
function turned(name, F, profile, style = {}, { bias = 0, owner = "rig", radius = null, extra = "", inner = "", key, steps } = {}) {
  const shape = record(A.solid(F, profile, { name, owner, radius }));
  const s0 = profile[0][0], s1 = profile[profile.length - 1][0];
  const opts = steps ? { steps } : {};
  put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.solidOf(profile, F, P, opts), { tone: "mid", ...style, inner }) + extra, [shape], { bias, owner, key });
  return shape;
}
function disc(name, F, s0, s1, r, style = {}, { bias = 0, owner = "rig" } = {}) {
  const shape = record(A.disc(F, s0, s1, r, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P), { tone: "mid", ...style }), [shape], { bias, owner });
  return shape;
}
function prismItem(name, F, poly, s0, s1, style = {}, { bias = 0, owner = "rig", ref, extra = "", meta = {} } = {}) {
  const shape = record(A.prism(F, poly, s0, s1, { name, owner, ...meta }));
  const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
  const cy = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
  put(name, ref ?? G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.add3(G.mul3(F.u, cx), G.mul3(F.v, cy))),
    S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style }) + extra, [shape], { bias, owner });
  return shape;
}
// 绕竖轴的螺旋弹簧：按观察方向切成前后两段
// 焊在圆柱体上的「桨形」支臂：起点贴柱面，端头带圆角
function paddlePlan(from, to, width, clear) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const base = Math.atan2(uy, ux);
  const half = Math.asin(Math.min(0.9, width / 2 / clear));
  const nx = -uy * width / 2, ny = ux * width / 2;
  const end = [to[0] - ux * (width / 2) * 0.6, to[1] - uy * (width / 2) * 0.6];
  const r = width / 2 - 0.01;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = base - half + (i / 8) * half * 2;
    pts.push([from[0] + Math.cos(a) * clear, from[1] + Math.sin(a) * clear]);
  }
  pts.push([end[0] + nx, end[1] + ny]);
  for (let i = 0; i <= 8; i++) {
    const a = base - Math.PI / 2 + (i / 8) * Math.PI;
    pts.push([end[0] + Math.cos(a) * r, end[1] + Math.sin(a) * r]);
  }
  pts.push([end[0] - nx, end[1] - ny]);
  return pts;
  // 用 -n 方向沿另一侧回到起点圆弧
}

/* ── 台面 ─────────────────────────────────────────────────────────── */
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
// 灯在地上留下的光斑
const glow = (points) => `<path class="iso-glow" d="${k.pathOf(points.map(([x, y]) => at([x, y, 0])), true)}"/>`;
back.push(glow([[46, -58], [-18, -40], [-32, -12], [30, -30]]));
back.push(glow([[40, -56], [-12, -42], [-22, -18], [26, -32]]));
// 前缘刻度尺 + 铭牌
const STRIP = { x: -124, y: 62, w: 140, d: 6, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const stripTicks = k.topTicks(STRIP.x + 5, STRIP.x + STRIP.w - 5, 4, 5, STRIP.y + 0.9, 0.6, [2.2, 4.2], P, "x");
back.push(Ln(stripTicks.minor, { tone: "lo" }), Ln(stripTicks.major, { tone: "mid" }));
record(A.slab(STRIP, 0, 0.6, { name: "stand.strip", owner: "stand" }, 3));
const LABEL = { x: -122, y: 42, w: 54, d: 16, r: 2.5 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
back.push(Ln([
  k.lineOnTop([LABEL.x + 5, 46], [LABEL.x + 30, 46], 0.8, P),
  k.lineOnTop([LABEL.x + 5, 51], [LABEL.x + 44, 51], 0.8, P),
  k.lineOnTop([LABEL.x + 5, 55], [LABEL.x + 24, 55], 0.8, P),
].join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 3, 44, 0.8]), at([LABEL.x + LABEL.w - 3, 55, 0.8])], { size: 0.45 }));
record(A.slab(LABEL, 0, 0.8, { name: "stand.label", owner: "stand" }, 4));

/* ── 左站：皮褶卡尺 ───────────────────────────────────────────────── */
slab("caliper.plinth", F_PLINTH, 0, F_PLINTH_H, { tone: "mid" }, {
  steps: 6, bevel: 0.8, owner: "caliper",
  extra: Ln(k.planOutline(k.insetPlan(F_PLINTH, 4), F_PLINTH_H, P, 6), { tone: "faint" })
    + Dots(k.corners(F_PLINTH, 8).map(([x, y]) => at([x, y, F_PLINTH_H])), { size: 0.5 }),
});
// 肌肉底座（顶部被脂肪层盖住）
slab("caliper.core", F_CORE, F_PLINTH_H, coreUnits(MUS0), { tone: "hi", crease: "lo" }, {
  steps: 6, bevel: 0.6, owner: "caliper", ref: [-58, -32, F_PLINTH_H + coreUnits(MUS0) / 2],
  extra: Ln(k.planOutline(k.insetPlan(F_CORE, 3), coreTop0, P, 6), { tone: "faint" }),
});
// 脂肪层：唯一高亮件，一道表皮缝靠上（皮肤约 1/5）
const PLAN0 = padPlan();
const padSvgAt = (fat) => S(k.slabOf(PLAN0, coreTop0, padUnits(fat), P, 6, 0.5), { tone: "hi", lit: true, crease: "lo" })
  + Ln(k.sideSeam(PLAN0, coreTop0 + padUnits(fat) * 0.78, P, 6), { tone: "faint" })
  + Ln(k.planOutline(k.insetPlan(PLAN0, 3), padTop(fat), P, 6), { tone: "faint" });
put("fat.pad", [-59, -35, coreTop0 + padUnits(FAT0) / 2], `<g data-part="fat-pad">${padSvgAt(FAT0)}</g>`,
  [record(A.slab(PLAN0, coreTop0, padUnits(FAT0), { name: "fat.pad", owner: "fat" }, 6))], { bias: 1.6, owner: "fat" });
// 皮肤层：覆盖在脂肪层上的一层薄膜，比脂肪略大一圈，像皮肤把试样包起来
const PLAN_SKIN = { x: PLAN0.x - 0.9, y: PLAN0.y - 0.9, w: PLAN0.w + 1.8, d: PLAN0.d + 1.8, r: PLAN0.r + 0.9 };
const skinSvgAt = (fat) => S(k.slabOf(PLAN_SKIN, padTop(fat), SKIN_T, P, 6, 0.5), { tone: "hi", crease: "lo" })
  + Ln(k.sideSeam(PLAN_SKIN, padTop(fat) + SKIN_T * 0.5, P, 6), { tone: "faint" })
  + Ln(k.planOutline(k.insetPlan(PLAN_SKIN, 2.4), skinTop(fat), P, 6), { tone: "faint" });
put("fat.skin", [-59, -35, padTop(FAT0) + SKIN_T / 2], `<g data-part="fat-skin">${skinSvgAt(FAT0)}</g>`,
  [record(A.slab(PLAN_SKIN, padTop(FAT0), SKIN_T, { name: "fat.skin", owner: "fat" }, 6))], { bias: 1.9, owner: "fat" });

// C 形框：底脚、底桥、下颌支柱、立柱（分两段，避开滑座与弹簧）、抱箍、表盘
const FOOT_PLAN = { x: CAL[0] - 9, y: CAL[1] - 9, w: 18, d: 18, r: 3 };
slab("caliper.foot", FOOT_PLAN, 0, CAL_FOOT_H, { tone: "mid" }, {
  steps: 4, bevel: 0.6, owner: "caliper",
  extra: Dots(k.corners(FOOT_PLAN, 5).map(([x, y]) => at([x, y, CAL_FOOT_H])), { size: 0.5 }),
});
slab("caliper.bridge", BRIDGE, CAL_FOOT_H, 2, { tone: "mid" }, { steps: 4, bevel: 0.4, owner: "caliper" });
post("caliper.jawPost", JAW_POST[0], JAW_POST[1], JAW_POST[2], CAL_FOOT_H + 2, JAW_LOW_Z - CAL_FOOT_H - 2, { tone: "mid" }, { steps: 24, bevel: 0.4, owner: "caliper" });
const COLUMN_KEY = k.depthOf([CAL[0], CAL[1], (CAL_FOOT_H + COLLAR_Z) / 2], P);
// 立柱分两段画（滑座与弹簧之间那段随皮褶上下）：下段只画到滑座以下，
// 但两段都按整根立柱记账，支撑链与间隙检查才看得到真实的柱子。
post("caliper.column.low", CAL[0], CAL[1], CAL_COL_R, CAL_FOOT_H, 7, { tone: "mid", crease: "none" }, {
  steps: 30, owner: "caliper", key: COLUMN_KEY - 3,
  extra: Ln([9, 11.4].map((z) => k.sideArc(CAL[0], CAL[1], CAL_COL_R, z, P, 20)).join(""), { tone: "faint" }),
});
record(A.cylinder(CAL[0], CAL[1], CAL_COL_R, CAL_FOOT_H, COLLAR_Z - CAL_FOOT_H, { name: "caliper.column", owner: "caliper" }));
const columnHighSvg = (fat) => S(k.cylinder(CAL[0], CAL[1], CAL_COL_R, carriageTop(fat), COLLAR_Z - carriageTop(fat), P, 30), { tone: "mid", crease: "none" })
  + Ln([46, 49].map((z) => k.sideArc(CAL[0], CAL[1], CAL_COL_R, z, P, 20)).join(""), { tone: "faint" });
put("caliper.column.high", [CAL[0], CAL[1], (carriageTop(FAT0) + COLLAR_Z) / 2], `<g data-part="column-high">${columnHighSvg(FAT0)}</g>`,
  [record(A.cylinder(CAL[0], CAL[1], CAL_COL_R, carriageTop(FAT0), COLLAR_Z - carriageTop(FAT0), { name: "caliper.column.high", owner: "caliper" }))],
  { key: COLUMN_KEY - 0.5, owner: "caliper" });
post("caliper.collar", CAL[0], CAL[1], CAL_COL_R + 3.4, COLLAR_Z, COLLAR_H, { tone: "mid" }, {
  steps: 30, bevel: 0.5, owner: "caliper",
  extra: Ln(k.knurl(CAL[0], CAL[1], CAL_COL_R + 3.4, COLLAR_Z + 1.4, COLLAR_Z + COLLAR_H - 1.4, 26, P), { tone: "lo" }),
});
post("caliper.cap", CAL[0], CAL[1], CAL_COL_R - 0.6, CAL_COL_TOP, 2.6, { tone: "mid" }, { steps: 24, bevel: 0.4, owner: "caliper" });
post("caliper.dialStem", CAL[0], CAL[1], 3.2, CAL_COL_TOP + 2.6, DIAL_Z - CAL_COL_TOP - 2.6, { tone: "mid", crease: "none" }, { steps: 20, owner: "caliper" });
const needleAt = (fat) => {
  const a = (fat / 8) * Math.PI * 2;
  return k.lineOnTop([CAL[0] - Math.sin(a) * 3.4, CAL[1] + Math.cos(a) * 3.4], [CAL[0] + Math.sin(a) * (DIAL_R - 4.4), CAL[1] - Math.cos(a) * (DIAL_R - 4.4)], DIAL_TOP + 0.25, P);
};
const dialTicks = k.radialTicks(CAL[0], CAL[1], DIAL_R - 3, 40, 5, DIAL_TOP, [1.2, 2.7], P);
const dialExtra = Ln(k.knurl(CAL[0], CAL[1], DIAL_R, DIAL_TOP - 3.2, DIAL_TOP, 84, P, 0.3), { tone: "lo" })
  + Ln(k.sideArc(CAL[0], CAL[1], DIAL_R, DIAL_TOP - 3.2, P, 40), { tone: "faint" })
  + Ln(k.ring(CAL[0], CAL[1], DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" })
  + Ln(dialTicks.minor, { tone: "lo" }) + Ln(dialTicks.major, { tone: "mid" })
  + Ln(k.ring(CAL[0], CAL[1], 1.6, DIAL_TOP, P, 16), { tone: "mid" })
  + S(k.slabOf({ x: CAL[0] + DIAL_R - 1, y: CAL[1] - 3.2, w: 4.6, d: 6.4, r: 1.2 }, DIAL_Z + 1.4, 5.8, P, 3), { tone: "mid" })
  + S(k.slabOf({ x: CAL[0] + DIAL_R + 3.2, y: CAL[1] - 2.4, w: 2.4, d: 4.8, r: 1.2 }, DIAL_Z + 1.8, 4.4, P, 3), { tone: "mid" })
  + `<g data-part="needle"><path class="iso-line" data-tone="lit" style="stroke-width:1.1" d="${needleAt(FAT0)}"/></g>`;
post("caliper.dial", CAL[0], CAL[1], DIAL_R, DIAL_Z, DIAL_H, { tone: "hi", crease: "lo" }, { steps: 64, bevel: 0.8, owner: "caliper", extra: dialExtra, ref: [CAL[0], CAL[1], DIAL_TOP] });

// 上下颚：根部厚、尖端薄的两条刀口；两片内表面之间的净空 = 皮褶毫米数
const JAW_BASE_X = -96, JAW_Y0 = JAW_Y.from, JAW_D = JAW_Y.to - JAW_Y.from;
const jawPlan = (from, to, r) => ({ x: from, y: JAW_Y0, w: to - from, d: JAW_D, r });
const jawBasePlan = jawPlan(JAW_X0, JAW_BASE_X, 1.2), jawTipPlan = jawPlan(JAW_BASE_X, JAW_TIP_X, 0.9);
const jawTopTipPlan = jawPlan(JAW_BASE_X, JAW_TOP_TIP_X, 0.9);   // 上颚伸到试样上方 20 毫米
// 尖端上表面的几道夹持槽，让刀口有手感而不是一块平板
const jawGrip = (z, from, to) => Ln([0, 1, 2].map((i) => k.lineOnTop([from + i * 2.4, JAW_Y0 + 3.2], [from + i * 2.4, JAW_Y.to - 3.2], z, P)).join(""), { tone: "lo" });

slab("caliper.jawLow.base", jawBasePlan, coreTop0 - 3.2, 3.2, { tone: "mid" }, {
  steps: 3, bevel: 0.6, owner: "caliper",
  extra: Ln(k.planOutline(k.insetPlan(jawBasePlan, 1.6), coreTop0, P, 3), { tone: "faint" }),
});
slab("caliper.jawLow.tip", jawTipPlan, coreTop0 - 1.5, 1.5, { tone: "mid" }, { steps: 3, bevel: 0.5, owner: "caliper" });

const carriageSvg = (fat) => {
  const inner = skinTop(fat);
  const top = inner + 11.6;
  const out = [];
  out.push(S(k.slabOf(jawBasePlan, inner, 3.2, P, 3, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(jawTopTipPlan, inner, 1.5, P, 3, 0.5), { tone: "mid" }));
  out.push(jawGrip(inner + 1.5, JAW_BASE_X + 6.4, JAW_TOP_TIP_X - 6));
  out.push(Ln(k.planOutline(k.insetPlan(jawBasePlan, 1.6), inner + 3.2, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf(CARRIAGE, inner, 11.6, P, 4, 0.8), { tone: "mid" }));
  out.push(Ln(k.planOutline(k.insetPlan(CARRIAGE, 2.2), top, P, 4), { tone: "faint" }));
  out.push(Dots([[CARRIAGE.x + 3.4, CARRIAGE.y + 3.6], [CARRIAGE.x + 3.4, CARRIAGE.y + CARRIAGE.d - 3.6], [CARRIAGE.x + CARRIAGE.w - 3.4, CARRIAGE.y + 3.6], [CARRIAGE.x + CARRIAGE.w - 3.4, CARRIAGE.y + CARRIAGE.d - 3.6]]
    .map(([x, y]) => at([x, y, top])), { size: 0.42, tone: "mid" }));
  // 锁紧螺钉：一根车出来的螺钉从滑座近侧拧出来
  const LOCK_F = G.frameAlong([CAL[0], CARRIAGE.y + CARRIAGE.d, inner + 6.2], [0, 1, 0]);
  out.push(S(G.solidOf([[0, 2.9], [1.2, 2.9], [1.8, 1.9], [4.2, 1.9], [4.8, 1.6], [5.0, 2.8], [7.4, 2.8]], LOCK_F, P), { tone: "mid" }));
  out.push(Ln(k.knurl(CAL[0], CARRIAGE.y + CARRIAGE.d + 5, 2.8, inner + 6.4, inner + 9, 20, P), { tone: "lo" }));
  return out.join("");
};
const carriageShapes = (fat) => {
  const inner = skinTop(fat);
  const LOCK_F = G.frameAlong([CAL[0], CARRIAGE.y + CARRIAGE.d, inner + 6.2], [0, 1, 0]);
  return [
    record(A.slab(jawBasePlan, inner, 3.2, { name: "caliper.jaw.carriage.base", owner: "caliper" }, 3)),
    record(A.slab(jawTopTipPlan, inner, 1.5, { name: "caliper.jaw.carriage.tip", owner: "caliper" }, 3)),
    record(A.slab(CARRIAGE, inner, 11.6, { name: "caliper.carriage.block", owner: "caliper" }, 4)),
    record(A.solid(LOCK_F, [[0, 2.9], [1.2, 2.9], [1.8, 1.9], [4.2, 1.9], [4.8, 1.6], [5.0, 2.8], [7.4, 2.8]], { name: "caliper.carriage.lock", owner: "caliper" })),
  ];
};
put("caliper.carriage", [CAL[0] + 2, CAL[1], skinTop(FAT0) + 6], `<g data-part="carriage">${carriageSvg(FAT0)}</g>`,
  carriageShapes(FAT0), { key: COLUMN_KEY + 2.5, owner: "caliper" });

/* ── 右站：竖脊肌 + 探针深度计 ─────────────────────────────────────── */
const RIDGE_F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const lobePoly = (mus, cy) => {
  const h = moundUnits(mus), base = F_PLINTH_H, top = base + h, hw = LOBE_HW;
  return [[cy - hw, base], [cy - hw * 0.82, base + h * 0.42], [cy - hw * 0.55, top - h * 0.16], [cy - hw * 0.26, top],
    [cy + hw * 0.26, top], [cy + hw * 0.55, top - h * 0.16], [cy + hw * 0.82, base + h * 0.42], [cy + hw, base]];
};
const ridgeSvg = (mus, cy) => {
  const poly = lobePoly(mus, cy);
  return S(G.prismOf(RIDGE_F, poly, RIDGE_X0, RIDGE_X1, P), { tone: "hi", crease: "lo" })
    + Ln(k.pathOf([...poly.map(([y, z]) => at([RIDGE_X1, y, z])), at([RIDGE_X1, poly[0][0], poly[0][1]])], true), { tone: "mid" });
};
slab("mus.plinth", M_PLINTH, 0, F_PLINTH_H, { tone: "mid" }, {
  steps: 6, bevel: 0.8, owner: "mus",
  extra: Ln(k.planOutline(k.insetPlan(M_PLINTH, 4), F_PLINTH_H, P, 6), { tone: "faint" })
    + Dots(k.corners(M_PLINTH, 8).map(([x, y]) => at([x, y, F_PLINTH_H])), { size: 0.5 }),
});
put("mus.lobe.far", [0, LOBE_FAR_Y, F_PLINTH_H + moundUnits(MUS0) / 2], `<g data-part="lobes">${ridgeSvg(MUS0, LOBE_FAR_Y)}</g>`,
  [record(A.prism(RIDGE_F, lobePoly(MUS0, LOBE_FAR_Y), RIDGE_X0, RIDGE_X1, { name: "mus.lobe.far", owner: "mus" }))], { bias: 0.3, owner: "mus" });
put("mus.lobe.near", [0, LOBE_NEAR_Y, F_PLINTH_H + moundUnits(MUS0) / 2], ridgeSvg(MUS0, LOBE_NEAR_Y),
  [record(A.prism(RIDGE_F, lobePoly(MUS0, LOBE_NEAR_Y), RIDGE_X0, RIDGE_X1, { name: "mus.lobe.near", owner: "mus" }))], { bias: 0.34, owner: "mus" });
const TRENCH = { x: RIDGE_X0, y: TRENCH_Y - TRENCH_D / 2, w: RIDGE_X1 - RIDGE_X0, d: TRENCH_D, r: 0.8 };
slab("mus.trench", TRENCH, F_PLINTH_H, 0.6, { tone: "lo" }, {
  steps: 2, owner: "mus",
  extra: Ln(k.lineOnTop([TRENCH.x + 2, TRENCH_Y], [TRENCH.x + TRENCH.w - 2, TRENCH_Y], F_PLINTH_H + 0.6, P), { tone: "faint" }),
});

// 深度计：底脚、立柱（分两段）、抱箍、桨形悬臂、头块、导套、探针、刻度片
post("gauge.foot", POST[0], POST[1], 8.5, F_PLINTH_H, 7, { tone: "mid" }, {
  steps: 32, bevel: 0.7, owner: "gauge",
  extra: Dots([[-6, -6], [6, -6], [-6, 6], [6, 6]].map(([dx, dy]) => at([POST[0] + dx, POST[1] + dy, F_PLINTH_H + 7])), { size: 0.5 }),
});
post("gauge.column.low", POST[0], POST[1], POST_R, F_PLINTH_H + 7, ARM_Z - F_PLINTH_H - 7, { tone: "mid", crease: "none" }, {
  steps: 30, owner: "gauge",
  extra: Ln([26, 48, 68].map((z) => k.sideArc(POST[0], POST[1], POST_R, z, P, 20)).join(""), { tone: "faint" }),
});
const ARM_END = [NOSE.x + NOSE.w / 2, NOSE.y + NOSE.d - 5];
prismItem("gauge.arm", G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), paddlePlan(POST, ARM_END, 10, POST_R), ARM_Z, ARM_TOP,
  { tone: "mid" }, { owner: "gauge", ref: [(POST[0] + ARM_END[0]) / 2, (POST[1] + ARM_END[1]) / 2, (ARM_Z + ARM_TOP) / 2] });
post("gauge.column.high", POST[0], POST[1], POST_R, ARM_TOP, COLLAR2_Z - ARM_TOP, { tone: "mid", crease: "none" }, { steps: 30, owner: "gauge" });
post("gauge.collar", POST[0], POST[1], POST_R + 3.2, COLLAR2_Z, COLLAR2_H, { tone: "mid" }, {
  steps: 30, bevel: 0.5, owner: "gauge",
  extra: Ln(k.knurl(POST[0], POST[1], POST_R + 3.2, COLLAR2_Z + 1.6, COLLAR2_Z + COLLAR2_H - 1.6, 26, P), { tone: "lo" }),
});
post("gauge.tension", POST[0], POST[1], 3.2, COLLAR2_Z + COLLAR2_H, 5, { tone: "mid", crease: "lo" }, {
  steps: 24, bevel: 0.5, owner: "gauge",
  extra: Ln(k.knurl(POST[0], POST[1], 3.2, COLLAR2_Z + COLLAR2_H + 0.6, COLLAR2_Z + COLLAR2_H + 4.4, 18, P), { tone: "lo" })
    + Ln(k.ring(POST[0], POST[1], 1.4, COLLAR2_Z + COLLAR2_H + 5, P, 16), { tone: "mid" }),
});
slab("gauge.nose", NOSE, NOSE_Z, ARM_Z - NOSE_Z, { tone: "mid" }, {
  steps: 4, bevel: 0.6, owner: "gauge",
  extra: Ln(k.planOutline(k.insetPlan(NOSE, 2.6), ARM_Z - 2.4, P, 4), { tone: "faint" }),
});
// 导套：实心圆盘（探针从它下面伸出来），盘底画一圈「孔」
post("gauge.bushing", PROBE[0], PROBE[1], BUSH_R, BUSH_Z, NOSE_Z - 4 - BUSH_Z, { tone: "mid" }, {
  steps: 30, bevel: 0.4, owner: "gauge",
  extra: Ln(k.ring(PROBE[0], PROBE[1], PROBE_R + 0.7, BUSH_Z, P, 20), { tone: "faint" }),
});
// 锁紧螺钉：一根车出来的螺钉从头块近侧拧出来
const LOCK_F = G.frameAlong([PROBE[0], NOSE.y + NOSE.d, NOSE_Z + 5.4], [0, 1, 0]);
turned("gauge.lock", LOCK_F, [[0, 2.8], [1.2, 2.8], [1.8, 1.8], [4, 1.8], [4.6, 1.5], [4.8, 2.6], [7, 2.6]], { tone: "mid" }, {
  owner: "gauge",
  extra: Ln(k.knurl(PROBE[0], NOSE.y + NOSE.d + 5, 2.6, NOSE_Z + 5.6, NOSE_Z + 8, 18, P), { tone: "lo" }),
});
// 刻度片：贴在立柱 +x 面，刻度从上缘往下挂
slab("gauge.scale", { x: SCALE_X - 0.45, y: POST[1] - 2.6, w: 0.9, d: 5.2, r: 0.2 }, SCALE_BOT, SCALE_TOP - SCALE_BOT, { tone: "lo" }, {
  steps: 2, owner: "gauge",
  extra: Ln(k.sideTicks(POST[1] - 1.8, POST[1] + 1.8, 2.6, 5, SCALE_X, SCALE_TOP, [1.6, 3], P, "y").minor, { tone: "lo" })
    + Ln(k.sideTicks(POST[1] - 1.8, POST[1] + 1.8, 2.6, 5, SCALE_X, SCALE_TOP, [1.6, 3], P, "y").major, { tone: "mid" })
    + Dots([at([SCALE_X, POST[1], SCALE_TOP - 2]), at([SCALE_X, POST[1], SCALE_BOT + 2])], { size: 0.4, tone: "mid" }),
});
// 探针：从导套底面伸到肌肉脊顶（A.slide：随肌肉高度伸缩）
const probeSvgAt = (tipZ) => S(k.cylinder(PROBE[0], PROBE[1], PROBE_R, tipZ + 1.6, BUSH_Z - tipZ - 1.6, P, 20), { tone: "hi", crease: "none" })
  + S(k.cylinder(PROBE[0], PROBE[1], PROBE_R + 1.1, tipZ, 1.6, P, 24, 0.4), { tone: "hi", crease: "lo" });
const BUSH_F = G.frameOf([PROBE[0], PROBE[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
put("gauge.probe", [PROBE[0], PROBE[1], (moundTop0 + BUSH_Z) / 2], `<g data-part="probe">${probeSvgAt(moundTop0)}</g>`,
  [record(A.slide(BUSH_F, BUSH_Z, moundTop0, PROBE_R, { name: "gauge.probe", owner: "gauge" }))], { bias: 0.6, owner: "gauge" });

/* ── 侧光灯 ───────────────────────────────────────────────────────── */
const lampScrews = [[LAMP.x + 7, LAMP.y + 7], [LAMP.x + LAMP.w - 7, LAMP.y + 7], [LAMP.x + 7, LAMP.y + LAMP.d - 7], [LAMP.x + LAMP.w - 7, LAMP.y + LAMP.d - 7]];
slab("lamp.housing", LAMP, 0, LAMP_H, { tone: "mid", inner: Ln(k.sideSeam(LAMP, LAMP_H - 7, P, 4), { tone: "faint" }) }, {
  steps: 4, bevel: 1.1, owner: "lamp",
  extra: Ln(lampScrews.map(([x, y]) => k.ring(x, y, 2, LAMP_H, P, 16)).join(""), { tone: "lo" })
    + Dots(lampScrews.map(([x, y]) => at([x, y, LAMP_H])), { size: 0.5, tone: "mid" })
    + Ln(k.planOutline({ x: LAMP.x + 18, y: LAMP.y + 12, w: 16, d: 10, r: 2 }, LAMP_H, P, 4), { tone: "faint" }),
});
const SHADE_F = G.frameAlong(SHADE_O, LAMP_DIR);
const LAMP_KEY = k.depthOf([LAMP.x + LAMP.w / 2, LAMP.y + LAMP.d / 2, LAMP_H / 2], P) + 1;
disc("lamp.boss", SHADE_F, -2.4, 0.6, 5.6, { tone: "mid" }, { owner: "lamp" });
turned("lamp.shade", SHADE_F, [[0.6, 3.6], [3.4, 3.6, 1], [6.4, 6.2, 1], [9.6, 9.6, 1], [LAMP_LEN - 1.6, 12.4, 1]], { tone: "mid", crease: "lo" }, { owner: "lamp", key: LAMP_KEY });
turned("lamp.flange", SHADE_F, [[LAMP_LEN - 1.6, 12.4], [LAMP_LEN - 0.5, 12.4], [LAMP_LEN - 0.5, 13.6], [LAMP_LEN - 1.6, 13.6]], { tone: "mid" }, { owner: "lamp", key: LAMP_KEY + 0.1 });
turned("lamp.lens", SHADE_F, [[LAMP_LEN - 0.4, 12.9], [LAMP_LEN + 0.5, 12.9]], { tone: "hi", crease: "lo" }, { owner: "lamp", key: LAMP_KEY + 0.2 });

/* ── 试样盘：三块厚度基准（3 / 8 / 13 毫米） ─────────────────────── */
slab("tray", TRAY, 0, 2.4, { tone: "lo" }, {
  steps: 5, bevel: 0.5, owner: "stand", meta: { ground: true },
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

/* ── 组装 ─────────────────────────────────────────────────────────── */
A.settle(R, P);
items.sort((a, b) => a.key - b.key);

if (process.env.ROOMS) {
  const rows = items.map((item) => {
    const b = item.shapes?.[0] ? A.boundsOf(item.shapes[0]) : null;
    const c = b ? b.min.map((v, i) => (v + b.max[i]) / 2) : [0, 0, 0];
    const [sx, sy] = k.iso(c, P);
    return `${item.name.padEnd(30)} key ${item.key.toFixed(1).padStart(7)}  screen ${sx.toFixed(0).padStart(4)},${sy.toFixed(0).padStart(4)}`;
  });
  console.log(rows.join("\n"));
}
const layer = items.map((item) => `<g class="rig-item" data-name="${item.name}">${item.svg}</g>`);
const svg = k.figureSvg({
  width: W,
  height: H,
  label: "薄肌测试台：左站是皮褶卡尺，两片薄颚夹住一块皮肤与皮下脂肪的试样，皮肤固定 1.5 毫米，脂肪层随旋钮增减，表盘以毫米读数；右站是探针深度计，探针从导套里伸出来压在腰部竖脊肌的脊顶，以厘米读数；台面右下角是按脂肪层厚度推算出的腰围。",
  body: [...back, ...layer],
});

/* ── 录制尾脚本模板（build 期注入时间轴） ──────────────────────── */
const recTail = `
/* ── 录制模式：拆解动画 ────────────────────────────────────────────
   1. 零件组沿世界坐标 +z 抬起（translateAlong 把三维位移换算成屏幕位移）；
   2. 抬起时按抬起量升序重排 DOM，抬得高的画在上面，避免互相穿插；
   3. 每个零件跟一个标注（位置每帧按 getBBox + getScreenCTM 换算），数字取自同一个模型；
   4. 时间轴播完在 signal 时刻置 window.animationFinished，交给 web_recorder 收尾。 */
const REC_CLOCK = { duration: __DURATION__, signal: __SIGNAL__, keys: __KEYS__, lifts: __LIFTS__, scenes: __SCENES__, parts: __PARTS__ };
const recEase = (u) => u * u * (3 - 2 * u);
function recValue(series, t) {
  if (t <= series[0][0]) return series[0][1];
  for (let index = 1; index < series.length; index++) {
    const [t0, v0] = series[index - 1];
    const [t1, v1] = series[index];
    if (t <= t1) {
      const span = t1 - t0 || 1;
      return v0 + (v1 - v0) * recEase(Math.max(0, Math.min(1, (t - t0) / span)));
    }
  }
  return series[series.length - 1][1];
}
const recTitle = document.querySelector("[data-rec-title]");
const recPoints = document.querySelector("[data-rec-points]");
const recCaption = document.querySelector("[data-rec-caption]");
const recProgress = document.querySelector("[data-rec-progress]");
const recStage = document.querySelector(".rec-stage");
const recSvg = recStage.querySelector("svg");

/* 标注文案：全部来自页面里那份模型（和正文读数同源） */
const REC_TAG_TEXT = {
  caliper: () => "卡尺 · 卡口净空 " + skinfoldMm(fat).toFixed(1) + " mm",
  probe: () => "探针 · 竖脊肌 " + (moundUnits(mus) / 10).toFixed(1) + " cm",
  skin: () => "皮肤 ≈ 1.5 mm（不变）",
  pad: () => "皮下脂肪 " + Math.max(0, skinfoldMm(fat) - 1.5).toFixed(1) + " mm",
  lobes: () => "竖脊肌脊顶 " + (moundUnits(mus) / 10).toFixed(1) + " cm",
};
const recParts = REC_CLOCK.parts.map((part) => Object.assign({}, part, { lift: 0, el: recSvg.querySelector(part.sel) }));
const recLayer = recParts[0].el.parentElement;
const recOrder0 = [...recLayer.children];
/* 标注的栏位：左侧栏放卡尺/皮肤/脂肪，右侧栏放探针/肌肉 */
const REC_SLOTS = { caliper: ["left", 0], skin: ["left", 1], pad: ["left", 2], probe: ["right", 0], lobes: ["right", 2] };
const recTags = {}, recLeaders = {};
const recLeaderLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
recLeaderLayer.setAttribute("class", "rec-leaders");
recSvg.appendChild(recLeaderLayer);
for (const part of recParts) {
  if (!part.label) continue;
  const slot = REC_SLOTS[part.key] || ["left", 0];
  const tag = document.createElement("div");
  tag.className = "rec-tag";
  tag.dataset.side = slot[0];
  tag.dataset.lane = String(slot[1]);
  tag.innerHTML = '<span class="rec-tag-text"></span>';
  recStage.appendChild(tag);
  recTags[part.key] = tag;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "3");
  dot.setAttribute("opacity", "0");
  path.setAttribute("opacity", "0");
  recLeaderLayer.append(path, dot);
  recLeaders[part.key] = { path, dot };
}
/* 屏幕像素 ↔ SVG 用户坐标（viewBox 的原点被抬到 -168，必须走 CTM 换算） */
const recToScreen = (el, x, y) => { const pt = recSvg.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(el.getScreenCTM()); };
const recToSvg = (x, y) => { const pt = recSvg.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(recSvg.getScreenCTM().inverse()); };
const recPt = recSvg.createSVGPoint();
let recBox = null, recOrderKey = "assembled";
function recOrderNow() {
  const lifted = recParts.some((part) => part.lift > 0.02);
  const key = lifted ? recParts.slice().sort((a, b) => a.lift - b.lift).map((part) => part.key).join(",") : "assembled";
  if (key === recOrderKey) return;
  recOrderKey = key;
  const order = lifted
    ? [...recOrder0.filter((node) => !recParts.some((part) => part.el === node)),
       ...recParts.slice().sort((a, b) => a.lift - b.lift).map((part) => part.el)]
    : recOrder0;
  recLayer.append(...order);
}
function recUpdateTag(part) {
  const tag = recTags[part.key];
  if (!tag) return;
  const value = REC_TAG_TEXT[part.key] ? REC_TAG_TEXT[part.key]() : part.label;
  const text = tag.firstElementChild;
  if (text.textContent !== value) text.textContent = value;
  const show = Math.max(0, Math.min(1, (part.lift / part.amp) * 1.8 - 0.25));
  tag.style.opacity = show.toFixed(2);
  const leader = recLeaders[part.key];
  if (!leader) return;
  const box = part.el.getBBox();
  const tip = recToScreen(part.el, box.x + box.width / 2, box.y);
  const rect = tag.getBoundingClientRect();
  const isRight = tag.dataset.side === "right";
  const anchor = recToSvg(isRight ? rect.right : rect.left, rect.top + rect.height / 2);
  const target = recToSvg(tip.x, tip.y);
  // 竖向段走到标注栏外侧，避免穿过同侧其它标注框
  const elbow = anchor.x + (isRight ? 34 : -34);
  const line = "M" + anchor.x.toFixed(1) + " " + anchor.y.toFixed(1)
    + " L" + elbow.toFixed(1) + " " + anchor.y.toFixed(1)
    + " L" + elbow.toFixed(1) + " " + target.y.toFixed(1)
    + " L" + target.x.toFixed(1) + " " + target.y.toFixed(1);
  leader.path.setAttribute("d", line);
  leader.path.setAttribute("opacity", show.toFixed(2));
  leader.dot.setAttribute("cx", target.x.toFixed(1));
  leader.dot.setAttribute("cy", target.y.toFixed(1));
  leader.dot.setAttribute("opacity", show.toFixed(2));
}
let recScene = null, recStart = 0, recSignalled = false;
function recFrame(now) {
  if (!recStart) { recStart = now; recBox = recStage.getBoundingClientRect(); }
  const t = (now - recStart) / 1000;
  fat = fatT = recValue(REC_CLOCK.keys.fat, t);
  mus = musT = recValue(REC_CLOCK.keys.mus, t);
  draw();
  for (const part of recParts) {
    part.lift = recValue(REC_CLOCK.lifts[part.key], t) * part.amp;
    part.el.setAttribute("transform", translateAlong(P, [0, 0, part.lift]));   // 页面里 kit 是裸名
    recUpdateTag(part);
  }
  recOrderNow();
  const scene = REC_CLOCK.scenes.find((item) => t >= item.from && t < item.to) || REC_CLOCK.scenes[REC_CLOCK.scenes.length - 1];
  if (scene !== recScene) {
    recScene = scene;
    recTitle.textContent = scene.title;
    recPoints.innerHTML = scene.points.map((point) => "<li>" + point + "</li>").join("");
    recCaption.textContent = scene.caption;
  }
  if (recProgress) recProgress.style.width = Math.min(100, (t / REC_CLOCK.duration) * 100).toFixed(2) + "%";
  if (!recSignalled && t >= REC_CLOCK.signal) { recSignalled = true; window.animationFinished = true; }
  if (t >= REC_CLOCK.duration) { if (recProgress) recProgress.style.width = "100%"; return; }
  requestAnimationFrame(recFrame);
}
requestAnimationFrame(recFrame);
`;

/* ── 页面里的模型（与 build 同一份公式） ─────────────────────────── */
const DATA = {
  P, UNIT, FAT0, MUS0, FAT_MIN, FAT_MAX, F_PLINTH_H, PLAN0, PLAN_SKIN, SKIN_T,
  JAW_X0, JAW_TIP_X, JAW_TOP_TIP_X, JAW_Y, CARRIAGE, CAL, CAL_COL_R, CAL_LOW_TOP, COLLAR_Z, DIAL_R, DIAL_TOP, DIAL_Z,
  RIDGE_F, RIDGE_X0, RIDGE_X1, LOBE_HW, LOBE_FAR_Y, LOBE_NEAR_Y, TRENCH,
  PROBE, PROBE_R, NOSE, NOSE_Z, BUSH_Z, BUSH_R, PANEL_H, KNOB_R, KNOBS,
};
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const padUnits = (fat) => fat;
const coreUnits = (mus) => 6 + mus * 4.4;
const moundUnits = (mus) => 25 + mus * 40;
const coreTop0 = D.F_PLINTH_H + coreUnits(D.MUS0);
const padTop = (fat) => coreTop0 + padUnits(fat);
const SKIN_T = 1.5;                                                    // 皮肤层：几乎不随减脂变化
const skinTop = (fat) => padTop(fat) + SKIN_T;
const carriageTop = (fat) => skinTop(fat) + 11.6;
const skinfoldMm = (fat) => fat + SKIN_T;                              // 卡尺读到的皮褶（皮肤 + 皮下脂肪）
const waistCm = (fat) => {
  const r = 9 + fat * 0.5;
  return (2 * (56 + 2 * fat + 40 + 2 * fat) - 8 * r + 2 * Math.PI * r) / D.UNIT;
};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const gaze = document.querySelector("[data-gaze]");
const padHost = svg.querySelector('[data-part="fat-pad"]');
const skinHost = svg.querySelector('[data-part="fat-skin"]');
const carriageHost = svg.querySelector('[data-part="carriage"]');
const columnHigh = svg.querySelector('[data-part="column-high"]');
const needle = svg.querySelector('[data-part="needle"] path');
const lobesHost = svg.querySelector('[data-part="lobes"]');
const probeHost = svg.querySelector('[data-part="probe"]');
const knobs = D.KNOBS.map((_, index) => svg.querySelector('[data-part="knob-' + index + '"]'));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const REC = ${RECORD};   // 录制版：不巡演、不接管指针，交给时间轴

function lobePoly(mus, cy) {
  const h = moundUnits(mus), base = D.F_PLINTH_H, top = base + h, hw = D.LOBE_HW;
  return [[cy - hw, base], [cy - hw * 0.82, base + h * 0.42], [cy - hw * 0.55, top - h * 0.16], [cy - hw * 0.26, top],
    [cy + hw * 0.26, top], [cy + hw * 0.55, top - h * 0.16], [cy + hw * 0.82, base + h * 0.42], [cy + hw, base]];
}
function ridgeSvg(mus, cy) {
  const poly = lobePoly(mus, cy);
  return solidSvg(G.prismOf(D.RIDGE_F, poly, D.RIDGE_X0, D.RIDGE_X1, P), { tone: "hi", crease: "lo" })
    + lineSvg(pathOf([...poly.map(([y, z]) => iso([D.RIDGE_X1, y, z], P)), iso([D.RIDGE_X1, poly[0][0], poly[0][1]], P)], true), { tone: "mid" });
}
const JAW_BASE_X = -96;
const jawPlan = (from, to, r) => ({ x: from, y: D.JAW_Y.from, w: to - from, d: D.JAW_Y.to - D.JAW_Y.from, r });
const jawBasePlan = jawPlan(D.JAW_X0, JAW_BASE_X, 1.2), jawTipPlan = jawPlan(JAW_BASE_X, D.JAW_TIP_X, 0.9);
const jawTopTipPlan = jawPlan(JAW_BASE_X, D.JAW_TOP_TIP_X, 0.9);
function jawGrip(z, from, to) {
  const out = [];
  for (let i = 0; i < 3; i++) out.push(lineOnTop([from + i * 2.4, D.JAW_Y.from + 3.2], [from + i * 2.4, D.JAW_Y.to - 3.2], z, P));
  return lineSvg(out.join(""), { tone: "lo" });
}
function carriageSvg(fat) {
  const inner = skinTop(fat);
  const top = inner + 11.6;
  const lockF = G.frameAlong([D.CAL[0], D.CARRIAGE.y + D.CARRIAGE.d, inner + 6.2], [0, 1, 0]);
  const out = [];
  out.push(solidSvg(slabOf(jawBasePlan, inner, 3.2, P, 3, 0.6), { tone: "mid" }));
  out.push(solidSvg(slabOf(jawTopTipPlan, inner, 1.5, P, 3, 0.5), { tone: "mid" }));
  out.push(jawGrip(inner + 1.5, JAW_BASE_X + 6.4, D.JAW_TOP_TIP_X - 6));
  out.push(lineSvg(planOutline(insetPlan(jawBasePlan, 1.6), inner + 3.2, P, 3), { tone: "faint" }));
  out.push(solidSvg(slabOf(D.CARRIAGE, inner, 11.6, P, 4, 0.8), { tone: "mid" }));
  out.push(lineSvg(planOutline(insetPlan(D.CARRIAGE, 2.2), top, P, 4), { tone: "faint" }));
  out.push(dotsSvg([[D.CARRIAGE.x + 3.4, D.CARRIAGE.y + 3.6], [D.CARRIAGE.x + 3.4, D.CARRIAGE.y + D.CARRIAGE.d - 3.6], [D.CARRIAGE.x + D.CARRIAGE.w - 3.4, D.CARRIAGE.y + 3.6], [D.CARRIAGE.x + D.CARRIAGE.w - 3.4, D.CARRIAGE.y + D.CARRIAGE.d - 3.6]]
    .map(([x, y]) => iso([x, y, top], P)), { size: 0.42, tone: "mid" }));
  out.push(solidSvg(G.solidOf([[0, 2.9], [1.2, 2.9], [1.8, 1.9], [4.2, 1.9], [4.8, 1.6], [5.0, 2.8], [7.4, 2.8]], lockF, P), { tone: "mid" }));
  out.push(lineSvg(knurl(D.CAL[0], D.CARRIAGE.y + D.CARRIAGE.d + 5, 2.8, inner + 6.4, inner + 9, 20, P), { tone: "lo" }));
  return out.join("");
}
function knobPointer([cx, cy], share) {
  const angle = -0.75 + share * 1.5;
  return lineSvg(lineOnTop([cx - 2.4, cy + 2.4], [cx - 2.4 + (D.KNOB_R - 1.6) * Math.cos(angle * Math.PI), cy + 2.4 - (D.KNOB_R - 1.6) * Math.sin(angle * Math.PI)], D.PANEL_H + 9, P), { tone: "lit", free: true });
}
function draw() {
  const lip = padUnits(fat);
  padHost.innerHTML = solidSvg(slabOf(D.PLAN0, coreTop0, lip, P, 6, 0.5), { tone: "hi", lit: true, crease: "lo" })
    + lineSvg(sideSeam(D.PLAN0, coreTop0 + lip * 0.78, P, 6), { tone: "faint" })
    + lineSvg(planOutline(insetPlan(D.PLAN0, 3), padTop(fat), P, 6), { tone: "faint" });
  skinHost.innerHTML = solidSvg(slabOf(D.PLAN_SKIN, padTop(fat), D.SKIN_T, P, 6, 0.5), { tone: "hi", crease: "lo" })
    + lineSvg(sideSeam(D.PLAN_SKIN, padTop(fat) + D.SKIN_T * 0.5, P, 6), { tone: "faint" })
    + lineSvg(planOutline(insetPlan(D.PLAN_SKIN, 2.4), skinTop(fat), P, 6), { tone: "faint" });
  carriageHost.innerHTML = carriageSvg(fat);
  const z0 = carriageTop(fat);
  columnHigh.innerHTML = solidSvg(cylinder(D.CAL[0], D.CAL[1], D.CAL_COL_R, z0, D.COLLAR_Z - z0, P, 30), { tone: "mid", crease: "none" })
    + lineSvg([46, 49].map((z) => sideArc(D.CAL[0], D.CAL[1], D.CAL_COL_R, z, P, 20)).join(""), { tone: "faint" });
  const a = (fat / 8) * Math.PI * 2;
  needle.setAttribute("d", lineOnTop([D.CAL[0] - Math.sin(a) * 3.4, D.CAL[1] + Math.cos(a) * 3.4], [D.CAL[0] + Math.sin(a) * (D.DIAL_R - 4.4), D.CAL[1] - Math.cos(a) * (D.DIAL_R - 4.4)], D.DIAL_TOP + 0.25, P));
  lobesHost.innerHTML = ridgeSvg(mus, D.LOBE_FAR_Y) + ridgeSvg(mus, D.LOBE_NEAR_Y);
  const h = moundUnits(mus);
  const tip = D.F_PLINTH_H + h;
  probeHost.innerHTML = solidSvg(cylinder(D.PROBE[0], D.PROBE[1], D.PROBE_R, tip + 1.6, D.BUSH_Z - tip - 1.6, P, 20), { tone: "hi", crease: "none" })
    + solidSvg(cylinder(D.PROBE[0], D.PROBE[1], D.PROBE_R + 1.1, tip, 1.6, P, 24, 0.4), { tone: "hi", crease: "lo" });
  knobs[0].innerHTML = knobPointer(D.KNOBS[0], (fat - D.FAT_MIN) / (D.FAT_MAX - D.FAT_MIN));
  knobs[1].innerHTML = knobPointer(D.KNOBS[1], mus);
  const text = "腰围 " + waistCm(fat).toFixed(1) + " cm · 皮褶 " + skinfoldMm(fat).toFixed(1) + " mm · 竖脊肌 " + (h / 10).toFixed(1) + " cm";
  if (readout && readout.textContent !== text) readout.textContent = text;
  if (gaze) gaze.textContent = "皮褶 " + skinfoldMm(fat).toFixed(1) + " 毫米：脂肪层薄下去的每一毫米，腰围就少 6.3 毫米";
  stage.setAttribute("aria-valuetext", text);
}
let fat = D.FAT0, mus = D.MUS0, fatT = D.FAT0, musT = D.MUS0;
let clock = 0, last = 0, frame = 0, visible = false, touring = true, idle = 0;
const TOUR = [[6.5, 0.85], [16.5, 0.85], [16.5, 0.25], [6.5, 0.25], [11.5, 0.55]];
const tourAt = (t) => TOUR[Math.floor(t / 3.4) % TOUR.length];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; const target = tourAt(clock); fatT = target[0]; musT = target[1]; }
  if (calm) { fat = fatT; mus = musT; } else {
    fat += (fatT - fat) * (1 - Math.exp(-dt / 0.3));
    mus += (musT - mus) * (1 - Math.exp(-dt / 0.3));
  }
  if (Math.abs(fatT - fat) < 0.02) fat = fatT;
  if (Math.abs(musT - mus) < 0.002) mus = musT;
  draw();
  const settled = !touring && fat === fatT && mus === musT;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (f, m) => {
  touring = false;
  fatT = clamp(f, D.FAT_MIN, D.FAT_MAX);
  musT = clamp(m, 0, 1);
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches && !REC; clock = 0; run(); }, 4000);
  run();
};
if (!REC) new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches || REC) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const fx = clamp((event.clientX - box.left) / box.width, 0, 1);
  const fy = clamp((event.clientY - box.top) / box.height, 0, 1);
  steer(D.FAT_MIN + fx * (D.FAT_MAX - D.FAT_MIN), 1 - fy);
});
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 3 : 0.8;
  if (event.key === "ArrowRight") steer(fatT + step, musT);
  else if (event.key === "ArrowLeft") steer(fatT - step, musT);
  else if (event.key === "ArrowUp") steer(fatT, musT + 0.08);
  else if (event.key === "ArrowDown") steer(fatT, musT - 0.08);
  else if (event.key === "Home") steer(D.FAT_MIN, 0);
  else if (event.key === "End") steer(D.FAT_MAX, 1);
  else return;
  event.preventDefault();
});
draw();
`;


/* ── 录制时间轴：页面自播与 SRT 共用同一份数据 ─────────────────────── */
const REC_DURATION = 27.4, REC_SIGNAL = 26.1;
const REC_KEYS = {
  // 起点：皮褶 16.5 毫米（体脂偏高）；第 3 步把脂肪层取到 3.2 毫米；第 4 步把肌肉练厚
  fat: [[0, 16.5], [11.8, 16.5], [16.6, 3.2], [REC_DURATION, 3.2]],
  mus: [[0, 0.30], [16.8, 0.30], [20.6, 0.95], [REC_DURATION, 0.95]],
};
/* 拆解：零件沿 +z（世界坐标的竖直方向）抬起，amp 是抬起的最大高度（世界单位）。
   sel 指向 build 时打好的 data-part 组，抬起靠 iso-kit 的 translateAlong 换算成屏幕位移。 */
const REC_PARTS = [
  { key: "caliper", sel: '[data-part="carriage"]', amp: 26, label: "卡尺" },
  { key: "column", sel: '[data-part="column-high"]', amp: 26 },
  { key: "needle", sel: '[data-part="needle"]', amp: 26 },
  { key: "probe", sel: '[data-part="probe"]', amp: 17, label: "探针" },
  { key: "skin", sel: '[data-part="fat-skin"]', amp: 50, label: "皮肤层" },
  { key: "pad", sel: '[data-part="fat-pad"]', amp: 31, label: "皮下脂肪" },
  { key: "lobes", sel: '[data-part="lobes"]', amp: 13, label: "竖脊肌" },
];
const REC_LIFTS = {
  caliper: [[0, 0], [3.8, 0], [7.2, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
  column: [[0, 0], [3.8, 0], [7.2, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
  needle: [[0, 0], [3.8, 0], [7.2, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
  probe: [[0, 0], [3.8, 0], [7.4, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
  skin: [[0, 0], [7.4, 0], [11.6, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
  pad: [[0, 0], [11.8, 0], [16.4, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
  lobes: [[0, 0], [16.8, 0], [20.4, 1], [21.0, 1], [24.6, 0], [REC_DURATION, 0]],
};
const REC_SCENES = [
  {
    from: 0, to: 3.8, title: "先看整机，再一层层拆开",
    points: ["皮肤：约 <b>1.5 毫米</b>，几乎不变", "皮下脂肪：随减脂变薄", "竖脊肌：随训练变厚"],
    caption: "这台测试台就是一层层量出来的：皮肤、皮下脂肪、竖脊肌。先看整机，再拆开。",
  },
  {
    from: 3.8, to: 7.4, title: "第 1 步：抬起卡尺",
    points: ["卡口净空 = 皮褶毫米数", "夹住的是皮肤 + 皮下脂肪", "拆下它才能看见里面"],
    caption: "第一步拆卡尺：它夹住的是两层——几乎不变的皮肤，和会变薄的皮下脂肪。",
  },
  {
    from: 7.4, to: 11.8, title: "第 2 步：掀开皮肤层",
    points: ["皮肤约 <b>1.5 毫米</b>", "几乎不随减脂变化", "所以量到的其实是它下面的脂肪"],
    caption: "皮肤只有约 1.5 毫米，而且几乎不随减脂变化——皮褶卡尺量到的主要是脂肪。",
  },
  {
    from: 11.8, to: 16.8, title: "第 3 步：取下脂肪层",
    points: ["皮褶 <b>16.5 → 3.2 毫米</b>", "每薄 1 毫米，腰围少约 <b>6.3 毫米</b>", "先动的是腰围，不是秤"],
    caption: "脂肪层从 16.5 毫米一路取到 3.2 毫米：每薄 1 毫米，腰围就少约 6.3 毫米。",
  },
  {
    from: 16.8, to: 21.0, title: "第 4 步：让肌肉长起来",
    points: ["分块与起止点由骨架决定", "厚度能练：<b>2.5 → 6.5 厘米</b>", "脂肪薄下去，线条才露出来"],
    caption: "肌肉的分块改不了，厚度能改：竖脊肌脊顶从 2.5 厘米练到 6.5 厘米。",
  },
  {
    from: 21.0, to: 24.6, title: "第 5 步：装回去",
    points: ["皮肤、脂肪、卡尺、探针依次落位", "脂肪薄了，肌肉厚了", "腰围读数跟着降下来"],
    caption: "装回去：皮肤、脂肪、卡尺依次落位，脂肪薄了、肌肉厚了。",
  },
  {
    from: 24.6, to: REC_DURATION, title: "腰围是结果，不是原因",
    points: ["脂肪：毫米级，按月动（靠吃）", "肌肉：厘米级，按年动（靠练）", "两边都做，再按结果微调"],
    caption: "腰围是结果，皮褶与肌肉厚度才是原因。原因可以分开调，结果只能一起等。",
  },
];
const srtTime = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const mm = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss},${String(ms % 1000).padStart(3, "0")}`;
};
const srtText = REC_SCENES.map((scene, index) => `${index + 1}\n${srtTime(scene.from)} --> ${srtTime(scene.to)}\n${scene.caption.replace(/<[^>]+>/g, "")}\n`).join("\n");

const DEFAULT_METRIC = `腰围 ${waistCm(FAT0).toFixed(1)} cm · 皮褶 ${skinfoldMm(FAT0).toFixed(1)} mm · 竖脊肌 ${erectorCm(MUS0).toFixed(1)} cm`;
const recShell = (stage) => `
<main class="iso-page rec">
  <section class="rec-left">
    <p class="rec-kicker">ANATOMY · 图 1 · <b>薄肌测试台</b></p>
    <h2 class="rec-title" data-rec-title>${REC_SCENES[0].title}</h2>
    <ul class="rec-points" data-rec-points>${REC_SCENES[0].points.map((point) => `<li>${point}</li>`).join("")}</ul>
    <div class="rec-metric" data-readout>${DEFAULT_METRIC}</div>
  </section>
  <section class="rec-stage">
    <figure class="iso-figure"><div class="iso-plate">
      <div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">图 1</span><span class="iso-plate-corner" data-corner="title">薄肌测试台</span></div>
      ${stage}
    </div></figure>
  </section>
  <div class="rec-caption"><span data-rec-caption>${REC_SCENES[0].caption}</span></div>
  <div class="rec-progress"><i data-rec-progress></i></div>
</main>`;

const RECORD_CSS = RECORD ? `
/* ── 录制版：1920×1080 演播布局 ────────────────────────────────────────
   为什么这样排：
   1. 深色主题缩到手机宽度时等距图只剩线条（灰度 2/255），所以录制版固定用项目自带的浅色主题，
      并把墨色再加深两档、字号按「缩到 1/3 仍可读」来定；
   2. 图的 SVG 比例是 620×452 ≈ 1.37，舞台盒子必须贴合这个比例，
      否则 xMidYMid 居中会在左右各留一大块空白（上一版就是这么糊掉的）；
   3. 左栏放标题 + 大号数据读数 + 要点，右栏放图，底部整条字幕。 */
body>.iso-page{margin:0;width:1920px;max-width:none;height:1080px;overflow:hidden;position:relative;
  display:grid;grid-template-columns:760px 1fr;grid-template-rows:1fr auto;background:var(--anatomy-page);
  --anatomy-text:#3f3f43;--anatomy-strong:#111113;--anatomy-hi:#1b1b1e;
  --anatomy-mid:#5b5b60;--anatomy-lo:#8c8c91;--anatomy-faint:#c6c6c9;
  --anatomy-shade-0:#eaeae7;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#dfdfdc;--anatomy-shade-3:#d9d9d6;
  --anatomy-paper:#f8f8f5;--anatomy-face:#f2f2ef;--anatomy-top:#ffffff;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#f5f5f2}
body>.iso-page>.iso-page.rec{display:contents}
.rec-left{position:relative;padding:84px 44px 76px 76px;border-right:1.5px solid var(--anatomy-faint)}
.rec-kicker{font-family:var(--anatomy-mono);font-size:19px;letter-spacing:.28em;color:var(--anatomy-muted);margin:0 0 18px}
.rec-kicker b{color:var(--anatomy-text);font-weight:400}
.rec-title{font-size:50px;line-height:1.24;color:var(--anatomy-strong);margin:0 0 30px;font-weight:600;letter-spacing:.5px}
.rec-points{margin:0;padding:0;list-style:none;display:grid;gap:18px}
.rec-points li{position:relative;padding-left:26px;font-size:25px;line-height:1.62;color:var(--anatomy-text)}
.rec-points li::before{content:"";position:absolute;left:0;top:19px;width:14px;height:2px;background:var(--anatomy-mid)}
.rec-points b{color:var(--anatomy-strong);font-weight:600}
.rec-metric{position:absolute;left:76px;right:44px;bottom:52px;padding-top:22px;border-top:1.5px solid var(--anatomy-faint);
  font-family:var(--anatomy-mono);font-size:27px;line-height:1.4;color:var(--anatomy-strong);white-space:nowrap;
  font-variant-numeric:tabular-nums;letter-spacing:.2px}
.rec-stage{position:relative;display:flex;align-items:center;justify-content:center;padding:34px 54px 26px 44px}
.rec-stage .iso-figure{margin:0;width:100%}
.rec-stage .iso-plate{padding:26px 28px;box-shadow:0 0 0 1.5px var(--anatomy-mid)}
.rec-stage .iso-plate-corner{font-size:17px}
/* 盒子比例 = viewBox 比例，避免居中留白把图缩没 */
/* 盒子比例 = viewBox 比例（拆解版是正方形 620×620：上方留 168 单位给零件飞出去） */
.rec-stage .iso-svg,.rec-stage svg{width:100%;max-width:820px;height:auto;aspect-ratio:1 / 1;margin:0 auto}
/* 跟随零件的标注：位置由脚本每帧按包围盒换算，抬起时才淡入 */
/* 标注固定在左右两栏（工程图的引线标注），位置不随零件移动，避免互相压住 */
.rec-tag{position:absolute;transform:translateY(-50%);opacity:0;pointer-events:none;transition:opacity .2s linear}
.rec-tag[data-side="left"]{left:14%}
.rec-tag[data-side="right"]{right:14%}
.rec-tag[data-lane="0"]{top:16%}
.rec-tag[data-lane="1"]{top:31%}
.rec-tag[data-lane="2"]{top:46%}
.rec-tag-text{display:inline-block;white-space:nowrap;padding:8px 16px;border:1.5px solid var(--anatomy-strong);border-radius:3px;
  background:var(--anatomy-page);color:var(--anatomy-strong);font-family:var(--anatomy-mono);font-size:22px;letter-spacing:.3px}
.rec-leaders path{fill:none;stroke:var(--anatomy-mid);stroke-width:1.6}
.rec-leaders circle{fill:var(--anatomy-strong)}
.rec-caption{grid-column:1 / -1;padding:20px 110px 52px;text-align:center;border-top:1.5px solid var(--anatomy-faint)}
.rec-caption span{display:inline-block;font-size:44px;line-height:1.44;color:var(--anatomy-strong);max-width:1620px;font-weight:500}
.rec-progress{position:absolute;left:0;right:0;bottom:0;height:6px;background:var(--anatomy-faint)}
.rec-progress i{display:block;height:100%;width:0;background:var(--anatomy-strong);opacity:.45}
` : "";

/* 正文样式（build 时插进页面里的第二个 <style>，只有正文页用到） */
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
  <h1>薄肌：为什么有人「看着瘦」，力量却一点不小</h1>
  <p class="lede">同样是 78 厘米的腰，可以是几块腹肌上蒙着一层薄皮，也可以是一圈结实的脂肪。腰围量不出这个区别，成分可以——下面这台机器把「薄」拆成两个能直接量的厚度。</p>
  <p class="meta">图 1 是一台可交互的示教机：鼠标移动 = 同时调皮褶厚度与肌肉高度，也可以用方向键（左右调皮褶，上下调肌肉，Shift 加快）。台面上的读数与图形跑在同一份模型上。</p>
</header>
<article class="iso-article">
  <p>「薄肌」是健身圈的说法，指<strong>体脂偏低、肌肉量正常或偏上</strong>的身材：穿上衣服看着细，脱下衣服有线条，力量也不低。它不玄学，拆开看只有两个变量——</p>
  <ul>
    <li><b>皮下脂肪的厚度</b>：腰腹这一层，普通人 3–18 毫米。皮褶卡尺量的是「皮肤 + 皮下脂肪」，大约是纯脂肪厚度再厚一点点。</li>
    <li><b>肌肉的厚度</b>：同一位置的肌肉横截面既决定力量上限，也决定低体脂下线条有多「满」。</li>
  </ul>
`;

const rest = `
  <h2><span class="num">01</span>「薄」是脂肪的厚度，不是肌肉的缺席</h2>
  <p>脂肪并不是均匀地贴在身上。腰腹的皮下脂肪，体脂率 15% 上下的男性大约只有 <b>5–9 毫米</b>厚，到 25% 会变成 <b>14–20 毫米</b>。听起来差别不大，但腰围是按周长算的：</p>
  <p>一个椭圆截面，四周各厚 1 毫米，周长就多约 <b>2π ≈ 6.3 毫米</b>。腰围的量级是厘米，于是两侧各厚 6 毫米的脂肪，就对应 <b>约 3.8 厘米</b>的腰围——所以减脂前期，腰围往往比体重先被看见，因为脂肪「变薄」比「变轻」在视觉上更划算。</p>
  <p>反过来，肌肉增加时腰围几乎不动：肌肉密度只比脂肪高一点点，同重量下体积差不多，但它<strong>长在该长的地方</strong>，不会像脂肪那样把腰线糊掉。图 1 里把「皮褶」旋钮拧满，脂肪层只是厚了几毫米；把「肌肉」旋钮拧满，那两团竖脊肌高了整整一倍，腰围却一点没动。</p>

  <h2><span class="num">02</span>为什么有人「不练也有线条」</h2>
  <p>肌肉的形状很早就定了：腹直肌被腱划分成几块、三角肌分几束、每条肌肉的起点与终点——这些由骨架决定，练不出来也改不掉。能改的是<strong>厚度</strong>：抗阻训练几个月到几年，肌肉横截面能增加 10%–30%（新手和恢复训练的人更快）。</p>
  <p>线条看起来「清楚」，一半靠厚度，一半靠<b>沟</b>。两块肌肉之间有一道浅沟，只有当外面那层脂肪足够薄时，光擦过沟口才形成阴影。图上右站那盏灯就是这个意思：<strong>同样的肌肉，光从侧面擦过来，沟才显形</strong>——低体脂的健身照看起来「干」，不是肌肉变多了，是沟终于露出来了。</p>

  <h2><span class="num">03</span>台面上的两个读数</h2>
  <p>图 1 的左站是一把<b>皮褶卡尺</b>：上下两片带齿的薄颚夹住一块皮肤与皮下脂肪的试样，压缩弹簧把上颚压下去，表盘直接读毫米，指针每 8 毫米转一圈。右站是一支<b>探针深度计</b>：探针从导套里伸出来，压在腰部竖脊肌的脊顶，读厘米——成年男性腰部竖脊肌的厚度大致在 <b>2.5–6.5 厘米</b>。</p>
  <p>两个数都不大，但它们决定同一件事：<b>腰围</b>。把皮褶厚度代进截面模型，腰围就从这一层的厚度推算出来——这也是体成分测量的基本逻辑：直接测的是几毫米，结论却按周长算出来。</p>
  <div class="iso-callout">
    <span class="tag">一句话</span>
    <p>腰围是<b>结果</b>，皮褶和肌肉厚度是<b>原因</b>。原因可以分开调，结果只能一起等。</p>
  </div>

  <h2><span class="num">04</span>四种身材，同一台仪器</h2>
  <table>
    <thead><tr><th>身材</th><th>皮褶</th><th>竖脊肌</th><th>腰带上的样子</th></tr></thead>
    <tbody>
      <tr><td>薄而不壮</td><td class="num">5–9 mm</td><td class="num">2.5–3.5 cm</td><td>细，但没有线条，肩背偏平</td></tr>
      <tr><td>薄肌（训练者）</td><td class="num">5–11 mm</td><td class="num">4.5–6.5 cm</td><td>细而有形，沟在，围度不大</td></tr>
      <tr><td>壮但看不出</td><td class="num">14–20 mm</td><td class="num">4.5–6.5 cm</td><td>厚实、力量大，线条被盖住</td></tr>
      <tr><td>体脂高、肌肉少</td><td class="num">14–20 mm</td><td class="num">2.5–3.5 cm</td><td>同一个腰围，但软、松、没形</td></tr>
    </tbody>
  </table>
  <p>最后两行的腰围可以一模一样，差别全在<b>那十毫米脂肪底下有没有东西</b>。这就是「薄肌」和「泡芙」的区别：不是秤上的数字，是秤底下那两层。</p>

  <h2><span class="num">05</span>哪些能练，哪些练不到</h2>
  <ul>
    <li><b>能改（按月计）</b>：脂肪层的厚度。每周 0.3%–0.7% 体重的减脂速度是可持续区间，再快就会带走肌肉和水分。</li>
    <li><b>能改（按年计）</b>：肌肉的厚度。每周每个部位 10–20 组抗阻训练、蛋白质 1.6–2.2 克/公斤体重，是现在证据最稳的两条。</li>
    <li><b>改不动</b>：肌肉的起点终点与分块、骨架宽度、脂肪「先胖哪、先瘦哪」的部位顺序。腰腹先胖的人，减到最后也是腰腹最后见效。</li>
    <li><b>容易误判</b>：体重的短期波动（水、糖原、肠内容物，一天里可以有 1–2 公斤）。腰围、皮褶、围度、力量记录、照片凑到一起，才是一份体成分证据。</li>
  </ul>

  <h2><span class="num">06</span>所以，「薄肌」是怎么来的</h2>
  <p>它是一对反方向努力叠出来的：一边用热量缺口把皮下脂肪压薄（毫米级），一边用抗阻训练把肌肉厚度顶上去（厘米级）。只做前一半，是「薄而不壮」；只做后一半，是「壮但看不出」。两件事的时间尺度不同——脂肪按月动，肌肉按年动——所以最快的路是<b>两边都做，再按结果微调</b>：腰围不涨、力量在涨，就是对的。</p>
  <p>至于「一周瘦十斤」「局部减脂」这类说法，可以用图 1 的两枚旋钮自己验证：把皮褶旋钮拧回原处，竖脊肌的高度一点没动；把肌肉旋钮拧到底，腰围也几乎照旧。这台机器只承认两个厚度：一个靠吃，一个靠练。</p>
</article>
<footer class="iso-foot">
  <p>图 1 用 <a href="https://github.com/wheresryan22/anatomy">Anatomy</a> 技能搭成：等距立体的 SVG，无依赖，几何、图标与读数都来自同一份模型，拧旋钮会同时改画与数字。模型是实物尺度：1 个世界单位 = 1 毫米。</p>
  <p>文中的厚度与腰围是常见范围与近似关系（皮褶 ≈ 皮肤 + 皮下脂肪；腰围按椭圆截面近似），用于说明机制，不构成个人测量或诊断建议。真要追踪自己的变化，请固定位置、固定时间、固定手法连续记录。</p>
</footer>
`;

/* 录制版把 viewBox 抬成正方形并留出上方 168 单位的空间：零件要沿 +z 从原位里「飞」出去，
   不留净空就会被 SVG 边缘裁掉（SVG 默认 overflow:hidden）。 */
const REC_HEADROOM = 168;
const stageSvg = RECORD ? svg.replace(`viewBox="0 0 ${W} ${H}"`, `viewBox="0 -${REC_HEADROOM} ${W} ${H + REC_HEADROOM}"`) : svg;
const stageHtml = `<div class="iso-stage" tabindex="0" role="slider" aria-label="薄肌测试台：左右方向键改皮褶厚度，上下方向键改肌肉高度" aria-valuemin="${FAT_MIN}" aria-valuemax="${FAT_MAX}"><span data-gaze aria-hidden="true" style="display:none"></span>${stageSvg}</div>`;
const figure = RECORD ? recShell(stageHtml) : k.plateHtml({
  fig: "图 1",
  title: "薄肌测试台",
  hint: "鼠标移动或方向键：左右调皮褶，上下调肌肉",
  readout: `腰围 ${waistCm(FAT0).toFixed(1)} cm · 皮褶 ${skinfoldMm(FAT0).toFixed(1)} mm · 竖脊肌 ${erectorCm(MUS0).toFixed(1)} cm`,
  keys: [
    { mark: "lit", label: "脂肪层：台面上唯一会随体重起落的那一层（皮肤盖在它上面，几乎不变）" },
    { mark: "raised", label: "肌肉：决定「薄但有力」的厚度" },
    { mark: "edge", label: "线沟：两块肌肉之间的浅沟，靠侧光显形" },
  ],
  caption: "左站：皮褶卡尺的两片薄颚夹住皮肤与皮下脂肪的试样，内表面之间的净空就是皮褶毫米数（皮肤 1.5 毫米 + 脂肪层）；右站：探针从导套伸出来压在腰部竖脊肌的脊顶，读厘米。脂肪层厚度代进截面模型，得到卡片右下角的腰围读数。",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="薄肌测试台：左右方向键改皮褶厚度，上下方向键改肌肉高度" aria-valuemin="${FAT_MIN}" aria-valuemax="${FAT_MAX}"><span data-gaze aria-hidden="true" style="display:none"></span>${svg}</div>`,
});

// 运行时要用的圆件（车削件）也一起内联：kitScript() 只带 iso-kit
const latheSource = readFileSync(join(HERE, "..", "..", "anatomy", "kit", "lathe.mjs"), "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, solidOf, circleOf, arcOf, stepsFor, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf, radialOf };})();\n`;

const REC_TAIL = RECORD
  ? recTail.replace("__DURATION__", String(REC_DURATION)).replace("__SIGNAL__", String(REC_SIGNAL))
      .replace("__KEYS__", JSON.stringify(REC_KEYS)).replace("__SCENES__", JSON.stringify(REC_SCENES))
      .replace("__LIFTS__", JSON.stringify(REC_LIFTS)).replace("__PARTS__", JSON.stringify(REC_PARTS))
  : "";
const html = k.pageHtml({
  title: RECORD ? "薄肌测试台 · 演示视频" : "薄肌：为什么有人看着瘦，力量却一点不小",
  theme: THEME,
  body: RECORD ? figure : `${head}${figure}${rest}`,
  script: kitScript() + latheScript + live + REC_TAIL,
  width: RECORD ? 1920 : 760,
}).replace('<html lang="en">', '<html lang="zh-CN">')
  .replace("<style>", RECORD ? `<style>${RECORD_CSS}</style><style>` : "<style>");

if (RECORD) {
  mkdirSync(join(HERE, "video"), { recursive: true });
  writeFileSync(join(HERE, "video", "captions.srt"), srtText);
  console.log("wrote video/captions.srt", REC_SCENES.length, "条字幕");
}
const file = RECORD
  ? "thin-muscle-record.html"                      // 录制版只有一个文件：固定浅色 + 演播布局
  : (THEME === "light" ? "thin-muscle-light.html" : "thin-muscle.html");
writeFileSync(join(HERE, file), html);
A.auditOrExit(R, P, {});
console.log("wrote", file, `${(html.length / 1024).toFixed(0)} KB`);
