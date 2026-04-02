import { TableCell, TableHeader } from '@tiptap/extension-table';

/** 셀 스타일 커스텀 속성 (borderColor, backgroundColor) */
const cellStyleAttributes = {
  borderColor: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-border-color'),
    renderHTML: (attrs: Record<string, unknown>) => {
      if (!attrs.borderColor) return {};
      return {
        'data-border-color': attrs.borderColor,
        style: `border-color: ${attrs.borderColor}`,
      };
    },
  },
  backgroundColor: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-bg-color'),
    renderHTML: (attrs: Record<string, unknown>) => {
      if (!attrs.backgroundColor) return {};
      return {
        'data-bg-color': attrs.backgroundColor,
        style: `background-color: ${attrs.backgroundColor}`,
      };
    },
  },
};

/**
 * 커스텀 TableCell 확장.
 * 셀별 테두리 색상(borderColor)과 배경색(backgroundColor) 속성을 지원한다.
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
