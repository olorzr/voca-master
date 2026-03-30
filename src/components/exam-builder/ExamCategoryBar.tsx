'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase';
import { buildCategoryTree } from '@/lib/category-tree';
import CategoryTree from '@/components/words/CategoryTree';
import { formatCategoryLabel } from '@/lib/format';
import { FolderOpen, Search } from 'lucide-react';
import type { Category } from '@/types';

/** 빌더 카테고리 정보 */
export interface BuilderCategory {
  level: '중등' | '고등';
  grade: string;
  publisher: string;
  semester: string;
  unit: string;
  subunit: string;
}

interface ExamCategoryBarProps {
  category: BuilderCategory;
  onChange: (cat: BuilderCategory) => void;
}

/**
 * Category → BuilderCategory 변환.
 * 단어관리의 카테고리를 빌더용 형식으로 매핑한다.
 */
function toBuilderCategory(cat: Category): BuilderCategory {
  return {
    level: cat.level === '고등' ? '고등' : '중등',
    grade: cat.grade,
    publisher: cat.publisher,
    semester: cat.semester,
    unit: cat.chapter,
    subunit: cat.sub_chapter || '',
  };
}

/**
 * 개념지 빌더 상단 카테고리 선택 바.
 * 단어관리와 동일한 CategoryTree에서 카테고리를 선택한다.
 */
export default function ExamCategoryBar({ category, onChange }: ExamCategoryBarProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .in('level', ['중등', '고등'])
      .order('level')
      .order('grade')
      .order('publisher')
      .order('chapter');
    setCategories(data ?? []);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = searchQuery
    ? categories.filter((c) =>
        formatCategoryLabel(c).toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : categories;

  const tree = buildCategoryTree(filtered);

  const handleSelect = (cat: Category) => {
    onChange(toBuilderCategory(cat));
    setSelectedCategoryId(cat.id);
    setOpen(false);
  };

  const label = category.unit
    ? `${category.grade} ${category.publisher} ${category.semester} ${category.unit}${category.subunit ? ` — ${category.subunit}` : ''}`
    : '카테고리를 선택하세요';

  return (
    <div className="bg-white border-b-2 border-primary p-4 flex items-center gap-3 sticky top-16 z-40" data-no-print>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" />
          }
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          카테고리 선택
        </SheetTrigger>
        <SheetContent side="left" className="w-[380px] sm:max-w-[380px]">
          <SheetHeader>
            <SheetTitle>카테고리 선택</SheetTitle>
            <SheetDescription>단어관리에 등록된 카테고리에서 선택하세요.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="카테고리 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <CategoryTree
              nodes={tree}
              selectedId={selectedCategoryId}
              onSelect={handleSelect}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${category.unit ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {label}
        </p>
      </div>
    </div>
  );
}
