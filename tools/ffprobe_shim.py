#!/usr/bin/env python3
"""最小 ffprobe 替身：给 skill 的 media_normalizer / formatters 用。

本环境只有静态 ffmpeg、没有 ffprobe，而 skill 会调用 ffprobe 查询
`stream=codec_name,width,height,pix_fmt` 与 `format=duration`。
这里解析 `ffmpeg -i` 的 stderr，输出同样格式的答案。

用法（当作 ffprobe 用）:
    ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt -of json <file>
    ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 <file>
    ffprobe -version
"""
import json
import os
import re
import subprocess
import sys

FFMPEG = os.environ.get("FFMPEG_BIN") or "/home/user/tools/bin/ffmpeg"


def probe(path):
    proc = subprocess.run([FFMPEG, "-hide_banner", "-i", path],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    text = proc.stderr or ""
    info = {}
    duration = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", text)
    if duration:
        hh, mm, ss = int(duration.group(1)), int(duration.group(2)), float(duration.group(3))
        info["duration"] = hh * 3600 + mm * 60 + ss
    stream = re.search(r"Stream #\d+:\d+.*?: Video: (\w+).*?, (\w+(?:\(\w+\))?), (\d+)x(\d+)", text)
    if stream:
        info["codec_name"] = stream.group(1)
        info["pix_fmt"] = re.sub(r"\(.*?\)", "", stream.group(2))
        info["width"] = int(stream.group(3))
        info["height"] = int(stream.group(4))
    return info


def main(argv):
    if any(arg == "-version" for arg in argv):
        print("ffprobe version shim (ffmpeg -i parser)")
        return 0
    paths = [arg for arg in argv[1:] if not arg.startswith("-") and os.path.exists(arg)]
    if not paths:
        return 1
    info = probe(paths[-1])
    if not info:
        return 1
    wants_stream = any("stream=" in arg for arg in argv)
    output = [arg for arg, nxt in zip(argv, argv[1:]) if nxt == "-of"] + [argv[-1] if argv[-2:][0] == "-of" else ""]
    mode = "json" if "json" in argv else "default"
    if wants_stream:
        payload = {key: info.get(key, "") for key in ("codec_name", "width", "height", "pix_fmt")}
        if mode == "json":
            print(json.dumps({"streams": [payload]}))
        else:
            print(payload)
    else:
        print(f"{info.get('duration', 0.0):.6f}" if mode == "default" else json.dumps({"format": {"duration": str(info.get('duration', 0.0))}}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
