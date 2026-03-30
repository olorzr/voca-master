'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MIDDLE_SCHOOL_GRADES, HIGH_SCHOOL_GRADES, SEMESTER_OPTIONS } from '@/lib/constants';
import { Save, History } from 'lucide-react';

/** 빌더 카테고리 정보 */
export interface BuilderCategory {
  level: '중등' | '고등';
  grade: string;
  publisher: string;
  semester: string;
  unit: string;
  subunit: string;
}

/** 출판사 기본 목록 */
const PUBLISHERS = ['비상(박)', '비상(김)', '미래엔', '천재', '지학사'] as const;

interface ExamCategoryBarProps {
  category: BuilderCategory;
  onChange: (cat: BuilderCategory) => void;
  onSave: () => void;
  onLoadRecent: () => void;
}

/**
 * 개념지 빌더 상단 카테고리 입력 바.
 * 레벨→학년 캐스케이딩, 출판사 직접 입력 지원.
 */
export default function ExamCategoryBar({ category, onChange, onSave, onLoadRecent }: ExamCategoryBarProps) {
  const grades = category.level === '중등' ? MIDDLE_SCHOOL_GRADES : HIGH_SCHOOL_GRADES;
  const isCustomPublisher = !PUBLISHERS.includes(category.publisher as typeof PUBLISHERS[number]);

  function update(patch: Partial<BuilderCategory>) {
    const next = { ...category, ...patch };
    // 레벨 변경 시 학년 리셋
    if (patch.level && patch.level !== category.level) {
      const newGrades = patch.level === '중등' ? MIDDLE_SCHOOL_GRADES : HIGH_SCHOOL_GRADES;
      next.grade = newGrades[0];
    }
    onChange(next);
  }

  return (
    <div className="bg-white border-b-2 border-primary p-4 flex flex-wrap gap-3 items-end sticky top-16 z-40" data-no-print>
      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-gray-500 uppercase tracking-wider">레벨</Label>
        <select
          className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={category.level}
          onChange={(e) => update({ level: e.target.value as BuilderCategory['level'] })}
        >
          <option value="중등">중등</option>
          <option value="고등">고등</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-gray-500 uppercase tracking-wider">학년</Label>
        <select
          className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={category.grade}
          onChange={(e) => update({ grade: e.target.value })}
        >
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-gray-500 uppercase tracking-wider">출판사</Label>
        <select
          className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={isCustomPublisher ? '기타' : category.publisher}
          onChange={(e) => {
            const v = e.target.value;
            update({ publisher: v === '기타' ? '' : v });
          }}
        >
          {PUBLISHERS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="기타">기타 (직접입력)</option>
        </select>
        {(isCustomPublisher || category.publisher === '') && (
          <Input
            className="h-8 text-sm w-28 mt-1"
            placeholder="출판사명"
            value={category.publisher === '' ? '' : category.publisher}
            onChange={(e) => update({ publisher: e.target.value })}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-gray-500 uppercase tracking-wider">학기</Label>
        <select
          className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={category.semester}
          onChange={(e) => update({ semester: e.target.value })}
        >
          {SEMESTER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
        <Label className="text-[11px] text-gray-500 uppercase tracking-wider">대단원</Label>
        <Input
          className="h-9 text-sm"
          placeholder="예: 1(1) 나무의 꿈, 내가 그린 히말라야시다"
          value={category.unit}
          onChange={(e) => update({ unit: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[140px]">
        <Label className="text-[11px] text-gray-500 uppercase tracking-wider">소단원 (선택)</Label>
        <Input
          className="h-9 text-sm"
          placeholder="예: 나무의 꿈"
          value={category.subunit}
          onChange={(e) => update({ subunit: e.target.value })}
        />
      </div>

      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onSave} className="border-primary text-primary hover:bg-primary/5">
          <Save className="h-3.5 w-3.5 mr-1" /> 저장
        </Button>
        <Button variant="outline" size="sm" onClick={onLoadRecent} className="border-primary text-primary hover:bg-primary/5">
          <History className="h-3.5 w-3.5 mr-1" /> 최근
        </Button>
      </div>
    </div>
  );
}
