'use client';

import type { Word } from '@/types';
import { Pencil, Trash2 } from 'lucide-react';

interface WordCardGridProps {
  words: Word[];
  onEdit: (word: Word) => void;
  onDelete: (wordId: string) => void;
}

/**
 * 단어를 카드 그리드로 표시하는 컴포넌트. 호버 시 수정/삭제 버튼이 나타난다.
 */
export default function WordCardGrid({ words, onEdit, onDelete }: WordCardGridProps) {
  if (words.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">등록된 단어가 없습니다.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {words.map((word, idx) => (
        <div
          key={word.id}
          className="group relative bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* 번호 뱃지 */}
          <span className="absolute top-3 right-3 text-xs font-semibold text-gray-300 bg-gray-50 rounded-full w-6 h-6 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            {idx + 1}
          </span>

          {/* 단어 */}
          <p className="text-base font-bold text-gray-900 pr-8 leading-snug">
            {word.word}
          </p>

          {/* 뜻 */}
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            {word.meaning}
          </p>

          {/* 호버 시 액션 버튼 */}
          <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(word)}
              className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary text-gray-400 transition-colors"
              aria-label="단어 수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(word.id)}
              className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
              aria-label="단어 삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
