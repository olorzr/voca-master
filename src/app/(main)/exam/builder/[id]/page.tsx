'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  ExamCategoryBar,
  ExamEditor,
  ExamMarkingSidebar,
  ExamPreview,
} from '@/components/exam-builder';
import type { BuilderCategory, MarkItem } from '@/components/exam-builder';
import { extractMarks } from '@/lib/concept-marks';
import type { ConceptSheet } from '@/types';

const DEFAULT_CATEGORY: BuilderCategory = {
  level: '중등',
  grade: '',
  publisher: '',
  semester: '',
  unit: '',
  subunit: '',
};

/**
 * 개념지 에디터 페이지.
 * [id]가 'new'이면 새 개념지, UUID이면 기존 개념지를 불러와 편집한다.
 */
export default function ConceptEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sheetId = params.id as string;
  const isNew = sheetId === 'new';

  const [screen, setScreen] = useState<'editor' | 'preview'>(isNew ? 'editor' : 'preview');
  const [title, setTitle] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(!isNew);
  const [category, setCategory] = useState<BuilderCategory>(DEFAULT_CATEGORY);
  const [editorHTML, setEditorHTML] = useState('');
  const [marks, setMarks] = useState<MarkItem[]>([]);
  const [previewTab, setPreviewTab] = useState('concept');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : sheetId);
  const [initialHTML, setInitialHTML] = useState<string | null>(isNew ? '' : null);
  const editorRef = useRef<Editor | null>(null);

  /** 카테고리 값으로 자동 제목을 생성한다 */
  const generateTitle = useCallback((cat: BuilderCategory) => {
    const parts = [cat.grade, cat.publisher, cat.semester, cat.unit, cat.subunit].filter(Boolean);
    return parts.length > 0 ? `${parts.join(' ')} 개념지` : '';
  }, []);

  /** 카테고리 변경 시 자동 제목도 갱신한다 */
  const handleCategoryChange = useCallback((next: BuilderCategory) => {
    setCategory(next);
    if (!titleManuallyEdited) {
      setTitle(generateTitle(next));
    }
  }, [titleManuallyEdited, generateTitle]);

  /* ── 기존 개념지 불러오기 ── */
  useEffect(() => {
    (async () => {
      if (isNew || !user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('concept_sheets')
        .select('*')
        .eq('id', sheetId)
        .single();

      if (error || !data) {
        toast.error('개념지를 찾을 수 없습니다.');
        router.push('/exam/builder');
        return;
      }

      const sheet = data as ConceptSheet;
      setTitle(sheet.title);
      setCategory({
        level: sheet.level,
        grade: sheet.grade,
        publisher: sheet.publisher,
        semester: sheet.semester,
        unit: sheet.unit,
        subunit: sheet.subunit,
      });
      setInitialHTML(sheet.editor_html);
      setEditorHTML(sheet.editor_html);
      setLoading(false);
    })();
  }, [isNew, sheetId, user, router]);

  /* ── 저장 ── */
  const handleSave = useCallback(async () => {
    if (!user) return;

    if (!category.grade || !category.publisher) {
      toast.error('카테고리를 먼저 설정해주세요.');
      return;
    }

    const editor = editorRef.current;
    const html = editor ? editor.getHTML() : editorHTML;
    const currentMarks = editor ? extractMarks(editor) : marks;
    const sheetTitle = title.trim() || '제목 없음';

    setSaving(true);

    const payload = {
      title: sheetTitle,
      level: category.level,
      grade: category.grade,
      publisher: category.publisher,
      semester: category.semester,
      unit: category.unit,
      subunit: category.subunit,
      editor_html: html,
      marks: currentMarks,
    };

    if (savedId) {
      const { error } = await supabase
        .from('concept_sheets')
        .update(payload)
        .eq('id', savedId);

      if (error) {
        toast.error('저장에 실패했습니다.');
        setSaving(false);
        return;
      }
      toast.success('저장되었습니다.');
    } else {
      const { data, error } = await supabase
        .from('concept_sheets')
        .insert(payload)
        .select('id')
        .single();

      if (error || !data) {
        toast.error('저장에 실패했습니다.');
        setSaving(false);
        return;
      }
      setSavedId(data.id);
      toast.success('저장되었습니다.');
      router.replace(`/exam/builder/${data.id}`);
    }

    setSaving(false);
  }, [user, title, category, editorHTML, marks, savedId, router]);

  /* ── 마킹 삭제 ── */
  const deleteMark = useCallback((pos: number, len: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().setTextSelection({ from: pos, to: pos + len }).unsetMark('concept').run();
  }, []);

  const clearAllMarks = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().selectAll().unsetMark('concept').run();
    toast.success('모든 마킹이 해제되었습니다');
  }, []);

  /* ── 개념지 미리보기 인터랙션 ── */
  const removeMarkByText = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isText && node.marks.some((m) => m.type.name === 'concept')) {
        if (node.text === text) {
          editor.chain().setTextSelection({ from: pos, to: pos + node.nodeSize }).unsetMark('concept').run();
          found = true;
          return false;
        }
      }
    });
    if (!found) {
      const merged = extractMarks(editor);
      const match = merged.find((m) => m.text === text);
      if (match) {
        editor.chain().setTextSelection({ from: match.pos, to: match.pos + match.len }).unsetMark('concept').run();
      }
    }
    setEditorHTML(editor.getHTML());
  }, []);

  const addMarkByText = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isText) {
        const idx = (node.text ?? '').indexOf(text);
        if (idx !== -1) {
          const from = pos + idx;
          editor.chain().setTextSelection({ from, to: from + text.length }).setMark('concept').run();
          found = true;
          return false;
        }
      }
    });
    setEditorHTML(editor.getHTML());
  }, []);

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /* ── 에디터 + 미리보기 (동시 마운트, CSS로 전환) ── */
  return (
    <>
      {/* 미리보기 화면 */}
      {screen === 'preview' && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 eb-preview-wrap" style={{ height: 'calc(100vh - 64px)' }}>
          <ExamPreview
            editorHTML={editorHTML}
            category={category}
            markCount={marks.length}
            activeTab={previewTab}
            onTabChange={setPreviewTab}
            onBack={() => router.push('/exam/builder')}
            onEdit={() => setScreen('editor')}
            onConceptClick={removeMarkByText}
            onConceptDrag={addMarkByText}
          />
        </div>
      )}

      {/* 에디터 화면 — preview 중에는 숨김 (언마운트하지 않음) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8" style={{ display: screen === 'editor' ? undefined : 'none' }}>
        {/* 상단 바: 뒤로가기 + 제목 + 저장 */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 sticky top-16 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/exam/builder')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>

          <Input
            placeholder="개념지 제목을 입력하세요"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleManuallyEdited(true); }}
            className="flex-1 max-w-md border-transparent hover:border-gray-300 focus:border-primary bg-transparent text-base font-semibold"
          />

          <Button
            size="sm"
            className="bg-primary hover:bg-primary-hover text-white ml-auto shrink-0"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>

        {/* 카테고리 바 */}
        <ExamCategoryBar category={category} onChange={handleCategoryChange} />

        {/* 에디터 + 사이드바 */}
        <div className="flex gap-5 p-5 overflow-hidden" style={{ height: 'calc(100vh - 64px - 56px - 80px)' }}>
          <div className="flex-[7] min-w-0 h-full">
            <ExamEditor
              onHTMLChange={setEditorHTML}
              onMarksChange={setMarks}
              editorRef={editorRef}
              initialContent={initialHTML ?? undefined}
            />
          </div>
          <div className="flex-[3] min-w-[280px] h-full overflow-y-auto">
            <ExamMarkingSidebar
              marks={marks}
              onDelete={deleteMark}
              onClearAll={clearAllMarks}
              onPreview={() => { setPreviewTab('concept'); setScreen('preview'); }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

