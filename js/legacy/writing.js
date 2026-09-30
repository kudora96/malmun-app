// 옛 앱(C:\kdrama-topik\learn.html) 쓰기 연습 — 투덜이 2026-09-30 「예전에 만든 그 방식대로」
// 아래는 옛 코드를 줄 그대로 옮긴 것(1849-1859 · 1890-1924 · 1975-2036 · 2038-2352). 바꾼 곳은 「// [말문]」 표시.
// 새 앱과의 연결(데이터·음성 경로·화면 틀·글자 반복 듣기)은 맨 아래 「말문 연결」에 있다.

var _quizAudioCtx = null;
function _getAudioCtx() { if (!_quizAudioCtx) { try { _quizAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _quizAudioCtx; }
function playQuizSound(correct, vol) {
  var v = typeof vol === 'number' ? vol : 1;
  try { var ctx = _getAudioCtx(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume();
    if (correct) { [523,659].forEach(function(f,i) { var o=ctx.createOscillator(); var g=ctx.createGain(); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(v,ctx.currentTime+i*0.15); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.15+0.3); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime+i*0.15); o.stop(ctx.currentTime+i*0.15+0.3); }); }
    else { [200,180].forEach(function(f,i) { var o=ctx.createOscillator(); var g=ctx.createGain(); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(v,ctx.currentTime+i*0.15); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.15+0.2); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime+i*0.15); o.stop(ctx.currentTime+i*0.15+0.2); }); }
  } catch(e) {}
}

// ── Writing Practice ──
var writingData = null, wrWritingSubId = -1, wrWordIdx = 0, wrCharIdx = 0, wrJamoIdx = 0, wrEnteredJamo = [], wrAdvanceTimer = null, wrWordAudio = null, wrSentenceAudio = null, wrSentenceIdx = -1, wrSentenceTimer = null, wrSkipping = false, wrSkipTarget = -1, wrSkipTimer = null, wrSkipAudio = null, wrPreloadedAudio = null, wrPreloadReady = false, wrKrAudio = null, wrKrTimer = null, wrAutoPlayTimer = null, wrSkipAllPending = false;

var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
var JAMO_AUDIO = {'ㄱ':'giyeok','ㄲ':'ssang_giyeok','ㄴ':'nieun','ㄷ':'digeut','ㄸ':'ssang_digeut','ㄹ':'rieul','ㅁ':'mieum','ㅂ':'bieup','ㅃ':'ssang_bieup','ㅅ':'siot','ㅆ':'ssang_siot','ㅇ':'ieung','ㅈ':'jieut','ㅉ':'ssang_jieut','ㅊ':'chieut','ㅋ':'kieuk','ㅌ':'tieut','ㅍ':'pieup','ㅎ':'hieut','ㅏ':'a','ㅐ':'ae','ㅑ':'ya','ㅒ':'yae','ㅓ':'eo','ㅔ':'e','ㅕ':'yeo','ㅖ':'ye','ㅗ':'o','ㅘ':'wa','ㅙ':'wae','ㅚ':'oe','ㅛ':'yo','ㅜ':'u','ㅝ':'wo','ㅞ':'we','ㅟ':'wi','ㅠ':'yu','ㅡ':'eu','ㅢ':'ui','ㅣ':'i'};

var COMPOUND_VOWEL = {'ㅐ':['ㅏ','ㅣ'],'ㅔ':['ㅓ','ㅣ'],'ㅘ':['ㅗ','ㅏ'],'ㅙ':['ㅗ','ㅏ','ㅣ'],'ㅚ':['ㅗ','ㅣ'],'ㅝ':['ㅜ','ㅓ'],'ㅞ':['ㅜ','ㅓ','ㅣ'],'ㅟ':['ㅜ','ㅣ'],'ㅢ':['ㅡ','ㅣ'],'ㅒ':['ㅑ','ㅣ'],'ㅖ':['ㅕ','ㅣ']};
function expandJamo(arr) { var r = []; for (var i = 0; i < arr.length; i++) { var d = COMPOUND_VOWEL[arr[i]]; if (d) { for (var j = 0; j < d.length; j++) r.push(d[j]); } else { r.push(arr[i]); } } return r; }

function composeHangul(j) { if (j.length === 0) return ''; if (j.length === 1) return j[0]; var ci = CHO.indexOf(j[0]); if (ci < 0) return j.join(''); var ji = JUNG.indexOf(j[1]); if (ji < 0) return j.join(''); if (j.length === 2) return String.fromCharCode(0xAC00 + (ci*21+ji)*28); var ki = JONG.indexOf(j[2]); if (ki < 0) return j.join(''); return String.fromCharCode(0xAC00 + (ci*21+ji)*28+ki); }
function composeFromExpanded(j) {
  if (j.length === 0) return '';
  var cho = j[0]; if (CHO.indexOf(cho) < 0) return j.join('');
  if (j.length === 1) return cho;
  var vParts = []; var vi = 1;
  while (vi < j.length && CHO.indexOf(j[vi]) < 0) { vParts.push(j[vi]); vi++; }
  if (vParts.length === 0) return j.join('');
  var vowel = vParts.length === 1 ? vParts[0] : null;
  if (!vowel) { for (var k in COMPOUND_VOWEL) { var d = COMPOUND_VOWEL[k]; if (d.length === vParts.length) { var match = true; for (var m = 0; m < d.length; m++) { if (d[m] !== vParts[m]) { match = false; break; } } if (match) { vowel = k; break; } } } }
  if (!vowel) return j.join('');
  var ci = CHO.indexOf(cho); var ji = JUNG.indexOf(vowel);
  if (ji < 0) return j.join('');
  if (vi >= j.length) return String.fromCharCode(0xAC00 + (ci*21+ji)*28);
  var jong = j[vi];
  var COMPOUND_JONG = {'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
  if (vi + 1 < j.length && CHO.indexOf(j[vi+1]) >= 0) { var cj = COMPOUND_JONG[jong + j[vi+1]]; if (cj) jong = cj; }
  var ki = JONG.indexOf(jong);
  if (ki < 0) return j.join('');
  return String.fromCharCode(0xAC00 + (ci*21+ji)*28+ki);
}
var _jamoAudioCache = {};
function preloadJamoAudio() { for (var j in JAMO_AUDIO) { if (!_jamoAudioCache[j]) { try { _jamoAudioCache[j] = new Audio(MALMUN_JAMO(JAMO_AUDIO[j])) /* [말문] 경로 */; _jamoAudioCache[j].preload = 'auto'; } catch(e) {} } } }
function playJamoAudio(jamo) { var a = _jamoAudioCache[jamo]; if (a) { try { a.currentTime = 0; a.play().catch(function(){}); return a; } catch(e) {} } return null; }
function renderWriting() {
  var body = document.getElementById('wr-body');
  if (!writingData) {
    body.innerHTML = '<div class="wr-complete"><div class="wr-complete-icon">📝</div><div class="wr-complete-title">' + L('writing_preparing','쓰기 연습 준비 중') + '</div><div class="wr-complete-ne">' + L('writing_preparing_desc','이 자막의 쓰기 연습 데이터가 아직 준비되지 않았습니다.') + '</div></div>';
    return;
  }
  var words = writingData.words; var html = '';
  var allDone = wrWordIdx >= words.length;
  // Word progress bar removed
  if (allDone) {
    html += '<div class="wr-complete"><div class="wr-complete-icon">🎉</div><div class="wr-complete-title">' + L('sentence_complete','문장 완성!') + '</div><div class="wr-complete-words" id="wr-complete-words">';
    for (var i = 0; i < words.length; i++) { html += '<span class="wr-cw" id="wr-cw-' + i + '">' + escHtml(words[i].word) + (words[i].meaning_ne ? '<span class="wr-cw-ne">' + escHtml(words[i].meaning_ne) + '</span>' : '') + '</span>'; }
    html += '</div><div class="wr-complete-ne">' + escHtml(writingData.sentence_ne) + '</div><div class="wr-complete-btns"><button class="wr-cbtn wr-cbtn-repeat" id="wr-complete-play-btn" onclick="toggleCompleteAudio()">🔊 ' + L('btn_listen','वाक्य सुन्नुहोस्') + '</button><button class="wr-cbtn wr-cbtn-repeat" id="wr-kr-complete-btn" onclick="toggleKrSentenceAudio()">🔊 ' + L('listen_sentence','पूरा वाक्य मूल सुन्नुहोस्') + '</button></div><div class="wr-complete-btns"><button class="wr-cbtn wr-cbtn-retry" onclick="retryWriting()">🔄 ' + L('retry_writing','다시 연습') + '</button></div></div>';
    body.innerHTML = html; playQuizSound(true); if (wrAutoPlayTimer) clearTimeout(wrAutoPlayTimer); wrAutoPlayTimer = setTimeout(function() { wrAutoPlayTimer = null; playSentenceAudioWithBtn(); }, 800); return;
  }
  html += '<div class="wr-sentence">'; for (var i = 0; i < words.length; i++) { var cls = 'wr-w'; if (i === wrWordIdx) cls += ' wr-w-active'; html += '<span class="' + cls + '" onclick="wrGoToWord(' + i + ')">' + escHtml(words[i].word) + '</span>'; if (i < words.length - 1) html += ' '; } html += '</div>';
  var cw = words[wrWordIdx]; var cc = cw.chars;
  if (wrCharIdx >= cc.length) {
    html += '<div class="wr-word-done"' + (cw.audio ? ' onclick="wrReplayWordAudio(\'' + escHtml(cw.audio).replace(/'/g, "\\'") + '\')" style="cursor:pointer"' : '') + '>✅ ' + escHtml(cw.word) + (cw.meaning_ne ? ' (' + escHtml(cw.meaning_ne) + ')' : '');
    var hasCharAudio = false; for (var ca = 0; ca < cc.length; ca++) { if (cc[ca].audio) { hasCharAudio = true; break; } }
    if (hasCharAudio) {
      html += '<span class="wr-char-audio-row">';
      for (var ca = 0; ca < cc.length; ca++) { if (cc[ca].audio) html += '<button class="wr-char-audio-play" onclick="event.stopPropagation();wrPlayCharAudio(\'' + escHtml(cc[ca].audio).replace(/'/g, "\\'") + '\')">🔊' + escHtml(cc[ca].char) + '</button>'; }
      html += '</span>';
    }
    html += '</div>';
    html += '<div class="wr-word-btns"><button class="wr-next-btn" onclick="wrNextWord()">' + L('next_word','다음 단어 →') + '</button></div>';
    body.innerHTML = html; playQuizSound(true);
    return;
  }
  var ch = cc[wrCharIdx]; var exJamo = expandJamo(ch.jamo); var tJ = exJamo.length;
  var wrWordHtml = ''; for (var ci = 0; ci < cc.length; ci++) { if (ci === wrCharIdx) wrWordHtml += '<span class="wr-cn-hi">' + escHtml(cc[ci].char) + '</span>'; else wrWordHtml += escHtml(cc[ci].char); }
  var wrNeHtml = cw.meaning_ne ? '<span class="wr-cn-ne">' + escHtml(cw.meaning_ne) + '</span>' : '';
  html += '<div class="wr-char-area"><div class="wr-char-inline"><div class="wr-char-box"><div class="wr-target-char">' + escHtml(ch.char) + '</div><div class="wr-composed" id="wr-composed">' + escHtml(composeFromExpanded(wrEnteredJamo)) + '</div></div><div class="wr-char-ne">' + wrWordHtml + wrNeHtml + '</div></div><div class="wr-jamo-slots">';
  for (var i = 0; i < tJ; i++) { var sc = 'wr-slot'; if (i < wrJamoIdx) sc += ' filled'; else if (i === wrJamoIdx) sc += ' current'; html += '<div class="' + sc + '">' + escHtml(exJamo[i]) + '</div>'; }
  html += '</div>';
  // Show compound vowel alternative hint
  var hasCompound = false;
  for (var ci2 = 0; ci2 < ch.jamo.length; ci2++) { if (COMPOUND_VOWEL[ch.jamo[ci2]]) { hasCompound = true; break; } }
  if (hasCompound) { html += '<div class="wr-alt-hint">' + L('alt_or','वा ') /* [말문] */ + escHtml(ch.jamo.join(' + ')) + '</div>'; }
  html += '</div>';
  var basicCho = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var doubleCho = ['ㄲ','ㄸ','ㅃ','ㅆ','ㅉ'];
  var basicVow = ['ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ'];
  var compVow = ['ㅐ','ㅒ','ㅔ','ㅖ','ㅘ','ㅙ','ㅚ','ㅝ','ㅞ','ㅟ','ㅢ'];
  html += '<div class="wr-keyboard">';
  html += '<div class="wr-kb-label">기본 자음 Basic Consonants</div>';
  html += '<div class="wr-kb-row">';
  for (var i = 0; i < basicCho.length; i++) html += '<button class="wr-kb-btn consonant" onclick="pressJamo(\'' + basicCho[i] + '\')">' + basicCho[i] + '</button>';
  html += '</div>';
  html += '<div class="wr-kb-label">쌍자음 Double Consonants</div>';
  html += '<div class="wr-kb-row">';
  for (var i = 0; i < doubleCho.length; i++) html += '<button class="wr-kb-btn consonant" onclick="pressJamo(\'' + doubleCho[i] + '\')">' + doubleCho[i] + '</button>';
  html += '</div>';
  html += '<div class="wr-kb-label">모음 Vowels</div>';
  html += '<div class="wr-kb-row">';
  for (var i = 0; i < basicVow.length; i++) html += '<button class="wr-kb-btn vowel" onclick="pressJamo(\'' + basicVow[i] + '\')">' + basicVow[i] + '</button>';
  html += '</div>';
  html += '</div>';
  html += '<div class="wr-skip-row"><button class="wr-skip-btn" id="wr-skip-word-btn" onclick="wrSkipWord()">▶ ' + L('skip','शब्द स्वतः पूरा') + '</button><button class="wr-skip-btn" id="wr-skip-all-btn" onclick="wrSkipAll()">⏭ ' + L('skip_all','सबै स्वतः पूरा') + '</button><button class="wr-skip-btn" id="wr-original-btn" onclick="toggleOriginalAudio()">🔊 ' + L('listen_original','शब्द सुन्नुहोस्') + '</button><button class="wr-skip-btn" id="wr-kr-btn" onclick="toggleKrSentenceAudio()">🔊 ' + L('listen_sentence','पूरा वाक्य मूल सुन्नुहोस्') + '</button></div>';
  body.innerHTML = html;
}
function pressJamo(jamo) {
  if (!writingData || wrAdvanceTimer || wrSkipping) return; var words = writingData.words; if (wrWordIdx >= words.length) return;
  var cw = words[wrWordIdx]; if (wrCharIdx >= cw.chars.length) return; var ch = cw.chars[wrCharIdx];
  var exJamo = expandJamo(ch.jamo); var exp = exJamo[wrJamoIdx];
  // Check compound vowel input: e.g. user presses ㅐ when expecting ㅏ+ㅣ
  var advance = 0;
  if (jamo === exp) { advance = 1; }
  else if (COMPOUND_VOWEL[jamo]) {
    var parts = COMPOUND_VOWEL[jamo]; var match = true;
    for (var pi = 0; pi < parts.length; pi++) { if (exJamo[wrJamoIdx + pi] !== parts[pi]) { match = false; break; } }
    if (match) advance = parts.length;
  }
  if (advance > 0) {
    for (var ai = 0; ai < advance; ai++) wrEnteredJamo.push(exJamo[wrJamoIdx + ai]);
    wrJamoIdx += advance;
    var cel = document.getElementById('wr-composed'); if (cel) cel.textContent = composeFromExpanded(wrEnteredJamo); updateSlots(exJamo.length);
    var charDone = wrJamoIdx >= exJamo.length;
    if (charDone) { if (cel) cel.classList.add('flash-correct'); }
    var isLastChar = wrCharIdx >= cw.chars.length - 1 && wrWordIdx >= words.length - 1;
    var isLastWordChar = wrCharIdx >= cw.chars.length - 1;
    requestAnimationFrame(function(){
      flashJamoBtn(jamo, true);
      if (charDone) { if (isLastChar) wrPreloadKrForCompletion(); }
      requestAnimationFrame(function(){
        if (charDone) {
          if (typeof wrWordAudio !== 'undefined' && wrWordAudio) { wrWordAudio.pause(); wrWordAudio = null; }
          if (ch.audio) { var charAudio = new Audio(ch.audio); charAudio.play().catch(function(){}); }
          if (isLastWordChar) playQuizSound(true);
        } else { playQuizSound(true, 0.3); playJamoAudio(jamo); }
      });
    });
    if (charDone) {
      // Pause and show next button for all chars (including last)
      wrAdvanceTimer = true; // block input
      var wrBody3 = document.getElementById('wr-body');
      var kbEl = wrBody3.querySelector('.wr-keyboard'); if (kbEl) kbEl.style.display = 'none';
      var skEl = wrBody3.querySelector('.wr-skip-row'); if (skEl) skEl.style.display = 'none';
      var nextDiv = document.createElement('div');
      nextDiv.className = 'wr-char-next-row';
      var chAudioPath = ch.audio;
      nextDiv.innerHTML = (chAudioPath ? '<button class="wr-char-next-btn wr-char-replay-btn" onclick="wrPlayCharAudio(\'' + escHtml(chAudioPath).replace(/'/g, "\\'") + '\')">🔊 ' + escHtml(ch.char) + '</button>' : '') + '<button class="wr-char-next-btn wr-char-advance-btn" onclick="wrAdvanceChar()">' + L('next_char','अर्को →') /* [말문] */ + '</button>';
      wrBody3.appendChild(nextDiv);
      if (ch.explanation_ne) { var explDiv = document.createElement('div'); explDiv.className = 'wr-explain'; explDiv.textContent = ch.explanation_ne; document.getElementById('wr-body').appendChild(explDiv); } }
  } else { requestAnimationFrame(function(){ playJamoAudio(jamo); flashJamoBtn(jamo, false); playQuizSound(false); }); }
}

function flashJamoBtn(jamo, correct) { var btns = document.querySelectorAll('.wr-kb-btn'); for (var i = 0; i < btns.length; i++) { if (btns[i].textContent === jamo) { var b = btns[i]; var c = correct ? 'correct-anim' : 'wrong-anim'; b.classList.add(c); (function(bb,cc) { setTimeout(function() { bb.classList.remove(cc); }, correct ? 500 : 400); })(b,c); break; } } }
function updateSlots(total) { var slots = document.querySelectorAll('.wr-jamo-slots .wr-slot'); for (var i = 0; i < slots.length; i++) { slots[i].className = 'wr-slot'; if (i < wrJamoIdx) slots[i].classList.add('filled'); else if (i === wrJamoIdx) slots[i].classList.add('current'); } }

function wrPlayCharAudio(path) { var a = new Audio(path); a.play().catch(function(){}); }
function wrAdvanceChar() {
  wrAdvanceTimer = null;
  if (!writingData) return;
  var cw = writingData.words[wrWordIdx];
  var isLastWordChar = cw && wrCharIdx >= cw.chars.length - 1;
  wrCharIdx++; wrJamoIdx = 0; wrEnteredJamo = [];
  if (isLastWordChar && cw && cw.audio) {
    if (wrWordAudio) { wrWordAudio.pause(); wrWordAudio = null; }
    wrWordAudio = new Audio(cw.audio);
    wrWordAudio.onended = function() { wrWordAudio = null; renderWriting(); };
    wrWordAudio.onerror = function() { wrWordAudio = null; renderWriting(); };
    setTimeout(function() { if (wrWordAudio) wrWordAudio.play().catch(function(){ renderWriting(); }); }, 500);
  } else { renderWriting(); }
}
function playWordAudio() { if (!writingData) return; var w = writingData.words; if (wrWordIdx >= w.length) return; var cw = w[wrWordIdx]; if (!cw.audio) return; if (wrWordAudio) { wrWordAudio.pause(); wrWordAudio = null; } wrWordAudio = new Audio(cw.audio); wrWordAudio.play().catch(function(){}); }
function wrReplayWordAudio(path) { if (wrWordAudio) { wrWordAudio.pause(); wrWordAudio = null; } wrWordAudio = new Audio(path); wrWordAudio.play().catch(function(){}); }
function getWritingKrAudioPath() { if (!writingData || !wrWritingSubId) return null; var expl = explanationsMap[String(wrWritingSubId)]; if (expl && expl.audio_kr) return 'audio/kr/' + CLIP_ID + '/' + expl.audio_kr + '?v=20260305b'; return null; }
function wrNextWord() {
  if (wrWordAudio) { wrWordAudio.pause(); wrWordAudio = null; }
  if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; }
  var resumeSkipAll = wrSkipAllPending; wrSkipAllPending = false;
  var words = writingData.words;
  wrWordIdx++; wrCharIdx = 0; wrJamoIdx = 0; wrEnteredJamo = [];
  renderWriting(); wrScrollToTop();
  // Resume skip-all auto-typing for next word
  if (resumeSkipAll && wrWordIdx < words.length) {
    wrSkipping = true; wrSkipTarget = words.length - 1;
    var btn = document.getElementById('wr-skip-all-btn'); if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
    wrSkipTimer = setTimeout(wrAutoTypeNext, 500);
  }
}
function wrGoToWord(idx) {
  if (!writingData) return;
  var words = writingData.words;
  if (idx < 0 || idx >= words.length) return;
  var wasSkipAll = wrSkipping && wrSkipTarget === words.length - 1;
  wrStopAll();
  wrWordIdx = idx; wrCharIdx = 0; wrJamoIdx = 0; wrEnteredJamo = [];
  renderWriting();
  wrScrollToTop();
  if (wasSkipAll) {
    wrSkipping = true; wrSkipTarget = words.length - 1; wrPreloadKrForCompletion();
    var btn = document.getElementById('wr-skip-all-btn'); if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
    wrAutoTypeNext();
  }
}

function wrPlayKrAudio(onDone) {
  stopSentenceAudio(); if (!writingData) return;
  // Check if words have audio paths for word-by-word playback
  var words = writingData.words; var audioPaths = [];
  for (var i = 0; i < words.length; i++) { if (words[i].audio) audioPaths.push(words[i].audio); }
  if (audioPaths.length > 0) {
    wrSentenceIdx = 0;
    var playNext = function() {
      if (wrSentenceIdx < 0 || wrSentenceIdx >= audioPaths.length) { wrSentenceAudio = null; wrSentenceIdx = -1; if (onDone) onDone(); return; }
      // Highlight current word
      for (var h = 0; h < words.length; h++) { var el = document.getElementById('wr-cw-' + h); if (el) { if (h === wrSentenceIdx) el.classList.add('wr-cw-playing'); else el.classList.remove('wr-cw-playing'); } }
      wrSentenceAudio = new Audio(audioPaths[wrSentenceIdx]);
      wrSentenceAudio.onended = function() { wrSentenceIdx++; playNext(); };
      wrSentenceAudio.onerror = function() { wrSentenceIdx++; playNext(); };
      wrSentenceAudio.play().catch(function(){ wrSentenceIdx++; playNext(); });
    };
    playNext(); return;
  }
  // Fallback: use KR sentence audio
  var endTime = writingData.sentence_end;
  var completeBtn = document.getElementById('wr-complete-play-btn');
  if (wrPreloadedAudio && wrPreloadReady) {
    wrSentenceAudio = wrPreloadedAudio; wrSentenceAudio.currentTime = 0; wrSentenceAudio.volume = 1;
  } else {
    var path = getWritingKrAudioPath(); if (!path) return;
    wrSentenceAudio = new Audio(path); wrSentenceAudio.currentTime = 0;
    if (wrSentenceAudio.readyState < 4) {
      if (completeBtn) completeBtn.innerHTML = '\u23f3 ' + L('loading','\u0932\u094b\u0921 \u0939\u0941\u0901\u0926\u0948\u091b...');
      wrSentenceAudio.oncanplaythrough = function() {
        wrSentenceAudio.oncanplaythrough = null;
        if (!wrSentenceAudio) return;
        if (completeBtn) completeBtn.innerHTML = '\u23f9 ' + L('btn_stop','\u0930\u094b\u0915\u094d\u0928\u0941\u0939\u094b\u0938\u094d');
        var done = function() { wrSentenceAudio = null; if (onDone) onDone(); };
        wrSentenceAudio.onended = done;
        wrSentenceAudio.onerror = done;
        wrSentenceAudio.play().catch(function(){});
        if (endTime && endTime > 0) { wrSentenceTimer = setTimeout(function() { if (wrSentenceAudio) { wrSentenceAudio.pause(); wrSentenceAudio = null; if (onDone) onDone(); } }, endTime * 1000); }
      };
      wrSentenceAudio.onerror = function() { wrSentenceAudio = null; if (completeBtn) completeBtn.innerHTML = '\ud83d\udd0a ' + L('btn_listen_again','\u092b\u0947\u0930\u093f \u0938\u0941\u0928\u094d\u0928\u0941\u0939\u094b\u0938\u094d'); if (onDone) onDone(); };
      return;
    }
  }
  var done = function() { wrSentenceAudio = null; if (onDone) onDone(); };
  wrSentenceAudio.onended = done;
  wrSentenceAudio.onerror = done;
  wrSentenceAudio.play().catch(function(){});
  if (endTime && endTime > 0) {
    wrSentenceTimer = setTimeout(function() { if (wrSentenceAudio) { wrSentenceAudio.pause(); wrSentenceAudio = null; if (onDone) onDone(); } }, endTime * 1000);
  }
}
function playSentenceAudio() { wrPlayKrAudio(); }
function playOriginalAudio() { wrPlayKrAudio(); }
function toggleOriginalAudio() {
  var wasPlaying = !!wrWordAudio;
  wrStopAll();
  if (wasPlaying) return;
  if (!writingData) return; var words = writingData.words; if (wrWordIdx >= words.length) return;
  var cw = words[wrWordIdx]; if (!cw.audio) return;
  var btn = document.getElementById('wr-original-btn');
  wrWordAudio = new Audio(cw.audio);
  wrWordAudio.onended = function() { wrWordAudio = null; if (btn) btn.innerHTML = '🔊 ' + L('listen_original','शब्द सुन्नुहोस्'); };
  wrWordAudio.onerror = function() { wrWordAudio = null; if (btn) btn.innerHTML = '🔊 ' + L('listen_original','शब्द सुन्नुहोस्'); };
  wrWordAudio.play().catch(function(){});
  if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
}
function stopKrAudio() { if (wrKrAudio) { wrKrAudio.pause(); wrKrAudio = null; } if (wrKrTimer) { clearTimeout(wrKrTimer); wrKrTimer = null; } }
function toggleKrSentenceAudio() {
  var wasPlaying = !!wrKrAudio;
  wrStopAll();
  if (wasPlaying) return;
  var btn = document.getElementById('wr-kr-btn') || document.getElementById('wr-kr-complete-btn');
  var endTime = writingData ? writingData.sentence_end : 0;
  if (wrPreloadedAudio && wrPreloadReady) {
    wrKrAudio = wrPreloadedAudio; wrKrAudio.currentTime = 0; wrKrAudio.volume = 1;
  } else {
    var path = getWritingKrAudioPath(); if (!path) return;
    wrKrAudio = new Audio(path);
    if (wrKrAudio.readyState < 4) {
      if (btn) btn.innerHTML = '\u23f3 ' + L('loading','\u0932\u094b\u0921 \u0939\u0941\u0901\u0926\u0948\u091b...');
      wrKrAudio.oncanplaythrough = function() {
        wrKrAudio.oncanplaythrough = null;
        if (!wrKrAudio) return;
        if (btn) btn.innerHTML = '\u23f9 ' + L('btn_stop','\u0930\u094b\u0915\u094d\u0928\u0941\u0939\u094b\u0938\u094d');
        var resetBtn = function() { wrKrAudio = null; if (wrKrTimer) { clearTimeout(wrKrTimer); wrKrTimer = null; } if (btn) btn.innerHTML = '\ud83d\udd0a ' + L('listen_sentence','\u092a\u0942\u0930\u093e \u0935\u093e\u0915\u094d\u092f \u092e\u0942\u0932 \u0938\u0941\u0928\u094d\u0928\u0941\u0939\u094b\u0938\u094d'); };
        wrKrAudio.onended = resetBtn;
        wrKrAudio.onerror = resetBtn;
        wrKrAudio.play().catch(function(){});
        if (endTime && endTime > 0) { wrKrTimer = setTimeout(function() { if (wrKrAudio) { wrKrAudio.pause(); resetBtn(); } }, endTime * 1000); }
      };
      wrKrAudio.onerror = function() { wrKrAudio = null; if (btn) btn.innerHTML = '\ud83d\udd0a ' + L('listen_sentence','\u092a\u0942\u0930\u093e \u0935\u093e\u0915\u094d\u092f \u092e\u0942\u0932 \u0938\u0941\u0928\u094d\u0928\u0941\u0939\u094b\u0938\u094d'); };
      return;
    }
  }
  var resetBtn = function() { wrKrAudio = null; if (wrKrTimer) { clearTimeout(wrKrTimer); wrKrTimer = null; } if (btn) btn.innerHTML = '🔊 ' + L('listen_sentence','पूरा वाक्य मूल सुन्नुहोस्'); };
  wrKrAudio.onended = resetBtn;
  wrKrAudio.onerror = resetBtn;
  wrKrAudio.play().catch(function(){});
  if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
  if (endTime && endTime > 0) { wrKrTimer = setTimeout(function() { if (wrKrAudio) { wrKrAudio.pause(); resetBtn(); } }, endTime * 1000); }
}
function toggleCompleteAudio() {
  var wasPlaying = !!wrSentenceAudio;
  wrStopAll();
  if (wasPlaying) return;
  var btn = document.getElementById('wr-complete-play-btn');
  wrPlayKrAudio(function() { if (btn) btn.innerHTML = '🔊 ' + L('btn_listen_again','फेरि सुन्नुहोस्'); });
  if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
}
function playSentenceAudioWithBtn() {
  wrPlayKrAudio(function() { var btn = document.getElementById('wr-complete-play-btn'); if (btn) btn.innerHTML = '🔊 ' + L('btn_listen_again','फेरि सुन्नुहोस्'); });
  var btn = document.getElementById('wr-complete-play-btn'); if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
}
function stopSentenceAudio() { if (wrSentenceAudio) { wrSentenceAudio.pause(); wrSentenceAudio = null; } if (wrSentenceTimer) { clearTimeout(wrSentenceTimer); wrSentenceTimer = null; } wrSentenceIdx = -1;
  // Reset word highlights
  if (writingData) { for (var h = 0; h < writingData.words.length; h++) { var el = document.getElementById('wr-cw-' + h); if (el) el.classList.remove('wr-cw-playing'); } }
}

function wrSkipWord() {
  if (!writingData) return;
  var wasSkippingWord = wrSkipping && wrSkipTarget === wrWordIdx;
  wrStopAll();
  renderWriting();
  if (wasSkippingWord) return;
  if (wrWordIdx >= writingData.words.length) return;
  wrSkipping = true; wrSkipTarget = wrWordIdx; wrPreloadKrForCompletion();
  var btn = document.getElementById('wr-skip-word-btn'); if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
  wrAutoTypeNext();
}
function wrSkipAll() {
  if (!writingData) return;
  var wasSkippingAll = wrSkipping && wrSkipTarget === writingData.words.length - 1;
  wrStopAll();
  renderWriting();
  if (wasSkippingAll) return;
  if (wrWordIdx >= writingData.words.length) return;
  wrSkipping = true; wrSkipTarget = writingData.words.length - 1; wrPreloadKrForCompletion();
  var btn = document.getElementById('wr-skip-all-btn'); if (btn) btn.innerHTML = '⏹ ' + L('btn_stop','रोक्नुहोस्');
  wrAutoTypeNext();
}
function wrPreloadKrForCompletion() { var p = getWritingKrAudioPath(); if (p) { try { wrPreloadReady = false; wrPreloadedAudio = new Audio(p); wrPreloadedAudio.preload = 'auto'; wrPreloadedAudio.volume = 0; wrPreloadedAudio.play().then(function(){ wrPreloadedAudio.pause(); wrPreloadedAudio.currentTime = 0; wrPreloadedAudio.volume = 1; wrPreloadReady = true; }).catch(function(){ wrPreloadedAudio = null; wrPreloadReady = false; }); } catch(e) { wrPreloadedAudio = null; wrPreloadReady = false; } } }
function wrStopSkip() { wrSkipping = false; wrSkipTarget = -1; wrSkipAllPending = false; if (wrSkipTimer) { clearTimeout(wrSkipTimer); wrSkipTimer = null; } if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; } }
function wrStopAll() {
  var wasSkipping = wrSkipping;
  wrStopSkip(); stopKrAudio(); stopSentenceAudio();
  if (wrWordAudio) { wrWordAudio.pause(); wrWordAudio = null; }
  if (wrAdvanceTimer) { clearTimeout(wrAdvanceTimer); wrAdvanceTimer = null; }
  if (wrAutoPlayTimer) { clearTimeout(wrAutoPlayTimer); wrAutoPlayTimer = null; }
  // Reset jamo state only if skip was interrupted mid-character (not normal completion)
  if (wasSkipping) { wrJamoIdx = 0; wrEnteredJamo = []; }
  // Reset button texts
  var b1 = document.getElementById('wr-skip-word-btn'); if (b1) b1.innerHTML = '▶ ' + L('skip','शब्द स्वतः पूरा');
  var b2 = document.getElementById('wr-skip-all-btn'); if (b2) b2.innerHTML = '⏭ ' + L('skip_all','सबै स्वतः पूरा');
  var b3 = document.getElementById('wr-original-btn'); if (b3) b3.innerHTML = '🔊 ' + L('listen_original','शब्द सुन्नुहोस्');
  var b4 = document.getElementById('wr-kr-btn'); if (b4) b4.innerHTML = '🔊 ' + L('listen_sentence','पूरा वाक्य मूल सुन्नुहोस्');
  var b5 = document.getElementById('wr-kr-complete-btn'); if (b5) b5.innerHTML = '🔊 ' + L('listen_sentence','पूरा वाक्य मूल सुन्नुहोस्');
  var b6 = document.getElementById('wr-complete-play-btn'); if (b6) b6.innerHTML = '🔊 ' + L('btn_listen','वाक्य सुन्नुहोस्');
}

function wrAutoTypeNext() {
  if (!wrSkipping || !writingData) return; var words = writingData.words;
  if (wrWordIdx >= words.length) { wrSkipping = false; renderWriting(); return; }
  var cw = words[wrWordIdx];
  if (wrCharIdx >= cw.chars.length) {
    if (wrWordIdx >= wrSkipTarget) {
      wrSkipping = false;
      if (wrSkipTarget === words.length - 1) {
        wrSkipAllPending = true;
        renderWriting(); return;
      }
      if (cw.audio) { try { if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; } wrSkipAudio = new Audio(cw.audio); wrSkipAudio.play().catch(function(){}); } catch(e) {} }
      renderWriting(); return;
    }
    if (wrSkipTarget === words.length - 1) {
      wrSkipping = false; wrSkipAllPending = true;
      if (cw.audio) { try { if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; } wrSkipAudio = new Audio(cw.audio); wrSkipAudio.play().catch(function(){}); } catch(e) {} }
      renderWriting(); return;
    }
    wrAutoPlayWordThenNext(cw); return;
  }
  var ch = cw.chars[wrCharIdx]; var exJamo = expandJamo(ch.jamo); var jamo = exJamo[wrJamoIdx];
  // DOM update first, then audio in background
  wrEnteredJamo.push(jamo); wrJamoIdx++;
  var cel = document.getElementById('wr-composed'); if (cel) cel.textContent = composeFromExpanded(wrEnteredJamo); updateSlots(exJamo.length);
  flashJamoBtn(jamo, true); playJamoAudio(jamo);
  if (wrJamoIdx >= exJamo.length) {
    if (cel) cel.classList.add('flash-correct');
    if (ch.explanation_ne) { var explDiv = document.createElement('div'); explDiv.className = 'wr-explain'; explDiv.textContent = ch.explanation_ne; document.getElementById('wr-body').appendChild(explDiv); }
    // Char done: play char audio in background, advance after fixed delay
    if (ch.audio) { try { var ca = new Audio(ch.audio); ca.play().catch(function(){}); } catch(e) {} }
    var isLWC = wrCharIdx >= cw.chars.length - 1;
    wrSkipTimer = setTimeout(function() { if (!wrSkipping) return; wrCharIdx++; wrJamoIdx = 0; wrEnteredJamo = [];
      if (wrCharIdx >= cw.chars.length) {
        // Skip-all: pause at word-done screen
        if (wrSkipTarget === words.length - 1) {
          wrSkipping = false; wrSkipAllPending = true;
          if (cw.audio) { try { if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; } wrSkipAudio = new Audio(cw.audio); wrSkipAudio.play().catch(function(){}); } catch(e) {} }
          renderWriting(); return;
        }
        if (wrWordIdx >= wrSkipTarget) {
          wrSkipping = false;
          if (cw.audio) { try { if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; } wrSkipAudio = new Audio(cw.audio); wrSkipAudio.play().catch(function(){}); } catch(e) {} }
          renderWriting(); return;
        }
        wrAutoPlayWordThenNext(cw);
      } else { renderWriting(); wrSkipTimer = setTimeout(wrAutoTypeNext, 200); }
    }, isLWC ? 1600 : 1000);
  } else { wrSkipTimer = setTimeout(wrAutoTypeNext, 300); }
}

function wrAutoPlayWordThenNext(cw) {
  if (!wrSkipping) return;
  renderWriting();
  // Play word audio in background, advance after fixed delay
  if (cw.audio) { try { if (wrSkipAudio) { wrSkipAudio.pause(); wrSkipAudio = null; } wrSkipAudio = new Audio(cw.audio); wrSkipAudio.play().catch(function(){}); } catch(e) {} }
  wrSkipTimer = setTimeout(function() { if (!wrSkipping) return; wrWordIdx++; wrCharIdx = 0; wrJamoIdx = 0; wrEnteredJamo = []; renderWriting(); wrSkipTimer = setTimeout(wrAutoTypeNext, 500); }, 2400);
}

function retryWriting() { wrStopAll(); wrWordIdx = 0; wrCharIdx = 0; wrJamoIdx = 0; wrEnteredJamo = []; renderWriting(); wrScrollToTop(); }
