// 언어 표 — tools/sync_lang.py 가 언어부 프로필(09_lang/profiles)에서 씀(손으로 고치지 않음 · 다국어부)
// stage: pilot = 개발 주소에서만 · ready = 공개(본부 신호) · 없음 = ?lang= 시범만 · ko_ui = {xx}.ko.json 있음
export const LANG_INFO = {
  "bn": {"dir": "ltr", "ko_ui": true, "lh": 1.5, "short": "বাং"},
  "en": {"dir": "ltr", "short": "EN", "stage": "ready"},
  "es": {"dir": "ltr", "ko_ui": true, "short": "Esp"},
  "fr": {"dir": "ltr", "ko_ui": true, "short": "Fr"},
  "hi": {"dir": "ltr", "ko_ui": true, "lh": 1.5, "short": "हिंदी"},
  "id": {"dir": "ltr", "short": "Indo"},
  "ja": {"dir": "ltr", "font": "Noto Sans JP", "ko_ui": true, "short": "日"},
  "km": {"dir": "ltr", "font": "Noto Sans Khmer", "lh": 1.8, "minpx": 12, "short": "ខ្មែរ"},
  "ky": {"dir": "ltr", "font": "Noto Sans", "short": "Кыр"},
  "lo": {"dir": "ltr", "font": "Noto Sans Lao", "lh": 1.6, "minpx": 12, "short": "ລາວ"},
  "mn": {"dir": "ltr", "font": "Noto Sans", "ko_ui": true, "short": "Мон"},
  "my": {"dir": "ltr", "font": "Noto Sans Myanmar", "ko_ui": true, "lh": 1.8, "minpx": 12, "short": "MY"},
  "ne": {"dir": "ltr", "ko_ui": true, "lh": 1.5, "short": "ने", "stage": "ready"},
  "pt": {"dir": "ltr", "ko_ui": true, "short": "Pt"},
  "ru": {"dir": "ltr", "ko_ui": true, "short": "Рус"},
  "si": {"dir": "ltr", "font": "Noto Sans Sinhala", "ko_ui": true, "lh": 1.6, "short": "SI"},
  "th": {"dir": "ltr", "font": "Noto Sans Thai", "ko_ui": true, "lh": 1.6, "minpx": 12, "short": "ไทย", "stage": "pilot"},
  "tl": {"dir": "ltr", "short": "Fil"},
  "ur": {"dir": "rtl", "font": "Noto Nastaliq Urdu", "ko_ui": true, "lh": 2.0, "minpx": 12, "short": "اردو", "stage": "pilot"},
  "uz": {"dir": "ltr", "short": "Oʻz"},
  "vi": {"dir": "ltr", "ko_ui": true, "lh": 1.35, "short": "Việt", "stage": "pilot"},
  "zh": {"dir": "ltr", "font": "Noto Sans SC", "ko_ui": true, "short": "中"}
};
