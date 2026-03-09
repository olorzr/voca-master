import { describe, it, expect } from 'vitest';
import { formatCategoryLabel, groupCategoriesByLevel } from './format';
import type { Category } from '@/types';

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: '1',
  level: '중등',
  grade: '중1',
  publisher: '비상',
  chapter: 'Lesson 1',
  sub_chapter: '본문1',
  user_id: 'user-1',
  created_at: '2026-01-01',
  ...overrides,
});

describe('formatCategoryLabel', () => {
  it('중등/고등 카테고리를 올바르게 포맷한다', () => {
    const cat = makeCategory();
    expect(formatCategoryLabel(cat)).toBe('중1 비상 Lesson 1 본문1');
  });

  it('외부지문 카테고리를 올바르게 포맷한다', () => {
    const cat = makeCategory({
      level: '외부지문 및 프린트',
      school_name: 'OO중학교',
      chapter: '프린트1',
      sub_chapter: '',
    });
    expect(formatCategoryLabel(cat)).toBe('OO중학교 - 프린트1');
  });

  it('외부지문에 학교명이 없으면 "외부"로 표시한다', () => {
    const cat = makeCategory({
      level: '외부지문 및 프린트',
      school_name: '',
      chapter: '프린트1',
      sub_chapter: '',
    });
    expect(formatCategoryLabel(cat)).toBe('외부 - 프린트1');
  });
});

describe('groupCategoriesByLevel', () => {
  it('레벨별로 카테고리를 그룹화한다', () => {
    const categories = [
      makeCategory({ id: '1', level: '중등' }),
      makeCategory({ id: '2', level: '고등' }),
      makeCategory({ id: '3', level: '중등' }),
    ];
    const grouped = groupCategoriesByLevel(categories);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['중등']).toHaveLength(2);
    expect(grouped['고등']).toHaveLength(1);
  });

  it('빈 배열이면 빈 객체를 반환한다', () => {
    expect(groupCategoriesByLevel([])).toEqual({});
  });
});
