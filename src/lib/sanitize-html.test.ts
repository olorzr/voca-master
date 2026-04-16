import { describe, it, expect } from 'vitest';
import { sanitizeConceptHTML } from './sanitize-html';

describe('sanitizeConceptHTML', () => {
  it('<script> 태그를 제거한다', () => {
    const out = sanitizeConceptHTML('<p>안녕</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('<p>안녕</p>');
  });

  it('<img> 의 onerror 핸들러와 태그 자체를 제거한다', () => {
    const out = sanitizeConceptHTML('<img src=x onerror="fetch(\'/steal\')">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('<img');
  });

  it('javascript: 스킴을 제거한다', () => {
    const out = sanitizeConceptHTML('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('<mark data-concept> 은 보존한다', () => {
    const html = '<p>이것은 <mark data-concept="true">개념</mark>이다</p>';
    const out = sanitizeConceptHTML(html);
    expect(out).toContain('<mark');
    expect(out).toContain('data-concept');
    expect(out).toContain('개념');
  });

  it('<table> 셀의 data-bg-color / data-bordertop / background-color style 을 보존한다', () => {
    const html =
      '<table><tbody><tr>' +
      '<td data-bg-color="#FEF3C7" data-bordertop="transparent" style="background-color: #FEF3C7">셀</td>' +
      '</tr></tbody></table>';
    const out = sanitizeConceptHTML(html);
    expect(out).toContain('<table');
    expect(out).toContain('data-bg-color');
    expect(out).toContain('data-bordertop');
    expect(out).toContain('background-color');
  });

  it('text-align inline style 을 보존한다', () => {
    const out = sanitizeConceptHTML('<h3 style="text-align: center">제목</h3>');
    expect(out).toContain('text-align');
    expect(out).toContain('center');
  });

  it('colspan / rowspan 속성을 보존한다', () => {
    const html =
      '<table><tbody><tr><td colspan="2" rowspan="3">병합</td></tr></tbody></table>';
    const out = sanitizeConceptHTML(html);
    expect(out).toContain('colspan="2"');
    expect(out).toContain('rowspan="3"');
  });

  it('h3 / h4 / ul / li / strong / em / u 등 TipTap 기본 태그를 보존한다', () => {
    const html =
      '<h3>h3</h3><h4>h4</h4>' +
      '<ul><li><strong>s</strong> <em>e</em> <u>u</u></li></ul>';
    const out = sanitizeConceptHTML(html);
    expect(out).toContain('<h3>');
    expect(out).toContain('<h4>');
    expect(out).toContain('<ul>');
    expect(out).toContain('<li>');
    expect(out).toContain('<strong>');
    expect(out).toContain('<em>');
    expect(out).toContain('<u>');
  });

  it('<iframe> / <object> / <embed> 를 제거한다', () => {
    const out = sanitizeConceptHTML(
      '<iframe src="//evil"></iframe><object></object><embed>',
    );
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<object');
    expect(out).not.toContain('<embed');
  });

  it('빈 문자열을 입력하면 빈 문자열을 반환한다', () => {
    expect(sanitizeConceptHTML('')).toBe('');
  });
});
