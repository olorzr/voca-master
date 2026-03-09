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
  const half = Math.ceil(words.length / 2);
  const leftCol = words.slice(0, half);
  const rightCol = words.slice(half);

  return (
    <div className="a4-page bg-white p-8 mx-auto flex flex-col">
      {/* 헤더 프레임 */}
      <div className="exam-header-frame text-center mb-6">
        <p
          className="text-[10px] tracking-[4px] text-gray-400 uppercase mb-2"
          style={{ fontFamily: "'Gmarket Sans', sans-serif" }}
        >
          아라국어논술
        </p>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">
          {exam.title}
        </h2>
        {showAnswer && (
          <span className="inline-block mt-2 px-4 py-0.5 border-2 border-gray-800 text-gray-800 text-xs font-bold rounded-full tracking-wider">
            ANSWER SHEET
          </span>
        )}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-dashed border-gray-300 text-xs text-gray-500">
          <span>총 <strong className="text-gray-800">{exam.total_questions}</strong>문항</span>
          <span>
            합격 <strong className="text-gray-800">{exam.pass_count}개</strong> 이상
            ({exam.pass_percentage}%)
          </span>
        </div>
        {!showAnswer && (
          <div className="flex justify-between items-center mt-3 text-sm text-gray-700">
            <span>이름 <span className="inline-block border-b border-gray-400 w-32 ml-1" /></span>
            <span>날짜 <span className="inline-block border-b border-gray-400 w-36 ml-1" /></span>
          </div>
        )}
      </div>

      {/* 문제 2열 */}
      <div className="grid grid-cols-2 gap-x-6 flex-1">
        {[leftCol, rightCol].map((col, colIdx) => (
          <div key={colIdx} className={colIdx === 1 ? 'border-l border-gray-200 pl-6' : 'pr-2'}>
            {col.map((w, idx) => {
              const num = colIdx === 0 ? idx + 1 : half + idx + 1;
              return (
                <div
                  key={w.id}
                  className={`flex items-center gap-2.5 py-[7px] px-2 rounded ${
                    idx % 2 === 1 ? 'exam-row-even' : ''
                  }`}
                >
                  <span className="exam-num-badge">{num}</span>
                  <span className="text-[12px] leading-tight flex-1">{w.meaning}</span>
                  {showAnswer ? (
                    <span className="text-[12px] font-bold text-gray-800 min-w-[80px] text-right">
                      {w.word}
                    </span>
                  ) : (
                    <span className="exam-answer-line min-w-[90px]" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 푸터 */}
      <div className="exam-footer mt-6">ARA KOREAN WRITING</div>
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
  const half = Math.ceil(words.length / 2);
  const leftCol = words.slice(0, half);
  const rightCol = words.slice(half);

  return (
    <div className="a4-page bg-white p-8 mx-auto flex flex-col">
      {/* 헤더 */}
      <div className="exam-header-frame text-center mb-6">
        <p
          className="text-[10px] tracking-[4px] text-gray-400 uppercase mb-2"
          style={{ fontFamily: "'Gmarket Sans', sans-serif" }}
        >
          아라국어논술
        </p>
        <h2 className="text-lg font-bold text-gray-900">{exam.title}</h2>
        <span className="inline-block mt-2 px-4 py-0.5 border border-gray-300 text-gray-500 text-xs rounded-full tracking-wider">
          WORD BOOK · {words.length}
        </span>
      </div>

      {/* 단어 테이블 2열 */}
      <div className="grid grid-cols-2 gap-x-5 flex-1">
        {[leftCol, rightCol].map((col, colIdx) => (
          <table key={colIdx} className="wordbook-table">
            <thead>
              <tr>
                <th className="w-8 text-center">#</th>
                <th>단어</th>
                <th>뜻</th>
              </tr>
            </thead>
            <tbody>
              {col.map((w, idx) => {
                const num = colIdx === 0 ? idx + 1 : half + idx + 1;
                return (
                  <tr key={w.id}>
                    <td className="text-center font-bold text-gray-400">{num}</td>
                    <td className="font-semibold text-gray-900">{w.word}</td>
                    <td className="text-gray-600">{w.meaning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>

      {/* 푸터 */}
      <div className="exam-footer mt-6">ARA KOREAN WRITING</div>
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
