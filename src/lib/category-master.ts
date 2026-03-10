import { supabase } from './supabase';
import type { Publisher, MajorChapter, SubChapter, School, SchoolMaterial } from '@/types';

// --- Publishers ---

/** 출판사 목록을 조회한다 */
export async function getPublishers(level?: string): Promise<Publisher[]> {
  let query = supabase.from('publishers').select('*').order('name');
  if (level) query = query.eq('level', level);
  const { data } = await query;
  return (data as Publisher[]) ?? [];
}

/** 출판사를 추가한다 */
export async function createPublisher(name: string, level: string) {
  return supabase.from('publishers').insert({ name, level }).select().single();
}

/** 출판사명을 수정한다 */
export async function updatePublisher(id: string, name: string) {
  return supabase.from('publishers').update({ name }).eq('id', id);
}

/** 출판사를 삭제한다 (하위 대단원/소단원도 CASCADE 삭제) */
export async function deletePublisher(id: string) {
  return supabase.from('publishers').delete().eq('id', id);
}

// --- Major Chapters (대단원) ---

/** 대단원 목록을 조회한다 (출판사 + 학년 + 학기 필터) */
export async function getMajorChapters(publisherId: string, grade?: string, semester?: string): Promise<MajorChapter[]> {
  let query = supabase.from('major_chapters').select('*').eq('publisher_id', publisherId).order('name');
  if (grade) query = query.eq('grade', grade);
  if (semester) query = query.eq('semester', semester);
  const { data } = await query;
  return (data as MajorChapter[]) ?? [];
}

/** 대단원을 추가한다 */
export async function createMajorChapter(name: string, publisherId: string, grade: string, semester: string) {
  return supabase.from('major_chapters').insert({ name, publisher_id: publisherId, grade, semester }).select().single();
}

/** 대단원명을 수정한다 */
export async function updateMajorChapter(id: string, name: string) {
  return supabase.from('major_chapters').update({ name }).eq('id', id);
}

/** 대단원을 삭제한다 (하위 소단원도 CASCADE 삭제) */
export async function deleteMajorChapter(id: string) {
  return supabase.from('major_chapters').delete().eq('id', id);
}

// --- Sub Chapters (소단원) ---

/** 소단원 목록을 조회한다 */
export async function getSubChapters(majorChapterId: string): Promise<SubChapter[]> {
  const { data } = await supabase
    .from('sub_chapters').select('*')
    .eq('major_chapter_id', majorChapterId).order('name');
  return (data as SubChapter[]) ?? [];
}

/** 소단원을 추가한다 */
export async function createSubChapter(name: string, majorChapterId: string) {
  return supabase.from('sub_chapters').insert({ name, major_chapter_id: majorChapterId }).select().single();
}

/** 소단원명을 수정한다 */
export async function updateSubChapter(id: string, name: string) {
  return supabase.from('sub_chapters').update({ name }).eq('id', id);
}

/** 소단원을 삭제한다 */
export async function deleteSubChapter(id: string) {
  return supabase.from('sub_chapters').delete().eq('id', id);
}

// --- Schools (학교) ---

/** 학교 목록을 조회한다 */
export async function getSchools(): Promise<School[]> {
  const { data } = await supabase.from('schools').select('*').order('name');
  return (data as School[]) ?? [];
}

/** 학교를 추가한다 */
export async function createSchool(name: string) {
  return supabase.from('schools').insert({ name }).select().single();
}

/** 학교명을 수정한다 */
export async function updateSchool(id: string, name: string) {
  return supabase.from('schools').update({ name }).eq('id', id);
}

/** 학교를 삭제한다 (하위 프린트/작품명도 CASCADE 삭제) */
export async function deleteSchool(id: string) {
  return supabase.from('schools').delete().eq('id', id);
}

// --- School Materials (프린트/작품명) ---

/** 프린트/작품명 목록을 조회한다 */
export async function getSchoolMaterials(schoolId: string): Promise<SchoolMaterial[]> {
  const { data } = await supabase
    .from('school_materials').select('*')
    .eq('school_id', schoolId).order('name');
  return (data as SchoolMaterial[]) ?? [];
}

/** 프린트/작품명을 추가한다 */
export async function createSchoolMaterial(name: string, schoolId: string) {
  return supabase.from('school_materials').insert({ name, school_id: schoolId }).select().single();
}

/** 프린트/작품명을 수정한다 */
export async function updateSchoolMaterial(id: string, name: string) {
  return supabase.from('school_materials').update({ name }).eq('id', id);
}

/** 프린트/작품명을 삭제한다 */
export async function deleteSchoolMaterial(id: string) {
  return supabase.from('school_materials').delete().eq('id', id);
}
