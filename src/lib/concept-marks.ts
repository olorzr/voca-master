import type { Editor } from '@tiptap/react';
import type { MarkItem } from '@/components/exam-builder';

/**
 * 인접한 텍스트 노드를 병합하여 마킹 목록을 반환한다.
 * @param raw - 병합 전 마킹 아이템 배열
 * @returns 병합된 마킹 아이템 배열
 */
export function mergeMarks(raw: MarkItem[]): MarkItem[] {
  const merged: MarkItem[] = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && last.pos + last.len === m.pos) {
      last.text += m.text;
      last.len += m.len;
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}

/**
 * 에디터에서 concept 마크가 적용된 텍스트를 추출하고 병합한다.
 * @param editor - TipTap Editor 인스턴스
 * @returns 병합된 마킹 아이템 배열
 */
export function extractMarks(editor: Editor): MarkItem[] {
  const raw: MarkItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.marks.some((m) => m.type.name === 'concept')) {
      raw.push({ text: node.text ?? '', pos, len: node.nodeSize });
    }
  });
  return mergeMarks(raw);
}
