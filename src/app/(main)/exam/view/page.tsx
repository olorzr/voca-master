'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { ExamWord } from '@/types';
import { Button } from '@/components/ui/button';
import { Printer, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ExamData {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  created_at: string;
}

function ExamViewContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('id');
  const [exam, setExam] = useState<ExamData | null>(null);
  const [examWords, setExamWords] = useState<ExamWord[]>([]);
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

  const handlePrint = () => window.print();

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
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            인쇄
          </Button>
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div className="print-area">
        {viewMode === 'wordbook' ? (
          <WordBookView exam={exam} words={examWords} />
        ) : (
          <ExamPaperView exam={exam} words={examWords} showAnswer={showAnswer} />
        )}
      </div>
    </div>
  );
}

function ExamPaperView({
  exam,
  words,
  showAnswer,
}: {
  exam: ExamData;
  words: ExamWord[];
  showAnswer: boolean;
}) {
  return (
    <div className="a4-page bg-white p-8 mx-auto">
      {/* 헤더 */}
      <div className="text-center border-b-2 border-primary pb-4 mb-6">
        <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: "'Gmarket Sans', sans-serif" }}>아라국어논술</p>
        <h2 className="text-xl font-bold text-gray-900">{exam.title}</h2>
        {showAnswer && (
          <span className="inline-block mt-1 px-3 py-0.5 bg-primary/10 text-primary text-sm font-semibold rounded">
            답안지
          </span>
        )}
        <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
          <span>총 {exam.total_questions}문항</span>
          <span className="font-semibold text-primary">
            {exam.pass_count}개 이상 통과 ({exam.pass_percentage}%)
          </span>
        </div>
        {!showAnswer && (
          <div className="flex justify-between items-center mt-2 text-sm">
            <span>이름: ________________</span>
            <span>날짜: ____년 ____월 ____일</span>
          </div>
        )}
      </div>

      {/* 문제 */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {words.map((w, idx) => (
          <div key={w.id} className="flex items-start gap-2 py-1.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-400 w-6 shrink-0">{idx + 1}.</span>
            <span className="text-sm flex-1">{w.meaning}</span>
            <span className="text-sm min-w-[120px] text-right">
              {showAnswer ? (
                <span className="text-primary font-semibold">{w.word}</span>
              ) : (
                <span className="inline-block border-b border-gray-300 w-full">&nbsp;</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WordBookView({
  exam,
  words,
}: {
  exam: ExamData;
  words: ExamWord[];
}) {
  return (
    <div className="a4-page bg-white p-8 mx-auto">
      <div className="text-center border-b-2 border-primary pb-4 mb-6">
        <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: "'Gmarket Sans', sans-serif" }}>아라국어논술</p>
        <h2 className="text-xl font-bold text-gray-900">{exam.title} - 단어장</h2>
        <p className="text-sm text-gray-500 mt-1">총 {words.length}개 단어</p>
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        {words.map((w, idx) => (
          <div
            key={w.id}
            className="flex items-center gap-3 py-2 border-b border-gray-100"
          >
            <span className="text-sm font-semibold text-primary w-6 shrink-0">{idx + 1}</span>
            <span className="text-sm font-medium flex-1">{w.word}</span>
            <span className="text-sm text-gray-600 flex-1">{w.meaning}</span>
          </div>
        ))}
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
