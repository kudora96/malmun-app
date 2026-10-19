// 글 열쇠 빠짐 점검(본부 10-19 — 「네팔어 화면에 영어가 섞임」 · 대표님 「화면 글은 한국어 ⇄ 학습자 언어 둘뿐」) — en.json 의 열쇠는 ko.json · 앱 언어(ne·th·ur·vi).json · 모든 *.ko.json 에 꼭 있어야 함(없으면 영어로 떨어짐)
//  새 열쇠를 en 에만 넣으면 ✗ → 한국어·네팔어를 같이 넣고, 나머지 언어는 다국어부에 요청 · 일부러 없는 것 = ALLOW
(async () => {
  const ALLOW = { "ko.json": ["n_episodes_one", "n_lines_one"], "*.ko.json": ["spk_dubu", "spk_kong"] }; // 한국어 복수형 없음 · 캐릭터 이름은 학습자 글자 그대로
  const v = document.documentElement.dataset.v, get = f => fetch(`/lang/${f}?v=${v}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const en = await get("en.json"), keys = Object.keys(en || {}).filter(k => !k.startsWith("_"));
  const LANGS = ["ne", "th", "ur", "vi"], files = ["ko.json", ...LANGS.map(l => `${l}.json`), ...LANGS.map(l => `${l}.ko.json`)], res = [];
  for (const f of files) {
    const d = await get(f); if (!d) { res.push(`✗ ${f} 못 읽음`); continue; }
    const allow = ALLOW[f] || (f.endsWith(".ko.json") ? ALLOW["*.ko.json"] : []), miss = keys.filter(k => !(k in d) && !allow.includes(k));
    res.push(`${miss.length ? "✗" : "✓"} ${f} 열쇠 ${keys.length - miss.length}/${keys.length}${miss.length ? " · 빠짐 " + miss.slice(0, 12).join(", ") : ""}`);
  }
  return res.join("\n");
})();
