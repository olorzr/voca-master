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
}

export interface DuplicateWordsResult {
  inBatch: string[];
  existing: string[];
}

export interface InsertWordsResult {
  ok: boolean;
  insertedCount: number;
  skippedDuplicates: string[];
  errorCode?: string;
}

interface InsertWordsRpcRow {
  inserted_count: number;
  skipped_duplicates: string[] | null;
}

/**
 * 입력된 카테고리 메타데이터로 기존 단원을 조회해 있으면 재사용하고,
 * 없으면 새로 생성한다. 기존 DB 에 이미 중복이 있어도 첫 번째 row 를 선택한다.
 * @returns 카테고리 ID, 실패 시 null
 */
export async function ensureCategoryId(input: CategoryMatchInput): Promise<string | null> {
  const isExternal = input.level === EXTERNAL_LEVEL;
  // user_id 는 categories 의 BEFORE INSERT 트리거가 auth.uid() 로 채운다.
  // 매칭에도 user_id 를 빼서 학원 내 모든 사용자가 같은 단원을 공유하도록 한다.
  const row = {
    level: input.level,
    grade: isExternal ? '' : input.grade,
    publisher: isExternal ? '' : input.publisher,
    semester: isExternal ? '' : input.semester,
    chapter: input.chapter,
    sub_chapter: input.subChapter,
    school_name: isExternal ? input.schoolName : '',
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
 * 단어 목록을 지정된 단원에 저장한다. DB 함수 `insert_words_batch` 를 호출해
 * 카테고리 단위 advisory lock 안에서 순번을 부여하고 UNIQUE 제약으로 중복을
 * 방어한다. 프리체크 이후 다른 사용자가 먼저 추가한 단어는 자동 스킵되며
 * `skippedDuplicates` 로 반환된다.
 * @returns 저장 결과 (성공 여부, 삽입/스킵 건수, 에러 코드)
 */
export async function insertWordsToCategory(
  categoryId: string,
  validWords: WordEntry[],
): Promise<InsertWordsResult> {
  const payload = validWords.map((w) => ({
    word: w.word.trim(),
    meaning: w.meaning.trim(),
  }));

  const { data, error } = await supabase.rpc('insert_words_batch', {
    p_category_id: categoryId,
    p_words: payload,
  });

  if (error) {
    return {
      ok: false,
      insertedCount: 0,
      skippedDuplicates: [],
      errorCode: error.code,
    };
  }

  const rows = (data ?? []) as InsertWordsRpcRow[];
  const row = rows[0];
  return {
    ok: true,
    insertedCount: row?.inserted_count ?? 0,
    skippedDuplicates: row?.skipped_duplicates ?? [],
  };
}
