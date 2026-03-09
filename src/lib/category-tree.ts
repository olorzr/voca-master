import type { Category } from '@/types';
import { EXTERNAL_LEVEL } from './constants';

/** 카테고리 트리 노드 타입 */
export interface CategoryTreeNode {
  id: string;
  label: string;
  type: 'level' | 'grade' | 'publisher' | 'chapter' | 'sub_chapter' | 'school' | 'material';
  children: CategoryTreeNode[];
  category?: Category;
}

/**
 * 카테고리 배열을 계층 트리 구조로 변환한다.
 * 중등/고등: level > grade > publisher > chapter > sub_chapter
 * 외부지문: level > school > material
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const byLevel = groupBy(categories, (c) => c.level);

  return Object.entries(byLevel).map(([level, cats]) => {
    if (level === EXTERNAL_LEVEL) {
      return buildExternalTree(level, cats);
    }
    return buildSchoolLevelTree(level, cats);
  });
}

function buildExternalTree(level: string, cats: Category[]): CategoryTreeNode {
  const bySchool = groupBy(cats, (c) => c.school_name || '외부');

  return {
    id: `level-${level}`,
    label: level,
    type: 'level',
    children: Object.entries(bySchool).map(([school, schoolCats]) => ({
      id: `school-${school}`,
      label: school,
      type: 'school' as const,
      children: schoolCats.map((cat) => ({
        id: cat.id,
        label: cat.chapter || '(미분류)',
        type: 'material' as const,
        children: [],
        category: cat,
      })),
    })),
  };
}

function buildSchoolLevelTree(level: string, cats: Category[]): CategoryTreeNode {
  const byGrade = groupBy(cats, (c) => c.grade);

  return {
    id: `level-${level}`,
    label: level,
    type: 'level',
    children: Object.entries(byGrade).map(([grade, gradeCats]) => {
      const byPub = groupBy(gradeCats, (c) => c.publisher);

      return {
        id: `${level}-${grade}`,
        label: grade,
        type: 'grade' as const,
        children: Object.entries(byPub).map(([pub, pubCats]) => {
          const byChapter = groupBy(pubCats, (c) => c.chapter);

          return {
            id: `${level}-${grade}-${pub}`,
            label: pub,
            type: 'publisher' as const,
            children: Object.entries(byChapter).map(([ch, chCats]) => {
              const hasSubChapters = chCats.some((c) => c.sub_chapter);

              if (!hasSubChapters && chCats.length === 1) {
                return {
                  id: chCats[0].id,
                  label: ch,
                  type: 'chapter' as const,
                  children: [],
                  category: chCats[0],
                };
              }

              return {
                id: `${level}-${grade}-${pub}-${ch}`,
                label: ch,
                type: 'chapter' as const,
                children: chCats.map((cat) => ({
                  id: cat.id,
                  label: cat.sub_chapter || '(전체)',
                  type: 'sub_chapter' as const,
                  children: [],
                  category: cat,
                })),
              };
            }),
          };
        }),
      };
    }),
  };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
