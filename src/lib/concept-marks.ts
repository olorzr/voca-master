import type { Editor } from '@tiptap/react';
import type { MarkItem } from '@/components/exam-builder';

/**
 * 같은 단어가 여러 텍스트 노드로 쪼개진 경우(예: bold 가 중간에 걸린 경우)
 * 바로 붙어있는 조각들을 하나의 MarkItem 으로 합친다.
 * 사이 공백이 없어야 병합 대상이므로 단어 단위 카운트는 유지된다.
 */
function mergeAdjacentWordFragments(items: MarkItem[]): MarkItem[] {
  const merged: MarkItem[] = [];
  for (const m of items) {
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
 * 에디터에서 concept 마크가 적용된 영역을 단어 단위로 추출한다.
 * 여러 단어에 걸친 레거시 마크도 공백을 기준으로 쪼개어 개별 MarkItem 으로 반환한다.
 * 결과 배열의 길이가 곧 마킹된 단어 개수이므로 채점 시 카운트 소스로 사용한다.
 * @param editor - TipTap Editor 인스턴스
 * @returns 단어별 MarkItem 배열
 */
export function extractMarks(editor: Editor): MarkItem[] {
  const result: MarkItem[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    if (!node.marks.some((m) => m.type.name === 'concept')) return;

    const text = node.text ?? '';
    const wordRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = wordRegex.exec(text)) !== null) {
      result.push({
        text: match[0],
        pos: pos + match.index,
        len: match[0].length,
      });
    }
  });

  return mergeAdjacentWordFragments(result);
}
