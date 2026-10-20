# 언어 넣기(다국어부 10-12) — 언어부 자료(09_lang)를 앱으로 · 절차 = docs/lang_ingest.md
#   python tools/sync_lang.py <편> <xx[,yy]|all> [--dry] [--force]   → 넣을 수 있는 언어만 넣고 한 줄씩 보고
#     앱 글이 언어부 원본과 다른 열쇠가 있으면 그 언어는 덮지 않고 표로 보여 줌(앱에서 고친 글 보호 · --accept 열쇠,열쇠 = 그 열쇠만 허락 · --force = 다 덮음)
#   python tools/sync_lang.py --table                       → js/langs.js(언어 표)만 프로필에서 다시 씀
#   python tools/sync_lang.py --ready xx[,yy]               → 공개 단계로(본부 신호 때만)
#   python tools/sync_lang.py --titles                      → 편·단원 제목만(09_lang/ui/out/titles/titles_{xx}.json → lang/titles/{xx}.json · 다국어부 10-20) · 언어 넣기 때도 함께
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
        "my": "Noto Sans Myanmar", "si": "Noto Sans Sinhala", "zh": "Noto Sans SC", "ja": "Noto Sans JP",
        "mn": "Noto Sans", "ky": "Noto Sans"}  # mn·ky 키릴 확장(ү ө ң)은 Noto Sans KR 에 없음(10-13 점검)


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
    if p.get("ui_short"): row["short"] = p["ui_short"]  # 「내 말 ⇄ 한」 토글 이름(본부 10-12 · 언어부 확인 · 2~4자)
    for k in ("stage", "ko_ui"):
        if k in old: row[k] = old[k]
    return row


def table_from_profiles(info):
    codes = sorted(f[:-5] for f in os.listdir(os.path.join(LANG, "profiles")) if f.endswith(".json") and len(f) == 7)
    return {c: profile_row(c, info.get(c, {})) for c in codes}


def ui_src(c, ko=False):
    """앱 글 원본 — 언어부 check_ui --export 결과 09_lang/ui/out/{xx}/ 가 정본(없으면 09_lang/{xx}/ 사본)"""
    f = f"lang_{c}.ko.json" if ko else f"lang_{c}.json"
    for d in (os.path.join(LANG, "ui", "out", c), os.path.join(LANG, c)):
        if os.path.exists(os.path.join(d, f)): return os.path.join(d, f)
    return None


def ready_to_send(ep, c):
    """언어부 「넘겨도 됨」 조건(lang_ingest §1) — 까닭 목록(빈 목록 = 됨)"""
    why, d = [], os.path.join(LANG, c)
    prof = json.load(open(os.path.join(LANG, "profiles", f"{c}.json"), encoding="utf-8"))
    if str(prof.get("status", "")).startswith("보류"): return ["프로필 status 보류"]
    if c == "ne":  # ne = 앱 첫 언어 · 09_lang/ne/ 없음 → 앱 글만(대사층·설명은 04_subtitles·out v2 → sync_content·sync_v9)
        return [] if ui_src(c) else ["ui/out/ne/lang_ne.json 없음"]
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
    if not ui_src(c): why.append(f"lang_{c}.json 없음")
    if not os.path.exists(os.path.join(d, f"{ep}.{c}.json")): why.append(f"{ep}.{c}.json 없음")
    v2 = os.path.join(LANG, "out", ep, f"{ep}.v9.v2.json")
    if os.path.exists(v2) and c not in json.load(open(v2, encoding="utf-8")).get("langs", []): why.append("v2 langs 에 없음")
    return why


def check_ui(c):
    """앱 en.json 열쇠·자리 견주기 — (빠진 열쇠, 자리 다른 열쇠)"""
    en = json.load(open(os.path.join(APP, "lang", "en.json"), encoding="utf-8"))
    xx = json.load(open(ui_src(c), encoding="utf-8"))
    ph = lambda s: sorted(set(re.findall(r"\{\w+\}", str(s))))
    base = lambda k: re.sub(r"_(zero|one|two|few|many|other)$", "", k)
    miss = [k for k in en if k not in xx and not k.startswith("_")]
    bad = [k for k in xx if base(k) in en and ph(xx[k]) != ph(en[base(k)]) and not k.startswith("_")]
    return miss, bad, len(en)


def app_edits(a, b):
    """앱 쪽 값 ≠ 언어부 원본 값인 열쇠(앱에서 바로 고친 글이 덮여 되돌려지지 않게 · 언어부 10-12) — [(열쇠, 앱 값, 원본 값)]"""
    if not os.path.exists(b): return []
    x, y = json.load(open(a, encoding="utf-8")), json.load(open(b, encoding="utf-8"))
    return [(k, y[k], x.get(k)) for k in y if not k.startswith("_") and y[k] != x.get(k)]


def sync_titles(codes=None, dry=False):
    """편·단원 제목 — 있는 언어만(en 포함) · [(언어, 개수)]"""
    d, out = os.path.join(LANG, "ui", "out", "titles"), []
    if not os.path.isdir(d): return out
    for f in sorted(os.listdir(d)):
        m = re.fullmatch(r"titles_([a-z]{2})\.json", f)
        if not m or (codes and m.group(1) not in codes and m.group(1) != "en"): continue
        j = json.load(open(os.path.join(d, f), encoding="utf-8"))
        if not dry:
            os.makedirs(os.path.join(APP, "lang", "titles"), exist_ok=True)
            open(os.path.join(APP, "lang", "titles", f"{m.group(1)}.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(j, ensure_ascii=False, indent=1) + "\n")
        out.append((m.group(1), len(j)))
    return out


def copy(a, b, dry):
    if dry: return
    os.makedirs(os.path.dirname(b), exist_ok=True)
    open(b, "wb").write(open(a, "rb").read())


def main(argv):
    dry, force = "--dry" in argv, "--force" in argv
    stage0 = argv[argv.index("--stage") + 1] if "--stage" in argv else "pilot"
    if "--stage" in argv: del argv[argv.index("--stage"):argv.index("--stage") + 2]
    acc = set(argv[argv.index("--accept") + 1].split(",")) if "--accept" in argv else set()  # 이번에 바뀌기로 한 열쇠(언어부가 새 값을 낸 것) — 이것만 덮기 허락
    if "--accept" in argv: del argv[argv.index("--accept"):argv.index("--accept") + 2]
    argv = [a for a in argv if a not in ("--dry", "--force")]
    info = read_table()
    if argv[:1] == ["--table"]:
        write_table(table_from_profiles(info)); print("js/langs.js ✓"); return
    if argv[:1] == ["--titles"]:
        print("제목:", " ".join(f"{c} {n}" for c, n in sync_titles(dry=dry)) or "없음"); return
    if argv[:1] == ["--ready"]:
        for c in argv[1].split(","): info.setdefault(c, {})["stage"] = "ready"
        write_table(info); print("ready:", argv[1]); return
    ep, which = argv[0], argv[1]
    codes = sorted(info) if which == "all" else which.split(",")
    info = table_from_profiles(info)
    out = []
    for c in codes:
        if c in ("ko", "en"): continue
        why = ready_to_send(ep, c)
        if not why:
            miss, bad, n = check_ui(c)
            if bad: why.append(f"자리 다름 {len(bad)}: {', '.join(bad[:5])}")
        if why:
            out.append(f"{c} ⏭ " + " · ".join(why)); continue
        pairs = [(ui_src(c), os.path.join(APP, "lang", f"{c}.json"))] + ([(ui_src(c, True), os.path.join(APP, "lang", f"{c}.ko.json"))] if ui_src(c, True) else [])
        if c != "ne": pairs.append((os.path.join(LANG, c, f"{ep}.{c}.json"), os.path.join(APP, "data", ep, f"{ep}.{c}.json")))
        diff = [(os.path.basename(b), *e) for a, b in pairs if os.sep + "lang" + os.sep in b for e in app_edits(a, b) if e[0] not in acc]
        if diff and not force:  # 앱에서 고친 글 → 언어부 todo 로 먼저 보내고(열쇠·값), 원본이 맞춰지면 다시 · 일부러 덮을 땐 --force
            out.append(f"{c} ⏸ 앱 값 ≠ 원본 {len(diff)}개 — 덮지 않음(언어부에 보내거나 --force):" + "".join(f"\n    {f} {k}: 앱 「{str(y)[:50]}」 · 원본 「{str(x)[:50]}」" for f, k, y, x in diff[:20])); continue
        for a, b in pairs: copy(a, b, dry)
        if len(pairs) > 1 and pairs[1][0].endswith(".ko.json"): info[c]["ko_ui"] = True
        if stage0 == "none": info[c].pop("stage", None)  # --stage none = 글만 넣고 선택 목록엔 「곧」(본부 신호 전 · 10-19)
        else: info[c].setdefault("stage", stage0)
        out.append(f"{c} ✓ 글 {n - len(miss)}/{n}" + (f"(en 으로 {len(miss)})" if miss else "") + f" · {info[c]['dir']}" + (f" · {info[c]['font']}" if info[c].get("font") else "") + f" · {info[c].get('stage', '곧(단계 없음)')}")
    tl = sync_titles(codes, dry)
    if tl: out.append("제목: " + " ".join(f"{c} {n}" for c, n in tl))
    if not dry:
        write_table(info)
        for tool in ("sync_v9.py", "sync_content.py"):
            r = subprocess.run([sys.executable, os.path.join(APP, "tools", tool)] + ([ep] if tool == "sync_v9.py" else []), capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "PYTHONIOENCODING": "utf-8"})
            out.append(f"{tool} {'✓' if r.returncode == 0 else '✗ ' + (r.stderr or r.stdout)[-300:]}")
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1:])
