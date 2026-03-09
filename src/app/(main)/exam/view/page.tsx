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

/** 인쇄용 책 아이콘 SVG */
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="52" viewBox="0 0 48 52" fill="none">
      <path d="M6 10a3 3 0 013-3h13v38H9a3 3 0 01-3-3V10z"
        fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M42 10a3 3 0 00-3-3H26v38h13a3 3 0 003-3V10z"
        fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="22" y="5" width="4" height="42" rx="1.5" fill="currentColor" />
      <line x1="11" y1="16" x2="18" y2="16" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="11" y1="20" x2="18" y2="20" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="11" y1="24" x2="16" y2="24" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="30" y1="16" x2="37" y2="16" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="30" y1="20" x2="37" y2="20" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="30" y1="24" x2="35" y2="24" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <path d="M34 7V1l3 2.5L40 1v6" fill="currentColor" fillOpacity=".5" />
    </svg>
  );
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

/** 시험지 / 답안지 뷰 (보라색 테마) */
function ExamPaperView({
  exam, words, showAnswer,
}: {
  exam: ExamData;
  words: ExamWord[];
  showAnswer: boolean;
}) {
  const half = Math.ceil(words.length / 2);

  return (
    <div className="a4-page bg-white p-8 mx-auto flex flex-col">
      {/* UNIT 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="unit-badge unit-badge--purple">
            <span className="unit-badge__label">UNIT</span>
            <span className="unit-badge__number">01</span>
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">
              {showAnswer ? 'Answer Key' : 'Vocabulary Test'}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">{exam.title}</p>
          </div>
        </div>
        <BookIcon className="text-[#6B5CA5]" />
      </div>

      {/* 정보 바 */}
      <div className="border-t-[1.5px] border-b-[1.5px] border-[#E0DBED] py-2.5 mb-4">
        {!showAnswer && (
          <div className="flex gap-8 text-[11px] text-gray-600 mb-2">
            <span>이름 <span className="inline-block border-b border-gray-400 w-28 ml-2" /></span>
            <span>날짜 <span className="inline-block border-b border-gray-400 w-28 ml-2" /></span>
          </div>
        )}
        <div className="flex justify-between text-[11px] text-gray-500">
          <span>총 <strong className="text-gray-800">{words.length}</strong> 문항</span>
          <span>
            합격 <strong className="text-gray-800">{exam.pass_count}개</strong> 이상 ({exam.pass_percentage}%)
          </span>
        </div>
      </div>

      {/* 섹션 A 헤더 */}
      <div className="section-bar section-bar--purple">
        <span className="section-bar__letter">A</span>
        <span>다음 뜻에 해당하는 단어를 쓰시오. (1~{words.length})</span>
      </div>

      {/* 2열 문제 */}
      <div className="grid grid-cols-2 gap-x-6 flex-1 mt-2">
        {[words.slice(0, half), words.slice(half)].map((col, colIdx) => (
          <div key={colIdx} className={colIdx === 1 ? 'border-l border-gray-200 pl-5' : ''}>
            {col.map((w, idx) => {
              const num = colIdx === 0 ? idx + 1 : half + idx + 1;
              return (
                <div key={w.id} className="q-row">
                  <span className="q-num q-num--purple">{String(num).padStart(2, '0')}</span>
                  <span className="q-text">{w.meaning}</span>
                  {showAnswer ? (
                    <span className="q-answer">{w.word}</span>
                  ) : (
                    <span className="q-blank" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="exam-footer mt-auto pt-4">ARA KOREAN WRITING</div>
    </div>
  );
}

/** 단어장 뷰 (핑크 테마) */
function WordBookView({
  exam, words,
}: {
  exam: ExamData;
  words: ExamWord[];
}) {
  const half = Math.ceil(words.length / 2);

  return (
    <div className="a4-page bg-white p-8 mx-auto flex flex-col">
      {/* UNIT 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="unit-badge unit-badge--pink">
            <span className="unit-badge__label">UNIT</span>
            <span className="unit-badge__number">01</span>
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-gray-900 leading-tight">
              {exam.title}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5 tracking-widest">아라국어논술</p>
          </div>
        </div>
        <BookIcon className="text-[#C83C6E]" />
      </div>

      {/* 단어 수 바 */}
      <div className="border-t-[1.5px] border-b-[1.5px] border-[#F5C6D8] py-2.5 mb-4 text-center text-[11px] text-gray-500 tracking-wider">
        WORD BOOK · <strong className="text-gray-800">{words.length}</strong>개
      </div>

      {/* 2열 단어 테이블 */}
      <div className="grid grid-cols-2 gap-x-5 flex-1">
        {[words.slice(0, half), words.slice(half)].map((col, colIdx) => (
          <div key={colIdx}>
            <div className="wb-thead">
              <span className="w-7 text-center">#</span>
              <span className="flex-1">단어</span>
              <span className="flex-1">뜻</span>
            </div>
            <div className="wb-body">
              {col.map((w, idx) => {
                const num = colIdx === 0 ? idx + 1 : half + idx + 1;
                return (
                  <div key={w.id} className="wb-row">
                    <span className="wb-row__num">{String(num).padStart(2, '0')}</span>
                    <span className="wb-row__word">{w.word}</span>
                    <span className="wb-row__meaning">{w.meaning}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="exam-footer mt-auto pt-4">ARA KOREAN WRITING</div>
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
