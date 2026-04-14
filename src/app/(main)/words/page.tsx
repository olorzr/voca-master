'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Category, Word } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WordCardGrid, CategoryTree, MoveWordsDialog } from '@/components/words';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Settings, CheckSquare, X, ArrowRightLeft, Trash2, BookOpen, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatCategoryLabel } from '@/lib/format';
import { buildCategoryTree } from '@/lib/category-tree';

/**
 * 단어 관리 페이지. 트리 구조로 카테고리 탐색, 단어 조회/수정/삭제 기능을 제공한다.
 */
export default function WordsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [editForm, setEditForm] = useState({ word: '', meaning: '' });
  const [loading, setLoading] = useState(true);

  // 정렬 상태: asc(ㄱ~ㅎ), desc(ㅎ~ㄱ), order(등록순)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'order'>('asc');

  // 선택 모드 상태
  const [selectMode, setSelectMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('level')
        .order('grade')
        .order('publisher')
        .order('chapter');
      setCategories(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const loadWords = useCallback(async (categoryId: string) => {
    const { data } = await supabase
      .from('words')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index');
    setWords(data ?? []);
  }, []);

  /** 정렬된 단어 목록 */
  const sortedWords = useMemo(() => {
    if (sortOrder === 'order') return words;
    return [...words].sort((a, b) => {
      const cmp = a.word.localeCompare(b.word, 'ko');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [words, sortOrder]);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    loadWords(cat.id);
    exitSelectMode();
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('이 단어를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('words').delete().eq('id', wordId);
    if (error) {
      toast.error('단어 삭제에 실패했어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    toast.success('단어가 삭제되었습니다.');
  };

  const handleEditSave = async () => {
    if (!editWord) return;
    const { error } = await supabase
      .from('words')
      .update({ word: editForm.word, meaning: editForm.meaning })
      .eq('id', editWord.id);
    if (error) {
      toast.error('단어 수정에 실패했어요.');
      return;
    }
    setWords((prev) =>
      prev.map((w) => (w.id === editWord.id ? { ...w, ...editForm } : w))
    );
    setEditWord(null);
    toast.success('단어가 수정되었습니다.');
  };

  /** 선택 모드 종료 */
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedWordIds(new Set());
  };

  /** 단어 선택 토글 */
  const toggleWordSelect = (wordId: string) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  /** 전체 선택/해제 */
  const toggleSelectAll = () => {
    if (selectedWordIds.size === words.length) {
      setSelectedWordIds(new Set());
    } else {
      setSelectedWordIds(new Set(words.map((w) => w.id)));
    }
  };

  /** 선택한 단어 일괄 삭제 */
  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${selectedWordIds.size}개의 단어를 삭제하시겠습니까?`)) return;
    const ids = Array.from(selectedWordIds);
    const { error } = await supabase.from('words').delete().in('id', ids);
    if (error) {
      toast.error('단어 삭제에 실패했어요.');
      return;
    }
    setWords((prev) => prev.filter((w) => !selectedWordIds.has(w.id)));
    toast.success(`${ids.length}개의 단어가 삭제되었습니다.`);
    exitSelectMode();
  };

  /** 카테고리 삭제 (words.category_id ON DELETE CASCADE로 단어도 함께 삭제) */
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    const label = formatCategoryLabel(selectedCategory);
    if (!confirm(`"${label}" 카테고리를 삭제하시겠습니까?\n포함된 단어 ${words.length}개도 함께 삭제됩니다.`)) return;
    const { error } = await supabase
      .from('categories').delete().eq('id', selectedCategory.id);
    if (error) {
      toast.error('카테고리 삭제에 실패했어요.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
    setSelectedCategory(null);
    setWords([]);
    toast.success('카테고리가 삭제되었습니다.');
  };

  /** 선택한 단어를 다른 카테고리로 이동 */
  const handleMoveConfirm = async (targetCategory: Category) => {
    const ids = Array.from(selectedWordIds);
    const { error } = await supabase
      .from('words').update({ category_id: targetCategory.id }).in('id', ids);
    if (error) {
      toast.error('단어 이동에 실패했어요.');
      return;
    }
    setWords((prev) => prev.filter((w) => !selectedWordIds.has(w.id)));
    setMoveDialogOpen(false);
    toast.success(`${ids.length}개의 단어가 이동되었습니다.`);
    exitSelectMode();
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true;
    const label = formatCategoryLabel(cat).toLowerCase();
    return label.includes(searchQuery.toLowerCase()) || cat.level.includes(searchQuery);
  });

  const tree = buildCategoryTree(filteredCategories);

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
        <h1 className="text-2xl font-bold text-gray-900">📚 단어 관리</h1>
        <div className="flex items-center gap-2">
          <Link href="/words/categories">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              카테고리 관리
            </Button>
          </Link>
          <Link href="/words/new">
            <Button className="bg-primary hover:bg-primary-hover text-white">
              <PlusCircle className="h-4 w-4 mr-2" />
              단어 추가
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="카테고리 검색..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 카테고리 트리 */}
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <CategoryTree
                nodes={tree}
                selectedId={selectedCategory?.id}
                onSelect={handleSelectCategory}
              />
            </CardContent>
          </Card>
        </div>

        {/* 단어 목록 */}
        <div className="lg:col-span-2">
          {selectedCategory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {formatCategoryLabel(selectedCategory)}
                  </h2>
                  <Badge variant="outline">{words.length}개</Badge>
                  <Select value={sortOrder} onValueChange={(v) => { if (v) setSortOrder(v as 'asc' | 'desc' | 'order'); }}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">오름차순 (ㄱ~ㅎ)</SelectItem>
                      <SelectItem value="desc">내림차순 (ㅎ~ㄱ)</SelectItem>
                      <SelectItem value="order">등록순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!selectMode ? (
                  <div className="flex items-center gap-2">
                    <Link href={`/words/print?categoryId=${selectedCategory.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={words.length === 0}
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        단어장
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectMode(true)}
                      disabled={words.length === 0}
                    >
                      <CheckSquare className="h-4 w-4 mr-1" />
                      단어 선택
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={handleDeleteCategory}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      카테고리 삭제
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={exitSelectMode}>
                    <X className="h-4 w-4 mr-1" />
                    선택 취소
                  </Button>
                )}
              </div>

              {/* 선택 모드 액션바 */}
              {selectMode && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                    {selectedWordIds.size === words.length ? '전체 해제' : '전체 선택'}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {selectedWordIds.size}개 선택됨
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedWordIds.size === 0}
                      onClick={() => setMoveDialogOpen(true)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-1" />
                      이동
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      disabled={selectedWordIds.size === 0}
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                </div>
              )}

              <WordCardGrid
                words={sortedWords}
                onEdit={(word) => {
                  setEditWord(word);
                  setEditForm({ word: word.word, meaning: word.meaning });
                }}
                onDelete={handleDeleteWord}
                selectMode={selectMode}
                selectedIds={selectedWordIds}
                onToggleSelect={toggleWordSelect}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <Search className="h-12 w-12 mb-3" />
              <p className="text-sm">카테고리를 선택해주세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 단어 수정 다이얼로그 */}
      <Dialog open={!!editWord} onOpenChange={() => setEditWord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>단어 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>단어</Label>
              <Input
                value={editForm.word}
                onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>뜻</Label>
              <Input
                value={editForm.meaning}
                onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWord(null)}>취소</Button>
            <Button className="bg-primary hover:bg-primary-hover text-white" onClick={handleEditSave}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 단어 이동 다이얼로그 */}
      {selectedCategory && (
        <MoveWordsDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          categories={categories}
          excludeCategoryId={selectedCategory.id}
          selectedCount={selectedWordIds.size}
          onConfirm={handleMoveConfirm}
        />
      )}
    </div>
  );
}
