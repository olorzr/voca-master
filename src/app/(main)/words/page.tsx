'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Category, Word } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WordCardGrid, CategoryTree } from '@/components/words';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Search, Settings } from 'lucide-react';
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

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('level')
      .order('grade')
      .order('publisher')
      .order('chapter');
    setCategories(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadWords = useCallback(async (categoryId: string) => {
    const { data } = await supabase
      .from('words')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index');
    setWords(data ?? []);
  }, []);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    loadWords(cat.id);
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('이 단어를 삭제하시겠습니까?')) return;
    await supabase.from('words').delete().eq('id', wordId);
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    toast.success('단어가 삭제되었습니다.');
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('이 카테고리와 포함된 모든 단어를 삭제하시겠습니까?')) return;
    await supabase.from('categories').delete().eq('id', catId);
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    if (selectedCategory?.id === catId) {
      setSelectedCategory(null);
      setWords([]);
    }
    toast.success('카테고리가 삭제되었습니다.');
  };

  const handleEditSave = async () => {
    if (!editWord) return;
    await supabase
      .from('words')
      .update({ word: editForm.word, meaning: editForm.meaning })
      .eq('id', editWord.id);
    setWords((prev) =>
      prev.map((w) => (w.id === editWord.id ? { ...w, ...editForm } : w))
    );
    setEditWord(null);
    toast.success('단어가 수정되었습니다.');
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
        <h1 className="text-2xl font-bold text-gray-900">단어 관리</h1>
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
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteCategory(selectedCategory.id)}
                >
                  카테고리 삭제
                </Button>
              </div>
              <WordCardGrid
                words={words}
                onEdit={(word) => {
                  setEditWord(word);
                  setEditForm({ word: word.word, meaning: word.meaning });
                }}
                onDelete={handleDeleteWord}
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
    </div>
  );
}
