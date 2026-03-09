'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { CategoryLevel, Publisher, MajorChapter, SubChapter, School, SchoolMaterial } from '@/types';
import { EXTERNAL_LEVEL, MIDDLE_SCHOOL_GRADES, HIGH_SCHOOL_GRADES } from '@/lib/constants';
import {
  getPublishers, getMajorChapters, getSubChapters,
  getSchools, getSchoolMaterials,
} from '@/lib/category-master';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';

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
 * 단어 입력 시 카테고리(구분/학년/출판사/단원) 선택 폼 컴포넌트.
 * 마스터 데이터에서 등록된 항목만 선택 가능하다.
 */
export default function CategoryForm({
  level, grade, publisher, chapter, subChapter, schoolName,
  onLevelChange, onGradeChange, onPublisherChange,
  onChapterChange, onSubChapterChange, onSchoolNameChange,
}: CategoryFormProps) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [chapters, setChapters] = useState<MajorChapter[]>([]);
  const [subChaptersList, setSubChaptersList] = useState<SubChapter[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [materials, setMaterials] = useState<SchoolMaterial[]>([]);

  const [publisherId, setPublisherId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [subChapterId, setSubChapterId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [materialId, setMaterialId] = useState('');

  const gradeOptions = level === '중등' ? MIDDLE_SCHOOL_GRADES : level === '고등' ? HIGH_SCHOOL_GRADES : [];

  // 출판사/학교 목록 로드
  useEffect(() => {
    if (level === EXTERNAL_LEVEL) {
      getSchools().then(setSchools);
    } else {
      getPublishers(level).then(setPublishers);
    }
  }, [level]);

  // 출판사 이름 → ID 역추적 (임시저장 복원용)
  useEffect(() => {
    if (!publisher || publishers.length === 0) return;
    const found = publishers.find((p) => p.name === publisher);
    if (found && found.id !== publisherId) setPublisherId(found.id);
  }, [publisher, publishers, publisherId]);

  // 대단원 로드
  useEffect(() => {
    if (!publisherId || !grade) { setChapters([]); return; }
    getMajorChapters(publisherId, grade).then(setChapters);
  }, [publisherId, grade]);

  // 대단원 이름 → ID 역추적
  useEffect(() => {
    if (!chapter || chapters.length === 0) return;
    const found = chapters.find((c) => c.name === chapter);
    if (found && found.id !== chapterId) setChapterId(found.id);
  }, [chapter, chapters, chapterId]);

  // 소단원 로드
  useEffect(() => {
    if (!chapterId) { setSubChaptersList([]); return; }
    getSubChapters(chapterId).then(setSubChaptersList);
  }, [chapterId]);

  // 소단원 이름 → ID 역추적
  useEffect(() => {
    if (!subChapter || subChaptersList.length === 0) return;
    const found = subChaptersList.find((s) => s.name === subChapter);
    if (found && found.id !== subChapterId) setSubChapterId(found.id);
  }, [subChapter, subChaptersList, subChapterId]);

  // 학교 이름 → ID 역추적
  useEffect(() => {
    if (!schoolName || schools.length === 0) return;
    const found = schools.find((s) => s.name === schoolName);
    if (found && found.id !== schoolId) setSchoolId(found.id);
  }, [schoolName, schools, schoolId]);

  // 프린트/작품명 로드
  useEffect(() => {
    if (!schoolId) { setMaterials([]); return; }
    getSchoolMaterials(schoolId).then(setMaterials);
  }, [schoolId]);

  // 프린트/작품명 이름 → ID 역추적
  useEffect(() => {
    if (!chapter || materials.length === 0) return;
    const found = materials.find((m) => m.name === chapter);
    if (found && found.id !== materialId) setMaterialId(found.id);
  }, [chapter, materials, materialId]);

  const handleLevelChange = (v: CategoryLevel) => {
    onLevelChange(v);
    onGradeChange(''); onPublisherChange(''); onChapterChange('');
    onSubChapterChange(''); onSchoolNameChange('');
    setPublisherId(''); setChapterId(''); setSubChapterId('');
    setSchoolId(''); setMaterialId('');
  };

  const handleGradeChange = (v: string) => {
    onGradeChange(v);
    onPublisherChange(''); onChapterChange(''); onSubChapterChange('');
    setPublisherId(''); setChapterId(''); setSubChapterId('');
  };

  const handlePublisherSelect = (pubId: string) => {
    setPublisherId(pubId);
    const pub = publishers.find((p) => p.id === pubId);
    onPublisherChange(pub?.name ?? '');
    onChapterChange(''); onSubChapterChange('');
    setChapterId(''); setSubChapterId('');
  };

  const handleChapterSelect = (chapId: string) => {
    setChapterId(chapId);
    const ch = chapters.find((c) => c.id === chapId);
    onChapterChange(ch?.name ?? '');
    onSubChapterChange(''); setSubChapterId('');
  };

  const handleSubChapterSelect = (subId: string) => {
    setSubChapterId(subId);
    const sub = subChaptersList.find((s) => s.id === subId);
    onSubChapterChange(sub?.name ?? '');
  };

  const handleSchoolSelect = (schId: string) => {
    setSchoolId(schId);
    const sch = schools.find((s) => s.id === schId);
    onSchoolNameChange(sch?.name ?? '');
    onChapterChange(''); setMaterialId('');
  };

  const handleMaterialSelect = (matId: string) => {
    setMaterialId(matId);
    const mat = materials.find((m) => m.id === matId);
    onChapterChange(mat?.name ?? '');
  };

  const noPublishers = publishers.length === 0 && grade && level !== EXTERNAL_LEVEL;
  const noSchools = schools.length === 0 && level === EXTERNAL_LEVEL;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">카테고리 설정</CardTitle>
        <Link
          href="/words/categories"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          카테고리 관리
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>구분</Label>
            <Select value={level} onValueChange={(v) => { if (v) handleLevelChange(v as CategoryLevel); }}>
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
                <Select value={grade} onValueChange={(v) => { if (v) handleGradeChange(v); }}>
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
                <Select value={publisherId} onValueChange={(v) => { if (v) handlePublisherSelect(v); }} disabled={!grade}>
                  <SelectTrigger><SelectValue placeholder="출판사 선택" /></SelectTrigger>
                  <SelectContent>
                    {publishers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>대단원</Label>
                <Select value={chapterId} onValueChange={(v) => { if (v) handleChapterSelect(v); }} disabled={!publisherId}>
                  <SelectTrigger><SelectValue placeholder="대단원 선택" /></SelectTrigger>
                  <SelectContent>
                    {chapters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>소단원 (선택)</Label>
                <Select value={subChapterId} onValueChange={(v) => { if (v) handleSubChapterSelect(v); }} disabled={!chapterId}>
                  <SelectTrigger><SelectValue placeholder="소단원 선택" /></SelectTrigger>
                  <SelectContent>
                    {subChaptersList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>학교명</Label>
                <Select value={schoolId} onValueChange={(v) => { if (v) handleSchoolSelect(v); }}>
                  <SelectTrigger><SelectValue placeholder="학교 선택" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>프린트/작품명</Label>
                <Select value={materialId} onValueChange={(v) => { if (v) handleMaterialSelect(v); }} disabled={!schoolId}>
                  <SelectTrigger><SelectValue placeholder="프린트/작품명 선택" /></SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {(noPublishers || noSchools) && (
          <p className="mt-3 text-xs text-gray-500">
            등록된 항목이 없습니다.{' '}
            <Link href="/words/categories" className="text-primary underline">카테고리 관리</Link>
            에서 먼저 등록해주세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
