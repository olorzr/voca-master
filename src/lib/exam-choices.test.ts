import { describe, it, expect } from 'vitest';
import { generateChoices, getCorrectLabel, CHOICE_COUNT, CHOICE_LABELS } from './exam-choices';
import type { ExamWord } from '@/types';

/** 테스트용 ExamWord 생성 헬퍼 */
function makeWord(id: string, word: string, meaning = `${word}-뜻`): ExamWord {
  return { id, exam_id: 'e1', word_id: id, word, meaning, order_index: 0 };
}

const WORDS: ExamWord[] = [
  makeWord('1', 'apple'),
  makeWord('2', 'banana'),
  makeWord('3', 'cherry'),
  makeWord('4', 'date'),
  makeWord('5', 'elderberry'),
  makeWord('6', 'fig'),
];

describe('generateChoices', () => {
  it('정답을 정확히 1개 포함하고 라벨은 ①~⑤ 순서다', () => {
    const choices = generateChoices(WORDS[0], WORDS, 0);
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(choices.filter((c) => c.isCorrect)).toHaveLength(1);
    expect(choices.map((c) => c.label)).toEqual([...CHOICE_LABELS]);
    expect(choices.find((c) => c.isCorrect)?.word).toBe('apple');
  });

  it('같은 시드(같은 단어·문항 인덱스)에는 항상 동일한 결과를 낸다(결정론)', () => {
    const a = generateChoices(WORDS[1], WORDS, 3);
    const b = generateChoices(WORDS[1], WORDS, 3);
    expect(a).toEqual(b);
  });

  it('시험지와 답안지가 동일한 정답 라벨을 산출한다', () => {
    const choices = generateChoices(WORDS[2], WORDS, 2);
    const correct = choices.find((c) => c.isCorrect);
    expect(getCorrectLabel(WORDS[2], WORDS, 2)).toBe(correct?.label);
  });

  it('표시 문자열(word)이 중복된 행이 있어도 선지에 같은 단어가 두 번 나오지 않는다', () => {
    // id 는 다르지만 word 가 정답과 같은 행, 그리고 서로 중복인 오답 행을 섞는다.
    const dupWords: ExamWord[] = [
      makeWord('1', 'apple'),
      makeWord('2', 'apple'), // 정답과 동일 표시 문자열
      makeWord('3', 'banana'),
      makeWord('4', 'banana'), // 오답끼리 중복
      makeWord('5', 'cherry'),
      makeWord('6', 'date'),
      makeWord('7', 'fig'),
    ];
    const choices = generateChoices(dupWords[0], dupWords, 0);
    const labels = choices.map((c) => c.word);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length); // 모든 선지 표시 문자열이 유일
    // 정답 'apple' 은 정확히 한 번만 등장
    expect(labels.filter((w) => w === 'apple')).toHaveLength(1);
  });
});
