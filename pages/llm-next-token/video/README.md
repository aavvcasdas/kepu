# 下一个词试验台 · 网页动效转视频

用 [`luoluoluo22/jianying-editor-skill`](https://github.com/luoluoluo22/jianying-editor-skill)
的「网页动效转视频 / Web-to-Video」路径（`rules/web-vfx.md`）把
[`llm-next-token-record.html`](../llm-next-token-record.html) 这段 1920×1080 网页动效录成视频素材，
再按同一条链路生成剪映草稿。管线与薄肌那支完全相同，见
[`../../thin-muscle/video/README.md`](../../thin-muscle/video/README.md)。

## 成片

| 文件 | 说明 |
| --- | --- |
| `llm-next-token-demo.mp4` | **最终成片**，1920×1080 / H.264 High / yuv420p / 30 fps / 26.17 s / 静音（页面自带字幕行） |
| `llm-next-token-demo.webm` | skill 录制器（`scripts/web_recorder.py`）的原始产出，VP9 / 1920×1080 / 25 fps |
| `llm-next-token-record.html` | 录制版页面（`node build.mjs --record` 生成），固定浅色 + 演播布局，按 26 s 时间轴自播 |
| `captions.srt` | 5 条字幕，剪映字幕轨的素材 |
| `jianying-draft.zip` | 剪映草稿：视频轨 `WebVfxTrack` + 字幕轨 `Subtitles`（5 段），画布 1920×1080 |

## 时间轴

页面按固定时间轴自播，24.8 s 处发 `window.animationFinished`：

| # | 时间 | 画面 | 温度 | top-k | 读数（例） |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–5.5 s | 下一个字，是一张概率表 | 0.9 | 6 → 9 | 九根柱子 = 九种可能 |
| 2 | 5.5–11 s | 温度：把骰子拧热或拧冷 | 0.6 → 2.0 | 9 | 温度 2.0 时柱子被抹平 |
| 3 | 11–16.5 s | top-k：先砍掉长尾 | 1.9 | 9 → 2 → 9 | 温度 1.9 + k=2 →「吧」p=42% |
| 4 | 16.5–21.8 s | 同一个问题，两次可以不同 | 1.9 → 0.4 → 1.9 | 9 → 6 | 被抽中的那根柱子点着 |
| 5 | 21.8–26 s | 没有意图，只有加权求和与抽样 | 1.9 → 0.9 | 6 → 4 → 6 | 回到静止状态 |

录制版同样固定用浅色主题（理由见 [`../../thin-muscle/video/README.md`](../../thin-muscle/video/README.md)：
深色那版缩到 1/3 宽时整帧灰度只有 2/255，等于黑屏）。数据条排两行：
第一行是抽签结果，第二行是温度 / top-k / 有效候选。

读数全部来自页面里那份模型（`probAt(T, keep)` / `sampledIndex`），所以视频里的数字与正文、
与你自己拧旋钮看到的完全一致：温度 1.9、top-k 2 时抽到「吧」的概率就是 42%。

## 复现命令

```bash
cd pages/llm-next-token
node build.mjs --record                     # 录制版页面 + video/captions.srt

python ../../tools/record_web_video.py llm-next-token-record.html \
       video/llm-next-token-demo.webm 45    # skill 的录制器

python ../../tools/make_jianying_draft.py llm-next-token-record.html \
       video/captions.srt /tmp/draftout2 "下一个词试验台 · 网页动效演示"
```

`llm-next-token-demo.mp4` 是第 3 步里 skill 自己归一化出来的素材
（`utils/media_normalizer.py`：`scale=1920:1080` 补边 + `libx264 -crf 18 -pix_fmt yuv420p` + `+faststart`）。
