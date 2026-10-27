"""새 편·새 말 앱에 넣기 (앱 출시부 · 10-27) — 설계: _hq/add_ep_design.md
  python tools/add_ep.py <편> [--langs ne,vi|all] [--learn ko] [--check-only] [--dry] [--no-tests]
단계: 1 입력 검사 → 2 sync_lang(글·제목·catalog) → 3 sync_v9(설명 글·소리) → 4 v9_keep_ready(다 갖춘 말만) → 5 표
하지 않는 것: push · R2 · js/css 수정 · integ(C:\malmun-app-dev)에서 실행(공개 세종 덮어쓰기 방지).
점검 세트(헤드리스)는 --no-tests 가 아니면 명령만 출력(동시 3개 · 크기별 크롬 따로 — P0-26)."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datapath import data_dir, APP
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

MALMUN = r"D:\gdrive\malmun"
V2 = os.path.join(MALMUN, "09_lang", "out")
TESTS = "learn,speak,uilang,fullsub,big,cardicons,explain_fit,speak_fit,nomusic,langkeys,langgate"


def jl(p):
    with open(p, encoding="utf-8") as f: return json.load(f)


def refuse_integ():
    if os.path.basename(APP).lower() == "malmun-app-dev":
        sys.exit("✗ integ(malmun-app-dev)에서는 실행하지 않음 — 공개 세종 자료를 덮어쓸 수 있음. 새 편 작업 갈래(예: malmun-app-ep1)에서.")


def check_input(ep, langs):
    """입력 검사 — (막는 문제 목록, 경고 목록)"""
    bad, warn = [], []
    v2p = os.path.join(V2, ep, f"{ep}.v9.v2.json")
    if not os.path.exists(v2p): bad.append(f"v2 없음: {v2p}")
    else:
        d = jl(v2p); n = len(d.get("lines") or [])
        nulls = sum(1 for l in d.get("lines", []) for s in l.get("sent", []) for k in s if k.endswith("_s") and s[k] is None)
        if nulls: bad.append(f"v2 문장 시각 null {nulls}개")
        for c in langs:
            if c != "ko" and c not in (d.get("langs") or []): warn.append(f"v2 에 말 없음: {c}")
        base = jl(os.path.join(data_dir("ko", ep), f"{ep}.json")) if os.path.exists(os.path.join(data_dir("ko", ep), f"{ep}.json")) else None
        if base and len(base.get("subtitles") or []) != n: bad.append(f"줄 수 다름: 대본 {len(base['subtitles'])} ≠ v2 {n}")
    vid = os.path.join(APP, "media", "video", "720", f"{ep}.mp4")
    if not os.path.exists(vid) and not os.path.exists(os.path.join(APP, "media", "video", "480", f"{ep}.mp4")): warn.append("영상 mp4 없음(media/video/{720,480}) — 영상 확정 전이면 정상")
    return bad, warn


def run(cmd, dry=False):
    print("  $ " + " ".join(cmd))
    if dry: return 0
    r = subprocess.run(cmd, cwd=APP, capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    tail = (r.stdout + r.stderr).strip().splitlines()[-6:]
    for t in tail: print("    " + t)
    return r.returncode


def keep_ready(ep, allow):
    """sync_v9 뒤: 소리·문장 시각 다 있는 말만 남김 — 남긴 말·뺀 말과 이유를 돌려줌"""
    p = os.path.join(data_dir("ko", ep), f"{ep}.v9.json"); d = jl(p)
    langs = [c for c in d["langs"] if c != "ko"]; ready, why = [], {}
    for c in langs:
        miss = []
        for l in d["lines"]:
            a = (l.get("audio") or {}).get(c, {})
            if not a.get("ex"): miss.append(f"{l['n']} 설명 소리")
            if not a.get("say"): miss.append(f"{l['n']} 말해보기 소리")
            if any(s.get(f"{c}_s") is None for s in l.get("sent", [])): miss.append(f"{l['n']} 문장 시각")
        if allow is not None and c not in allow: miss.append("허용 목록 밖")
        (why.__setitem__(c, miss[:3]) if miss else ready.append(c))
    drop = set(langs) - set(ready)

    def clean(o):
        if isinstance(o, dict):
            for k in list(o):
                if k in drop or (k.endswith("_s") and k[:-2] in drop): o.pop(k)
                else: clean(o[k])
        elif isinstance(o, list):
            for x in o: clean(x)
    clean(d["lines"]); d["langs"] = ["ko"] + ready
    if d.get("say_head"): d["say_head"] = {k: v for k, v in d["say_head"].items() if k == "ko" or k in ready}
    for l in d["lines"]:
        for c, kb in (l.get("ko_by") or {}).items():
            if kb.get("audio_ex") and (not kb.get("sent_s") or None in kb["sent_s"]): kb.pop("audio_ex", None); kb.pop("sent_s", None)
    with open(p, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=1)
    return ready, why


def main(argv):
    refuse_integ()
    dry, only = "--dry" in argv, "--check-only" in argv
    opt = lambda k, dflt: argv[argv.index(k) + 1] if k in argv else dflt
    langs_a = opt("--langs", "all"); learn = opt("--learn", "ko")
    pos = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] not in ("--langs", "--learn"))]
    if not pos: sys.exit(__doc__)
    ep = pos[0]
    if learn != "ko": sys.exit("✗ ko 이외 배울 말은 resolver(다국어부) 정해진 뒤 — 아직 ko 만")
    allow = None if langs_a == "all" else set(langs_a.split(","))
    print(f"== add_ep {ep} · 배울 말 {learn} · 말 {langs_a} · {'확인만' if only else '건조' if dry else '실행'}")
    bad, warn = check_input(ep, allow or [])
    for w in warn: print("  ⚠", w)
    for b in bad: print("  ✗", b)
    if bad: sys.exit("✗ 입력 검사 실패 — 멈춤")
    print("  ✓ 입력 검사")
    if only: return
    ok = run([sys.executable, "tools/sync_lang.py"] + (["--dry"] if dry else []) + ["--stage", "none", "--no-content"] + [ep] + ([",".join(sorted(allow))] if allow else ["all"]), dry) == 0
    print("  sync_lang", "✓" if ok else "✗")   # sync_lang 안에서 sync_v9 도 돌림(sync_content 는 --no-content: 옛 원본으로 편 파일·catalog 덮어쓰는 사고 10-27)
    if dry: return
    ready, why = keep_ready(ep, allow)
    print(f"== 표 · 남긴 말 {len(ready)}: {','.join(ready)}")
    for c, m in why.items(): print(f"   제외 {c}: {' · '.join(m)}")
    print("== 점검 세트(명령) — 크기별 크롬 따로 · 동시 3개까지")
    for i, sz in enumerate(("375", "1280x800", "812x375")):
        print(f"   cd D:/malmun_work/qa && node headless_run.js --url http://localhost:8775 --sizes {sz} --cdp {9361 + i} --profile D:/malmun_work/qa/chrome_prof_ae{i} --lang ne --names {TESTS}")
    print("   결과 ✗ 는 _hq/known_fails_baseline.md 와 대조 → 새 ✗ 만 보고 · 합친 줄은 _hq/merge_queue.md")


if __name__ == "__main__":
    main(sys.argv[1:])
