// 소리는 언제나 하나(앱 CLAUDE.md W5 · 대표님 11-18 12:49 「저번에 했던 건데 왜 또 겹치지」) — 공용 한 곳.
// 소리가 나는 쪽은 자기 멈춤 함수를 onSound(이름, 멈춤)으로 등록하고, 새 소리를 시작할 때 claim(자기 이름)을 부른다 → 나머지는 전부 멈춤(읽기 창은 멈춘 채 남음 · ▶ 하면 이어서).
// 새 소리 길을 만들면 반드시 claim 을 부른다(경로마다 따로 멈추지 않음). 자동 검사 = 07_tools/qa one_sound.
const owners = new Map();
export const onSound = (name, stop) => { owners.set(name, stop); return () => { if (owners.get(name) === stop) owners.delete(name); }; };
export function claim(name) { for (const [n, f] of [...owners]) if (n !== name) { try { f(); } catch {} } }
