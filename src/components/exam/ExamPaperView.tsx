import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import Image from 'next/image';

/** 단일 열에 넣을 최대 문항 수. 이 이하이면 1열로 표시 */
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

/** 시험지 / 답안지 뷰 (민트 테마) */
export default function ExamPaperView({ exam, words, categories, showAnswer }: ExamPaperViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const half = useSingleCol ? words.length : Math.ceil(words.length / 2);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const sourceLabels = categories.map(formatCategoryLabel);

  return (
    <div className="a4-page bg-white p-8 mx-auto flex flex-col">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">
            {showAnswer ? `${exam.title} - 답안지` : exam.title}
          </h2>
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

      {/* 문제 영역 */}
      <div className={`grid ${useSingleCol ? 'grid-cols-1' : 'grid-cols-2'} gap-x-6 flex-1 mt-2`}>
        {[words.slice(0, half), words.slice(half)].filter(col => col.length > 0).map((col, colIdx) => (
          <div key={colIdx} className={colIdx === 1 ? 'border-l border-gray-200 pl-5' : ''}>
            {col.map((w, idx) => {
              const num = colIdx === 0 ? idx + 1 : half + idx + 1;
              return (
                <div key={w.id} className="q-row">
                  <span className="q-num q-num--mint">{String(num).padStart(2, '0')}</span>
                  <span className="q-text">{w.meaning}</span>
                  {showAnswer ? (
                    <span className="q-answer">{w.word}</span>
                  ) : (
                    <span className="q-blank" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 푸터: 학원명 */}
      <div className="exam-footer mt-auto pt-4">
        <div className="flex items-center justify-center gap-1.5">
          <Image src="/logo.png" alt="아라국어논술" width={20} height={20} className="object-contain" />
          <span>아라국어논술</span>
        </div>
      </div>
    </div>
  );
}
