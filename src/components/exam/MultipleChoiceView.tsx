import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import Image from 'next/image';

/** 객관식 선지 수 */
const CHOICE_COUNT = 5;

interface MultipleChoiceViewProps {
  exam: {
    title: string;
    pass_percentage: number;
    pass_count: number;
  };
  words: ExamWord[];
  categories: Category[];
}

/**
 * 시드 기반 난수 생성기 (같은 시험이면 같은 선지 순서 보장)
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
 * 각 문항에 대해 5개 선지를 생성한다.
 * 정답 1개 + 같은 시험의 다른 단어 4개 (랜덤)
 */
function generateChoices(
  currentWord: ExamWord,
  allWords: ExamWord[],
  questionIndex: number,
): { label: string; word: string; isCorrect: boolean }[] {
  const others = allWords.filter((w) => w.id !== currentWord.id);
  const seed = currentWord.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), questionIndex);
  const shuffled = seededShuffle(others, seed);
  const distractors = shuffled.slice(0, CHOICE_COUNT - 1);

  const choices = [
    { label: '', word: currentWord.word, isCorrect: true },
    ...distractors.map((d) => ({ label: '', word: d.word, isCorrect: false })),
  ];

  const shuffledChoices = seededShuffle(choices, seed + 1);
  const labels = ['①', '②', '③', '④', '⑤'];
  return shuffledChoices.map((c, i) => ({ ...c, label: labels[i] }));
}

/**
 * 객관식 시험지 뷰 (2단 레이아웃, 5지선다)
 * 뜻을 보여주고 해당하는 단어를 선지에서 고르는 형태
 */
export default function MultipleChoiceView({ exam, words, categories }: MultipleChoiceViewProps) {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const sourceLabels = categories.map((c) => formatCategoryLabel(c));
  const title = `${exam.title} - 객관식 시험지`;

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
              <div className="flex items-center gap-8 text-[11px] text-gray-600 mb-2">
                <span>이름 <span className="inline-block border-b border-gray-400 w-28 ml-2" /></span>
                <span>날짜 <span className="ml-2 text-gray-800">{today}</span></span>
                <span className="ml-auto exam-score-box">
                  <span className="inline-block border-b border-gray-400 w-10 text-center" />
                  <span className="text-gray-800 font-bold"> / {words.length}개</span>
                </span>
              </div>
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

            {/* 섹션 헤더 */}
            <div className="section-bar section-bar--mint">
              <span>다음 뜻에 해당하는 단어를 고르시오.</span>
            </div>

            {/* 문제 영역 — 항상 2단 */}
            <div className="mc-q-grid mt-2">
              {words.map((w, idx) => {
                const choices = generateChoices(w, words, idx);
                return (
                  <div key={w.id} className="mc-q-item">
                    <div className="mc-q-header">
                      <span className="q-num q-num--mint">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="mc-q-meaning">{w.meaning}</span>
                    </div>
                    <div className="mc-q-choices">
                      {choices.map((c, ci) => (
                        <span key={ci} className="mc-q-choice">
                          {c.label} {c.word}
                        </span>
                      ))}
                    </div>
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
