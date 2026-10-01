// 소리 장치 깨워 두기 — 조용하면 스피커·블루투스가 잠들어 다음 소리의 앞부분(0.1~0.3초)이 먹힌다
// (10-01 투덜이 「한 번 누를 때랑 두 번 누를 때 틀려진다」 — 앱은 매번 0초부터 똑같이 트는데, 장치가 깨어나며 첫소리가 잘렸다)
// 학습·쓰기 화면이 열려 있는 동안 들리지 않는 아주 작은 신호(25Hz · −94dB)를 흘려 장치를 깨어 있게 한다.
let ctx = null, osc = null, users = 0;

export function audioCtx() {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function start() {
  try {
    const c = audioCtx();
    if (osc) return;
    osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.value = 25; g.gain.value = 0.00002;
    osc.connect(g); g.connect(c.destination); osc.start();
  } catch {}
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
