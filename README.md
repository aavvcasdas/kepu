# kepu

中文科普页 —— 每篇一个自包含的 HTML 文件：图文正文 + 一张可交互的等距立体图。
图形用 [Anatomy](https://github.com/wheresryan22/anatomy) 技能搭成（`anatomy/`，MIT），
无框架、无依赖，几何与读数来自同一份模型——拧旋钮会同时改画与数字。

| 页面 | 主题 | 文件 |
| --- | --- | --- |
| 薄肌：为什么有人「看着瘦」，力量却一点不小 | 健身 / 减脂视角：皮下脂肪厚度 + 肌肉厚度如何合成「薄肌」 | `pages/thin-muscle/thin-muscle.html`（深色）、`thin-muscle-light.html`（浅色） |
| 大模型是怎么猜下一个字的 | 大语言模型：自回归、注意力、温度与 top-k、幻觉、规模 | `pages/llm-next-token/llm-next-token.html`（深色）、`llm-next-token-light.html`（浅色） |

直接双击 HTML 即可在浏览器里打开：CSS、SVG 与脚本全部内联，离线可用。
每页的图都可以用鼠标或方向键操作，卡片里会实时给出读数。

## 视频版

用 [jianying-editor-skill](https://github.com/luoluoluo22/jianying-editor-skill) 的
「网页动效转视频」路径，把页面动作录成 1920×1080 视频素材，并生成剪映草稿：

| 成片 | 视频 | 剪映草稿 | 字幕 |
| --- | --- | --- | --- |
| 薄肌测试台 · 25.97 s | [`pages/thin-muscle/video/thin-muscle-demo.mp4`](pages/thin-muscle/video/thin-muscle-demo.mp4) | [`jianying-draft.zip`](pages/thin-muscle/video/jianying-draft.zip) | [`captions.srt`](pages/thin-muscle/video/captions.srt) |

录制版页面（`node build.mjs --record` 生成）按固定时间轴自播，播完用
`window.animationFinished` 给 skill 的 `scripts/web_recorder.py` 发信号收尾。
做法与复现命令见 [`pages/thin-muscle/video/README.md`](pages/thin-muscle/video/README.md)。

## 重新构建

```bash
cd pages/thin-muscle     && node build.mjs          # 深色 → thin-muscle.html
cd pages/thin-muscle     && node build.mjs --light  # 浅色 → thin-muscle-light.html
cd pages/thin-muscle     && node build.mjs --audit  # 纯 Node 的几何审计（支撑、间隙、遮挡顺序…）

cd pages/llm-next-token  && node build.mjs          # 深色 → llm-next-token.html
cd pages/llm-next-token  && node build.mjs --light  # 浅色 → llm-next-token-light.html
cd pages/llm-next-token  && node build.mjs --audit
```

需要 Node 20.10+。`--audit` 会逐条检查：每件画出来的东西都按真实形状记账，支撑关系成立、
没有互相插进去的零件、屏幕上的遮挡顺序与深度一致、曲线轮廓不抖、没有孤立的悬空端点。
两个页面的审计目前都是 `audit passed`。

## 模型尺度

两张图都是实物尺度：**1 个世界单位 = 1 毫米**。

- 薄肌测试台：皮褶卡尺读毫米（皮肤 1.5 毫米 + 皮下脂肪，随「皮褶」旋钮在 3–18 毫米之间变），
  探针深度计读厘米；脂肪层厚度代进椭圆截面模型得到腰围。
- 下一个词试验台：柱高是 9 个候选词的 softmax 概率（温度 0.2–2.0、top-k 1–9 可调），
  探针高度是示意用的注意力权重，不是某个具体模型的真实数值。
