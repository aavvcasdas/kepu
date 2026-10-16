#!/usr/bin/env python3
"""按 luoluoluo22/jianying-editor-skill 的工作流生成一个剪映专业版草稿。

流程（对应 skill 的 rules/web-vfx.md）：
    1. JyProject(...) 建草稿；
    2. project.add_web_asset_safe(html) —— 内部调用 skill 的 scripts/web_recorder.py
       把网页动效录成 1920×1080 视频素材并放到轨道上（页面用 window.animationFinished 收尾）；
    3. 按 SRT 逐句 add_text_simple 铺字幕轨；
    4. save() 落盘，再把草稿目录打包成 zip 便于分发。

注意：TTS（add_narrated_subtitles）依赖剪映云端/本机语音，本环境不可用，故字幕不带配音。

用法:
    /tmp/pyenv/bin/python tools/make_jianying_draft.py <page.html> <captions.srt> <draft_out_dir> [name]

Windows / macOS 上把解压出的草稿目录放进剪映的草稿根目录（com.lveditor.draft）即可打开。
"""
import json
import os
import shutil
import sys
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(REPO, "tools"))
sys.path.append(os.path.join(REPO, "python-deps"))   # 备用

import record_web_video  # noqa: E402  复用「把 chromium 指给 skill」的适配层

SKILL_ROOT = record_web_video.SKILL_ROOT
sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))

import web_recorder  # noqa: E402
from jy_wrapper import JyProject  # noqa: E402

MICRO = 1_000_000


def parse_srt(path):
    """返回 [(start_seconds, end_seconds, text)]。"""
    entries, block = [], []
    for line in open(path, encoding="utf-8").read().splitlines() + [""]:
        if line.strip() == "":
            if len(block) >= 3:
                start, end = block[1].split("-->")
                entries.append((to_seconds(start), to_seconds(end), " ".join(block[2:]).strip()))
            block = []
        else:
            block.append(line.strip())
    return entries


def to_seconds(stamp):
    hh, mm, rest = stamp.strip().split(":")
    ss, ms = rest.split(",")
    return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    html, srt, out_dir = (os.path.abspath(p) for p in sys.argv[1:4])
    name = sys.argv[4] if len(sys.argv) > 4 else "薄肌测试台 · 网页动效演示"

    drafts_root = os.path.join(out_dir, "drafts")
    shutil.rmtree(drafts_root, ignore_errors=True)
    os.makedirs(drafts_root, exist_ok=True)

    web_recorder.sync_playwright = record_web_video.patched_sync_playwright

    project = JyProject(name, drafts_root=drafts_root)
    captions = parse_srt(srt)
    video_end = max(end for _, end, _ in captions)

    asset = project.add_web_asset_safe(html, start_time="0s", duration=f"{video_end:.2f}s", track_name="WebVfxTrack")
    print("网页素材:", "已入轨" if asset else "失败")

    for index, (start, end, text) in enumerate(captions, 1):
        project.add_text_simple(
            text,
            start_time=int(round(start * MICRO)),
            duration=int(round((end - start) * MICRO)),
            track_name="Subtitles",
        )
        print(f"  字幕 {index}: {start:6.2f}s → {end:6.2f}s  {text}")

    result = project.save()
    draft_path = result["draft_path"]

    zip_path = os.path.join(out_dir, os.path.basename(draft_path) + ".zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for folder, _, files in os.walk(draft_path):
            for file in files:
                full = os.path.join(folder, file)
                archive.write(full, os.path.relpath(full, drafts_root))
    print("草稿:", draft_path)
    print("打包:", zip_path, os.path.getsize(zip_path), "bytes")

    meta = os.path.join(draft_path, "draft_meta_info.json")
    if os.path.exists(meta):
        info = json.load(open(meta, encoding="utf-8"))
        print("草稿时长(µs):", info.get("duration"), "画布:", info.get("canvas_config"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
