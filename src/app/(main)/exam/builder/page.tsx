'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import {
  ExamCategoryBar,
  ExamEditor,
  ExamMarkingSidebar,
  ExamPreview,
} from '@/components/exam-builder';
import type { BuilderCategory, MarkItem } from '@/components/exam-builder';

/** localStorage 키 */
const RECENT_KEY = 'exam-builder-categories';
const MAX_RECENT = 10;

const DEFAULT_CATEGORY: BuilderCategory = {
  level: '중등',
  grade: '중2',
  publisher: '비상(박)',
  semester: '1학기',
  unit: '',
  subunit: '',
};

/**
 * 개념지 & 암기 테스트 빌더 페이지.
 * 에디터 화면 ↔ 미리보기 화면을 전환하는 2-스크린 구조.
 */
export default function ExamBuilderPage() {
  const [screen, setScreen] = useState<'editor' | 'preview'>('editor');
  const [category, setCategory] = useState<BuilderCategory>(DEFAULT_CATEGORY);
  const [editorHTML, setEditorHTML] = useState('');
  const [marks, setMarks] = useState<MarkItem[]>([]);
  const [previewTab, setPreviewTab] = useState('concept');
  const editorRef = useRef<Editor | null>(null);

  /* ── 카테고리 저장/불러오기 ── */
  const saveCategory = useCallback(() => {
    const raw = localStorage.getItem(RECENT_KEY);
    let recent: BuilderCategory[] = raw ? JSON.parse(raw) : [];
    recent = recent.filter((r) => JSON.stringify(r) !== JSON.stringify(category));
    recent.unshift(category);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    toast.success('카테고리가 저장되었습니다');
  }, [category]);

  const loadRecent = useCallback(() => {
    const raw = localStorage.getItem(RECENT_KEY);
    const recent: BuilderCategory[] = raw ? JSON.parse(raw) : [];
    if (recent.length === 0) {
      toast.info('저장된 카테고리가 없습니다');
      return;
    }
    // 가장 최근 카테고리 로드 (추후 드롭다운 확장 가능)
    setCategory(recent[0]);
    toast.success('카테고리를 불러왔습니다');
  }, []);

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
    // 병합된 텍스트 노드 체크
    if (!found) {
      const merged = getMergedMarks(editor);
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

  /* ── 렌더링 ── */
  if (screen === 'preview') {
    return (
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8" style={{ height: 'calc(100vh - 64px)' }}>
        <ExamPreview
          editorHTML={editorHTML}
          category={category}
          markCount={marks.length}
          activeTab={previewTab}
          onTabChange={setPreviewTab}
          onBack={() => setScreen('editor')}
          onConceptClick={removeMarkByText}
          onConceptDrag={addMarkByText}
        />
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* 카테고리 바 */}
      <ExamCategoryBar
        category={category}
        onChange={setCategory}
        onSave={saveCategory}
        onLoadRecent={loadRecent}
      />

      {/* 에디터 + 사이드바 */}
      <div className="flex gap-5 p-5" style={{ height: 'calc(100vh - 64px - 80px)' }}>
        <div className="flex-[7] min-w-0">
          <ExamEditor
            onHTMLChange={setEditorHTML}
            onMarksChange={setMarks}
            editorRef={editorRef}
          />
        </div>
        <div className="flex-[3] min-w-[280px]">
          <ExamMarkingSidebar
            marks={marks}
            onDelete={deleteMark}
            onClearAll={clearAllMarks}
            onPreview={() => { setPreviewTab('concept'); setScreen('preview'); }}
          />
        </div>
      </div>
    </div>
  );
}

/** 에디터에서 병합된 마킹 목록 추출 */
function getMergedMarks(editor: Editor): MarkItem[] {
  const raw: MarkItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.marks.some((m) => m.type.name === 'concept')) {
      raw.push({ text: node.text ?? '', pos, len: node.nodeSize });
    }
  });
  const merged: MarkItem[] = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && last.pos + last.len === m.pos) {
      last.text += m.text;
      last.len += m.len;
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}
