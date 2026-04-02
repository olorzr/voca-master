'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Category, Word } from '@/types';
import { WordBookView } from '@/components/exam';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCategoryLabel } from '@/lib/format';

function WordsPrintContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const [category, setCategory] = useState<Category | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    if (!categoryId) return;
    async function load() {
      const [catRes, wordsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('id', categoryId).single(),
        supabase.from('words').select('*').eq('category_id', categoryId).order('order_index'),
      ]);
      if (catRes.data) setCategory(catRes.data);
      if (wordsRes.data) setWords(wordsRes.data);
    }
    load();
  }, [categoryId]);

  if (!category) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* 컨트롤 바 (인쇄 시 숨김) */}
      <div data-no-print className="space-y-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/words">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">단어장</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            인쇄
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const el = document.querySelector('.print-area');
              if (!el) return;
              toast.info('PDF 생성 중...');
              const html2pdf = (await import('html2pdf.js')).default;
              const label = category ? formatCategoryLabel(category, { excludePublisher: true }).replace(/\s/g, '_') : '단어장';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (html2pdf() as any).set({
                margin: [15, 15, 15, 15],
                filename: `단어장_${label}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.wb-row', '.wb-item'] },
              }).from(el).save();
              toast.success('PDF 다운로드 완료!');
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div className="print-area">
        <WordBookView
          sourceText={formatCategoryLabel(category, { excludePublisher: true })}
          words={words}
        />
      </div>
    </div>
  );
}

/**
 * 소단원별 단어장 인쇄 페이지. 카테고리 ID로 단어를 로드하여 단어장을 표시한다.
 */
export default function WordsPrintPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <WordsPrintContent />
    </Suspense>
  );
}
