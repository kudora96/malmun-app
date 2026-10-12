// 언어 표 — tools/sync_lang.py 가 언어부 프로필(09_lang/profiles)에서 씀(손으로 고치지 않음 · 다국어부)
// stage: pilot = 개발 주소에서만 · ready = 공개(본부 신호) · 없음 = ?lang= 시범만 · ko_ui = {xx}.ko.json 있음
export const LANG_INFO = {
  "bn": {"dir": "ltr", "lh": 1.5},
  "en": {"dir": "ltr", "stage": "ready"},
  "es": {"dir": "ltr"},
  "fr": {"dir": "ltr"},
  "hi": {"dir": "ltr", "lh": 1.5},
  "id": {"dir": "ltr"},
  "ja": {"dir": "ltr", "font": "Noto Sans JP"},
  "km": {"dir": "ltr", "font": "Noto Sans Khmer", "lh": 1.8, "minpx": 12},
  "ky": {"dir": "ltr"},
  "lo": {"dir": "ltr", "font": "Noto Sans Lao", "lh": 1.6, "minpx": 12},
  "mn": {"dir": "ltr"},
  "my": {"dir": "ltr", "font": "Noto Sans Myanmar", "lh": 1.8, "minpx": 12},
  "ne": {"dir": "ltr", "ko_ui": true, "lh": 1.5, "stage": "ready"},
  "pt": {"dir": "ltr"},
  "ru": {"dir": "ltr"},
  "si": {"dir": "ltr", "font": "Noto Sans Sinhala", "lh": 1.6},
  "th": {"dir": "ltr", "font": "Noto Sans Thai", "ko_ui": true, "lh": 1.6, "minpx": 12, "stage": "pilot"},
  "tl": {"dir": "ltr"},
  "ur": {"dir": "rtl", "font": "Noto Nastaliq Urdu", "ko_ui": true, "lh": 2.0, "minpx": 12, "stage": "pilot"},
  "uz": {"dir": "ltr"},
  "vi": {"dir": "ltr", "ko_ui": true, "lh": 1.35, "stage": "pilot"},
  "zh": {"dir": "ltr", "font": "Noto Sans SC"}
};
