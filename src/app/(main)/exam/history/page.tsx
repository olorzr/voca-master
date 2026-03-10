'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ExamHistoryCard } from '@/components/exam';

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

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험지를 삭제하시겠습니까?')) return;
    await supabase.from('exams').delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id && e.parent_exam_id !== id));
    toast.success('시험지가 삭제되었습니다.');
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

      {originalExams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {originalExams.map((exam) => (
            <ExamHistoryCard
              key={exam.id}
              exam={exam}
              retakes={retakeMap.get(exam.id)}
              onDelete={handleDelete}
              onRetest={handleRetest}
              retesting={retestingId === exam.id}
            />
          ))}
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
