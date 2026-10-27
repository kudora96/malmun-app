# 새 설명(v9) 시안 자료 가져오기 — 본부 04_subtitles/{편}/_v9/{편}_v9_app.json + _preview 소리
# 글 → data/{편}/{편}.v9.json · 소리 → media/v9/{편}/(로컬 복사 · 저장소에 안 들어감)
# media/audio 는 05_audio 로 이어진 연결 폴더라 거기에 쓰지 않는다(드라이브 쪽 원본을 건드리지 않게).
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datapath import data_dir  # 편 자료 폴더 한 곳(배울 말별)

MALMUN = r"D:\gdrive\malmun"
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


V2 = os.path.join(MALMUN, "09_lang", "out")  # 언어부 v2 정본(migrate_v9) — 09_lang/out/{편}/{편}.v9.v2.json


def check_v2(d):
    """v2 받기 전 검사(v9_schema_v2.md §7 요지) — 언어마다 문장 수·소리↔시각 짝 · 틀리면 멈춤"""
    bad = []
    for l in d["lines"]:
        ns = len(l.get("sent") or [])
        for lg, kb in (l.get("ko_by") or {}).items():
            if any(not (0 <= int(k) < ns) for k in (kb.get("sent") or {})): bad.append(f"{l['n']} ko_by.{lg}.sent 번호가 0..{ns - 1} 밖")  # 달라지는 문장만 {"번호": 글}
            if bool(kb.get("audio_ex")) != bool(kb.get("sent_s")): bad.append(f"{l['n']} ko_by.{lg} audio_ex↔sent_s 짝 없음")
            if kb.get("sent_s") is not None and len(kb["sent_s"]) != ns: bad.append(f"{l['n']} ko_by.{lg}.sent_s 수")
    return bad


def sync(ep, dry=False):
    v2src = os.path.join(V2, ep, f"{ep}.v9.v2.json")
    src = v2src if os.path.exists(v2src) else os.path.join(MALMUN, "04_subtitles", ep, "_v9", f"{ep}_v9_app.json")
    d = json.load(open(src, encoding="utf-8"))
    if d.get("schema") == 2:
        bad = check_v2(d)
        if bad: print("v2 검사 실패 — 쓰지 않음:", *bad[:20], sep="\n  "); sys.exit(1)
    root = os.path.join(MALMUN, d.get("audio_root", f"04_subtitles/{ep}/_preview/").replace("/", os.sep))
    out = os.path.join(APP, "media", "v9", ep)
    os.makedirs(out, exist_ok=True)
    n = 0
    # v2: 견주기 줄 언어판 한국어 소리(ko_by.{xx}.audio_ex)가 아직 없으면 _todo.audio_copy 의 원본에서 앱 media 로만 복사(드라이브 원본은 안 건드림)
    cp = {b: a for a, b in (d.get("_todo") or {}).get("audio_copy", [])}
    missing = set()
    for l in d["lines"]:
        rels = [r for lg in (l.get("audio") or {}).values() for r in lg.values() if r] + [kb["audio_ex"] for kb in (l.get("ko_by") or {}).values() if kb.get("audio_ex")]
        for rel in rels:
                a, b = os.path.join(root, rel.replace("/", os.sep)), os.path.join(out, rel.replace("/", os.sep))
                if not os.path.exists(a) and rel in cp: a = os.path.join(root, cp[rel].replace("/", os.sep))
                if os.path.exists(a):
                    os.makedirs(os.path.dirname(b), exist_ok=True); shutil.copy2(a, b); n += 1
                else:
                    print("소리 없음:", rel); missing.add(rel)
    # 없는 소리는 자료에서 뺌(앱이 그 단추를 숨기고 · 언어판 견주기 소리가 없으면 공용 한국어 소리·시각으로 · 시범 언어는 글만 단계 — 언어부 10-12)
    for l in d["lines"]:
        for lg in (l.get("audio") or {}).values():
            for k in [k for k, r in lg.items() if r in missing]: lg[k] = None
        for kb in (l.get("ko_by") or {}).values():
            if kb.get("audio_ex") in missing: kb.pop("audio_ex", None); kb.pop("sent_s", None)
    # 문장 시작 시각({xx}_s)이 비어 있으면 소리부 _lang_narrate.json(설명 파일마다 sent_s)에서 채움 — 없으면 앱이 늘 마지막 문장만 칠함(검사1팀 10-21)
    filled = 0
    for code in d.get("langs", []):
        if code == "ko": continue
        nj = os.path.join(root, f"새설명_소리_{code}", "_lang_narrate.json")
        if not os.path.exists(nj): continue
        try: items = json.load(open(nj, encoding="utf-8")).get("items") or []
        except Exception: continue
        by = {it.get("file"): it.get("sent_s") for it in items if it.get("sent_s")}
        for l in d["lines"]:
            ss = by.get(f"{ep}_{l['n']:02d}_{code}_설명.mp3"); sent = l.get("sent") or []
            if not ss or len(ss) != len(sent): continue
            for j, sj in enumerate(sent):
                if sj.get(code) is not None and sj.get(f"{code}_s") is None: sj[f"{code}_s"] = ss[j]; filled += 1
    if filled: print("문장 시각 채움:", filled)
    # 한국어 문장 시각(ko_s)·학습자별 한국어 설명(ko_by.{xx}.sent_s)이 비면 앱 칠이 마지막 문장에 붙음(10-22 새 1편) → 경고
    nk = [l["n"] for l in d["lines"] if any(s.get("ko") and s.get("ko_s") is None for s in (l.get("sent") or []))]
    nb = [(l["n"], c) for l in d["lines"] for c, kb in (l.get("ko_by") or {}).items() if kb.get("audio_ex") and (not kb.get("sent_s") or None in kb["sent_s"])]
    if nk or nb: print("⚠ 문장 시각 빔 — ko_s 줄", nk, "· ko_by sent_s", nb, "(소리부 sent_s 또는 MMS 정렬로 채울 것)")
    # 말하기 본보기 = 문장만 읽은 소리(본부 10-03 · app.json 에 칸이 없어 이름 규칙으로) → audio.ko.sentence
    for l in d["lines"]:
        rel = f"새설명_소리_kr/{ep}_{l['n']:02d}_말해보세요_문장.mp3"
        a = os.path.join(root, rel.replace("/", os.sep))
        if os.path.exists(a):
            b = os.path.join(out, rel.replace("/", os.sep)); shutil.copy2(a, b); n += 1
            l.setdefault("audio", {}).setdefault("ko", {})["sentence"] = rel
    # 「이제 말해 보세요」 머리말 — 모든 줄 공통 · 언어마다 하나(본부 10-05 · 문장과 나눠 0.6초 쉼)
    heads = {}
    for code in ["ko"] + [c for c in d.get("langs", []) if c != "ko"]:
        tag = "kr" if code == "ko" else code
        rel = f"새설명_소리_{tag}/말해보세요_머리_{tag}.mp3"
        a = os.path.join(root, rel.replace("/", os.sep))
        if os.path.exists(a):
            b = os.path.join(out, rel.replace("/", os.sep)); os.makedirs(os.path.dirname(b), exist_ok=True); shutil.copy2(a, b); n += 1
            heads[code] = rel
    if heads:
        d["say_head"] = heads
    dst = os.path.join(data_dir("ko", ep), f"{ep}.v9.json")
    if dry: print(ep, "(dry-run)", src); return d
    with open(dst + ".tmp", "w", encoding="utf-8") as f:  # 반쯤 쓴 파일 막기 — 임시 → 바꿔치기
        json.dump(d, f, ensure_ascii=False, indent=1)
    os.replace(dst + ".tmp", dst)
    print(ep, "v2" if d.get("schema") == 2 else "v1", len(d["lines"]), "줄 ·", n, "소리 ·", os.path.relpath(src, MALMUN))


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    for ep in a or ["L01-00-01"]:
        sync(ep, dry="--dry-run" in sys.argv)
