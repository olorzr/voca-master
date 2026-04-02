import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import Image from 'next/image';

/** 객관식 선지 수 */
const CHOICE_COUNT = 5;

interface MultipleChoiceAnswerViewProps {
  exam: {
    title: string;
    pass_percentage: number;
    pass_count: number;
  };
  words: ExamWord[];
  categories: Category[];
}

/**
 * 시드 기반 난수 생성기 (MultipleChoiceView와 동일한 로직)
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 정답 번호를 계산한다 (MultipleChoiceView와 동일한 셔플 로직)
 */
function getCorrectLabel(currentWord: ExamWord, allWords: ExamWord[], questionIndex: number): string {
  const others = allWords.filter((w) => w.id !== currentWord.id);
  const seed = currentWord.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), questionIndex);
  const shuffled = seededShuffle(others, seed);
  const distractors = shuffled.slice(0, CHOICE_COUNT - 1);

  const choices = [
    { word: currentWord.word, isCorrect: true },
    ...distractors.map((d) => ({ word: d.word, isCorrect: false })),
  ];

  const shuffledChoices = seededShuffle(choices, seed + 1);
  const labels = ['①', '②', '③', '④', '⑤'];
  const correctIndex = shuffledChoices.findIndex((c) => c.isCorrect);
  return labels[correctIndex];
}

/**
 * 객관식 답안지 뷰
 * 번호와 정답 번호만 표시하는 간결한 레이아웃
 */
export default function MultipleChoiceAnswerView({ exam, words, categories }: MultipleChoiceAnswerViewProps) {
  const sourceLabels = categories.map((c) => formatCategoryLabel(c));
  const title = `${exam.title} - 객관식 답안지`;

  return (
    <table className="exam-print-table bg-white mx-auto">
      <thead><tr><td><div className="exam-print-header-spacer" /></td></tr></thead>
      <tfoot>
        <tr>
          <td>
            <div className="exam-print-footer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="아라국어논술" width={20} height={20} />
              <span>아라국어논술</span>
            </div>
          </td>
        </tr>
      </tfoot>

      <tbody>
        <tr>
          <td className="p-8">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">{title}</h2>
                <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
              </div>
              <Image src="/logo.png" alt="아라국어논술" width={52} height={52} className="object-contain" />
            </div>

            {/* 정보 바 */}
            <div className="border-t-[1.5px] border-b-[1.5px] border-[#B8EDE8] py-2.5 mb-4">
              <div className="flex justify-between text-[11px] text-gray-500">
                <div className="flex flex-col gap-0.5">
                  {sourceLabels.map((label, i) => (
                    <span key={i} className="text-gray-800 font-medium">{label}</span>
                  ))}
                </div>
                <span className="self-end">
                  합격 <strong className="text-gray-800">{exam.pass_count}개</strong> 이상 ({exam.pass_percentage}%)
                </span>
              </div>
            </div>

            {/* 답안 그리드 — 5열 */}
            <div className="mc-answer-grid">
              {words.map((w, idx) => {
                const correctLabel = getCorrectLabel(w, words, idx);
                return (
                  <div key={w.id} className="mc-answer-item">
                    <span className="mc-answer-num">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="mc-answer-label">{correctLabel}</span>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
