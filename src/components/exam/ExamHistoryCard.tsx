'use client';

import Link from 'next/link';
import { Eye, Trash2, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateKR } from '@/lib/format';

interface ExamRecord {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  created_at: string;
}

interface ExamHistoryCardProps {
  exam: ExamRecord;
  onDelete: (id: string) => void;
}

/**
 * 시험지 이력을 카드로 표시하는 컴포넌트.
 */
export default function ExamHistoryCard({ exam, onDelete }: ExamHistoryCardProps) {
  return (
    <div className="group relative bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* 아이콘 + 제목 */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate pr-16">{exam.title}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>{formatDateKR(exam.created_at)}</span>
          </div>
        </div>
      </div>

      {/* 통계 뱃지 */}
      <div className="flex gap-2 mt-4">
        <Badge variant="outline" className="text-xs font-medium">
          {exam.total_questions}문항
        </Badge>
        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium">
          합격 {exam.pass_count}개 ({exam.pass_percentage}%)
        </Badge>
      </div>

      {/* 호버 시 액션 버튼 */}
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/exam/view?id=${exam.id}`}>
          <button
            className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary text-gray-400 transition-colors"
            aria-label="시험지 보기"
          >
            <Eye className="h-4 w-4" />
          </button>
        </Link>
        <button
          onClick={() => onDelete(exam.id)}
          className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
          aria-label="시험지 삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
