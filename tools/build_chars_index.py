"""글자 음성 색인 data/chars_index.json — {글자: 파일명}

옛 앱(C:\\kdrama-topik) 쓰기 데이터에 적힌 글자↔파일 짝만 쓴다(이름만으로 추측하지 않는다 — at2·gat2 같은 번호 파일 때문).
새 글자 음성은 본부 도구가 만들고, 이 색인에 합쳐 넣는다.

실행: python tools/build_chars_index.py
"""
import glob, json, os

OLD = os.environ.get("OLD_APP", r"C:\kdrama-topik")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

m = {}
for f in glob.glob(os.path.join(OLD, "data", "**", "*.json"), recursive=True):
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    if not isinstance(d, dict):
        continue
    for w in d.get("writing") or []:
        for wd in w.get("words", []):
            for c in wd.get("chars", []):
                a, ch = c.get("audio"), c.get("char")
                if a and ch:
                    m[ch] = a.split("/")[-1].split("?")[0]

files = set(os.listdir(os.path.join(OLD, "audio", "chars")))
m = {k: v for k, v in sorted(m.items()) if v in files}
with open(os.path.join(APP, "data", "chars_index.json"), "w", encoding="utf-8") as f:
    json.dump(m, f, ensure_ascii=False, indent=0)
print(len(m), "글자")
