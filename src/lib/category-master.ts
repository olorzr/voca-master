import { supabase } from './supabase';
import type { Publisher, MajorChapter, SubChapter, School, SchoolMaterial, Category } from '@/types';

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

/** 출판사명을 수정하고, 관련 categories의 publisher도 동기화한다 */
export async function updatePublisher(id: string, name: string) {
  const { data: old, error: selectErr } = await supabase
    .from('publishers').select('name, level').eq('id', id).single();
  if (selectErr || !old) {
    return { error: selectErr ?? { message: '출판사를 찾을 수 없습니다.' } };
  }

  const { error: updateErr } = await supabase
    .from('publishers').update({ name }).eq('id', id);
  if (updateErr) return { error: updateErr };

  // DB 트리거가 있어도 앱 레벨에서도 동기화 시도 (안전장치)
  if (old.name !== name) {
    const { error: syncErr } = await supabase
      .from('categories')
      .update({ publisher: name })
      .eq('publisher', old.name)
      .eq('level', old.level);
    if (syncErr) return { error: syncErr };
  }

  return { error: null };
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

/** 대단원명을 수정하고, 관련 categories의 chapter도 동기화한다 */
export async function updateMajorChapter(id: string, name: string) {
  const { data: old, error: selectErr } = await supabase
    .from('major_chapters')
    .select('name, grade, semester, publisher_id, publishers(name, level)')
    .eq('id', id)
    .single();
  if (selectErr || !old) {
    return { error: selectErr ?? { message: '대단원을 찾을 수 없습니다.' } };
  }

  const { error: updateErr } = await supabase
    .from('major_chapters').update({ name }).eq('id', id);
  if (updateErr) return { error: updateErr };

  if (old.name !== name) {
    const pub = old.publishers as unknown as { name: string; level: string };
    const { error: syncErr } = await supabase
      .from('categories')
      .update({ chapter: name })
      .eq('chapter', old.name)
      .eq('publisher', pub.name)
      .eq('level', pub.level)
      .eq('grade', old.grade)
      .eq('semester', old.semester);
    if (syncErr) return { error: syncErr };
  }

  return { error: null };
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

/** 소단원명을 수정하고, 관련 categories의 sub_chapter도 동기화한다 */
export async function updateSubChapter(id: string, name: string) {
  const { data: old, error: selectErr } = await supabase
    .from('sub_chapters')
    .select('name, major_chapter_id, major_chapters(name, grade, semester, publisher_id, publishers(name, level))')
    .eq('id', id)
    .single();
  if (selectErr || !old) {
    return { error: selectErr ?? { message: '소단원을 찾을 수 없습니다.' } };
  }

  const { error: updateErr } = await supabase
    .from('sub_chapters').update({ name }).eq('id', id);
  if (updateErr) return { error: updateErr };

  if (old.name !== name) {
    const mc = old.major_chapters as unknown as {
      name: string; grade: string; semester: string;
      publishers: { name: string; level: string };
    };
    const { error: syncErr } = await supabase
      .from('categories')
      .update({ sub_chapter: name })
      .eq('sub_chapter', old.name)
      .eq('chapter', mc.name)
      .eq('publisher', mc.publishers.name)
      .eq('level', mc.publishers.level)
      .eq('grade', mc.grade)
      .eq('semester', mc.semester);
    if (syncErr) return { error: syncErr };
  }

  return { error: null };
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

/** 학교명을 수정하고, 관련 categories의 school_name도 동기화한다 */
export async function updateSchool(id: string, name: string) {
  const { data: old, error: selectErr } = await supabase
    .from('schools').select('name').eq('id', id).single();
  if (selectErr || !old) {
    return { error: selectErr ?? { message: '학교를 찾을 수 없습니다.' } };
  }

  const { error: updateErr } = await supabase
    .from('schools').update({ name }).eq('id', id);
  if (updateErr) return { error: updateErr };

  if (old.name !== name) {
    const { error: syncErr } = await supabase
      .from('categories')
      .update({ school_name: name })
      .eq('school_name', old.name)
      .eq('level', '외부지문 및 프린트');
    if (syncErr) return { error: syncErr };
  }

  return { error: null };
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

/** 프린트/작품명을 수정하고, 관련 categories의 chapter도 동기화한다 */
export async function updateSchoolMaterial(id: string, name: string) {
  const { data: old, error: selectErr } = await supabase
    .from('school_materials')
    .select('name, school_id, schools(name)')
    .eq('id', id)
    .single();
  if (selectErr || !old) {
    return { error: selectErr ?? { message: '항목을 찾을 수 없습니다.' } };
  }

  const { error: updateErr } = await supabase
    .from('school_materials').update({ name }).eq('id', id);
  if (updateErr) return { error: updateErr };

  if (old.name !== name) {
    const school = old.schools as unknown as { name: string };
    const { error: syncErr } = await supabase
      .from('categories')
      .update({ chapter: name })
      .eq('chapter', old.name)
      .eq('school_name', school.name)
      .eq('level', '외부지문 및 프린트');
    if (syncErr) return { error: syncErr };
  }

  return { error: null };
}

/** 프린트/작품명을 삭제한다 */
export async function deleteSchoolMaterial(id: string) {
  return supabase.from('school_materials').delete().eq('id', id);
}

// --- 마스터 기반 전체 카테고리 조회 ---

/**
 * 마스터 테이블(publishers · major_chapters · sub_chapters)에서
 * 모든 중등/고등 카테고리를 Category[] 형태로 조회한다.
 *
 * 단어 등록 여부와 무관하게 가능한 모든 카테고리를 반환하므로,
 * 개념지 에디터처럼 "빈 카테고리도 선택 가능해야 하는" 곳에서 사용한다.
 */
export async function getAllSchoolLevelCategories(): Promise<Category[]> {
  const [pubRes, majorRes, subRes] = await Promise.all([
    supabase.from('publishers').select('*'),
    supabase.from('major_chapters').select('*'),
    supabase.from('sub_chapters').select('*'),
  ]);

  const publishers = (pubRes.data as Publisher[]) ?? [];
  const majors = (majorRes.data as MajorChapter[]) ?? [];
  const subs = (subRes.data as SubChapter[]) ?? [];

  const result: Category[] = [];

  for (const pub of publishers) {
    const pubMajors = majors.filter((m) => m.publisher_id === pub.id);
    for (const major of pubMajors) {
      const majorSubs = subs.filter((s) => s.major_chapter_id === major.id);

      if (majorSubs.length === 0) {
        // 소단원이 없는 대단원도 선택 가능하도록 한 줄짜리 Category 생성
        result.push({
          id: `master-major-${major.id}`,
          level: pub.level,
          grade: major.grade,
          publisher: pub.name,
          semester: major.semester,
          chapter: major.name,
          sub_chapter: '',
          user_id: '',
          created_at: '',
        });
      } else {
        for (const sub of majorSubs) {
          result.push({
            id: `master-sub-${sub.id}`,
            level: pub.level,
            grade: major.grade,
            publisher: pub.name,
            semester: major.semester,
            chapter: major.name,
            sub_chapter: sub.name,
            user_id: '',
            created_at: '',
          });
        }
      }
    }
  }

  return result;
}
