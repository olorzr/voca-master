'use client';

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { transformHTML } from '@/lib/exam-transform';
import ExamSheetRenderer, { SHEET_CONFIGS } from './ExamSheetRenderer';
import type { SheetConfig } from './ExamSheetRenderer';
import type { BuilderCategory } from './ExamCategoryBar';

/** 미리보기 탭 목록 */
const TABS = [
  { key: 'concept', label: '개념지', pink: false },
  { key: 'stage1', label: '1단계: 초성', pink: false },
  { key: 'stage2', label: '2단계: □', pink: true },
  { key: 'stage3', label: '3단계: ____', pink: true },
  { key: 'answer', label: '답안지', pink: true },
  { key: 'all', label: '전체 출력', pink: false },
] as const;

interface ExamPreviewProps {
  editorHTML: string;
  category: BuilderCategory;
  markCount: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBack: () => void;
  /** 개념지 탭에서 마킹 클릭/드래그 시 에디터 동기화 콜백 */
  onConceptClick?: (text: string) => void;
  onConceptDrag?: (text: string) => void;
}

/**
 * 미리보기 화면: 탭 전환 + A4 렌더링 + PDF 다운로드.
 */
export default function ExamPreview({
  editorHTML,
  category,
  markCount,
  activeTab,
  onTabChange,
  onBack,
  onConceptClick,
  onConceptDrag,
}: ExamPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  /** 개념지 미리보기 클릭/드래그 핸들러 */
  const handlePreviewMouseUp = useCallback(() => {
    if (activeTab !== 'concept') return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 0) {
      onConceptDrag?.(selectedText);
      selection?.removeAllRanges();
      return;
    }
    // 클릭 해제는 이벤트 위임으로 처리
  }, [activeTab, onConceptDrag]);

  const handleConceptClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('data-concept-interactive') === 'true') {
        e.preventDefault();
        const text = target.getAttribute('data-original') ?? target.textContent ?? '';
        onConceptClick?.(text);
      }
    },
    [onConceptClick],
  );

  /** PDF 다운로드 (현재 탭) */
  const downloadPDF = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    toast.info('PDF 생성 중...');
    const html2pdf = (await import('html2pdf.js')).default;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.eb-concept-preview-mark').forEach((m) => {
      m.className = 'eb-concept-highlight';
      m.removeAttribute('data-concept-interactive');
    });
    const filename = buildFilename(category, activeTab);
    const container = document.createElement('div');
    container.appendChild(clone);
    document.body.appendChild(container);
    await html2pdf().set(pdfOptions(filename)).from(clone).save();
    document.body.removeChild(container);
    toast.success('PDF 다운로드 완료!');
  }, [category, activeTab]);

  /** 전체 PDF 다운로드 (5종) */
  const downloadAllPDF = useCallback(async () => {
    toast.info('전체 PDF 생성 중...');
    const html2pdf = (await import('html2pdf.js')).default;
    const wrapper = document.createElement('div');

    const allConfigs = ['concept', 'stage1', 'stage2', 'stage3', 'answer'] as const;
    allConfigs.forEach((key, i) => {
      const page = document.createElement('div');
      page.className = `eb-a4-page${i > 0 ? ' eb-section-break' : ''}`;
      const config = SHEET_CONFIGS[key];
      const mode = key === 'concept' ? 'concept' as const : config.mode;
      const bodyHTML = transformHTML(editorHTML, mode);
      page.innerHTML = buildSheetHTML(category, config, markCount, bodyHTML);
      wrapper.appendChild(page);
    });

    document.body.appendChild(wrapper);
    const filename = buildFilename(category, '전체');
    await html2pdf().set({
      ...pdfOptions(filename),
      pagebreak: { mode: ['css'], before: '.eb-section-break', avoid: ['tr'] },
    }).from(wrapper).save();
    document.body.removeChild(wrapper);
    toast.success('전체 PDF 다운로드 완료!');
  }, [editorHTML, category, markCount]);

  const renderSheets = () => {
    if (activeTab === 'all') {
      return (['concept', 'stage1', 'stage2', 'stage3', 'answer'] as const).map((key, i) => {
        const cfg = { ...SHEET_CONFIGS[key] };
        if (key === 'concept') cfg.mode = 'concept';
        return (
          <div key={key} className={i > 0 ? 'mt-8' : ''}>
            <ExamSheetRenderer
              editorHTML={editorHTML}
              config={cfg}
              category={category}
              markCount={markCount}
            />
          </div>
        );
      });
    }
    const config = SHEET_CONFIGS[activeTab];
    if (!config) return null;
    return (
      <ExamSheetRenderer
        editorHTML={editorHTML}
        config={config}
        category={category}
        markCount={markCount}
        interactive={activeTab === 'concept'}
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 탭 바 */}
      <div className="bg-white border-b-2 border-gray-200 px-6 flex sticky top-16 z-40" data-no-print>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap
              ${activeTab === tab.key
                ? tab.pink
                  ? 'text-[#C83C6E] border-[#C83C6E]'
                  : 'text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 미리보기 영역 */}
      <div
        className="flex-1 overflow-y-auto p-8 bg-gray-100 flex justify-center"
        ref={previewRef}
        onClick={handleConceptClick}
        onMouseUp={handlePreviewMouseUp}
      >
        <div>{renderSheets()}</div>
      </div>

      {/* 하단 액션 바 */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center" data-no-print>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 에디터로 돌아가기
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            인쇄
          </Button>
          <Button className="bg-primary text-white hover:bg-primary-hover" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-1" /> 현재 탭 PDF
          </Button>
          <Button className="bg-[#C83C6E] text-white hover:bg-[#8B1A4A]" onClick={downloadAllPDF}>
            <FileDown className="h-4 w-4 mr-1" /> 전체 PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── 헬퍼 ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pdfOptions(filename: string): any {
  return {
    margin: [15, 15, 15, 15],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] },
  };
}

function buildFilename(cat: BuilderCategory, type: string): string {
  const pub = cat.publisher.replace(/[()]/g, '').replace(/\s/g, '');
  const unit = cat.unit.replace(/\s/g, '_').replace(/[,]/g, '').substring(0, 20);
  return `${cat.grade}_${pub}_${unit}_${type}.pdf`;
}

function buildSheetHTML(cat: BuilderCategory, config: SheetConfig, markCount: number, bodyHTML: string): string {
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const subtitle = cat.subunit ? `${cat.unit} — ${cat.subunit}` : cat.unit;
  return `
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10pt">
      <div>
        <h2 style="font-size:14pt;font-weight:800">${year} ${cat.grade} 국어 ${cat.publisher}
          <span class="${config.badgeClass}" style="display:inline-block;margin-left:6pt;padding:2pt 6pt;border-radius:4pt;font-size:9pt;font-weight:700">${config.badge}</span>
        </h2>
        <p style="font-size:8pt;color:#9CA3AF;letter-spacing:2px">아라국어논술</p>
      </div>
      <img src="/logo.png" width="48" height="48" style="object-fit:contain" />
    </div>
    <div style="border-top:1.5px solid #B8EDE8;border-bottom:1.5px solid #B8EDE8;padding:6pt 0;margin-bottom:10pt">
      <div style="display:flex;gap:16pt;font-size:10pt;color:#4B5563">
        <span style="font-weight:600">이름 <span style="display:inline-block;border-bottom:1px solid #9CA3AF;width:80pt;margin-left:4pt"></span></span>
        <span>날짜 <span style="color:#1F2937;margin-left:2pt">${today}</span></span>
        ${config.showScore ? `<span style="margin-left:auto;font-weight:600;color:#C83C6E"><span style="display:inline-block;border-bottom:1px solid #9CA3AF;width:30pt;text-align:center"></span> / ${markCount}개</span>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9pt;color:#6B7280;margin-top:4pt">
        <span style="color:#1F2937;font-weight:500">${subtitle || '-'}</span>
        <span>${cat.semester}</span>
      </div>
    </div>
    <div>${bodyHTML}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;border-top:1px solid #e5e7eb;padding:8px 0;margin-top:20pt;font-size:9px;color:#aaa;letter-spacing:2px">
      <img src="/logo.png" width="16" height="16" />
      <span>아라국어논술</span>
    </div>
  `;
}
