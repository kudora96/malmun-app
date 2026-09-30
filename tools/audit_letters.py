"""글자·자모 소리 점검 — 크기 · 길이 · 앞뒤 빈소리 · 목소리 높이 · 받아쓰기
(투덜이 2026-09-30: ㅏ 누르면 「아」 · ㅡ 는 소리가 작다 · 톤과 크기가 다 같아야 한다 · 하나씩 다 점검)

  python tools/audit_letters.py            → tools/_audit/letters.md · letters.json
  python tools/audit_letters.py --no-stt   (받아쓰기 빼고 빨리)

크기 = 목소리 나는 부분만의 RMS(dBFS) — 파일 전체 평균은 빈소리 길이에 따라 흔들려서 쓰지 않는다.
받아쓰기 = 본부 Whisper(make_srt 와 같은 exe) · 힌트 없이(한 음절은 힌트를 주면 그대로 따라 써서 검사가 안 된다).
"""
import glob, json, os, subprocess, sys
import numpy as np, librosa, warnings
warnings.filterwarnings("ignore")

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, "tools", "_audit")
WHISPER_DIR = os.path.join(os.environ.get("APPDATA", ""), "Subtitle Edit", "Whisper", "Purfview-Whisper-Faster")
WHISPER_EXE = os.path.join(WHISPER_DIR, "faster-whisper-xxl.exe")

JAMO = {"a": "아", "ae": "애", "ya": "야", "yae": "얘", "eo": "어", "e": "에", "yeo": "여", "ye": "예", "o": "오", "wa": "와",
        "wae": "왜", "oe": "외", "yo": "요", "u": "우", "wo": "워", "we": "웨", "wi": "위", "yu": "유", "eu": "으", "ui": "의", "i": "이",
        "giyeok": "기역", "ssang_giyeok": "쌍기역", "nieun": "니은", "digeut": "디귿", "ssang_digeut": "쌍디귿", "rieul": "리을",
        "mieum": "미음", "bieup": "비읍", "ssang_bieup": "쌍비읍", "siot": "시옷", "ssang_siot": "쌍시옷", "ieung": "이응",
        "jieut": "지읒", "ssang_jieut": "쌍지읒", "chieut": "치읓", "kieuk": "키읔", "tieut": "티읕", "pieup": "피읖", "hieut": "히읗"}


def expected():
    idx = json.load(open(os.path.join(APP, "data", "chars_index.json"), encoding="utf-8"))
    items = [("jamo", f"media/jamo/{k}.mp3", v) for k, v in JAMO.items()]
    items += [("char", f"media/chars/{f}", ch) for ch, f in idx.items()]
    return [(kind, os.path.join(APP, p), want) for kind, p, want in items if os.path.exists(os.path.join(APP, p))]


def measure(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    frame = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]
    db = 20 * np.log10(np.maximum(frame, 1e-9))
    voiced = db > max(db.max() - 30, -50)
    idx = np.where(voiced)[0]
    t = librosa.frames_to_time(np.arange(len(db)), sr=sr, hop_length=256)
    act = 20 * np.log10(np.sqrt(np.mean(frame[voiced] ** 2)) + 1e-9) if idx.size else -99
    f0, vflag, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr)
    f0 = f0[vflag] if vflag is not None else []
    return {
        "active_db": round(float(act), 1), "peak_db": round(float(20 * np.log10(np.abs(y).max() + 1e-9)), 1),
        "dur": round(len(y) / sr, 2), "voice_dur": round(float(t[idx[-1]] - t[idx[0]]), 2) if idx.size else 0,
        "lead": round(float(t[idx[0]]), 2) if idx.size else 0, "tail": round(float(len(y) / sr - t[idx[-1]]), 2) if idx.size else 0,
        "f0": round(float(np.median(f0)), 0) if len(f0) else None,
    }


def transcribe(paths):
    os.makedirs(os.path.join(OUT, "_stt"), exist_ok=True)
    got = {}
    for i in range(0, len(paths), 60):
        chunk = paths[i:i + 60]
        subprocess.run([WHISPER_EXE, *chunk, "--language", "ko", "--model", "large-v3", "--model_dir", os.path.join(WHISPER_DIR, "_models"),
                        "--output_format", "json", "--output_dir", os.path.join(OUT, "_stt"), "--beep_off"], cwd=WHISPER_DIR, capture_output=True)
        for p in chunk:
            j = os.path.join(OUT, "_stt", os.path.splitext(os.path.basename(p))[0] + ".json")
            try:
                got[p] = "".join(s["text"] for s in json.load(open(j, encoding="utf-8"))["segments"]).strip()
            except Exception:
                got[p] = "?"
        print(f"받아쓰기 {min(i + 60, len(paths))}/{len(paths)}", flush=True)
    return got


def main():
    os.makedirs(OUT, exist_ok=True)
    items = expected()
    rows = []
    for kind, p, want in items:
        rows.append({"kind": kind, "file": os.path.relpath(p, APP).replace("\\", "/"), "want": want, **measure(p)})
    if "--no-stt" not in sys.argv:
        heard = transcribe([os.path.join(APP, r["file"]) for r in rows])
        for r in rows:
            h = heard.get(os.path.join(APP, r["file"]), "?")
            r["heard"] = h
            r["stt_ok"] = r["want"] in h.replace(" ", "")
    json.dump(rows, open(os.path.join(OUT, "letters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(len(rows), "개 점검 →", os.path.join(OUT, "letters.json"))


if __name__ == "__main__":
    main()
