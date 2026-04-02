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
 * 단어장 단일 열 렌더링
 * 헤더(# 단어 뜻 암기)를 포함한 하나의 열을 렌더링한다.
 */
function WordColumn({ words, startIndex }: { words: WordBookWord[]; startIndex: number }) {
  return (
    <div className="wb-col">
      <div className="wb-thead">
        <span className="w-7 text-center">#</span>
        <span className="wb-thead__word">단어</span>
        <span className="wb-thead__meaning">뜻</span>
        <span className="wb-thead__check">암기</span>
      </div>
      {words.map((w, idx) => (
        <div
          key={w.id}
          className={`wb-row ${idx === words.length - 1 ? 'wb-row--last' : ''}`}
        >
          <span className="wb-row__num">{String(startIndex + idx + 1).padStart(2, '0')}</span>
          <span className="wb-row__word">{w.word}</span>
          <span className="wb-row__meaning">{w.meaning}</span>
          <span className="wb-row__check">
            <span className="wb-checkbox" />
            <span className="wb-checkbox" />
            <span className="wb-checkbox" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 단어장 뷰 (핑크 테마)
 * table + tfoot으로 푸터가 매 페이지 하단에 자동 반복.
 * 수동 2단 분할로 각 열마다 헤더(# 단어 뜻 암기)가 반복된다.
 */
export default function WordBookView({ sourceText, words }: WordBookViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const mid = Math.ceil(words.length / 2);
  const leftWords = words.slice(0, mid);
  const rightWords = words.slice(mid);

  return (
    <table className="exam-print-table bg-white mx-auto">
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

            {/* 단어 테이블 — 각 열마다 헤더 포함 */}
            {useSingleCol ? (
              <WordColumn words={words} startIndex={0} />
            ) : (
              <div className="wb-grid wb-grid--dual">
                <WordColumn words={leftWords} startIndex={0} />
                <WordColumn words={rightWords} startIndex={mid} />
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
