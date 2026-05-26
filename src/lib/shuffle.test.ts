import { describe, it, expect } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('원본 배열을 변경하지 않는다', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('모든 원소를 보존한다(같은 multiset)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('빈 배열/단일 원소를 안전하게 처리한다', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });

  it('각 위치 분포가 대체로 균등하다(편향 없음)', () => {
    // [0,1,2] 를 많이 셔플해 위치 0 에 각 값이 ~1/3 비율로 오는지 본다.
    const counts = [0, 0, 0];
    const N = 30000;
    for (let i = 0; i < N; i++) {
      const out = shuffle([0, 1, 2]);
      counts[out[0]]++;
    }
    for (const c of counts) {
      expect(c / N).toBeGreaterThan(0.28);
      expect(c / N).toBeLessThan(0.39);
    }
  });
});
