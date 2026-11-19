# 판 번호 올리기 — 앱 코드를 고칠 때마다 돌린다(본부 10-04: 학습자는 Ctrl+Shift+R 을 모른다)
#   python tools/bump_version.py 1118.12  → 그 번호로 올림 (인자는 MMDD.차례 형식만 · origin 판보다 커야 함)
#   python tools/bump_version.py          → 제안만(바꾸지 않음) · --next 를 붙이면 제안한 번호로 올림
#   python tools/bump_version.py --help   → 사용법만
# 형식이 아닌 인자(10, abc 등)는 아무것도 바꾸지 않고 사용법 출력 · 종료코드 1 (11-18 사고: 판 번호가 「--help」「10」으로 바뀜)
# 하는 일: js/version.js · version.json 에 판 번호 → index.html 의 css/js 주소와 모든 js 의 import 주소에 ?v=판번호
# (주소가 바뀌면 브라우저는 반드시 새로 받는다 · 데이터·말 JSON 은 data.js·i18n.js 가 VERSION 을 붙여 받음)
# 열려 있던 탭은 version.json 을 가끔 확인해 새 판이 있으면 「새 판이 있어요」 띠를 띄운다(js/main.js).
# 인터넷(R2·Pages) 판: 코드는 이 판 번호 주소 그대로(GitHub Pages 기본 max-age 10분이어도 주소가 달라 새로 받음) ·
#   소리·영상(R2)은 지금처럼 paths.js 의 ?v= 를 바뀐 종류만 올린다 — 올리기는 투덜이 「올려」 뒤.
import datetime, json, os, re, subprocess, sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(errors="replace")  # 콘솔 글자 때문에 죽지 않게
    except Exception:
        pass

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORM = re.compile(r"^\d{4}\.\d+$")
USAGE = """사용법:
  python tools/bump_version.py 1118.12   판 번호를 그 값으로 올림 (형식 MMDD.차례, 예 1118.10)
  python tools/bump_version.py           지금 version.json 을 읽어 다음 번호를 제안만 함(바꾸지 않음)
  python tools/bump_version.py --next    제안한 다음 번호(오늘 MMDD.끝번호+1)로 올림
  python tools/bump_version.py --help    이 도움말
새 판은 origin/main 의 version.json 보다 커야 하고, 형식이 다르면 아무것도 바꾸지 않고 종료코드 1."""


def key(v):
    a, b = v.split(".")
    return (int(a), int(b))


def read_text(p):
    return open(p, encoding="utf-8", newline="").read()  # 줄 끝(CRLF/LF)을 그대로 읽음


def write_text(p, s):
    open(p, "w", encoding="utf-8", newline="").write(s)


def cur_version():
    vf = os.path.join(APP, "version.json")
    try:
        return json.load(open(vf, encoding="utf-8"))["v"] if os.path.exists(vf) else ""
    except Exception:
        return ""


def origin_version():
    """origin/main 의 version.json 판(가져올 수 없으면 빈 문자열)."""
    try:
        subprocess.run(["git", "-C", APP, "fetch", "-q", "origin"], timeout=60,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        r = subprocess.run(["git", "-C", APP, "show", "origin/main:version.json"], timeout=30,
                           capture_output=True, text=True, encoding="utf-8")
        v = json.loads(r.stdout)["v"] if r.returncode == 0 else ""
        return v if FORM.match(v or "") else ""
    except Exception:
        return ""


def suggest(base):
    day = datetime.date.today().strftime("%m%d")
    n = int(base.split(".")[1]) + 1 if base.startswith(day + ".") else 1
    return f"{day}.{n}"


MARK = re.compile(r"^(<<<<<<< |>>>>>>> |=======\r?$)", re.M)


def conflict_files():
    """충돌 표시(<<<<<<< ======= >>>>>>>)가 든 js/css/html/json 파일 목록 (11-19 1119.21 사고)."""
    bad = []
    for root, ds, files in os.walk(APP):
        ds[:] = [d for d in ds if d not in (".git", "node_modules")]
        for f in files:
            if f.endswith((".js", ".css", ".html", ".json")):
                fp = os.path.join(root, f)
                try:
                    if MARK.search(read_text(fp)):
                        bad.append(os.path.relpath(fp, APP))
                except Exception:
                    pass
    return bad


def diff_check_marks():
    r = subprocess.run(["git", "-C", APP, "diff", "--check", "HEAD"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return [l for l in r.stdout.splitlines() if "conflict marker" in l]


def fail(msg):
    print("X", msg)
    print(USAGE)
    sys.exit(1)


def apply(v, old):
    json.dump({"v": v}, open(os.path.join(APP, "version.json"), "w", encoding="utf-8"))
    vp = os.path.join(APP, "js", "version.js")
    eol = "\r\n" if os.path.exists(vp) and "\r\n" in read_text(vp) else "\n"
    write_text(vp, f'// 판 번호 — tools/bump_version.py 가 씀(손으로 고치지 않음){eol}export const VERSION = "{v}";{eol}')
    q = f"?v={v}"
    p = os.path.join(APP, "index.html")
    s = read_text(p)
    s = re.sub(r'(href="css/app\.css)(\?v=[^"]*)?"', rf'\1{q}"', s)
    s = re.sub(r'(src="js/main\.js)(\?v=[^"]*)?"', rf'\1{q}"', s)
    write_text(p, s)
    n = 0
    for root, _, files in os.walk(os.path.join(APP, "js")):
        for f in files:
            if not f.endswith(".js"):
                continue
            fp = os.path.join(root, f)
            s = read_text(fp)
            t = re.sub(r'((?:from|import)\s*\(?\s*["\'])(\.{1,2}/[^"\'?]+\.js)(\?v=[^"\']*)?(["\'])', rf'\1\2{q}\4', s)
            if t != s:
                write_text(fp, t); n += 1
    print("판", old or "-", "→", v, "·", n, "개 js")


def main():
    args = sys.argv[1:]
    if any(a in ("--help", "-h") for a in args):
        print(USAGE); return
    if len(args) > 1:
        fail("인자가 너무 많습니다: " + " ".join(args))
    old = cur_version()
    ov = origin_version()
    if not args or args[0] == "--next":
        base = old
        if ov and (not base or key(ov) > key(base)):
            base = ov
        v = suggest(base if FORM.match(base or "") else "")
        if not args:
            print(f"지금 판 {old or '-'} (origin {ov or '?'}) · 제안: {v}")
            print(f"바꾸려면: python tools/bump_version.py {v}   (또는 --next)")
            return
    else:
        v = args[0]
        if not FORM.match(v):
            fail(f"판 번호 형식이 아닙니다: {v!r} (MMDD.차례, 예 1118.10)")
    for name, ref in (("지금 판", old), ("origin 판", ov)):
        if FORM.match(ref or "") and key(v) <= key(ref):
            fail(f"새 판 {v} 은 {name} {ref} 보다 커야 합니다(작거나 같으면 거부)")
    bad = conflict_files() + diff_check_marks()
    if bad:
        fail("충돌 표시가 남아 있어 판을 올리지 않습니다: " + ", ".join(bad[:5]))
    apply(v, old)


if __name__ == "__main__":
    main()
