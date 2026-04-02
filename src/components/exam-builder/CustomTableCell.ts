import { TableCell, TableHeader } from '@tiptap/extension-table';

/** 테두리 방향 키 목록 */
const BORDER_SIDES = ['borderTop', 'borderBottom', 'borderLeft', 'borderRight'] as const;

/** CSS 속성 이름 매핑 */
const BORDER_CSS: Record<string, string> = {
  borderTop: 'border-top-color',
  borderBottom: 'border-bottom-color',
  borderLeft: 'border-left-color',
  borderRight: 'border-right-color',
};

/** 테두리 방향별 + 배경색 커스텀 속성 생성 */
function buildCellStyleAttributes() {
  const attrs: Record<string, unknown> = {};

  for (const side of BORDER_SIDES) {
    attrs[side] = {
      default: null,
      parseHTML: (el: HTMLElement) => el.getAttribute(`data-${side.toLowerCase()}`),
      renderHTML: (a: Record<string, unknown>) => {
        if (!a[side]) return {};
        return {
          [`data-${side.toLowerCase()}`]: a[side],
          style: `${BORDER_CSS[side]}: ${a[side]}`,
        };
      },
    };
  }

  attrs.backgroundColor = {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-bg-color'),
    renderHTML: (a: Record<string, unknown>) => {
      if (!a.backgroundColor) return {};
      return {
        'data-bg-color': a.backgroundColor,
        style: `background-color: ${a.backgroundColor}`,
      };
    },
  };

  return attrs;
}

const cellStyleAttributes = buildCellStyleAttributes();

/**
 * 커스텀 TableCell 확장.
 * 셀별 테두리 방향(상/하/좌/우)과 배경색 속성을 지원한다.
 */
export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellStyleAttributes };
  },
});

/**
 * 커스텀 TableHeader 확장.
 * th 셀에도 동일한 스타일 속성을 지원한다.
 */
export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellStyleAttributes };
  },
});
