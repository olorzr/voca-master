'use client';

import type { CategoryLevel } from '@/types';
import { EXTERNAL_LEVEL, MIDDLE_SCHOOL_GRADES, HIGH_SCHOOL_GRADES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryFormProps {
  level: CategoryLevel;
  grade: string;
  publisher: string;
  chapter: string;
  subChapter: string;
  schoolName: string;
  onLevelChange: (value: CategoryLevel) => void;
  onGradeChange: (value: string) => void;
  onPublisherChange: (value: string) => void;
  onChapterChange: (value: string) => void;
  onSubChapterChange: (value: string) => void;
  onSchoolNameChange: (value: string) => void;
}

/**
 * 단어 입력 시 카테고리(구분/학년/출판사/단원) 설정 폼 컴포넌트
 */
export default function CategoryForm({
  level, grade, publisher, chapter, subChapter, schoolName,
  onLevelChange, onGradeChange, onPublisherChange,
  onChapterChange, onSubChapterChange, onSchoolNameChange,
}: CategoryFormProps) {
  const gradeOptions = level === '중등'
    ? MIDDLE_SCHOOL_GRADES
    : level === '고등'
      ? HIGH_SCHOOL_GRADES
      : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">카테고리 설정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>구분</Label>
            <Select value={level} onValueChange={(v) => { if (v) onLevelChange(v as CategoryLevel); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="중등">중등</SelectItem>
                <SelectItem value="고등">고등</SelectItem>
                <SelectItem value={EXTERNAL_LEVEL}>외부지문 및 프린트</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {level !== EXTERNAL_LEVEL ? (
            <>
              <div className="space-y-2">
                <Label>학년</Label>
                <Select value={grade} onValueChange={(v) => { if (v) onGradeChange(v); }}>
                  <SelectTrigger><SelectValue placeholder="학년 선택" /></SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>출판사</Label>
                <Input
                  placeholder="예: 비상, 천재"
                  value={publisher}
                  onChange={(e) => onPublisherChange(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>학교명</Label>
              <Input
                placeholder="예: OO중학교"
                value={schoolName}
                onChange={(e) => onSchoolNameChange(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>대단원</Label>
            <Input
              placeholder="예: Lesson 1"
              value={chapter}
              onChange={(e) => onChapterChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>소단원</Label>
            <Input
              placeholder="예: 본문1"
              value={subChapter}
              onChange={(e) => onSubChapterChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
