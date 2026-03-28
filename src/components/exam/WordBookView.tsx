import Image from 'next/image';

/** 첫 페이지 열당 단어 수 (헤더/정보바 공간) */
const FIRST_PAGE_PER_COL = 15;
/** 이후 페이지 열당 단어 수 */
const NEXT_PAGE_PER_COL = 21;
/** 단일 열 최대 문항 수 기준 */
const SINGLE_COL_THRESHOLD = 20;

interface WordBookWord {
  id: string;
  word: string;
  meaning: string;
}

interface WordBookViewProps {
  sourceText?: string;
  words: WordBookWord[];
}

/** 단어를 페이지별로 나눈다 */
function paginateWords(words: WordBookWord[], useSingleCol: boolean) {
  const colCount = useSingleCol ? 1 : 2;
  const firstPageSize = FIRST_PAGE_PER_COL * colCount;
  const nextPageSize = NEXT_PAGE_PER_COL * colCount;

  const pages: WordBookWord[][] = [];
  if (words.length === 0) return pages;

  pages.push(words.slice(0, firstPageSize));
  let offset = firstPageSize;

  while (offset < words.length) {
    pages.push(words.slice(offset, offset + nextPageSize));
    offset += nextPageSize;
  }

  return pages;
}

/** 단어장 뷰 (핑크 테마) — A4 페이지 자동 분할 */
export default function WordBookView({ sourceText, words }: WordBookViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const pages = paginateWords(words, useSingleCol);
  const totalPages = pages.length;

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
              <FirstPageHeader sourceText={sourceText} totalWords={words.length} />
            ) : (
              <ContinuationHeader />
            )}

            {/* 단어 테이블 */}
            <div className={`grid ${useSingleCol ? 'grid-cols-1' : 'grid-cols-2'} gap-x-5 flex-1`}>
              {[pageWords.slice(0, half), pageWords.slice(half)].filter(col => col.length > 0).map((col, colIdx) => (
                <div key={colIdx}>
                  <div className="wb-thead">
                    <span className="w-7 text-center">#</span>
                    <span className="wb-thead__word">단어</span>
                    <span className="wb-thead__meaning">뜻</span>
                    <span className="wb-thead__check">암기</span>
                  </div>
                  <div className="wb-body">
                    {col.map((w, idx) => {
                      const num = colIdx === 0
                        ? startNum + idx + 1
                        : startNum + half + idx + 1;
                      return (
                        <div key={w.id} className="wb-row">
                          <span className="wb-row__num">{String(num).padStart(2, '0')}</span>
                          <span className="wb-row__word">{w.word}</span>
                          <span className="wb-row__meaning">{w.meaning}</span>
                          <span className="wb-row__check">
                            <span className="wb-checkbox" />
                            <span className="wb-checkbox" />
                            <span className="wb-checkbox" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
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

/** 첫 페이지 전체 헤더 */
function FirstPageHeader({ sourceText, totalWords }: { sourceText?: string; totalWords: number }) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">단어장</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
        </div>
        <Image src="/logo.png" alt="아라국어논술" width={52} height={52} className="object-contain" />
      </div>

      <div className="border-t-[1.5px] border-b-[1.5px] border-[#F5C6D8] py-2.5 mb-4 text-[11px]">
        <div className="flex justify-between items-center">
          <strong className="text-gray-800">{sourceText || '-'}</strong>
          <span className="text-gray-500">총 <strong className="text-gray-800">{totalWords}</strong>개</span>
        </div>
      </div>
    </>
  );
}

/** 이후 페이지 간소 헤더 */
function ContinuationHeader() {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F5C6D8]">
      <h2 className="text-[14px] font-bold text-gray-700">단어장</h2>
      <Image src="/logo.png" alt="아라국어논술" width={28} height={28} className="object-contain" />
    </div>
  );
}
