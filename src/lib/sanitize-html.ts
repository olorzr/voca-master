import DOMPurify from 'isomorphic-dompurify';

/**
 * concept_sheets.editor_html 전용 DOMPurify 화이트리스트.
 * TipTap StarterKit + Underline + TextAlign + Table + ConceptMark 이
 * 실제로 생성하는 태그/속성만 허용한다.
 * 새 TipTap 확장을 추가하면 이 목록도 같이 갱신해야 한다.
 */
const ALLOWED_TAGS = [
  'h3', 'h4',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'mark',
  'span',
];

const ALLOWED_ATTR = [
  'colspan', 'rowspan', 'colwidth',
  'data-concept',
  'data-colwidth',
  'data-bg-color',
  'data-bordertop', 'data-borderbottom', 'data-borderleft', 'data-borderright',
  'class', 'style',
];

const FORBID_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form',
  'input', 'button', 'link', 'meta', 'base', 'style', 'svg', 'math',
];

const FORBID_ATTR = [
  'srcdoc', 'formaction', 'xlink:href', 'action',
  'onload', 'onerror', 'onclick', 'onmouseover',
  'onfocus', 'onblur', 'onchange', 'onsubmit',
];

/** javascript: · data: 등 위험 스킴 차단, http/https/mailto/tel 만 허용 */
const SAFE_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const CONCEPT_SHEET_SANITIZE_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
  FORBID_TAGS,
  FORBID_ATTR,
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * 개념지 HTML 을 안전하게 정화한다.
 * 저장 경로(handleSave) 와 렌더 변환 경로(exam-transform) 양쪽에서 호출하여
 * 다층 방어를 구성한다.
 * @param dirty - 신뢰할 수 없는 HTML 문자열
 * @returns `<script>`, `on*` 핸들러, `javascript:` URL 등 위험 요소가 제거된 HTML
 */
export function sanitizeConceptHTML(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, CONCEPT_SHEET_SANITIZE_CONFIG);
}
