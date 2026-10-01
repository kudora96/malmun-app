"""자막 시각을 영상 속 실제 목소리에 맞춰 잰다 → data/{ep}/{ep}.sync.json
(투덜이 10-01: 「두부 소리가 나면 조금 먼저 영상 아래 바로 자막이 보여야 해」 — 편 JSON 시각이 목소리보다 0.6~1초 늦은 줄이 있었다)

  python tools/measure_sync.py L01-00-01
  (먼저 Whisper 문장 시각: faster-whisper-xxl {영상} --language ko --model large-v3 --output_format json --output_dir tools/_audit/sync)

재는 법: 영상 소리를 말소리 대역(250~3500Hz)으로 걸러 10ms 단위 크기를 본다.
 · 시작 = 자막 시작 앞뒤(-1.6 ~ +0.4초)에서 소리가 크게 올라가는 곳을 찾고, 거기서 거꾸로 걸어 소리가 바닥+6dB 아래였던 마지막 지점
 · 끝   = 자막 끝 앞뒤(-1.0 ~ +0.6초)에서 바닥+6dB 아래로 내려가는 곳 · 다음 줄 시작보다 0.05초 앞을 넘지 않게
검사용(10-01 본부 회신): 앱은 편 JSON 시각을 정본으로 쓰고, 이 도구는 차이가 큰 줄을 찾아 본부에 알릴 때만 쓴다.
 ⚠ 알려진 약점 — 발소리(1000Hz 아래 짧은 쿵) · 바닥 소음 · 앞 줄 꼬리를 시작으로 잡을 수 있다(세종 2·4·8번). 결과는 tools/_audit/sync/ 에 둔다.
"""
import json, os, subprocess, sys
import numpy as np, librosa, scipy.signal as sg

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.environ.get("VIDEO_DIR", r"D:\gdrive\malmun\06_release\video\480")
FF = os.environ.get("FFMPEG", r"C:\ffmpeg\bin\ffmpeg.exe")


def envelope(mp4):
    wav = os.path.join(APP, "tools", "_audit", "sync", os.path.basename(mp4) + ".wav")
    os.makedirs(os.path.dirname(wav), exist_ok=True)
    subprocess.run([FF, "-loglevel", "error", "-y", "-i", mp4, "-ac", "1", "-ar", "16000", wav], check=True)
    y, sr = librosa.load(wav, sr=16000)
    b, a = sg.butter(4, [250 / (sr / 2), 3500 / (sr / 2)], "band")
    hop = 160
    db = 20 * np.log10(librosa.feature.rms(y=sg.filtfilt(b, a, y), frame_length=512, hop_length=hop)[0] + 1e-9)
    return db, np.arange(len(db)) * hop / sr


def sentence_ends(ep):
    """Whisper 문장 끝 시각들(앞 줄 꼬리를 다음 줄 시작으로 잘못 잡지 않게 하는 울타리) — tools/_audit/sync/{ep}.json"""
    p = os.path.join(APP, "tools", "_audit", "sync", f"{ep}.json")
    if not os.path.exists(p):
        return []
    return sorted(g["end"] for g in json.load(open(p, encoding="utf-8"))["segments"])


def measure(ep):
    subs = json.load(open(os.path.join(APP, "data", ep, f"{ep}.json"), encoding="utf-8"))["subtitles"]
    db, t = envelope(os.path.join(VIDEO, f"{ep}.mp4"))
    ends = sentence_ends(ep)
    out, prev_off = {}, 0.0
    for n, s in enumerate(subs):
        fence = max([e for e in ends if e < s["start"] - 0.2], default=0.0)
        lo, hi = max(prev_off, fence, s["start"] - 1.6), s["start"] + 0.4
        idx = np.where((t >= lo) & (t <= hi))[0]
        floor = np.percentile(db[idx], 15)
        peak = db[(t >= s["start"]) & (t <= s["start"] + 1.5)].max()
        half = floor + 0.5 * (peak - floor)
        ups = [k for k in idx[1:] if db[k - 1] < half <= db[k] and (db[k:k + 8] >= half - 3).all()]
        if not ups:
            on = s["start"]
        else:
            k = min(ups, key=lambda k: abs(t[k] - (s["start"] - 0.4)))
            while k > idx[0] and t[k - 1] >= lo and db[k - 1] > floor + 6:
                k -= 1
            on = float(t[k])
        out[s["id"]] = {"on": round(on, 2), "start": s["start"], "end": s["end"]}
        prev_off = on + 0.3
    for n, s in enumerate(subs):
        nxt = out[subs[n + 1]["id"]]["on"] if n + 1 < len(subs) else s["end"] + 1
        idx = np.where((t >= s["end"] - 1.0) & (t <= min(s["end"] + 0.6, nxt)))[0]
        floor = np.percentile(db[idx], 15) if idx.size else -80
        off = s["end"]
        for k in idx[::-1]:
            if db[k] > floor + 6:
                off = float(t[k]) + 0.12
                break
        out[s["id"]]["off"] = round(min(off, nxt - 0.05), 2)
    path = os.path.join(APP, "tools", "_audit", "sync", f"{ep}.sync.json")
    json.dump({"clip_id": ep, "how": "tools/measure_sync.py", "lines": out}, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for i, v in out.items():
        print(f"{i:>3}  자막 {v['start']:6.2f}~{v['end']:6.2f}  →  목소리 {v['on']:6.2f}~{v['off']:6.2f}  (시작 {v['start'] - v['on']:+.2f}초 늦었음)")
    return out


if __name__ == "__main__":
    for ep in sys.argv[1:]:
        measure(ep)
