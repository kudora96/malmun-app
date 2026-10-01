"""글자·자모 소리 크기 맞추기 — 원본은 그대로 두고 맞춘 사본을 만든다.
(투덜이 2026-09-30: 「크기도 다 같아야 해」)

  python tools/audit_letters.py --no-stt      (먼저 잰다 → tools/_audit/letters.json)
  python tools/normalize_letters.py           → D:\\gdrive\\malmun\\05_audio\\_app_letters\\{c,j}\\ + media/letters/ (로컬 미리보기)

맞추는 기준 = 목소리 나는 부분의 RMS -16 dB · 꼭대기는 -1 dB 을 넘지 않게 · 앞 0.2초 · 뒤 0.15초 여유(무음).
R2 에는 letters/c/{파일} · letters/j/{이름}.mp3 로 올린다(옛 chars/ jamo/ 와 주소가 달라 폰 캐시에 옛 소리가 남지 않는다).
"""
import json, os, shutil, subprocess

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("LETTERS_OUT", r"D:\gdrive\malmun\05_audio\_app_letters")
FF = os.environ.get("FFMPEG", r"C:\ffmpeg\bin\ffmpeg.exe")
TARGET = -16.0
LEAD_MS, TAIL_S = 200, 0.15  # 앞뒤 여유


def main():
    rows = json.load(open(os.path.join(APP, "tools", "_audit", "letters.json"), encoding="utf-8"))
    for sub in ("c", "j"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
        os.makedirs(os.path.join(APP, "media", "letters", sub), exist_ok=True)
    report = []
    for r in rows:
        src = os.path.join(APP, r["file"])
        sub = "j" if r["kind"] == "jamo" else "c"
        name = os.path.basename(src)
        dst = os.path.join(OUT, sub, name)
        gain = round(TARGET - r["active_db"], 1)
        # 앞 0.2초 · 뒤 0.15초 여유(10-01 투덜이 「무조건 앞에 시간 여유」 — 소리 장치가 깨어나는 동안 첫소리가 먹히지 않게)
        start = max(0.0, r["lead"] - 0.02)
        end = r["dur"] - max(0.0, r["tail"] - 0.02)
        af = (f"atrim={start:.3f}:{end:.3f},asetpts=PTS-STARTPTS,volume={gain}dB,alimiter=limit=0.89:level=false,"
              f"adelay={LEAD_MS}:all=1,apad=pad_dur={TAIL_S}")
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-af", af, "-ar", "44100", "-ac", "1", "-b:a", "128k", dst], check=True)
        shutil.copy2(dst, os.path.join(APP, "media", "letters", sub, name))
        report.append((r["want"], name, r["active_db"], gain))
    print(len(report), "개 · 크기 조정 범위", min(g for *_, g in report), "~", max(g for *_, g in report), "dB")
    # 2차: 자르고 한 줄로 바꾸면 잰 값이 조금 달라진다 → 사본을 다시 재서 0.3dB 넘게 벗어난 것만 한 번 더 맞춘다
    from audit_letters import measure
    fixed = 0
    for r in rows:
        sub = "j" if r["kind"] == "jamo" else "c"
        name = os.path.basename(r["file"])
        dst = os.path.join(OUT, sub, name)
        g = round(TARGET - measure(dst)["active_db"], 1)
        if abs(g) < 0.3:
            continue
        tmp = dst + ".tmp.mp3"
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", dst, "-af", f"volume={g}dB,alimiter=limit=0.89:level=false",
                        "-ar", "44100", "-ac", "1", "-b:a", "128k", tmp], check=True)
        os.replace(tmp, dst)
        shutil.copy2(dst, os.path.join(APP, "media", "letters", sub, name))
        fixed += 1
    print("2차 맞춤", fixed, "개")


if __name__ == "__main__":
    main()
