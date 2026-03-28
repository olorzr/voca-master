import Image from 'next/image';

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

/**
 * 단어장 뷰 (핑크 테마)
 * 핑크 박스 테이블 스타일 + break-inside: avoid로 자동 페이지 분할
 */
export default function WordBookView({ sourceText, words }: WordBookViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const half = useSingleCol ? words.length : Math.ceil(words.length / 2);

  return (
    <div className="exam-print-wrap bg-white p-8 mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">단어장</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
        </div>
        <Image src="/logo.png" alt="아라국어논술" width={52} height={52} className="object-contain" />
      </div>

      {/* 소단원 제목 바 */}
      <div className="border-t-[1.5px] border-b-[1.5px] border-[#F5C6D8] py-2.5 mb-4 text-[11px]">
        <div className="flex justify-between items-center">
          <strong className="text-gray-800">{sourceText || '-'}</strong>
          <span className="text-gray-500">총 <strong className="text-gray-800">{words.length}</strong>개</span>
        </div>
      </div>

      {/* 단어 테이블 — 핑크 박스 스타일 */}
      <div className={`grid ${useSingleCol ? 'grid-cols-1' : 'grid-cols-2'} gap-x-5`}>
        {[words.slice(0, half), words.slice(half)].filter(col => col.length > 0).map((col, colIdx) => (
          <div key={colIdx}>
            <div className="wb-thead">
              <span className="w-7 text-center">#</span>
              <span className="wb-thead__word">단어</span>
              <span className="wb-thead__meaning">뜻</span>
              <span className="wb-thead__check">암기</span>
            </div>
            <div className="wb-body">
              {col.map((w, idx) => {
                const num = colIdx === 0 ? idx + 1 : half + idx + 1;
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

      {/* 푸터 — 인쇄 시 모든 페이지 하단에 반복 */}
      <div className="exam-print-footer">
        <div className="flex items-center justify-center gap-1.5">
          <Image src="/logo.png" alt="아라국어논술" width={20} height={20} className="object-contain" />
          <span>아라국어논술</span>
        </div>
      </div>
    </div>
  );
}
