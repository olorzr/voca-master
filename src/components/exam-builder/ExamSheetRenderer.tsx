'use client';

import { useMemo } from 'react';
import { transformHTML } from '@/lib/exam-transform';
import type { TransformMode } from '@/lib/exam-transform';
import type { BuilderCategory } from './ExamCategoryBar';

/** 시트 설정 */
export interface SheetConfig {
  badge: string;
  badgeClass: string;
  mode: TransformMode;
  showScore: boolean;
}

/** 모든 탭별 설정 */
export const SHEET_CONFIGS: Record<string, SheetConfig> = {
  concept: { badge: '개념지', badgeClass: 'bg-[#E8F8F5] text-[#5BBFB7]', mode: 'concept-interactive', showScore: false },
  stage1:  { badge: '1단계: 초성', badgeClass: 'bg-[#B8EDE8] text-[#5BBFB7]', mode: 'stage1', showScore: true },
  stage2:  { badge: '2단계: 글자 수', badgeClass: 'bg-[#FDF0F4] text-[#C83C6E]', mode: 'stage2', showScore: true },
  stage3:  { badge: '3단계: 빈칸', badgeClass: 'bg-[#FDF0F4] text-[#8B1A4A]', mode: 'stage3', showScore: true },
  answer:  { badge: '답안지', badgeClass: 'bg-[#F5C6D8] text-[#8B1A4A]', mode: 'answer', showScore: false },
};

interface ExamSheetRendererProps {
  editorHTML: string;
  config: SheetConfig;
  category: BuilderCategory;
  markCount: number;
  /** 개념지 탭에서 인터랙티브 모드 */
  interactive?: boolean;
}

/**
 * A4 시트 1장 렌더러.
 * 기존 시험지(ExamPaperView)와 동일한 헤더 구조: 로고 + 제목 + 이름란 + 점수란.
 */
export default function ExamSheetRenderer({
  editorHTML,
  config,
  category,
  markCount,
  interactive,
}: ExamSheetRendererProps) {
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const title = `${year} ${category.grade} 국어 ${category.publisher}`;
  const subtitle = category.subunit
    ? `${category.unit} — ${category.subunit}`
    : category.unit;

  const bodyHTML = useMemo(
    () => transformHTML(editorHTML, config.mode),
    [editorHTML, config.mode],
  );

  return (
    <div className={`eb-a4-page ${interactive ? 'eb-concept-interactive' : ''}`}>
      {/* 헤더 — 기존 ExamPaperView와 동일 구조 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-[14pt] font-extrabold text-gray-900 leading-tight">
            {title}
            <span className={`inline-block ml-2 px-2 py-0.5 rounded text-[9pt] font-bold ${config.badgeClass}`}>
              {config.badge}
            </span>
          </h2>
          <p className="text-[8pt] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="아라국어논술" width={48} height={48} className="object-contain" />
      </div>

      {/* 정보 바 — 기존 시험지 스타일 통일 */}
      <div className="border-t-[1.5px] border-b-[1.5px] border-[#B8EDE8] py-2 mb-3">
        <div className="flex items-center gap-6 text-[10pt] text-gray-600">
          <span className="font-semibold">
            이름 <span className="inline-block border-b border-gray-400 w-28 ml-2" />
          </span>
          <span>날짜 <span className="ml-1 text-gray-800">{today}</span></span>
          {config.showScore && (
            <span className="ml-auto font-semibold text-[#C83C6E]">
              <span className="inline-block border-b border-gray-400 w-10 text-center" /> / {markCount}개
            </span>
          )}
        </div>
        <div className="flex justify-between text-[9pt] text-gray-500 mt-1">
          <span className="text-gray-800 font-medium">{subtitle || '-'}</span>
          <span>{category.semester}</span>
        </div>
      </div>

      {/* 본문 — 변환된 HTML */}
      <div className="sheet-body" dangerouslySetInnerHTML={{ __html: bodyHTML }} />

      {/* 푸터 */}
      <div className="exam-print-footer mt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="아라국어논술" width={16} height={16} />
        <span>아라국어논술</span>
      </div>
    </div>
  );
}
