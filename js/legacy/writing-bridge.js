// 옛 쓰기 코드(writing.js)와 새 앱을 잇는 곳 — 옛 코드는 고치지 않고 여기서만 맞춘다.
// write.js(모듈)가 window.MALMUN_WR 에 { t, jamo(name), lineAudio } 를 넣고 writingData 를 채운 뒤 renderWriting() 을 부른다.
var writingData = null, wrWritingSubId = -1;

function L(key, fb) { var W = window.MALMUN_WR; var s = W && W.t(key); return s && s !== key ? s : fb; }
function escHtml(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function MALMUN_JAMO(name) { return window.MALMUN_WR.jamo(name); }
function wrScrollToTop() { var el = document.getElementById('wr-body'); if (el) el.scrollTop = 0; }

// 문장 원래 소리 = 그 줄 대사 낭독(_sub_t1) — 옛 앱의 explanationsMap·CLIP_ID 대신
window.getWritingKrAudioPath = function () { var W = window.MALMUN_WR; return W && W.lineAudio || null; };

// 문장 듣기: 낱말 음성이 전부 있으면 옛 방식(낱말별 이어 듣기 + 강조), 하나라도 없으면 대사 한 줄 소리로
(function () {
  var orig = window.wrPlayKrAudio;
  window.wrPlayKrAudio = function (onDone) {
    if (!writingData || writingData.words.every(function (w) { return w.audio; })) return orig(onDone);
    var saved = writingData.words.map(function (w) { return w.audio; });
    writingData.words.forEach(function (w) { w.audio = null; });
    try { return orig(onDone); } finally { writingData.words.forEach(function (w, i) { w.audio = saved[i]; }); }
  };
})();

// [말문 추가] 글자 반복 듣기 — 큰 글자 칸을 누르면 그 글자 소리가 계속 반복 · 다시 누르면 멈춤
var wrLoopAudio = null, wrLoopTimer = null, wrLoopSrc = null;
function wrLoopStop() { if (wrLoopTimer) { clearTimeout(wrLoopTimer); wrLoopTimer = null; } if (wrLoopAudio) { wrLoopAudio.pause(); wrLoopAudio = null; } wrLoopSrc = null; var b = document.querySelector('.wr-char-box.looping'); if (b) b.classList.remove('looping'); }
function wrLoopToggle(src) {
  var same = wrLoopSrc === src; wrLoopStop(); if (same || !src) return;
  wrLoopSrc = src; wrLoopAudio = new Audio(src);
  wrLoopAudio.onended = function () { wrLoopTimer = setTimeout(function () { if (wrLoopAudio) wrLoopAudio.play().catch(function () {}); }, 600); };
  wrLoopAudio.play().catch(function () {});
  var b = document.querySelector('.wr-char-box'); if (b) b.classList.add('looping');
}
document.addEventListener('click', function (e) {
  var box = e.target.closest && e.target.closest('.wr-char-box');
  if (!box || !writingData) return;
  var cw = writingData.words[wrWordIdx]; var ch = cw && cw.chars[wrCharIdx];
  wrLoopToggle(ch && ch.audio);
});
// 글자·낱말이 바뀌면 반복을 멈춘다(옛 renderWriting 이 화면을 다시 그릴 때)
(function () { var orig = window.renderWriting; window.renderWriting = function () { wrLoopStop(); return orig.apply(this, arguments); }; })();

// [말문] 소리는 한 번에 하나만 — 쓰기 화면에서 새 소리가 나면 앞 소리를 멈춘다(글자·낱말·문장·자모가 겹치던 문제)
(function () {
  var play = HTMLMediaElement.prototype.play, live = [];
  HTMLMediaElement.prototype.play = function () {
    if (this.tagName === 'AUDIO' && this.volume > 0 && document.querySelector('.writing-overlay')) {
      for (var i = 0; i < live.length; i++) if (live[i] !== this && !live[i].paused) live[i].pause();
      live = live.filter(function (a) { return !a.ended; }).slice(-20);
      if (live.indexOf(this) < 0) live.push(this);
    }
    return play.apply(this, arguments);
  };
})();
