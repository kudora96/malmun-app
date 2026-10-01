"""음성·영상을 R2 버킷(malmun-media)에 올린다 — 경로는 js/paths.js 와 같게.

  video/{ep}.mp4            ← 06_release/video/480/{ep}.mp4
  audio/{ep}/{file}.mp3     ← 05_audio/{ep}/ (JSON 에 적힌 파일만)
  chars/{file}.mp3          ← data/chars_index.json 에 있는 글자만
  jamo/{name}.mp3           ← 옛 앱 audio/jamo

이미 같은 크기로 올라가 있으면 건너뛴다. 8개씩 동시에 올린다.
실행: python tools/upload_media.py L01-00-01 [--chars] [--jamo] [--letters] [--charsf]   (먼저 npx wrangler login)
"""
import json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

MALMUN = os.environ.get("MALMUN_ROOT", r"D:\gdrive\malmun")
OLD = os.environ.get("OLD_APP", r"C:\kdrama-topik")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = "malmun-media"
PUBLIC = "https://pub-5e6f50ff2dda412eaa13ca4d4302d599.r2.dev"


def already(key, path):
    try:
        req = urllib.request.Request(f"{PUBLIC}/{key}", method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            return int(r.headers.get("Content-Length", -1)) == os.path.getsize(path)
    except Exception:
        return False


def put(job):
    key, path, ctype = job
    if already(key, path):
        return f"= {key}"
    r = subprocess.run(["npx", "wrangler", "r2", "object", "put", f"{BUCKET}/{key}", "--file", path,
                        "--content-type", ctype, "--cache-control", "public, max-age=604800", "--remote"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", shell=os.name == "nt")
    return (f"✓ {key}" if r.returncode == 0 else f"✗ {key}\n{(r.stdout + r.stderr)[-400:]}")


def episode(ep):
    jobs = [(f"video/{ep}.mp4", os.path.join(MALMUN, "06_release", "video", "480", f"{ep}.mp4"), "video/mp4")]
    base = json.load(open(os.path.join(APP, "data", ep, f"{ep}.json"), encoding="utf-8"))
    kr = json.load(open(os.path.join(APP, "data", ep, f"{ep}.kr.json"), encoding="utf-8"))
    files = [p["audio"] for s in base["subtitles"] for p in s.get("parts", []) if p.get("audio")]
    files += [f for e in kr["explanations"] for f in e.get("audio_kr", [])]
    ud = os.path.join(MALMUN, "05_audio", ep, "units")  # 쓰기 낱말·토막 소리(본부)
    units = [(f"audio/{ep}/units/{f}", os.path.join(ud, f), "audio/mpeg") for f in sorted(os.listdir(ud)) if f.endswith(".mp3")] if os.path.isdir(ud) else []
    return jobs + units + [(f"audio/{ep}/{f}", os.path.join(MALMUN, "05_audio", ep, f), "audio/mpeg") for f in files]


def chars():
    from build_chars_index import source  # 옛 글자 폴더 + 본부 새 글자 폴더(05_audio/_chars)
    idx = json.load(open(os.path.join(APP, "data", "chars_index.json"), encoding="utf-8"))
    return [(f"chars/{f}", source(f), "audio/mpeg") for f in sorted(set(idx.values()))]


def jamo():
    d = os.path.join(OLD, "audio", "jamo")
    return [(f"jamo/{f}", os.path.join(d, f), "audio/mpeg") for f in sorted(os.listdir(d)) if f.endswith(".mp3")]


def letters():
    """크기를 맞춘 글자·자모 사본(tools/normalize_letters.py) → letters/c · letters/j"""
    from normalize_letters import OUT
    return [(f"letters/{sub}/{f}", os.path.join(OUT, sub, f), "audio/mpeg")
            for sub in ("c", "j") for f in sorted(os.listdir(os.path.join(OUT, sub))) if f.endswith(".mp3")]


def chars_f():
    """공용 아나운서 글자·자모 소리 → chars_f/{파일}"""
    d = os.path.join(MALMUN, "05_audio", "_chars_f")
    m = json.load(open(os.path.join(APP, "data", "chars_f.json"), encoding="utf-8")) if os.path.exists(os.path.join(APP, "data", "chars_f.json")) else {}
    return [(f"chars_f/{f}", os.path.join(d, f), "audio/mpeg") for f in sorted(set(m.values()))]


if __name__ == "__main__":
    jobs = []
    for a in sys.argv[1:]:
        jobs += chars() if a == "--chars" else jamo() if a == "--jamo" else letters() if a == "--letters" else chars_f() if a == "--charsf" else episode(a)
    bad = 0
    with ThreadPoolExecutor(8) as ex:
        for line in ex.map(put, jobs):
            print(line, flush=True)
            bad += line.startswith("✗")
    print(f"끝 · {len(jobs)}개 중 실패 {bad}")
