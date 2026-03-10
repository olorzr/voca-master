'use client';

import Link from 'next/link';
import { Eye, Trash2, FileText, Calendar, RefreshCw, CornerDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateKR } from '@/lib/format';

interface ExamRecord {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  parent_exam_id: string | null;
  retake_number: number;
  created_at: string;
}

interface ExamHistoryCardProps {
  exam: ExamRecord;
  retakes?: ExamRecord[];
  onDelete: (id: string) => void;
  onRetest: (id: string) => void;
  retesting?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

/**
 * 시험지 이력을 카드로 표시하는 컴포넌트. 재시험은 원본 아래 스레드로 표시.
 */
export default function ExamHistoryCard({ exam, retakes = [], onDelete, onRetest, retesting, selected, onToggleSelect }: ExamHistoryCardProps) {
  return (
    <div className="space-y-0">
      {/* 원본 시험 카드 */}
      <div className={`group relative bg-white border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${selected ? 'border-pink-400 ring-1 ring-pink-300/40' : 'border-pink-100'}`}>
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(exam.id)}
                aria-label={`${exam.title} 선택`}
              />
            </div>
          )}
          <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
            <FileText className="h-5 w-5 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate pr-16">{exam.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
              <Calendar className="h-3 w-3 text-pink-300" />
              <span>{formatDateKR(exam.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Badge variant="outline" className="text-xs font-medium border-pink-200 text-pink-600">
            📋 {exam.total_questions}문항
          </Badge>
          <Badge className="bg-pink-100 text-pink-600 hover:bg-pink-200 text-xs font-medium">
            ✅ 합격 {exam.pass_count}개 ({exam.pass_percentage}%)
          </Badge>
        </div>

        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/exam/view?id=${exam.id}`}>
            <button
              className="p-1.5 rounded-md hover:bg-pink-50 hover:text-pink-500 text-gray-400 transition-colors"
              aria-label="시험지 보기"
            >
              <Eye className="h-4 w-4" />
            </button>
          </Link>
          <button
            onClick={() => onRetest(exam.id)}
            disabled={retesting}
            className="p-1.5 rounded-md hover:bg-pink-50 hover:text-pink-500 text-gray-400 transition-colors disabled:opacity-50"
            aria-label="재시험지 생성"
          >
            <RefreshCw className={`h-4 w-4 ${retesting ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onDelete(exam.id)}
            className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
            aria-label="시험지 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 재시험 스레드 */}
      {retakes.length > 0 && (
        <div className="ml-6 border-l-2 border-pink-200 pl-4 space-y-2 pt-2">
          {retakes.map((retake) => (
            <RetakeItem key={retake.id} retake={retake} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RetakeItemProps {
  retake: ExamRecord;
  onDelete: (id: string) => void;
}

/** 재시험 스레드 아이템 */
function RetakeItem({ retake, onDelete }: RetakeItemProps) {
  return (
    <div className="group relative flex items-center gap-3 bg-pink-50/40 border border-pink-100 rounded-lg px-4 py-3 hover:bg-white hover:shadow-sm transition-all duration-200">
      <CornerDownRight className="h-4 w-4 text-pink-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 truncate">
            🔄 재시험 {retake.retake_number}차
          </span>
          <span className="text-xs text-gray-400">{formatDateKR(retake.created_at)}</span>
        </div>
        <div className="flex gap-1.5 mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-pink-200 text-pink-500">
            {retake.total_questions}문항
          </Badge>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/exam/view?id=${retake.id}`}>
          <button
            className="p-1 rounded-md hover:bg-pink-100 hover:text-pink-500 text-gray-400 transition-colors"
            aria-label="재시험지 보기"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </Link>
        <button
          onClick={() => onDelete(retake.id)}
          className="p-1 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
          aria-label="재시험지 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
