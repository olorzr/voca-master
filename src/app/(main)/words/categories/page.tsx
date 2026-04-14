'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { MIDDLE_SCHOOL_GRADES, HIGH_SCHOOL_GRADES, SEMESTER_OPTIONS } from '@/lib/constants';
import { MasterListPanel } from '@/components/words';
import type { Publisher, MajorChapter, SubChapter, School, SchoolMaterial } from '@/types';
import * as cm from '@/lib/category-master';

/**
 * 카테고리 마스터 데이터 관리 페이지.
 * 출판사/대단원/소단원, 학교/프린트 등록·수정·삭제를 제공한다.
 */
export default function CategoryManagePage() {
  const [level, setLevel] = useState<'중등' | '고등'>('중등');
  const [grade, setGrade] = useState('');
  const [semester, setSemester] = useState('');
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [selectedPubId, setSelectedPubId] = useState('');
  const [chapters, setChapters] = useState<MajorChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [subChapters, setSubChapters] = useState<SubChapter[]>([]);

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [materials, setMaterials] = useState<SchoolMaterial[]>([]);

  const gradeOptions = level === '중등' ? MIDDLE_SCHOOL_GRADES : HIGH_SCHOOL_GRADES;

  // --- 출판사 로드 ---
  const loadPublishers = useCallback(async () => {
    const data = await cm.getPublishers(level);
    setPublishers(data);
  }, [level]);

  useEffect(() => {
    (async () => {
      await loadPublishers();
      setSelectedPubId('');
      setChapters([]);
      setSelectedChapterId('');
      setSubChapters([]);
    })();
  }, [loadPublishers]);

  // --- 대단원 로드 ---
  useEffect(() => {
    (async () => {
      if (!selectedPubId || !grade || !semester) {
        setChapters([]); setSelectedChapterId(''); setSubChapters([]);
        return;
      }
      const data = await cm.getMajorChapters(selectedPubId, grade, semester);
      setChapters(data);
      setSelectedChapterId('');
      setSubChapters([]);
    })();
  }, [selectedPubId, grade, semester]);

  // --- 소단원 로드 ---
  useEffect(() => {
    (async () => {
      if (!selectedChapterId) { setSubChapters([]); return; }
      const data = await cm.getSubChapters(selectedChapterId);
      setSubChapters(data);
    })();
  }, [selectedChapterId]);

  // --- 학교 로드 ---
  const loadSchools = useCallback(async () => {
    setSchools(await cm.getSchools());
  }, []);

  useEffect(() => {
    (async () => { await loadSchools(); })();
  }, [loadSchools]);

  // --- 프린트/작품명 로드 ---
  useEffect(() => {
    (async () => {
      if (!selectedSchoolId) { setMaterials([]); return; }
      const data = await cm.getSchoolMaterials(selectedSchoolId);
      setMaterials(data);
    })();
  }, [selectedSchoolId]);

  // --- Publisher CRUD ---
  const handleAddPub = async (name: string) => {
    const { error } = await cm.createPublisher(name, level);
    if (error) { toast.error('이미 존재하는 출판사입니다.'); return; }
    toast.success('출판사가 추가되었습니다.');
    loadPublishers();
  };
  const handleEditPub = async (id: string, name: string) => {
    const { error } = await cm.updatePublisher(id, name);
    if (error) { toast.error(`출판사 수정 실패: ${error.message}`); return; }
    toast.success('출판사명이 수정되었습니다.');
    loadPublishers();
  };
  const handleDeletePub = async (id: string) => {
    await cm.deletePublisher(id);
    toast.success('출판사가 삭제되었습니다.');
    if (selectedPubId === id) setSelectedPubId('');
    loadPublishers();
  };

  // --- Chapter CRUD ---
  const reloadChapters = () => cm.getMajorChapters(selectedPubId, grade, semester).then(setChapters);
  const handleAddChapter = async (name: string) => {
    const { error } = await cm.createMajorChapter(name, selectedPubId, grade, semester);
    if (error) { toast.error('이미 존재하는 대단원입니다.'); return; }
    toast.success('대단원이 추가되었습니다.');
    reloadChapters();
  };
  const handleEditChapter = async (id: string, name: string) => {
    const { error } = await cm.updateMajorChapter(id, name);
    if (error) { toast.error(`대단원 수정 실패: ${error.message}`); return; }
    toast.success('대단원명이 수정되었습니다.');
    reloadChapters();
  };
  const handleDeleteChapter = async (id: string) => {
    await cm.deleteMajorChapter(id);
    toast.success('대단원이 삭제되었습니다.');
    if (selectedChapterId === id) setSelectedChapterId('');
    reloadChapters();
  };

  // --- SubChapter CRUD ---
  const reloadSubs = () => cm.getSubChapters(selectedChapterId).then(setSubChapters);
  const handleAddSub = async (name: string) => {
    const { error } = await cm.createSubChapter(name, selectedChapterId);
    if (error) { toast.error('이미 존재하는 소단원입니다.'); return; }
    toast.success('소단원이 추가되었습니다.');
    reloadSubs();
  };
  const handleEditSub = async (id: string, name: string) => {
    const { error } = await cm.updateSubChapter(id, name);
    if (error) { toast.error(`소단원 수정 실패: ${error.message}`); return; }
    toast.success('소단원명이 수정되었습니다.');
    reloadSubs();
  };
  const handleDeleteSub = async (id: string) => {
    await cm.deleteSubChapter(id);
    toast.success('소단원이 삭제되었습니다.');
    reloadSubs();
  };

  // --- School CRUD ---
  const handleAddSchool = async (name: string) => {
    const { error } = await cm.createSchool(name);
    if (error) { toast.error('이미 존재하는 학교입니다.'); return; }
    toast.success('학교가 추가되었습니다.');
    loadSchools();
  };
  const handleEditSchool = async (id: string, name: string) => {
    const { error } = await cm.updateSchool(id, name);
    if (error) { toast.error(`학교 수정 실패: ${error.message}`); return; }
    toast.success('학교명이 수정되었습니다.');
    loadSchools();
  };
  const handleDeleteSchool = async (id: string) => {
    await cm.deleteSchool(id);
    toast.success('학교가 삭제되었습니다.');
    if (selectedSchoolId === id) setSelectedSchoolId('');
    loadSchools();
  };

  // --- Material CRUD ---
  const reloadMats = () => cm.getSchoolMaterials(selectedSchoolId).then(setMaterials);
  const handleAddMat = async (name: string) => {
    const { error } = await cm.createSchoolMaterial(name, selectedSchoolId);
    if (error) { toast.error('이미 존재하는 항목입니다.'); return; }
    toast.success('프린트/작품명이 추가되었습니다.');
    reloadMats();
  };
  const handleEditMat = async (id: string, name: string) => {
    const { error } = await cm.updateSchoolMaterial(id, name);
    if (error) { toast.error(`항목 수정 실패: ${error.message}`); return; }
    toast.success('항목이 수정되었습니다.');
    reloadMats();
  };
  const handleDeleteMat = async (id: string) => {
    await cm.deleteSchoolMaterial(id);
    toast.success('항목이 삭제되었습니다.');
    reloadMats();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/words">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">📂 카테고리 관리</h1>
      </div>

      <Tabs defaultValue="school">
        <TabsList>
          <TabsTrigger value="school">중등 / 고등</TabsTrigger>
          <TabsTrigger value="external">외부지문 및 프린트</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>구분</Label>
              <Select value={level} onValueChange={(v) => { if (v) setLevel(v as '중등' | '고등'); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="중등">중등</SelectItem>
                  <SelectItem value="고등">고등</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>학년</Label>
              <Select value={grade} onValueChange={(v) => { if (v) { setGrade(v); setSemester(''); } }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="학년 선택" /></SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>학기</Label>
              <Select value={semester} onValueChange={(v) => { if (v) setSemester(v); }} disabled={!grade}>
                <SelectTrigger className="w-32"><SelectValue placeholder="학기 선택" /></SelectTrigger>
                <SelectContent>
                  {SEMESTER_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MasterListPanel
                  title="출판사"
                  items={publishers}
                  selectedId={selectedPubId}
                  onSelect={setSelectedPubId}
                  onAdd={handleAddPub}
                  onEdit={handleEditPub}
                  onDelete={handleDeletePub}
                  placeholder="예: 비상, 천재"
                />
                <MasterListPanel
                  title="대단원"
                  items={chapters}
                  selectedId={selectedChapterId}
                  onSelect={setSelectedChapterId}
                  onAdd={handleAddChapter}
                  onEdit={handleEditChapter}
                  onDelete={handleDeleteChapter}
                  placeholder="예: 1. 문학의 갈래"
                  disabled={!selectedPubId || !grade || !semester}
                />
                <MasterListPanel
                  title="소단원"
                  items={subChapters}
                  onAdd={handleAddSub}
                  onEdit={handleEditSub}
                  onDelete={handleDeleteSub}
                  placeholder="예: (1) 시의 이해"
                  disabled={!selectedChapterId}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MasterListPanel
                  title="학교"
                  items={schools}
                  selectedId={selectedSchoolId}
                  onSelect={setSelectedSchoolId}
                  onAdd={handleAddSchool}
                  onEdit={handleEditSchool}
                  onDelete={handleDeleteSchool}
                  placeholder="예: OO중학교"
                />
                <MasterListPanel
                  title="프린트/작품명"
                  items={materials}
                  onAdd={handleAddMat}
                  onEdit={handleEditMat}
                  onDelete={handleDeleteMat}
                  placeholder="예: 프린트1, 작품명"
                  disabled={!selectedSchoolId}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
