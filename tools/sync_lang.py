# 언어 넣기(다국어부 10-12) — 언어부 자료(09_lang)를 앱으로 · 절차 = docs/lang_ingest.md
#   python tools/sync_lang.py <편> <xx[,yy]|all> [--dry]   → 넣을 수 있는 언어만 넣고 한 줄씩 보고
#   python tools/sync_lang.py --table                       → js/langs.js(언어 표)만 프로필에서 다시 씀
#   python tools/sync_lang.py --ready xx[,yy]               → 공개 단계로(본부 신호 때만)
# 하는 일: lang_{xx}.json(.ko.json) → lang/ · {편}.{xx}.json → data/{편}/ · 프로필 → js/langs.js(방향·글꼴·줄 높이·단계)
#   설명(v9 v2)은 tools/sync_v9.py · 편 목록 langs 는 tools/sync_content.py 가 함(여기서 부름)
# 언어를 더할 때 js 는 고치지 않는다 — 언어마다 다른 값은 js/langs.js 한 곳(i18n.js 가 읽음)
import json, os, re, subprocess, sys

MALMUN = os.environ.get("MALMUN_ROOT", r"D:\gdrive\malmun")
LANG = os.path.join(MALMUN, "09_lang")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLE = os.path.join(APP, "js", "langs.js")
# Google Fonts 이름 — 앱 본문 글꼴(Noto Sans KR · index.html 의 Devanagari·Bengali)로 안 되는 글자만
FONT = {"ur": "Noto Nastaliq Urdu", "th": "Noto Sans Thai", "km": "Noto Sans Khmer", "lo": "Noto Sans Lao",
        "my": "Noto Sans Myanmar", "si": "Noto Sans Sinhala", "zh": "Noto Sans SC", "ja": "Noto Sans JP"}


def read_table():
    if not os.path.exists(TABLE): return {}
    m = re.search(r"export const LANG_INFO = (\{.*\});", open(TABLE, encoding="utf-8").read(), re.S)
    return json.loads(m.group(1)) if m else {}


def write_table(info):
    rows = ",\n".join(f"  {json.dumps(c)}: {json.dumps(info[c], ensure_ascii=False, sort_keys=True)}" for c in sorted(info))
    open(TABLE, "w", encoding="utf-8", newline="\n").write(
        "// 언어 표 — tools/sync_lang.py 가 언어부 프로필(09_lang/profiles)에서 씀(손으로 고치지 않음 · 다국어부)\n"
        "// stage: pilot = 개발 주소에서만 · ready = 공개(본부 신호) · 없음 = ?lang= 시범만 · ko_ui = {xx}.ko.json 있음\n"
        f"export const LANG_INFO = {{\n{rows}\n}};\n")


def profile_row(c, old):
    p = json.load(open(os.path.join(LANG, "profiles", f"{c}.json"), encoding="utf-8"))
    row = {"dir": p.get("dir", "ltr")}
    if c in FONT: row["font"] = FONT[c]
    if (p.get("line_height_min") or 0) > 0: row["lh"] = p["line_height_min"]
    if (p.get("min_font_px") or 0) > 0: row["minpx"] = p["min_font_px"]
    for k in ("stage", "ko_ui"):
        if k in old: row[k] = old[k]
    return row


def table_from_profiles(info):
    codes = sorted(f[:-5] for f in os.listdir(os.path.join(LANG, "profiles")) if f.endswith(".json") and len(f) == 7)
    return {c: profile_row(c, info.get(c, {})) for c in codes}


def ready_to_send(ep, c):
    """언어부 「넘겨도 됨」 조건(lang_ingest §1) — 까닭 목록(빈 목록 = 됨)"""
    why, d = [], os.path.join(LANG, c)
    st = os.path.join(d, f"state_{c}.json")
    if not os.path.exists(st): return ["state 없음"]
    s = json.load(open(st, encoding="utf-8"))
    for k in ("S6", "S7", "S8"):  # state = {단계: {mark: ✓|⚠|✗, …}} · ⚠ 는 넘겨도 됨
        m = (s.get(k) or {}).get("mark")
        if m not in ("✓", "⚠"): why.append(f"{k} {'✗' if m == '✗' else '안 끝남'}")
    rep = os.path.join(d, f"report_{c}.md")
    if os.path.exists(rep):
        last = [l for l in open(rep, encoding="utf-8") if l.strip()][-1:]
        if last and "✗" in last[0]: why.append("report 끝 줄 ✗")
    for f in (f"lang_{c}.json", f"{ep}.{c}.json"):
        if not os.path.exists(os.path.join(d, f)): why.append(f"{f} 없음")
    v2 = os.path.join(LANG, "out", ep, f"{ep}.v9.v2.json")
    if os.path.exists(v2) and c not in json.load(open(v2, encoding="utf-8")).get("langs", []): why.append("v2 langs 에 없음")
    return why


def check_ui(c):
    """앱 en.json 열쇠·자리 견주기 — (빠진 열쇠, 자리 다른 열쇠)"""
    en = json.load(open(os.path.join(APP, "lang", "en.json"), encoding="utf-8"))
    xx = json.load(open(os.path.join(LANG, c, f"lang_{c}.json"), encoding="utf-8"))
    ph = lambda s: sorted(set(re.findall(r"\{\w+\}", str(s))))
    base = lambda k: re.sub(r"_(zero|one|two|few|many|other)$", "", k)
    miss = [k for k in en if k not in xx and not k.startswith("_")]
    bad = [k for k in xx if base(k) in en and ph(xx[k]) != ph(en[base(k)]) and not k.startswith("_")]
    return miss, bad, len(en)


def copy(a, b, dry):
    if dry: return
    os.makedirs(os.path.dirname(b), exist_ok=True)
    open(b, "wb").write(open(a, "rb").read())


def main(argv):
    dry = "--dry" in argv
    argv = [a for a in argv if a != "--dry"]
    info = read_table()
    if argv[:1] == ["--table"]:
        write_table(table_from_profiles(info)); print("js/langs.js ✓"); return
    if argv[:1] == ["--ready"]:
        for c in argv[1].split(","): info.setdefault(c, {})["stage"] = "ready"
        write_table(info); print("ready:", argv[1]); return
    ep, which = argv[0], argv[1]
    codes = sorted(info) if which == "all" else which.split(",")
    info = table_from_profiles(info)
    out = []
    for c in codes:
        if c in ("ko", "en", "ky"): continue
        why = ready_to_send(ep, c)
        if not why:
            miss, bad, n = check_ui(c)
            if bad: why.append(f"자리 다름 {len(bad)}: {', '.join(bad[:5])}")
        if why:
            out.append(f"{c} ⏭ " + " · ".join(why)); continue
        d = os.path.join(LANG, c)
        copy(os.path.join(d, f"lang_{c}.json"), os.path.join(APP, "lang", f"{c}.json"), dry)
        ko = os.path.join(d, f"lang_{c}.ko.json")
        if os.path.exists(ko): copy(ko, os.path.join(APP, "lang", f"{c}.ko.json"), dry); info[c]["ko_ui"] = True
        copy(os.path.join(d, f"{ep}.{c}.json"), os.path.join(APP, "data", ep, f"{ep}.{c}.json"), dry)
        info[c].setdefault("stage", "pilot")
        out.append(f"{c} ✓ 글 {n - len(miss)}/{n}" + (f"(en 으로 {len(miss)})" if miss else "") + f" · {info[c]['dir']}" + (f" · {info[c]['font']}" if info[c].get("font") else "") + f" · {info[c]['stage']}")
    if not dry:
        write_table(info)
        for tool in ("sync_v9.py", "sync_content.py"):
            r = subprocess.run([sys.executable, os.path.join(APP, "tools", tool)] + ([ep] if tool == "sync_v9.py" else []), capture_output=True, text=True, encoding="utf-8", errors="replace")
            out.append(f"{tool} {'✓' if r.returncode == 0 else '✗ ' + (r.stderr or r.stdout)[-300:]}")
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1:])
