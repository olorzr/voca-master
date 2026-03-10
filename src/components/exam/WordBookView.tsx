import type { ExamWord } from '@/types';
import Image from 'next/image';

/** 단일 열에 넣을 최대 문항 수. 이 이하이면 1열로 표시 */
const SINGLE_COL_THRESHOLD = 20;

interface WordBookViewProps {
  exam: {
    title: string;
  };
  words: ExamWord[];
}

/** 단어장 뷰 (핑크 테마) */
export default function WordBookView({ exam, words }: WordBookViewProps) {
  const useSingleCol = words.length <= SINGLE_COL_THRESHOLD;
  const half = useSingleCol ? words.length : Math.ceil(words.length / 2);

  return (
    <div className="a4-page bg-white p-8 mx-auto flex flex-col">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">
            {exam.title}
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
        </div>
        <Image src="/logo.png" alt="아라국어논술" width={52} height={52} className="object-contain" />
      </div>

      {/* 단어 수 바 */}
      <div className="border-t-[1.5px] border-b-[1.5px] border-[#F5C6D8] py-2.5 mb-4 text-center text-[11px] text-gray-500 tracking-wider">
        WORD BOOK · <strong className="text-gray-800">{words.length}</strong>개
      </div>

      {/* 단어 테이블 */}
      <div className={`grid ${useSingleCol ? 'grid-cols-1' : 'grid-cols-2'} gap-x-5 flex-1`}>
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

      <div className="exam-footer mt-auto pt-4">
        <div className="flex items-center justify-center gap-1.5">
          <Image src="/logo.png" alt="아라국어논술" width={20} height={20} className="object-contain" />
          <span>아라국어논술</span>
        </div>
      </div>
    </div>
  );
}
