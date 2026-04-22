import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import { getCorrectLabel } from '@/lib/exam-choices';
import Image from 'next/image';

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
