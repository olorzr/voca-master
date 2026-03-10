'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Category, Word } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { CategoryTree } from '@/components/words';
import { FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PASS_PERCENTAGE, PERCENTAGE_BASE } from '@/lib/constants';
import { buildCategoryTree } from '@/lib/category-tree';

/**
 * 시험지 생성 페이지 (트리 구조 카테고리 선택, 합격선 설정, 셔플 옵션)
 */
export default function ExamCreatePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [title, setTitle] = useState('');
  const [passPercentage, setPassPercentage] = useState(DEFAULT_PASS_PERCENTAGE);
  const [shuffle, setShuffle] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('level')
      .order('grade');
    setCategories(data ?? []);
  }, [user]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCatIds.length === 0) {
      setWords([]);
      return;
    }
    async function loadWords() {
      const { data } = await supabase
        .from('words')
        .select('*')
        .in('category_id', selectedCatIds)
        .order('order_index');
      setWords(data ?? []);
    }
    loadWords();
  }, [selectedCatIds]);

  const toggleCategory = (catId: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const totalQuestions = words.length;
  const passCount = Math.ceil((passPercentage / PERCENTAGE_BASE) * totalQuestions);

  const tree = buildCategoryTree(categories);

  const handleCreate = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error('시험지 제목을 입력해주세요.');
      return;
    }
    if (words.length === 0) {
      toast.error('카테고리를 선택해주세요.');
      return;
    }

    setCreating(true);

    const orderedWords = shuffle
      ? [...words].sort(() => Math.random() - 0.5)
      : words;

    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .insert({
        title: title.trim(),
        pass_percentage: passPercentage,
        total_questions: totalQuestions,
        pass_count: passCount,
        category_ids: selectedCatIds,
        word_ids: orderedWords.map((w) => w.id),
        user_id: user.id,
      })
      .select()
      .single();

    if (examErr || !exam) {
      toast.error('시험지 생성 중 오류가 발생했습니다.');
      setCreating(false);
      return;
    }

    const examWords = orderedWords.map((w, i) => ({
      exam_id: exam.id,
      word_id: w.id,
      word: w.word,
      meaning: w.meaning,
      order_index: i,
    }));

    const { error: ewErr } = await supabase.from('exam_words').insert(examWords);

    if (ewErr) {
      toast.error('시험지 단어 저장 중 오류가 발생했습니다.');
      setCreating(false);
      return;
    }

    toast.success('시험지가 생성되었습니다.');
    router.push(`/exam/view?id=${exam.id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">✏️ 시험지 생성</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 설정 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">시험지 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>시험지 제목</Label>
                <Input
                  placeholder="예: 중2 비상 Lesson 1 단어시험"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>합격 기준 (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="shuffle"
                      checked={shuffle}
                      onCheckedChange={(v) => setShuffle(v as boolean)}
                    />
                    <Label htmlFor="shuffle">문제 순서 섞기</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 카테고리 트리 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">카테고리 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryTree
                nodes={tree}
                selectedIds={selectedCatIds}
                onToggle={toggleCategory}
                multiSelect
              />
              {categories.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  카테고리가 없습니다. 먼저 단어를 추가해주세요.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 미리보기 */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                미리보기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">총 문항 수</span>
                  <span className="font-bold">{totalQuestions}문항</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">합격 기준</span>
                  <span className="font-bold">{passPercentage}%</span>
                </div>
                <Separator />
                <div className="flex justify-between text-primary">
                  <span className="font-medium">통과 기준</span>
                  <span className="font-bold">{passCount}개 이상 / {totalQuestions}문항</span>
                </div>
              </div>

              <Separator />

              <Button
                className="w-full bg-primary hover:bg-primary-hover text-white"
                onClick={handleCreate}
                disabled={creating || words.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                {creating ? '생성 중...' : '시험지 생성'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
