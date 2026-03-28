import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import Image from 'next/image';

/** 첫 페이지 열당 문항 수 (헤더/정보바 등 공간 차지) */
const FIRST_PAGE_PER_COL = 17;
/** 이후 페이지 열당 문항 수 (간소화된 헤더) */
const NEXT_PAGE_PER_COL = 20;
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

/** 문항을 페이지별로 나눈다 */
function paginateWords(words: ExamWord[], useSingleCol: boolean) {
  const colCount = useSingleCol ? 1 : 2;
  const firstPageSize = FIRST_PAGE_PER_COL * colCount;
  const nextPageSize = NEXT_PAGE_PER_COL * colCount;

  const pages: ExamWord[][] = [];
  if (words.length === 0) return pages;

  pages.push(words.slice(0, firstPageSize));
  let offset = firstPageSize;

  while (offset < words.length) {
    pages.push(words.slice(offset, offset + nextPageSize));
    offset += nextPageSize;
  }

  return pages;
}

/** 시험지 / 답안지 뷰 (민트 테마) — A4 페이지 자동 분할 */
export default function ExamPaperView({ exam, words, categories, showAnswer }: ExamPaperViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const pages = paginateWords(words, useSingleCol);
  const totalPages = pages.length;
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const sourceLabels = categories.map((c) => formatCategoryLabel(c));

  /** 해당 페이지 이전까지의 누적 문항 수 */
  let cumulativeCount = 0;

  return (
    <>
      {pages.map((pageWords, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const startNum = cumulativeCount;
        cumulativeCount += pageWords.length;

        const half = useSingleCol ? pageWords.length : Math.ceil(pageWords.length / 2);

        return (
          <div key={pageIdx} className="a4-page bg-white p-8 mx-auto flex flex-col">
            {/* 헤더 */}
            {isFirstPage ? (
              <FirstPageHeader
                title={showAnswer ? `${exam.title} - 답안지` : exam.title}
                today={today}
                wordCount={words.length}
                sourceLabels={sourceLabels}
                passCount={exam.pass_count}
                passPercentage={exam.pass_percentage}
                showAnswer={showAnswer}
              />
            ) : (
              <ContinuationHeader
                title={showAnswer ? `${exam.title} - 답안지` : exam.title}
              />
            )}

            {/* 섹션 헤더 */}
            <div className="section-bar section-bar--mint">
              <span>다음 뜻에 해당하는 단어를 쓰시오.</span>
            </div>

            {/* 문제 영역 */}
            <div className={`grid ${useSingleCol ? 'grid-cols-1' : 'grid-cols-2'} gap-x-6 flex-1 mt-2`}>
              {[pageWords.slice(0, half), pageWords.slice(half)].filter(col => col.length > 0).map((col, colIdx) => (
                <div key={colIdx} className={colIdx === 1 ? 'border-l border-gray-200 pl-5' : ''}>
                  {col.map((w, idx) => {
                    const num = colIdx === 0
                      ? startNum + idx + 1
                      : startNum + half + idx + 1;
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

            {/* 푸터 */}
            <div className="exam-footer mt-auto pt-4">
              <div className="flex items-center justify-center gap-1.5">
                <Image src="/logo.png" alt="아라국어논술" width={20} height={20} className="object-contain" />
                <span>아라국어논술</span>
                {totalPages > 1 && (
                  <span className="ml-2 text-[8px]">({pageIdx + 1} / {totalPages})</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** 첫 페이지 전체 헤더 (정보바 포함) */
function FirstPageHeader({
  title, today, wordCount, sourceLabels, passCount, passPercentage, showAnswer,
}: {
  title: string;
  today: string;
  wordCount: number;
  sourceLabels: string[];
  passCount: number;
  passPercentage: number;
  showAnswer: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">{title}</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
        </div>
        <Image src="/logo.png" alt="아라국어논술" width={52} height={52} className="object-contain" />
      </div>

      <div className="border-t-[1.5px] border-b-[1.5px] border-[#B8EDE8] py-2.5 mb-4">
        {!showAnswer && (
          <div className="flex items-center gap-8 text-[11px] text-gray-600 mb-2">
            <span>이름 <span className="inline-block border-b border-gray-400 w-28 ml-2" /></span>
            <span>날짜 <span className="ml-2 text-gray-800">{today}</span></span>
            <span className="ml-auto exam-score-box">
              <span className="inline-block border-b border-gray-400 w-10 text-center" />
              <span className="text-gray-800 font-bold"> / {wordCount}개</span>
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
            합격 <strong className="text-gray-800">{passCount}개</strong> 이상 ({passPercentage}%)
          </span>
        </div>
      </div>
    </>
  );
}

/** 이후 페이지 간소 헤더 */
function ContinuationHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#B8EDE8]">
      <h2 className="text-[14px] font-bold text-gray-700">{title}</h2>
      <Image src="/logo.png" alt="아라국어논술" width={28} height={28} className="object-contain" />
    </div>
  );
}
