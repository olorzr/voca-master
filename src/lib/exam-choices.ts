import type { ExamWord } from '@/types';

/** 객관식 선지 수 */
export const CHOICE_COUNT = 5;

/** 선지 라벨 (원문자) */
export const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'] as const;

/**
 * FNV-1a 문자열 해시. 시드와 섞어 32-bit 정수를 돌려준다.
 * char code 단순 합보다 분포가 넓어 mulberry32 초기값의 편향을 줄인다.
 */
function fnv1a(str: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * mulberry32 PRNG. 32-bit 시드로 [0, 1) 난수를 생성한다.
 * glibc LCG 는 하위 비트 편향이 심해 `% N` 에서 쏠림이 생기므로 대신 사용한다.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 시드 기반 Fisher-Yates 셔플. 같은 시드면 항상 같은 순서를 보장한다.
 */
function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const result = [...arr];
  const rand = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface Choice {
  label: string;
  word: string;
  isCorrect: boolean;
}

/**
 * 문항별 5지선다 선지를 생성한다.
 * 정답 1개 + 같은 시험의 다른 단어 중 (CHOICE_COUNT - 1) 개를 방해지(distractor) 로 뽑아 섞는다.
 * 결정론적이어서 시험지/답안지 양쪽이 동일한 결과를 갖는다.
 */
export function generateChoices(
  currentWord: ExamWord,
  allWords: readonly ExamWord[],
  questionIndex: number,
): Choice[] {
  const others = allWords.filter((w) => w.id !== currentWord.id);
  const seed = fnv1a(currentWord.id, questionIndex);

  const shuffledOthers = seededShuffle(others, seed);
  const distractors = shuffledOthers.slice(0, CHOICE_COUNT - 1);

  const choices: Choice[] = [
    { label: '', word: currentWord.word, isCorrect: true },
    ...distractors.map((d) => ({ label: '', word: d.word, isCorrect: false })),
  ];

  // 정답 위치를 섞을 땐 방해지 선택과 다른 시드를 써야 상관관계가 사라진다
  const shuffled = seededShuffle(choices, (seed + 1) >>> 0);
  return shuffled.map((c, i) => ({ ...c, label: CHOICE_LABELS[i] }));
}

/**
 * 해당 문항의 정답 라벨(①~⑤) 을 반환한다.
 */
export function getCorrectLabel(
  currentWord: ExamWord,
  allWords: readonly ExamWord[],
  questionIndex: number,
): string {
  const choices = generateChoices(currentWord, allWords, questionIndex);
  const correct = choices.find((c) => c.isCorrect);
  return correct ? correct.label : '';
}
