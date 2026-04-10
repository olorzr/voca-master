import type { EditorState } from '@tiptap/pm/state';

/** 단어 구분자: 공백 · 탭 · 개행 */
const WORD_SEPARATOR = /\s/;

/**
 * 주어진 위치에서 왼쪽으로 이동하며 단어의 시작 경계를 찾는다.
 * 현재 텍스트블록을 벗어나지 않으며, 공백을 만나면 즉시 멈춘다.
 */
export function findWordStart(state: EditorState, pos: number): number {
  const $pos = state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return pos;
  const blockStart = $pos.start();
  let p = pos;
  while (p > blockStart) {
    const ch = state.doc.textBetween(p - 1, p);
    if (!ch || WORD_SEPARATOR.test(ch)) break;
    p--;
  }
  return p;
}

/**
 * 주어진 위치에서 오른쪽으로 이동하며 단어의 끝 경계를 찾는다.
 * 현재 텍스트블록을 벗어나지 않으며, 공백을 만나면 즉시 멈춘다.
 */
export function findWordEnd(state: EditorState, pos: number): number {
  const $pos = state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return pos;
  const blockEnd = $pos.end();
  let p = pos;
  while (p < blockEnd) {
    const ch = state.doc.textBetween(p, p + 1);
    if (!ch || WORD_SEPARATOR.test(ch)) break;
    p++;
  }
  return p;
}

/** splitRangeByWords 결과 항목 */
export interface WordRange {
  from: number;
  to: number;
  text: string;
}

/**
 * [from, to) 범위를 공백 기준으로 쪼개 각 단어의 doc 위치 범위를 반환한다.
 * 양 끝은 단어 경계로 자동 확장한다(부분 단어 선택 방지).
 * 여러 텍스트블록에 걸쳐도 동작하며, 블록 경계는 단어 경계 역할을 한다.
 */
export function splitRangeByWords(
  state: EditorState,
  from: number,
  to: number,
): WordRange[] {
  if (from === to) return [];

  const expandedFrom = findWordStart(state, from);
  const expandedTo = findWordEnd(state, to);
  if (expandedFrom >= expandedTo) return [];

  const words: WordRange[] = [];

  state.doc.nodesBetween(expandedFrom, expandedTo, (node, pos) => {
    if (!node.isText) return;
    const nodeText = node.text ?? '';
    const nodeStart = pos;
    const nodeEnd = pos + nodeText.length;

    const sliceStart = Math.max(nodeStart, expandedFrom);
    const sliceEnd = Math.min(nodeEnd, expandedTo);
    if (sliceStart >= sliceEnd) return;

    const offset = sliceStart - nodeStart;
    const slice = nodeText.slice(offset, sliceEnd - nodeStart);

    const wordRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = wordRegex.exec(slice)) !== null) {
      words.push({
        from: sliceStart + match.index,
        to: sliceStart + match.index + match[0].length,
        text: match[0],
      });
    }
  });

  return words;
}
