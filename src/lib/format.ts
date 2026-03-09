import type { Category } from '@/types';
import { EXTERNAL_LEVEL } from './constants';

/**
 * 카테고리를 사람이 읽을 수 있는 라벨로 변환한다.
 * @param cat - 변환할 카테고리 객체
 * @returns 포맷팅된 카테고리 라벨 문자열
 */
export function formatCategoryLabel(cat: Category): string {
  if (cat.level === EXTERNAL_LEVEL) {
    return [cat.school_name || '외부', cat.chapter].filter(Boolean).join(' - ');
  }
  return [cat.grade, cat.publisher, cat.chapter, cat.sub_chapter].filter(Boolean).join(' ');
}

/**
 * 카테고리 배열을 level 기준으로 그룹화한다.
 * @param categories - 그룹화할 카테고리 배열
 * @returns level을 키로 하는 카테고리 그룹 객체
 */
export function groupCategoriesByLevel(categories: Category[]): Record<string, Category[]> {
  return categories.reduce<Record<string, Category[]>>((acc, cat) => {
    const key = cat.level;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});
}

/**
 * 날짜 문자열을 한국어 포맷으로 변환한다.
 * @param dateStr - ISO 형식 날짜 문자열
 * @returns 한국어 포맷 날짜 문자열
 */
export function formatDateKR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
