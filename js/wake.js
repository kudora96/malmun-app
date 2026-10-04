// 소리 장치 깨워 두기 — 조용하면 스피커·블루투스가 잠들어 다음 소리의 앞부분(0.1~0.3초)이 먹힌다
// (10-01 투덜이 「한 번 누를 때랑 두 번 누를 때 틀려진다」 — 앱은 매번 0초부터 똑같이 트는데, 장치가 깨어나며 첫소리가 잘렸다)
// 학습·쓰기 화면이 열려 있는 동안 귀에 안 들리는 낮은 신호(45Hz · gain 0.0126 ≈ −38dB)를 흘려 장치를 깨어 있게 한다.
// (10-02 확정: 블루투스 스피커는 완전한 무음·너무 작은 신호(25Hz · 0.00002)로는 안 깨어난다 — 투덜이 STOCKWELL II 로 이 값에서 「다 잘 들린다 · 웅 소리 안 들린다」)
let ctx = null, osc = null, users = 0, quiet = false;

export function audioCtx() {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function start() {
  try {
    const c = audioCtx();
    if (osc || quiet) return;
    osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.value = 45; g.gain.value = 0.0126;
    osc.connect(g); g.connect(c.destination); osc.start();
  } catch {}
}

// 녹음하는 동안은 깨우기 소리를 멈춘다 — 출력(블루투스)과 입력(USB)이 다를 때 크롬 에코 제거가 이 소리를 「상대가 말하는 중」으로 보고
// 내 목소리를 100~200ms 마다 끊었다(본부 10-04 진단 녹음 포락선) · 녹음이 끝나면 다시
export function quietWake(on) {
  quiet = !!on;
  if (quiet && osc) { try { osc.stop(); } catch {} osc = null; }
  else if (!quiet && users > 0) start();
}

// 화면이 열릴 때 hold() · 닫힐 때 돌려받은 함수를 부른다. 브라우저는 사용자가 한 번 눌러야 소리를 켜 주므로 첫 누름에도 다시 깨운다.
export function hold() {
  users++;
  start();
  const kick = () => start();
  addEventListener("pointerdown", kick, true);
  return () => {
    removeEventListener("pointerdown", kick, true);
    if (--users <= 0 && osc) { try { osc.stop(); } catch {} osc = null; }
  };
}
