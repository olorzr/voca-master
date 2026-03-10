'use client';

import { useState } from 'react';
import { Search, X, Calendar, FolderTree, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategoryTree } from '@/components/words';
import type { CategoryTreeNode } from '@/lib/category-tree';

interface ExamHistoryFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  filterCategoryIds: string[];
  onCategoryToggle: (id: string) => void;
  onClearFilters: () => void;
  categoryTree: CategoryTreeNode[];
  hasActiveFilters: boolean;
}

/**
 * 시험 이력 검색/필터 컴포넌트.
 * 제목 검색, 날짜 범위, 카테고리 트리 필터를 제공한다.
 */
export default function ExamHistoryFilter({
  searchQuery, onSearchChange,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  filterCategoryIds, onCategoryToggle, onClearFilters,
  categoryTree, hasActiveFilters,
}: ExamHistoryFilterProps) {
  const [showCategoryTree, setShowCategoryTree] = useState(false);

  return (
    <div className="space-y-3">
      {/* 제목 검색 + 날짜 필터 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* 제목 검색 */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-300" />
          <Input
            placeholder="🔍 시험지 제목으로 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 border-pink-200 focus:border-pink-400 focus:ring-pink-200"
            aria-label="시험 제목 검색"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 날짜 범위 필터 */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-pink-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="text-xs border border-pink-200 rounded-md px-2 py-1.5 text-gray-600 focus:outline-none focus:border-pink-400"
            aria-label="시작 날짜"
          />
          <span className="text-xs text-gray-400">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="text-xs border border-pink-200 rounded-md px-2 py-1.5 text-gray-600 focus:outline-none focus:border-pink-400"
            aria-label="종료 날짜"
          />
        </div>

        {/* 카테고리 필터 토글 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoryTree(!showCategoryTree)}
          className={`text-xs gap-1.5 ${filterCategoryIds.length > 0 ? 'border-pink-400 text-pink-600 bg-pink-50' : 'border-pink-200 text-gray-600'}`}
        >
          <FolderTree className="h-3.5 w-3.5" />
          범위 선택
          {filterCategoryIds.length > 0 && (
            <span className="bg-pink-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
              {filterCategoryIds.length}
            </span>
          )}
          {showCategoryTree
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          }
        </Button>

        {/* 필터 초기화 */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-pink-500 hover:text-pink-700 hover:bg-pink-50"
          >
            ✨ 초기화
          </Button>
        )}
      </div>

      {/* 카테고리 트리 패널 */}
      {showCategoryTree && (
        <div className="border border-pink-200 rounded-xl bg-pink-50/30 p-4 max-h-64 overflow-y-auto">
          {categoryTree.length > 0 ? (
            <>
              <p className="text-xs text-pink-400 mb-2">📚 출제 범위를 선택해서 필터링하세요!</p>
              <CategoryTree
                nodes={categoryTree}
                selectedIds={filterCategoryIds}
                onToggle={onCategoryToggle}
                multiSelect
              />
            </>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">카테고리가 없습니다 🥲</p>
          )}
        </div>
      )}
    </div>
  );
}
