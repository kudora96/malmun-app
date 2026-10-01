"""말문 콘텐츠 → 앱 data/ 로 옮긴다 (읽기만 · 편 파일은 고치지 않는다).

- 편 JSON 3층({ep}.json · {ep}.kr.json · {ep}.{lang}.json)을 data/{ep}/ 로 복사
- 편 목록 data/catalog.json 을 편 안내서(00_docs/plan/Malmun-episode-guide-v3-*.md)에서 만든다
- 음성·영상은 옮기지 않는다(저장소 밖 · 경로는 js/paths.js 한 곳에서 조립)

실행: python tools/sync_content.py
"""
import glob, json, os, re, shutil, sys

MALMUN = os.environ.get("MALMUN_ROOT", r"D:\gdrive\malmun")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(APP, "data")
LANGS = "ne vi id th mn ur si bn tl uz ky km lo my zh ja en es fr pt".split()


def episode_guide():
    guides = sorted(glob.glob(os.path.join(MALMUN, "00_docs", "plan", "Malmun-episode-guide-v3-*.md")))
    if not guides:
        sys.exit("편 안내서를 찾지 못했다")
    rows = []
    for line in open(guides[-1], encoding="utf-8"):
        m = re.match(r"\|\s*(L\d\d-\d\d-\d\d)\s*\|\s*([^|]+?)\s*\|", line)
        if m:
            rows.append((m.group(1), m.group(2)))
    return rows


def sync_episode(ep):
    src = os.path.join(MALMUN, "04_subtitles", ep)
    base = os.path.join(src, f"{ep}.json")
    if not os.path.exists(base):
        return None
    out = os.path.join(DATA, ep)
    os.makedirs(out, exist_ok=True)
    shutil.copy2(base, out)
    kr = os.path.join(src, f"{ep}.kr.json")
    if os.path.exists(kr):
        shutil.copy2(kr, out)
    # 대사 원음 낱말 시각(본부 강제 정렬) — 05_audio/{ep}/{ep}.words.json 이 있으면 그것이 정본
    words = os.path.join(MALMUN, "05_audio", ep, f"{ep}.words.json")
    if os.path.exists(words):
        shutil.copy2(words, out)
    langs = []
    for lang in LANGS:
        f = os.path.join(src, f"{ep}.{lang}.json")
        if os.path.exists(f):
            shutil.copy2(f, out)
            langs.append(lang)
    d = json.load(open(base, encoding="utf-8"))
    subs = d.get("subtitles", [])
    return {"lines": len(subs), "duration": round(max((s["end"] for s in subs), default=0), 1), "langs": langs}


def main():
    catalog = {"units": {}, "episodes": []}
    for ep, title in episode_guide():
        info = sync_episode(ep)
        item = {"id": ep, "title": title, "ready": bool(info)}
        if info:
            item.update(info)
        catalog["episodes"].append(item)
        print(("✓ " if info else "· ") + ep, title)
    catalog["units"]["L01-00"] = "한글과 발음"
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)
    print("catalog:", len(catalog["episodes"]), "편 ·", sum(e["ready"] for e in catalog["episodes"]), "준비됨")


if __name__ == "__main__":
    main()
