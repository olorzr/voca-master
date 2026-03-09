'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Category, Word } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Pencil, Trash2, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCategoryLabel, groupCategoriesByLevel } from '@/lib/format';

/**
 * 단어 관리 페이지. 카테고리 탐색, 단어 목록 조회/수정/삭제 기능을 제공한다.
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

  const grouped = groupCategoriesByLevel(filteredCategories);

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
        <Link href="/words/new">
          <Button className="bg-primary hover:bg-primary-hover text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            단어 추가
          </Button>
        </Link>
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
        {/* 카테고리 목록 */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([level, cats]) => (
            <Card key={level}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {level}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {cats.map((cat) => (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                      selectedCategory?.id === cat.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectCategory(cat)}
                  >
                    <span className="truncate flex-1">{formatCategoryLabel(cat)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                        className="p-1 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-center text-gray-500 py-8">카테고리가 없습니다.</p>
          )}
        </div>

        {/* 단어 목록 */}
        <div className="lg:col-span-2">
          {selectedCategory ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {formatCategoryLabel(selectedCategory)}
                  <Badge variant="outline" className="ml-2">{words.length}개</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {words.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>단어</TableHead>
                        <TableHead>뜻</TableHead>
                        <TableHead className="w-24 text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {words.map((word, idx) => (
                        <TableRow key={word.id}>
                          <TableCell className="text-gray-400">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{word.word}</TableCell>
                          <TableCell>{word.meaning}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditWord(word);
                                  setEditForm({ word: word.word, meaning: word.meaning });
                                }}
                                className="p-1.5 hover:text-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteWord(word.id)}
                                className="p-1.5 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-8">등록된 단어가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-400">
              카테고리를 선택해주세요.
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
