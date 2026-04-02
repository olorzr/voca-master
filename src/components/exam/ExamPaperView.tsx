import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import Image from 'next/image';

/** 단일 열 최대 문항 수 기준 */
const SINGLE_COL_THRESHOLD = 20;

interface ExamPaperViewProps {
  exam: {
    title: string;
    pass_percentage: number;
    pass_count: number;
  };
  words: ExamWord[];
  categories: Category[];
  showAnswer: boolean;
}

/**
 * 시험지 / 답안지 뷰 (민트 테마)
 * table + tfoot으로 푸터가 매 페이지 하단에 자동 반복, 콘텐츠 겹침 없음
 */
export default function ExamPaperView({ exam, words, categories, showAnswer }: ExamPaperViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const sourceLabels = categories.map((c) => formatCategoryLabel(c));
  const title = showAnswer ? `${exam.title} - 답안지` : exam.title;

  return (
    <table className="exam-print-table bg-white mx-auto">
      {/* 상단 여백 — 매 인쇄 페이지 상단에 자동 반복 */}
      <thead><tr><td><div className="exam-print-header-spacer" /></td></tr></thead>
      {/* 푸터 — 매 인쇄 페이지 하단에 자동 반복 */}
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

      {/* 본문 */}
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
              {!showAnswer && (
                <div className="flex items-center gap-8 text-[11px] text-gray-600 mb-2">
                  <span>이름 <span className="inline-block border-b border-gray-400 w-28 ml-2" /></span>
                  <span>날짜 <span className="ml-2 text-gray-800">{today}</span></span>
                  <span className="ml-auto exam-score-box">
                    <span className="inline-block border-b border-gray-400 w-10 text-center" />
                    <span className="text-gray-800 font-bold"> / {words.length}개</span>
                  </span>
                </div>
              )}
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
              <span>다음 뜻에 해당하는 단어를 쓰시오.</span>
            </div>

            {/* 문제 영역 — CSS columns로 자동 분할 */}
            <div className={`exam-q-grid mt-2 ${useSingleCol ? 'exam-q-grid--single' : 'exam-q-grid--dual'}`}>
              {words.map((w, idx) => (
                <div key={w.id} className="q-row exam-q-item">
                  <span className="q-num q-num--mint">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="q-text">{w.meaning}</span>
                  {showAnswer ? (
                    <span className="q-answer">{w.word}</span>
                  ) : (
                    <span className="q-blank" />
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
