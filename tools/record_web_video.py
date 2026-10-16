#!/usr/bin/env python3
"""用 luoluoluo22/jianying-editor-skill 的 Web-to-Video 路径录制页面动画。

规则来源：skill 的 rules/web-vfx.md —— 网页动效 → 录成视频素材（1920×1080），
页面在动画结束时把 window.animationFinished 置为 true，录制器据此收尾。
本脚本只是把 skill 的 scripts/web_recorder.py（record_web_animation）跑起来，
并按沙箱环境把 Chromium 可执行文件和字体/动态库指过去，不修改 skill 本体。

用法:
    /tmp/pyenv/bin/python tools/record_web_video.py <page.html> <out.webm> [max_seconds]
环境变量:
    JY_SKILL_ROOT    skill 仓库位置（默认 /home/user/jianying-skill）
    REC_CHROMIUM     Chromium 可执行文件（默认 /tmp/chromium）
"""
import os
import sys

SKILL_ROOT = os.environ.get("JY_SKILL_ROOT", "/home/user/jianying-skill")
CHROMIUM = os.environ.get("REC_CHROMIUM", "/tmp/chromium")

# 沙箱里的 Chromium 需要自带的动态库、字体配置和可写 HOME
os.environ.setdefault("LD_LIBRARY_PATH", "/tmp/csslib/lib")
os.environ.setdefault("FONTCONFIG_PATH", "/tmp/csfonts")
os.environ.setdefault("HOME", "/tmp")

sys.path.insert(0, os.path.join(SKILL_ROOT, "scripts"))

import web_recorder  # noqa: E402  skill 的录制器
from playwright.sync_api import sync_playwright as _sync_playwright  # noqa: E402


class _ChromiumProxy:
    """只替换启动方式：把 chromium 指到沙箱里已有的可执行文件。"""

    def __init__(self, chromium):
        self._chromium = chromium

    def launch(self, **kwargs):
        kwargs.setdefault("executable_path", CHROMIUM)
        kwargs["args"] = list(kwargs.get("args", [])) + ["--no-sandbox", "--disable-setuid-sandbox"]
        return self._chromium.launch(**kwargs)

    def __getattr__(self, name):
        return getattr(self._chromium, name)


class _PlaywrightProxy:
    def __init__(self, real):
        self._real = real
        self.chromium = _ChromiumProxy(real.chromium)

    def __getattr__(self, name):
        return getattr(self._real, name)


def patched_sync_playwright():
    """给 skill 用：返回注入过 executable_path 的 playwright 上下文管理器。"""
    class _Ctx:
        def __enter__(self):
            self._real_ctx = _sync_playwright()
            return _PlaywrightProxy(self._real_ctx.__enter__())

        def __exit__(self, *exc):
            return self._real_ctx.__exit__(*exc)

    return _Ctx()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    html, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    max_seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 60.0

    web_recorder.sync_playwright = patched_sync_playwright   # skill 的录制器走我们的启动器
    ok = web_recorder.record_web_animation(html, out, max_duration=max_seconds)
    print("skill recorder:", "OK" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
