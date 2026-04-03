'use client';

import { useMemo } from 'react';
import { transformHTML } from '@/lib/exam-transform';
import type { TransformMode } from '@/lib/exam-transform';
import type { BuilderCategory } from './ExamCategoryBar';

/** 1단 최대 글자 수 — 초과 시 2단 레이아웃 */
const SINGLE_COL_CHAR_THRESHOLD = 300;

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
 * A4 시트 렌더러.
 * table + tfoot 패턴으로 푸터가 매 인쇄 페이지에 자동 반복되고,
 * 내용이 A4를 넘으면 자연스럽게 다음 페이지로 넘어간다.
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
  const unitText = category.subunit
    ? `${category.unit} — ${category.subunit}`
    : category.unit;
  const title = [
    `${year} ${category.grade} 국어 ${category.publisher}`,
    unitText,
  ].filter(Boolean).join(' ');

  const bodyHTML = useMemo(
    () => transformHTML(editorHTML, config.mode),
    [editorHTML, config.mode],
  );

  /** HTML 태그 제거 후 글자 수로 2단 여부 판단 */
  const useDualCol = useMemo(() => {
    const textLength = editorHTML.replace(/<[^>]*>/g, '').trim().length;
    return textLength > SINGLE_COL_CHAR_THRESHOLD;
  }, [editorHTML]);

  return (
    <table className={`exam-print-table eb-sheet-table bg-white mx-auto ${interactive ? 'eb-concept-interactive' : ''}`}>
      {/* 헤더 + 정보바 — 매 인쇄 페이지 상단에 자동 반복 */}
      <thead>
        <tr>
          <td className="eb-sheet-thead-cell">
            {/* 헤더 */}
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

            {/* 정보 바 */}
            <div className="border-t-[1.5px] border-b-[1.5px] border-[#B8EDE8] py-2">
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
              {(unitText || category.semester) && (
                <div className="flex justify-between text-[9pt] text-gray-500 mt-1">
                  <span className="text-gray-800 font-medium">{unitText}</span>
                  <span>{category.semester}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      </thead>

      {/* 푸터 — 매 인쇄 페이지 하단에 자동 반복 */}
      <tfoot>
        <tr>
          <td>
            <div className="exam-print-footer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="아라국어논술" width={16} height={16} />
              <span>아라국어논술</span>
            </div>
          </td>
        </tr>
      </tfoot>

      {/* 본문 */}
      <tbody>
        <tr>
          <td className="eb-sheet-tbody-cell">
            {/* 본문 — 변환된 HTML (글자 수 300자 초과 시 2단) */}
            <div
              className={`sheet-body ${useDualCol ? 'sheet-body--dual' : ''}`}
              dangerouslySetInnerHTML={{ __html: bodyHTML }}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
