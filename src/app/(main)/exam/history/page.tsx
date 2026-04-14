'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Search, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExamHistoryCard, ExamHistoryFilter } from '@/components/exam';
import { formatDateKR } from '@/lib/format';
import { buildCategoryTree } from '@/lib/category-tree';
import type { Category } from '@/types';

interface ExamRecord {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  parent_exam_id: string | null;
  retake_number: number;
  category_ids: string[];
  created_at: string;
}

/**
 * 시험 이력 페이지. 원본 시험 아래에 재시험이 스레드로 표시된다.
 */
export default function ExamHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [retestingId, setRetestingId] = useState<string | null>(null);

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);

  // 선택 모드 상태
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!user) return;
    const [examRes, catRes] = await Promise.all([
      supabase.from('exams').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('level').order('grade'),
    ]);
    setExams(examRes.data ?? []);
    setCategories(catRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const originalExams = useMemo(
    () => exams.filter((e) => !e.parent_exam_id),
    [exams],
  );

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

  const hasActiveFilters = !!(searchQuery || dateFrom || dateTo || filterCategoryIds.length > 0);

  /** 모든 필터를 적용한 시험 목록 */
  const filteredExams = useMemo(() => {
    return originalExams.filter((e) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!e.title.toLowerCase().includes(q)) return false;
      }
      if (dateFrom) {
        const examDate = new Date(e.created_at).toISOString().slice(0, 10);
        if (examDate < dateFrom) return false;
      }
      if (dateTo) {
        const examDate = new Date(e.created_at).toISOString().slice(0, 10);
        if (examDate > dateTo) return false;
      }
      if (filterCategoryIds.length > 0) {
        const examCatIds = e.category_ids ?? [];
        const hasOverlap = filterCategoryIds.some((id) => examCatIds.includes(id));
        if (!hasOverlap) return false;
      }
      return true;
    });
  }, [originalExams, searchQuery, dateFrom, dateTo, filterCategoryIds]);

  const handleCategoryToggle = useCallback((id: string) => {
    setFilterCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setFilterCategoryIds([]);
  }, []);

  /** 선택 모드 종료 */
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredExams.length && filteredExams.length > 0) return new Set();
      return new Set(filteredExams.map((e) => e.id));
    });
  }, [filteredExams]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험지를 삭제할까요?')) return;
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) {
      toast.error('시험지 삭제에 실패했어요.');
      return;
    }
    setExams((prev) => prev.filter((e) => e.id !== id && e.parent_exam_id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast.success('시험지가 삭제되었어요!');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 시험지를 삭제할까요?\n관련 재시험도 함께 삭제돼요!`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('exams').delete().in('id', ids);
    if (error) {
      toast.error('시험지 삭제에 실패했어요.');
      return;
    }
    setExams((prev) => prev.filter((e) => !ids.includes(e.id) && (!e.parent_exam_id || !ids.includes(e.parent_exam_id))));
    toast.success(`${ids.length}개의 시험지가 삭제되었어요!`);
    exitSelectMode();
  };

  const handleRetest = async (examId: string) => {
    if (!user) return;
    setRetestingId(examId);
    const originalExam = exams.find((e) => e.id === examId);
    if (!originalExam) { setRetestingId(null); return; }

    const { data: originalWords } = await supabase
      .from('exam_words').select('*').eq('exam_id', examId).order('order_index');
    if (!originalWords || originalWords.length === 0) {
      toast.error('원본 시험지의 단어를 불러올 수 없어요');
      setRetestingId(null);
      return;
    }

    const existingRetakes = retakeMap.get(examId) ?? [];
    const nextNumber = existingRetakes.length + 1;
    const shuffled = [...originalWords].sort(() => Math.random() - 0.5);

    const { data: newExamId, error: rpcErr } = await supabase.rpc(
      'create_exam_with_words',
      {
        p_title: `${originalExam.title} (재시험 ${nextNumber}차)`,
        p_pass_percentage: originalExam.pass_percentage,
        p_total_questions: originalExam.total_questions,
        p_pass_count: originalExam.pass_count,
        p_category_ids: originalExam.category_ids,
        p_word_ids: [],
        p_user_id: user.id,
        p_words: shuffled.map((w, i) => ({
          word_id: w.word_id,
          word: w.word,
          meaning: w.meaning,
          order_index: i,
        })),
        p_parent_exam_id: examId,
        p_retake_number: nextNumber,
      },
    );

    if (rpcErr || !newExamId) {
      toast.error('재시험지 생성 중 오류가 발생했어요');
      setRetestingId(null);
      return;
    }

    toast.success(`재시험 ${nextNumber}차가 생성되었어요!`);
    setRetestingId(null);
    router.push(`/exam/view?id=${newExamId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-gray-400">불러오는 중...</p>
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

      {/* 필터 영역 */}
      {originalExams.length > 0 && (
        <>
          <ExamHistoryFilter
            searchQuery={searchQuery}
            onSearchChange={(q) => { setSearchQuery(q); setSelectedIds(new Set()); }}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(d) => { setDateFrom(d); setSelectedIds(new Set()); }}
            onDateToChange={(d) => { setDateTo(d); setSelectedIds(new Set()); }}
            filterCategoryIds={filterCategoryIds}
            onCategoryToggle={handleCategoryToggle}
            onClearFilters={clearFilters}
            categoryTree={categoryTree}
            hasActiveFilters={hasActiveFilters}
          />

          {/* 선택 모드 토글 */}
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectMode(true)}
                disabled={filteredExams.length === 0}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                선택
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={exitSelectMode}>
                  <X className="h-4 w-4 mr-1" />
                  선택 취소
                </Button>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs">
                    {isAllSelected ? '전체 해제' : '전체 선택'}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {selectedIds.size}개 선택됨
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={selectedIds.size === 0}
                    className="text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {selectedIds.size}개 삭제
                  </Button>
                </div>
              </>
            )}
            {hasActiveFilters && (
              <span className="text-xs text-gray-400 ml-2">
                {filteredExams.length}개의 결과
              </span>
            )}
          </div>
        </>
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
              selectMode={selectMode}
              selected={selectedIds.has(exam.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      ) : originalExams.length > 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">검색 결과가 없어요</p>
          <p className="text-xs text-gray-400 mt-1">다른 조건으로 검색해보세요!</p>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">-</div>
          <p className="text-sm text-gray-500 font-medium">아직 시험지가 없어요!</p>
          <p className="text-xs text-gray-400 mt-1">첫 시험지를 만들어볼까요?</p>
          <Link href="/exam/create">
            <Button variant="outline" className="mt-4">
              시험지 만들기
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
