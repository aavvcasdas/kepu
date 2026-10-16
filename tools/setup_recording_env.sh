#!/usr/bin/env bash
# 重建「网页动效转视频」的录制环境（沙箱重置后跑这一条即可，幂等）。
#
# 装什么：
#   1. npm: puppeteer-core / @sparticuz/chromium / @ffmpeg-installer/ffmpeg（在 tools/ 下，node_modules 不入库）
#   2. Chromium → /tmp/chromium，配套动态库 → /tmp/csslib，字体 → /tmp/fonts + /tmp/csfonts/fonts.conf
#   3. Python venv → /tmp/pyenv（playwright）
#   4. Playwright 录屏要用的 ffmpeg 桩 → ~/.cache/ms-playwright/ffmpeg-<rev>/ffmpeg-linux
#   5. tools/bin/{ffmpeg,ffprobe} 供 jianying-editor-skill 的 media_normalizer 调用
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$REPO/tools"
CHROMIUM_BIN=/tmp/chromium
LD_DIR=/tmp/csslib
FONT_DIR=/tmp/fonts
FONT_CONF=/tmp/csfonts
VENV=/tmp/pyenv

SKILL_DIR="${JY_SKILL_ROOT:-/home/user/jianying-skill}"

echo "== 0/5 jianying-editor-skill =="
if [ ! -d "$SKILL_DIR/scripts" ]; then
  git clone --depth 1 -q https://github.com/luoluoluo22/jianying-editor-skill "$SKILL_DIR"
fi
echo "skill → $SKILL_DIR ($(git -C "$SKILL_DIR" rev-parse --short HEAD 2>/dev/null || echo '?'))"

echo "== 1/5 npm 依赖 =="
cd "$TOOLS"
if [ ! -x node_modules/@ffmpeg-installer/linux-x64/ffmpeg ]; then
  npm install --no-fund --no-audit --silent puppeteer-core @sparticuz/chromium @ffmpeg-installer/ffmpeg
fi
FFMPEG="$TOOLS/node_modules/@ffmpeg-installer/linux-x64/ffmpeg"
ls -l "$FFMPEG" >/dev/null

echo "== 2/5 Chromium + 动态库 + 字体 =="
if [ ! -x "$CHROMIUM_BIN" ]; then
  node --input-type=module -e "import('@sparticuz/chromium').then(async (m) => { const p = await m.default.executablePath(); console.log('chromium →', p); })"
fi
mkdir -p "$LD_DIR" "$FONT_DIR" "$FONT_CONF"
node -e '
const fs = require("fs"), zlib = require("zlib"), path = require("path");
const base = "node_modules/@sparticuz/chromium/bin";
fs.mkdirSync("/tmp/tars", { recursive: true });
for (const name of ["al2023.tar.br", "fonts.tar.br", "swiftshader.tar.br"]) {
  const src = path.join(base, name);
  if (!fs.existsSync(src)) continue;
  const out = path.join("/tmp/tars", name.replace(/\.br$/, ""));
  if (!fs.existsSync(out)) fs.writeFileSync(out, zlib.brotliDecompressSync(fs.readFileSync(src)));
  console.log("解开", name, "→", out);
}'
[ -f /tmp/tars/al2023.tar ] && tar -xf /tmp/tars/al2023.tar -C "$LD_DIR" --skip-old-files
[ -f /tmp/tars/fonts.tar ] && tar -xf /tmp/tars/fonts.tar -C "$FONT_DIR" --skip-old-files
[ -f /tmp/tars/swiftshader.tar ] && tar -xf /tmp/tars/swiftshader.tar -C "$LD_DIR" --skip-old-files
if [ ! -f "$FONT_DIR/wqy-microhei.ttc" ]; then
  rm -rf /tmp/fonts-wqy
  git clone --depth 1 -q https://github.com/anthonyfok/fonts-wqy-microhei /tmp/fonts-wqy
  cp /tmp/fonts-wqy/wqy-microhei.ttc "$FONT_DIR/"
fi
cat > "$FONT_CONF/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>$FONT_DIR</dir>
  <cachedir>/tmp/fontcache</cachedir>
</fontconfig>
EOF

echo "== 3/5 Python venv + playwright =="
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet playwright
fi
"$VENV/bin/python" -c "import playwright; print('playwright', playwright.__version__ if hasattr(playwright,'__version__') else 'ok')"

echo "== 4/5 Playwright 的 ffmpeg 桩 =="
REV="$("$VENV/bin/python" - <<'PY'
import json, pathlib, re
driver = pathlib.Path("/tmp/pyenv/lib/python3.11/site-packages/playwright/driver/package/browsers.json")
data = json.loads(driver.read_text())
for entry in data["browsers"]:
    if entry["name"] == "ffmpeg":
        print(entry["revision"])
PY
)"
mkdir -p "/home/user/.cache/ms-playwright/ffmpeg-$REV"
cp -f "$FFMPEG" "/home/user/.cache/ms-playwright/ffmpeg-$REV/ffmpeg-linux"
chmod +x "/home/user/.cache/ms-playwright/ffmpeg-$REV/ffmpeg-linux"
echo "ffmpeg 桩 → /home/user/.cache/ms-playwright/ffmpeg-$REV/ffmpeg-linux"

echo "== 5/5 PATH 里的 ffmpeg / ffprobe =="
mkdir -p "$TOOLS/bin"
ln -sf "$FFMPEG" "$TOOLS/bin/ffmpeg"
ln -sf "$TOOLS/ffprobe_shim.py" "$TOOLS/bin/ffprobe"
chmod +x "$TOOLS/ffprobe_shim.py"
PATH="$TOOLS/bin:$PATH" ffmpeg -version | head -1
PATH="$TOOLS/bin:$PATH" ffprobe -version | head -1

echo
echo "环境就绪："
echo "  录制 page:  $VENV/bin/python $TOOLS/record_web_video.py <page.html> <out.webm> [max_s]"
echo "  剪映草稿:   PATH=$TOOLS/bin:\$PATH $VENV/bin/python $TOOLS/make_jianying_draft.py <page.html> <captions.srt> <out_dir> [名称]"
