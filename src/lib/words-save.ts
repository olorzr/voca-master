import { supabase } from './supabase';
import { EXTERNAL_LEVEL } from './constants';
import type { CategoryLevel } from '@/types';
import type { WordEntry } from '@/components/words';

export interface CategoryMatchInput {
  level: CategoryLevel;
  grade: string;
  publisher: string;
  semester: string;
  chapter: string;
  subChapter: string;
  schoolName: string;
  userId: string;
}

export interface DuplicateWordsResult {
  inBatch: string[];
  existing: string[];
}

/**
 * 입력된 카테고리 메타데이터로 기존 단원을 조회해 있으면 재사용하고,
 * 없으면 새로 생성한다. 기존 DB 에 이미 중복이 있어도 첫 번째 row 를 선택한다.
 * @returns 카테고리 ID, 실패 시 null
 */
export async function ensureCategoryId(input: CategoryMatchInput): Promise<string | null> {
  const isExternal = input.level === EXTERNAL_LEVEL;
  const row = {
    level: input.level,
    grade: isExternal ? '' : input.grade,
    publisher: isExternal ? '' : input.publisher,
    semester: isExternal ? '' : input.semester,
    chapter: input.chapter,
    sub_chapter: input.subChapter,
    school_name: isExternal ? input.schoolName : '',
    user_id: input.userId,
  };

  const { data: existingRows, error: selectErr } = await supabase
    .from('categories')
    .select('id')
    .match(row)
    .limit(1);

  if (selectErr) return null;
  if (existingRows && existingRows.length > 0) return existingRows[0].id;

  const { data: created, error: insertErr } = await supabase
    .from('categories')
    .insert(row)
    .select('id')
    .single();

  if (insertErr || !created) return null;
  return created.id;
}

/**
 * 업로드할 단어들에 대해 중복을 찾는다.
 * - 배치 내부에서 같은 이름이 2번 이상 등장한 단어
 * - 선택된 단원에 이미 저장된 단어와 이름이 겹치는 단어
 * @returns 중복 결과, 조회 에러 시 null
 */
export async function findDuplicateWords(
  categoryId: string,
  validWords: WordEntry[],
): Promise<DuplicateWordsResult | null> {
  const seen = new Set<string>();
  const batchDupes = new Set<string>();
  for (const w of validWords) {
    const name = w.word.trim();
    if (seen.has(name)) batchDupes.add(name);
    else seen.add(name);
  }

  const { data, error } = await supabase
    .from('words')
    .select('word')
    .eq('category_id', categoryId);

  if (error) return null;

  const existingSet = new Set((data ?? []).map((w) => w.word));
  const existingDupes = new Set<string>();
  for (const w of validWords) {
    const name = w.word.trim();
    if (existingSet.has(name)) existingDupes.add(name);
  }

  return {
    inBatch: [...batchDupes],
    existing: [...existingDupes],
  };
}

/**
 * 중복 단어(배치 내부 중복 + 기존 단어와 겹치는 단어)를 제거한 새 배열을 반환한다.
 * 배치 내부 중복은 첫 번째 등장만 남긴다.
 */
export function removeDuplicateWords(
  validWords: WordEntry[],
  existingDuplicates: string[],
): WordEntry[] {
  const existingSet = new Set(existingDuplicates);
  const seen = new Set<string>();
  const result: WordEntry[] = [];
  for (const w of validWords) {
    const name = w.word.trim();
    if (existingSet.has(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(w);
  }
  return result;
}

/**
 * 단어 목록을 지정된 단원에 저장한다. 기존 단어 뒤에 이어서 저장하기 위해
 * 현재 단원의 최대 order_index + 1 부터 붙인다.
 * @returns 성공 여부
 */
export async function insertWordsToCategory(
  categoryId: string,
  validWords: WordEntry[],
): Promise<boolean> {
  const { data: lastRow } = await supabase
    .from('words')
    .select('order_index')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const startIndex = (lastRow?.order_index ?? -1) + 1;

  const wordsToInsert = validWords.map((w, i) => ({
    word: w.word.trim(),
    meaning: w.meaning.trim(),
    category_id: categoryId,
    order_index: startIndex + i,
  }));

  const { error } = await supabase.from('words').insert(wordsToInsert);
  return !error;
}
