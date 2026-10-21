# 말하기 결과 안내 소리 조각(대표님 10-21 · 설계 _hq/design_speak_feedback_voice.md) — 개발2팀
#  lang/{말}.json(학습자 말 = L) · lang/{말}.ko.json(⇄ 한국어 = K)의 결과 안내 열쇠 25개를 {칸} 자리에서 잘라 「읽을 조각」으로
#  → data/fb_manifest.json(앱이 읽음: 말·L/K·열쇠 → 조각 줄[글 조각 id | 칸 이름])
#  → D:/malmun_work/fb/to_sound/{목소리}.json(소리부가 만들 것: id·읽을 글) — 목소리 = 학습자 말 코드 또는 ko · 같은 글은 한 번만(id = 글 해시)
#  숫자 = 0~100 「N%」 목소리마다(fb/{목소리}/n/{N}.mp3)
#  쓰는 법: python tools/fb_pieces.py   (열쇠 글이 바뀌면 다시 돌림 → 바뀐 id 만 소리부가 새로)
import json, re, hashlib, os, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_SOUND = "D:/malmun_work/fb/to_sound"
KEYS = ("score_1 score_2 score_3 score_4 score_5 why_time why_pause_tail why_tail why_tail_short why_other why_heard_as why_missing "
        "why_redo why_rest_ok why_many why_polish why_frame why_late rhythm_line rhy_long rhy_short rhy_pause rhy_speed rhy_stutter rhy_pause_word").split()
# 쓰기 안내 열쇠(쓰기부 10-21 · _hq/fb_write_keys.md 표의 첫 칸)
WKEYS = [m.group(1) for m in re.finditer(r"^\| `([\w]+)` \|", open("D:/gdrive/malmun/_hq/fb_write_keys.md", encoding="utf-8").read(), re.M)] if os.path.exists("D:/gdrive/malmun/_hq/fb_write_keys.md") else []
KEYS = KEYS + [k for k in WKEYS if k not in KEYS]
SYM = re.compile(r"[☆★⏱✓✔✗👁🎤▶]")
SLOT = re.compile(r"\{(\w+)\}")
SPOKEN = re.compile(r"[\w]", re.U)

def say_of(s):  # 소리로 읽을 글(기호 빼고 앞뒤 이음표·빈칸 정리)
    s = SYM.sub("", s).replace("(", " ").replace(")", " ")
    s = re.sub(r"^[\s·—–\-:,;]+|[\s·—–\-:,;]+$", "", s)
    return re.sub(r"\s{2,}", " ", s).strip()

def fid(voice, text):
    return hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:10]

def pieces(voice, s, need):
    out, pos = [], 0
    for m in SLOT.finditer(s):
        t = s[pos:m.start()]
        if SPOKEN.search(SYM.sub("", t)):
            say = say_of(t); i = fid(voice, say); need[i] = say; out.append({"t": t, "id": i})
        elif t: out.append({"t": t})
        out.append({"s": m.group(1)}); pos = m.end()
    t = s[pos:]
    if SPOKEN.search(SYM.sub("", t)):
        say = say_of(t); i = fid(voice, say); need[i] = say; out.append({"t": t, "id": i})
    elif t: out.append({"t": t})
    return out

def main():
    man = {"v": 1, "keys": KEYS, "langs": {}}
    sound = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "lang", "*.json"))):
        b = os.path.basename(f)
        if b.count(".") > 1 or b == "ko.json": continue
        lang = b[:-5]
        L = json.load(open(f, encoding="utf-8"))
        kof = os.path.join(ROOT, "lang", f"{lang}.ko.json")
        K = json.load(open(kof, encoding="utf-8")) if os.path.exists(kof) else json.load(open(os.path.join(ROOT, "lang", "ko.json"), encoding="utf-8"))
        ent = {}
        for mode, src, voice in (("L", L, lang), ("K", K, "ko")):
            need = sound.setdefault(voice, {})
            ent[mode] = {k: pieces(voice, src[k], need) for k in KEYS if k in src}
        man["langs"][lang] = ent
    for voice, need in sound.items():  # 숫자 0~100
        for n in range(101): need[f"n{n}"] = f"{n}%"
        for n in range(101): need[f"p{n}"] = str(n)  # 맨 숫자(획 번호·초)
    json.dump(man, open(os.path.join(ROOT, "data", "fb_manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.makedirs(OUT_SOUND, exist_ok=True)
    tot = 0
    for voice, need in sorted(sound.items()):
        items = [{"id": i, "say": s, "file": f"fb/{voice}/{'n/' + i[1:] if i.startswith('n') and i[1:].isdigit() else 'num/' + i[1:] if i.startswith('p') and i[1:].isdigit() else i}.mp3"} for i, s in need.items()]
        json.dump({"voice": voice, "items": items}, open(os.path.join(OUT_SOUND, f"{voice}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        tot += len(items); print(f"{voice}: {len(items)}")
    print("합계", tot)

if __name__ == "__main__":
    main()
