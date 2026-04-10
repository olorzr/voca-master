'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { EXTERNAL_LEVEL, DRAFT_STORAGE_KEY } from '@/lib/constants';
import {
  ensureCategoryId,
  findDuplicateWords,
  removeDuplicateWords,
  insertWordsToCategory,
  type DuplicateWordsResult,
} from '@/lib/words-save';
import type { CategoryLevel } from '@/types';
import type { WordEntry } from '@/components/words';
import { CategoryForm, WordEntryTable, DuplicateWordsDialog } from '@/components/words';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 새 단어 입력 페이지 (카테고리 설정 + 단어 목록 입력)
 */
export default function NewWordsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [level, setLevel] = useState<CategoryLevel>('중등');
  const [grade, setGrade] = useState('');
  const [publisher, setPublisher] = useState('');
  const [semester, setSemester] = useState('');
  const [chapter, setChapter] = useState('');
  const [subChapter, setSubChapter] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [wordEntries, setWordEntries] = useState<WordEntry[]>([{ word: '', meaning: '' }]);
  const [saving, setSaving] = useState(false);

  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateWordsResult | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [pendingValidWords, setPendingValidWords] = useState<WordEntry[] | null>(null);

  const validateInputs = (validWords: WordEntry[]): boolean => {
    if (validWords.length === 0) {
      toast.error('최소 1개의 단어를 입력해주세요.');
      return false;
    }
    if (level !== EXTERNAL_LEVEL && (!grade || !publisher || !semester || !chapter)) {
      toast.error('학년, 출판사, 학기, 대단원을 모두 입력해주세요.');
      return false;
    }
    if (level === EXTERNAL_LEVEL && !chapter) {
      toast.error('단원명을 입력해주세요.');
      return false;
    }
    return true;
  };

  const finalizeInsert = async (categoryId: string, words: WordEntry[]) => {
    const ok = await insertWordsToCategory(categoryId, words);
    if (!ok) {
      toast.error('단어 저장 중 오류가 발생했습니다.');
      return false;
    }
    toast.success(`${words.length}개 단어가 저장되었습니다.`);
    router.push('/words');
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    const validWords = wordEntries.filter((w) => w.word.trim() && w.meaning.trim());
    if (!validateInputs(validWords)) return;

    setSaving(true);

    const categoryId = await ensureCategoryId({
      level, grade, publisher, semester, chapter, subChapter, schoolName, userId: user.id,
    });
    if (!categoryId) {
      toast.error('카테고리 저장 중 오류가 발생했습니다.');
      setSaving(false);
      return;
    }

    const dupes = await findDuplicateWords(categoryId, validWords);
    if (!dupes) {
      toast.error('단어 중복 확인 중 오류가 발생했습니다.');
      setSaving(false);
      return;
    }

    if (dupes.inBatch.length > 0 || dupes.existing.length > 0) {
      setPendingCategoryId(categoryId);
      setPendingValidWords(validWords);
      setDuplicateCheck(dupes);
      setSaving(false);
      return;
    }

    await finalizeInsert(categoryId, validWords);
    setSaving(false);
  };

  const handleConfirmSkipDuplicates = async () => {
    if (!pendingCategoryId || !pendingValidWords || !duplicateCheck) return;

    const deduped = removeDuplicateWords(pendingValidWords, duplicateCheck.existing);
    setDuplicateCheck(null);

    if (deduped.length === 0) {
      toast.error('저장할 단어가 없습니다. 모두 중복입니다.');
      setPendingCategoryId(null);
      setPendingValidWords(null);
      return;
    }

    setSaving(true);
    await finalizeInsert(pendingCategoryId, deduped);
    setSaving(false);
    setPendingCategoryId(null);
    setPendingValidWords(null);
  };

  const handleCancelDuplicates = () => {
    setDuplicateCheck(null);
    setPendingCategoryId(null);
    setPendingValidWords(null);
  };

  const handleSaveDraft = () => {
    const draft = { level, grade, publisher, semester, chapter, subChapter, schoolName, wordEntries };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    toast.success('임시 저장되었습니다.');
  };

  const handleLoadDraft = () => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) {
      toast.error('저장된 임시 데이터가 없습니다.');
      return;
    }
    const draft = JSON.parse(saved);
    setLevel(draft.level);
    setGrade(draft.grade ?? '');
    setPublisher(draft.publisher ?? '');
    setSemester(draft.semester ?? '');
    setChapter(draft.chapter ?? '');
    setSubChapter(draft.subChapter ?? '');
    setSchoolName(draft.schoolName ?? '');
    setWordEntries(draft.wordEntries ?? [{ word: '', meaning: '' }]);
    toast.success('임시 저장 데이터를 불러왔습니다.');
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
        <h1 className="text-2xl font-bold text-gray-900">✏️ 단어 입력</h1>
      </div>

      <CategoryForm
        level={level}
        grade={grade}
        publisher={publisher}
        semester={semester}
        chapter={chapter}
        subChapter={subChapter}
        schoolName={schoolName}
        onLevelChange={setLevel}
        onGradeChange={setGrade}
        onPublisherChange={setPublisher}
        onSemesterChange={setSemester}
        onChapterChange={setChapter}
        onSubChapterChange={setSubChapter}
        onSchoolNameChange={setSchoolName}
      />

      <WordEntryTable
        entries={wordEntries}
        saving={saving}
        onEntriesChange={setWordEntries}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onLoadDraft={handleLoadDraft}
      />

      <DuplicateWordsDialog
        open={duplicateCheck !== null}
        onOpenChange={(v) => { if (!v) handleCancelDuplicates(); }}
        inBatchDuplicates={duplicateCheck?.inBatch ?? []}
        existingDuplicates={duplicateCheck?.existing ?? []}
        onConfirmSkipDuplicates={handleConfirmSkipDuplicates}
        onCancel={handleCancelDuplicates}
      />
    </div>
  );
}
