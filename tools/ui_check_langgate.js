// 언어별 「출시 가능」 검사(다국어부 10-19 · 대표님 원칙 「화면 글은 한국어 ⇄ 학습자 언어뿐 · 영어가 섞이면 안 됨」) — run_all 에 붙여 판마다 ✗ 0
//  ui_check_langkeys(앱개발부 · ko·ne·.ko 고정 목록)를 넓힌 것: 언어 목록을 js/langs.js 단계(ready·pilot)에서 읽음 → 새 언어가 들어오면 저절로 검사
//  기준 열쇠 = lang/en.json(열쇠 정본 · "_" 메모 빼고 · 복수형 _one/_few… 는 바탕 열쇠가 있으면 됨)
//  ✗ = 공개(ready)·시범(pilot) 언어의 그 말 글(lang/xx.json)에 빠진 열쇠 → 그 언어 「출시 불가」(빠진 자리는 한국어로 떨어짐 · 10-19 i18n)
//  ✗ = ⇄ 있는 언어의 한국어판(lang/xx.ko.json)에 빠진 열쇠 · ko.json(바탕)에 빠진 열쇠
//  ℹ = 아직 단계 없는 언어(선택 목록에선 「곧」) — 글 파일 유무·빠진 수만
(async () => {
  const ALLOW = { "ko": ["n_episodes_one", "n_lines_one"], "*.ko": ["spk_dubu", "spk_kong"] }; // 한국어 복수형 없음 · 캐릭터 이름은 학습자 글자(앱개발부 langkeys 와 같음)
  const v = document.documentElement.dataset.v, out = [];
  const { LANG_INFO } = await import(`/js/langs.js?v=${v}`);
  const get = async f => { try { const r = await fetch(`/lang/${f}.json?v=${v}&_=${Date.now()}`); return r.ok ? await r.json() : null; } catch { return null; } };
  const en = await get("en"); if (!en) return "✗ lang/en.json 을 못 읽음";
  const PL = /_(zero|one|two|few|many|other)$/;
  const base = Object.keys(en).filter(k => !k.startsWith("_") && !(PL.test(k) && en[k.replace(PL, "")] != null));
  const miss = (d, allow = []) => base.filter(k => (d[k] == null || d[k] === "") && !allow.includes(k));
  const short = m => `${m.slice(0, 12).join(" ")}${m.length > 12 ? " …" : ""}`;
  let bad = 0;
  const ko = await get("ko"), mko = ko ? miss(ko, ALLOW.ko) : base;
  if (mko.length) { bad++; out.push(`✗ ko(바탕 · 빠진 열쇠가 떨어지는 곳) 빠진 ${mko.length}: ${short(mko)}`); } else out.push(`✓ ko 바탕 ${base.length}/${base.length}`);
  for (const [c, info] of Object.entries(LANG_INFO).sort()) {
    if (c === "en") continue;
    const st = info.stage || "", d = await get(c);
    if (!st) { out.push(`ℹ ${c} 단계 없음(곧) · 글 파일 ${d ? `있음 · 빠진 ${miss(d).length}` : "없음"}`); continue; }
    if (!d) { bad++; out.push(`✗ ${c}(${st}) 출시 불가 · lang/${c}.json 없음`); continue; }
    const m = miss(d);
    if (m.length) { bad++; out.push(`✗ ${c}(${st}) 출시 불가 · 빠진 열쇠 ${m.length}: ${short(m)}`); } else out.push(`✓ ${c}(${st}) 열쇠 ${base.length}/${base.length}`);
    if (info.ko_ui) {
      const k = await get(`${c}.ko`), mk = k ? miss(k, ALLOW["*.ko"]) : base;
      if (mk.length) { bad++; out.push(`✗ ${c}(${st}) ⇄ 한국어판 빠진 ${mk.length}: ${short(mk)}`); } else out.push(`✓ ${c} ⇄ 한국어판 ${base.length}/${base.length}`);
    }
  }
  out.push(bad ? `✗ 합계 ${bad}` : "✓ 공개·시범 언어 모두 열쇠 빠짐 0");
  return out.join("\n");
})();
