'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { ExamWord, Category } from '@/types';
import { formatCategoryLabel } from '@/lib/format';
import { ExamPaperView, WordBookView } from '@/components/exam';
import { Button } from '@/components/ui/button';
import { Printer, FileText, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ExamData {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  category_ids: string[];
  created_at: string;
}

function ExamViewContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('id');
  const [exam, setExam] = useState<ExamData | null>(null);
  const [examWords, setExamWords] = useState<ExamWord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [viewMode, setViewMode] = useState<'exam' | 'wordbook' | 'answer'>('exam');

  useEffect(() => {
    if (!examId) return;
    async function load() {
      const [examRes, wordsRes] = await Promise.all([
        supabase.from('exams').select('*').eq('id', examId).single(),
        supabase.from('exam_words').select('*').eq('exam_id', examId).order('order_index'),
      ]);
      if (examRes.data) setExam(examRes.data);
      if (wordsRes.data) setExamWords(wordsRes.data);

      // 카테고리 출처 정보 로드
      if (examRes.data?.category_ids?.length) {
        const catRes = await supabase
          .from('categories')
          .select('*')
          .in('id', examRes.data.category_ids);
        if (catRes.data) setCategories(catRes.data);
      }
    }
    load();
  }, [examId]);

  if (!exam) {
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
          <Link href="/exam/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={viewMode === 'exam' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('exam'); setShowAnswer(false); }}
            className={viewMode === 'exam' ? 'bg-primary hover:bg-primary-hover text-white' : ''}
          >
            <FileText className="h-4 w-4 mr-1" />
            시험지
          </Button>
          <Button
            variant={viewMode === 'answer' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('answer'); setShowAnswer(true); }}
            className={viewMode === 'answer' ? 'bg-primary hover:bg-primary-hover text-white' : ''}
          >
            답안지
          </Button>
          <Button
            variant={viewMode === 'wordbook' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('wordbook'); setShowAnswer(false); }}
            className={viewMode === 'wordbook' ? 'bg-primary hover:bg-primary-hover text-white' : ''}
          >
            단어장
          </Button>
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
              const suffix = viewMode === 'wordbook' ? '단어장' : viewMode === 'answer' ? '답안지' : '시험지';
              const filename = `${exam.title}_${suffix}.pdf`;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (html2pdf() as any).set({
                margin: [15, 15, 15, 15],
                filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.wb-row', '.q-row'] },
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
        {viewMode === 'wordbook' ? (
          <WordBookView
            sourceText={categories.map(c => formatCategoryLabel(c, { excludePublisher: true })).join(', ')}
            words={examWords}
          />
        ) : (
          <ExamPaperView exam={exam} words={examWords} categories={categories} showAnswer={showAnswer} />
        )}
      </div>
    </div>
  );
}

/**
 * 시험지 보기 페이지. 시험지/답안지/단어장 3종 보기 및 A4 인쇄를 지원한다.
 */
export default function ExamViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <ExamViewContent />
    </Suspense>
  );
}
