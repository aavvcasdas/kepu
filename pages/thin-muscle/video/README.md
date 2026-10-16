# 薄肌测试台 · 网页动效转视频

用 [`luoluoluo22/jianying-editor-skill`](https://github.com/luoluoluo22/jianying-editor-skill)
的「网页动效转视频 / Web-to-Video」路径（`rules/web-vfx.md`）把
[`thin-muscle-record.html`](../thin-muscle-record.html) 这段 1920×1080 网页动效录成视频素材，
再按同一条链路生成剪映草稿。

## 成片

| 文件 | 说明 |
| --- | --- |
| `thin-muscle-demo.mp4` | **最终成片**，1920×1080 / H.264 High / yuv420p / 30 fps / 26.00 s / 静音（页面自带字幕行） |
| `thin-muscle-demo.webm` | skill 录制器（`scripts/web_recorder.py`）的原始产出，VP9 / 1920×1080 / 25 fps |
| `thin-muscle-record.html` | 录制版页面（`node build.mjs --record` 生成），固定浅色 + 演播布局，按 25.5 s 时间轴自播 |
| `captions.srt` | 5 条字幕，剪映字幕轨的素材（页面自播与 SRT 共用同一份时间轴） |
| `jianying-draft.zip` | skill 生成的剪映专业版草稿：视频轨 `WebVfxTrack`（1 段 × 25.5 s）+ 字幕轨 `Subtitles`（5 段），画布 1920×1080 |

在 GitHub 上看成片：直接打开
[`thin-muscle-demo.mp4`](https://github.com/aavvcasdas/kepu/blob/arena/d6bc678d-kepu/pages/thin-muscle/video/thin-muscle-demo.mp4)
（GitHub 会用它自带的播放器直接播）。

## 为什么是浅色、为什么这样排

第一版把深色主题原样录了进去，结果视频在播放器里缩到 1/3 宽时，等距图只剩黑底上一层
`#3e3e3e` 的线（整帧灰度均值只有 **2/255**），看上去就是「黑屏 + 白字」。所以录制版：

1. **固定用项目自带的浅色主题**（`--record` 强制 `light`），并把墨色再加深两档、
   背景保持 `#f2f2ef`：整帧灰度均值 254/255，缩略图里图形和字都还在；
2. **舞台盒子贴合 SVG 的 `viewBox` 比例**（620×452 ≈ 1.37）。图的 `preserveAspectRatio`
   是 `xMidYMid meet`，盒子比例不对就会左右各留一大块空白、把图挤小——这一版按比例给盒子，
   图实际占满右栏；
3. **字号按「缩到 1/3 仍可读」定**：标题 50px、要点 25px、数据行 32px、字幕 44px，
   大号数据读数（皮褶 / 腰围 / 竖脊肌）录进画面，和正文的读数一样来自同一个模型。

## 链接是怎么搭起来的

页面按 skill 的约定，在动画播完时把 `window.animationFinished` 置为 `true`，
`web_recorder.py` 用 `page.wait_for_function` 等这个信号，再多录 0.5 s 收尾：

```
build.mjs --record   →   thin-muscle-record.html   1920×1080 演播布局
                         左侧知识栏 / 右侧主舞台 / 底部字幕 / 进度条
                         25.5 s 固定时间轴，24.6 s 处发 window.animationFinished
```

时间轴（`REC_KEYS` / `REC_SCENES`，`build.mjs` 里手写）：

| # | 时间 | 画面 | 皮褶旋钮 | 肌肉旋钮 |
| --- | --- | --- | --- | --- |
| 1 | 0–5 s | 皮褶卡尺夹的是两层 | 11.5 → 9.0 mm | 0.55 |
| 2 | 5–11 s | 脂肪薄 1 毫米，腰围少 6.3 毫米 | 9.0 → 18 → 3.2 mm | 0.55 |
| 3 | 11–17 s | 形状是天生的，厚度是练出来的 | 3.2 → 6.5 mm | 0 → 1.0 |
| 4 | 17–21.8 s | 腰围只跟着脂肪走 | 6.5 → 12 → 6.5 mm | 1.0 |
| 5 | 21.8–25.5 s | 腰围是结果，不是原因 | 6.5 → 8.0 mm | 1.0 |

## 复现命令

```bash
# 1) 生成录制版页面 + SRT
node build.mjs --record

# 2) 用 skill 的录制器录成视频素材（适配层只负责把 chromium 指过去）
python tools/record_web_video.py pages/thin-muscle/thin-muscle-record.html \
       pages/thin-muscle/video/thin-muscle-demo.webm 45

# 3) 走 skill 的剪映草稿链路：录制 → 归一化 → 入轨 → 字幕 → 存盘
python tools/make_jianying_draft.py pages/thin-muscle/thin-muscle-record.html \
       pages/thin-muscle/video/captions.srt /tmp/draftout
```

`thin-muscle-demo.mp4` 就是第 3 步里 skill 自己归一化出来的素材
（`utils/media_normalizer.py`：`scale=1920:1080` 补边 + `libx264 -crf 18 -pix_fmt yuv420p`
+ `+faststart`，即剪映导入前的标准档）。

## 沙箱里做的环境适配（skill 本体未改）

| 差异 | 处理 |
| --- | --- |
| 剪映专业版只有 Windows/macOS | 只跑到「生成草稿」，不调用 `auto_exporter`（Windows UI 自动化）与云端 TTS |
| Playwright 自带 Chromium 未下载 | `tools/record_web_video.py` 里包一层 `p.chromium.launch(executable_path=…)` |
| 没有 `ffprobe` | `tools/ffprobe_shim.py` 解析 `ffmpeg -i` 输出，冒充 `ffprobe` 的两种查询 |
| 静态 ffmpeg 不在 PATH | 软链到 `tools/bin/ffmpeg`，供 `media_normalizer` 归一化调用 |

## 把草稿拿去剪映里用

解开 `jianying-draft.zip`，把 `薄肌测试台 · 网页动效演示` 整个目录放进剪映的草稿根目录
（Windows 一般是 `%localappdata%/JianyingPro/User Data/Projects/com.lveditor.draft`，
macOS 一般是 `~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft`），
打开剪映即可看到视频轨 + 字幕轨；素材路径是 Linux 下的绝对路径，需要重新链接一次
（或用同目录的 `thin-muscle-demo.mp4` 替换）。
