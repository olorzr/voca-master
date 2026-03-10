'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExamHistoryCard } from '@/components/exam';
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

/**
 * 시험 이력 페이지. 원본 시험 아래에 재시험이 스레드로 표시된다.
 */
export default function ExamHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [retestingId, setRetestingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadExams = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setExams(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  /** 원본 시험 목록 (parent_exam_id가 없는 것) */
  const originalExams = useMemo(
    () => exams.filter((e) => !e.parent_exam_id),
    [exams],
  );

  /** 원본 시험 ID → 재시험 배열 맵 (retake_number 오름차순) */
  const retakeMap = useMemo(() => {
    const map = new Map<string, ExamRecord[]>();
    for (const e of exams) {
      if (!e.parent_exam_id) continue;
      const list = map.get(e.parent_exam_id) ?? [];
      list.push(e);
      map.set(e.parent_exam_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.retake_number - b.retake_number);
    }
    return map;
  }, [exams]);

  /** 검색어로 필터링된 원본 시험 목록 */
  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return originalExams;
    const q = searchQuery.trim().toLowerCase();
    return originalExams.filter((e) => {
      const titleMatch = e.title.toLowerCase().includes(q);
      const dateMatch = formatDateKR(e.created_at).includes(q);
      return titleMatch || dateMatch;
    });
  }, [originalExams, searchQuery]);

  /** 전체 선택/해제 토글 */
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredExams.length && filteredExams.length > 0) {
        return new Set();
      }
      return new Set(filteredExams.map((e) => e.id));
    });
  }, [filteredExams]);

  /** 개별 시험 선택 토글 */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험지를 삭제하시겠습니까?')) return;
    await supabase.from('exams').delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id && e.parent_exam_id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast.success('시험지가 삭제되었습니다.');
  };

  /** 선택된 시험들을 일괄 삭제한다. */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 시험지를 삭제하시겠습니까?\n관련 재시험도 함께 삭제됩니다.`)) return;

    const ids = Array.from(selectedIds);
    await supabase.from('exams').delete().in('id', ids);
    setExams((prev) => prev.filter((e) => !ids.includes(e.id) && (!e.parent_exam_id || !ids.includes(e.parent_exam_id))));
    setSelectedIds(new Set());
    toast.success(`${ids.length}개의 시험지가 삭제되었습니다.`);
  };

  /** 원본 시험의 단어를 셔플하여 재시험지를 생성한다. */
  const handleRetest = async (examId: string) => {
    if (!user) return;
    setRetestingId(examId);

    const originalExam = exams.find((e) => e.id === examId);
    if (!originalExam) {
      setRetestingId(null);
      return;
    }

    const { data: originalWords } = await supabase
      .from('exam_words')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index');

    if (!originalWords || originalWords.length === 0) {
      toast.error('원본 시험지의 단어를 불러올 수 없습니다.');
      setRetestingId(null);
      return;
    }

    // 기존 재시험 수를 세서 다음 차수 결정
    const existingRetakes = retakeMap.get(examId) ?? [];
    const nextNumber = existingRetakes.length + 1;

    const shuffled = [...originalWords].sort(() => Math.random() - 0.5);

    const { data: newExam, error: examErr } = await supabase
      .from('exams')
      .insert({
        title: `${originalExam.title} (재시험 ${nextNumber}차)`,
        pass_percentage: originalExam.pass_percentage,
        total_questions: originalExam.total_questions,
        pass_count: originalExam.pass_count,
        parent_exam_id: examId,
        retake_number: nextNumber,
        user_id: user.id,
      })
      .select()
      .single();

    if (examErr || !newExam) {
      toast.error('재시험지 생성 중 오류가 발생했습니다.');
      setRetestingId(null);
      return;
    }

    const newWords = shuffled.map((w, i) => ({
      exam_id: newExam.id,
      word_id: w.word_id,
      word: w.word,
      meaning: w.meaning,
      order_index: i,
    }));

    const { error: ewErr } = await supabase.from('exam_words').insert(newWords);
    if (ewErr) {
      toast.error('재시험지 단어 저장 중 오류가 발생했습니다.');
      setRetestingId(null);
      return;
    }

    toast.success(`재시험 ${nextNumber}차가 생성되었습니다.`);
    setRetestingId(null);
    router.push(`/exam/view?id=${newExam.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isAllSelected = filteredExams.length > 0 && selectedIds.size === filteredExams.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">시험 이력</h1>
        <Link href="/exam/create">
          <Button className="bg-primary hover:bg-primary-hover text-white">
            <FileText className="h-4 w-4 mr-2" />
            새 시험지
          </Button>
        </Link>
      </div>

      {/* 검색 & 일괄 작업 바 */}
      {originalExams.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="제목, 날짜로 검색..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedIds(new Set()); }}
              className="pl-9 pr-8"
              aria-label="시험 검색"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedIds(new Set()); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="text-xs"
            >
              {isAllSelected ? '전체 해제' : '전체 선택'}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {selectedIds.size}개 삭제
              </Button>
            )}
          </div>
        </div>
      )}

      {filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => (
            <ExamHistoryCard
              key={exam.id}
              exam={exam}
              retakes={retakeMap.get(exam.id)}
              onDelete={handleDelete}
              onRetest={handleRetest}
              retesting={retestingId === exam.id}
              selected={selectedIds.has(exam.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      ) : originalExams.length > 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Search className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm">아직 생성된 시험지가 없습니다.</p>
          <Link href="/exam/create">
            <Button variant="outline" className="mt-4">시험지 만들기</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
