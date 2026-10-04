# 판 번호 올리기 — 앱 코드를 고칠 때마다 돌린다(본부 10-04: 학습자는 Ctrl+Shift+R 을 모른다)
#   python tools/bump_version.py          → 오늘 날짜.차례 (예: 1004.3)
# 하는 일: js/version.js · version.json 에 판 번호 → index.html 의 css/js 주소와 모든 js 의 import 주소에 ?v=판번호
# (주소가 바뀌면 브라우저는 반드시 새로 받는다 · 데이터·말 JSON 은 data.js·i18n.js 가 VERSION 을 붙여 받음)
# 열려 있던 탭은 version.json 을 가끔 확인해 새 판이 있으면 「새 판이 있어요」 띠를 띄운다(js/main.js).
# 인터넷(R2·Pages) 판: 코드는 이 판 번호 주소 그대로(GitHub Pages 기본 max-age 10분이어도 주소가 달라 새로 받음) ·
#   소리·영상(R2)은 지금처럼 paths.js 의 ?v= 를 바뀐 종류만 올린다 — 올리기는 투덜이 「올려」 뒤.
import datetime, json, os, re, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    vf = os.path.join(APP, "version.json")
    old = json.load(open(vf, encoding="utf-8"))["v"] if os.path.exists(vf) else ""
    day = datetime.date.today().strftime("%m%d")
    if len(sys.argv) > 1:
        v = sys.argv[1]
    else:
        n = int(old.split(".")[1]) + 1 if old.startswith(day + ".") else 1
        v = f"{day}.{n}"
    json.dump({"v": v}, open(vf, "w", encoding="utf-8"))
    open(os.path.join(APP, "js", "version.js"), "w", encoding="utf-8", newline="\n").write(
        f'// 판 번호 — tools/bump_version.py 가 씀(손으로 고치지 않음)\nexport const VERSION = "{v}";\n')
    q = f"?v={v}"
    p = os.path.join(APP, "index.html")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'(href="css/app\.css)(\?v=[^"]*)?"', rf'\1{q}"', s)
    s = re.sub(r'(src="js/main\.js)(\?v=[^"]*)?"', rf'\1{q}"', s)
    open(p, "w", encoding="utf-8", newline="").write(s)
    n = 0
    for root, _, files in os.walk(os.path.join(APP, "js")):
        for f in files:
            if not f.endswith(".js"):
                continue
            fp = os.path.join(root, f)
            s = open(fp, encoding="utf-8").read()
            t = re.sub(r'((?:from|import)\s*\(?\s*["\'])(\.{1,2}/[^"\'?]+\.js)(\?v=[^"\']*)?(["\'])', rf'\1\2{q}\4', s)
            if t != s:
                open(fp, "w", encoding="utf-8", newline="").write(t); n += 1
    print("판", old or "-", "→", v, "·", n, "개 js")


if __name__ == "__main__":
    main()
