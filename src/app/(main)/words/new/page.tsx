'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { EXTERNAL_LEVEL, DRAFT_STORAGE_KEY } from '@/lib/constants';
import type { CategoryLevel } from '@/types';
import type { WordEntry } from '@/components/words';
import { CategoryForm } from '@/components/words';
import { WordEntryTable } from '@/components/words';
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
  const [chapter, setChapter] = useState('');
  const [subChapter, setSubChapter] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [wordEntries, setWordEntries] = useState<WordEntry[]>([{ word: '', meaning: '' }]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    const validWords = wordEntries.filter((w) => w.word.trim() && w.meaning.trim());
    if (validWords.length === 0) {
      toast.error('최소 1개의 단어를 입력해주세요.');
      return;
    }
    if (level !== EXTERNAL_LEVEL && (!grade || !publisher || !chapter)) {
      toast.error('학년, 출판사, 대단원을 모두 입력해주세요.');
      return;
    }
    if (level === EXTERNAL_LEVEL && !chapter) {
      toast.error('단원명을 입력해주세요.');
      return;
    }

    setSaving(true);

    const { data: cat, error: catErr } = await supabase
      .from('categories')
      .insert({
        level,
        grade: level === EXTERNAL_LEVEL ? '' : grade,
        publisher: level === EXTERNAL_LEVEL ? '' : publisher,
        chapter,
        sub_chapter: subChapter,
        school_name: level === EXTERNAL_LEVEL ? schoolName : '',
        user_id: user.id,
      })
      .select()
      .single();

    if (catErr || !cat) {
      toast.error('카테고리 저장 중 오류가 발생했습니다.');
      setSaving(false);
      return;
    }

    const wordsToInsert = validWords.map((w, i) => ({
      word: w.word.trim(),
      meaning: w.meaning.trim(),
      category_id: cat.id,
      order_index: i,
    }));

    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (wordErr) {
      toast.error('단어 저장 중 오류가 발생했습니다.');
      setSaving(false);
      return;
    }

    toast.success(`${validWords.length}개 단어가 저장되었습니다.`);
    router.push('/words');
  };

  const handleSaveDraft = () => {
    const draft = { level, grade, publisher, chapter, subChapter, schoolName, wordEntries };
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
        <h1 className="text-2xl font-bold text-gray-900">단어 입력</h1>
      </div>

      <CategoryForm
        level={level}
        grade={grade}
        publisher={publisher}
        chapter={chapter}
        subChapter={subChapter}
        schoolName={schoolName}
        onLevelChange={setLevel}
        onGradeChange={setGrade}
        onPublisherChange={setPublisher}
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
    </div>
  );
}
