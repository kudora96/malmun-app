"""쓰기에서 소리로 들려줄 단위(낱말 · 토막) 목록 → data/{ep}/{ep}.units.json
(투덜이 10-01: 「단어와 이 부분 소리는 일레븐랩스로 따로 만들자 · 앞뒤 여유를 둔 문장으로 읽혀 그 말만 남기고 자르자」)

토막(부분)은 편마다 **고정** — 앱도 이 목록대로 나눈다(화면 너비로 바꾸지 않는다 · 좁은 화면은 글자를 줄인다).
나누는 법: 문장 끝(. ? ! …)에서 끊고, 그래도 길면 낱말 단위로 SEG_MAX 글자(한글) 안 — 단 기대는 말(수 · 것 · 그 …)에서는 끊지 않는다.
소리 파일 이름(본부가 만든다): 05_audio/{ep}/units/{id}.mp3 · id = {ep}_{줄 2자리}_w{낱말 2자리} / _p{토막 2자리} / 글자 {ep}_c{유니코드 4자리}

  python tools/writing_units.py L01-00-01
"""
import json, os, re, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAN = re.compile(r"[가-힣]")
SEG_MAX = 8
BOUND = {"수", "것", "거", "줄", "적", "데", "때", "그", "온", "더", "안", "못", "잘"}


def units(ko):
    words = [w for w in ko.split() if HAN.search(w)]
    segs, cur, n = [], [], 0
    for i, w in enumerate(words):
        k = len(HAN.findall(w))
        # 토막을 「수 · 것 · 거 · 줄 · 적 · 데 · 때 · 그」 같은 기대는 말로 끝내지 않는다(「읽을 수 | 있어야」 → 「읽을 수 있어야」)
        if cur and n + k > SEG_MAX and words[cur[-1]] not in BOUND:
            segs.append(cur); cur, n = [], 0
        cur.append(i); n += k
        if re.search(r"[.?!…]$", w):
            segs.append(cur); cur, n = [], 0
    if cur:
        segs.append(cur)
    return words, segs


def main(ep):
    base = json.load(open(os.path.join(APP, "data", ep, f"{ep}.json"), encoding="utf-8"))
    out = {}
    for s in base["subtitles"]:
        words, segs = units(s["ko"])
        nn = f"{s['id']:02d}"
        out[str(s["id"])] = {
            "words": [{"id": f"{ep}_{nn}_w{i + 1:02d}", "text": w, "say": "".join(re.findall(r"[가-힣 ]", w)).strip()} for i, w in enumerate(words)],
            "parts": [{"id": f"{ep}_{nn}_p{k + 1:02d}", "words": [i for i in seg], "text": " ".join(words[i] for i in seg),
                       "say": " ".join("".join(HAN.findall(words[i])) for i in seg)} for k, seg in enumerate(segs)],
        }
        print(f"{s['id']:>2} 토막 " + " | ".join(p["say"] for p in out[str(s["id"])]["parts"]))
    # 글자 하나씩 소리(10-01 투덜이 — 단어 듣기와 따로 · 이 편에 나오는 모든 글자) · id = {ep}_c{유니코드 4자리}
    chars = sorted({c for v in base["subtitles"] for c in HAN.findall(v["ko"])})
    charlist = [{"id": f"{ep}_c{ord(c):04X}", "ch": c} for c in chars]
    json.dump({"clip_id": ep, "how": "tools/writing_units.py (SEG_MAX 8 · 문장 끝에서 끊음)", "audio": "05_audio/{ep}/units/{id}.mp3", "chars": charlist, "lines": out},
              open(os.path.join(APP, "data", ep, f"{ep}.units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    nw = sum(len(v["words"]) for v in out.values()); np_ = sum(len(v["parts"]) for v in out.values())
    print(f"낱말 {nw} · 토막 {np_} · 글자 {len(charlist)}")


if __name__ == "__main__":
    for ep in sys.argv[1:]:
        main(ep)
