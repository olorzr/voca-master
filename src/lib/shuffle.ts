/**
 * Fisher-Yates 알고리즘으로 배열을 무편향 셔플한다.
 *
 * `arr.sort(() => Math.random() - 0.5)` 는 비교 함수가 비일관적이라 엔진별로
 * permutation 분포가 치우친다(특정 순서가 더 자주 나옴). Fisher-Yates 는 각
 * permutation 이 균등하게 나오도록 보장한다.
 *
 * 원본 배열을 변경하지 않고 새 배열을 반환한다.
 * @param arr - 셔플할 배열
 * @returns 셔플된 새 배열
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
