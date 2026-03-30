'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Mark } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { MarkItem } from './ExamMarkingSidebar';

/** TipTap 커스텀 마크: 개념 하이라이트 */
const ConceptMark = Mark.create({
  name: 'concept',
  addAttributes() {
    return { 'data-concept': { default: 'true' } };
  },
  parseHTML() {
    return [{ tag: 'mark[data-concept]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', { ...HTMLAttributes, 'data-concept': 'true' }, 0];
  },
});

const SAMPLE_CONTENT = `<h3>1. 「나무의 꿈」 제재 개관</h3>
<table><tbody>
<tr><td><strong>갈래</strong></td><td>자유시, 서정시</td></tr>
<tr><td><strong>성격</strong></td><td>희망적, 교훈적, 성찰적</td></tr>
<tr><td><strong>제재</strong></td><td>나무, 꿈</td></tr>
<tr><td><strong>주제</strong></td><td>다양한 꿈과 무한한 가능성을 지닌 대상에 대한 지지와 격려</td></tr>
</tbody></table>
<p><strong>특징</strong></p>
<p>① 나무를 의인화하여 말을 건네는 방식으로 시상을 전개함.</p>
<p>② 나무의 꿈을 연쇄적으로 연상하여 나열함.</p>
<p>③ 유사한 종결 표현을 반복하여 운율을 형성함.</p>`;

interface ExamEditorProps {
  onHTMLChange: (html: string) => void;
  onMarksChange: (marks: MarkItem[]) => void;
  editorRef: React.MutableRefObject<Editor | null>;
}

/**
 * TipTap 리치 에디터 + 마킹 모드 토글.
 * 마킹 ON 상태에서 드래그 → 하이라이트, 기존 마킹 클릭 → 해제.
 */
export default function ExamEditor({ onHTMLChange, onMarksChange, editorRef }: ExamEditorProps) {
  const [markingMode, setMarkingMode] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3, 4] } }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      ConceptMark,
    ],
    content: SAMPLE_CONTENT,
    onUpdate: ({ editor: e }) => {
      onHTMLChange(e.getHTML());
      syncMarks(e);
    },
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      onHTMLChange(editor.getHTML());
      syncMarks(editor);
    }
  }, [editor]);

  const syncMarks = useCallback((e: Editor) => {
    const raw: MarkItem[] = [];
    e.state.doc.descendants((node, pos) => {
      if (node.isText && node.marks.some((m) => m.type.name === 'concept')) {
        raw.push({ text: node.text ?? '', pos, len: node.nodeSize });
      }
    });
    // 인접 텍스트 노드 병합
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
    onMarksChange(merged);
  }, [onMarksChange]);

  /** 에디터 클릭/드래그 → 마킹 적용/해제 */
  const handleMouseUp = useCallback(() => {
    if (!markingMode || !editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      // 기존 마크 위 클릭 → 해제
      const resolved = editor.state.doc.resolve(from);
      if (resolved.marks().some((m) => m.type.name === 'concept')) {
        let start = from;
        let end = from;
        editor.state.doc.nodesBetween(
          Math.max(0, from - 200),
          Math.min(editor.state.doc.content.size, from + 200),
          (node, pos) => {
            if (node.isText && node.marks.some((m) => m.type.name === 'concept')) {
              const nodeEnd = pos + node.nodeSize;
              if (pos <= from && nodeEnd >= from) { start = pos; end = nodeEnd; }
            }
          },
        );
        editor.chain().focus().setTextSelection({ from: start, to: end }).unsetMark('concept').run();
        syncMarks(editor);
      }
      return;
    }
    editor.chain().focus().setMark('concept').run();
    syncMarks(editor);
  }, [markingMode, editor, syncMarks]);

  if (!editor) return null;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 transition-colors flex flex-col overflow-hidden ${markingMode ? 'border-primary' : 'border-transparent'}`}
    >
      {/* 툴바 */}
      <EditorToolbar editor={editor} markingMode={markingMode} onToggleMarking={() => setMarkingMode((v) => !v)} />

      {/* 에디터 본문 */}
      <div className="eb-editor-wrap" ref={wrapRef} onMouseUp={handleMouseUp}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/* ── 툴바 (분리하여 가독성 확보) ── */

interface ToolbarProps {
  editor: Editor;
  markingMode: boolean;
  onToggleMarking: () => void;
}

const TB_CMDS = [
  { cmd: 'bold', label: 'B', title: '굵게' },
  { cmd: 'italic', label: 'I', title: '기울임' },
  { cmd: 'underline', label: 'U', title: '밑줄' },
  { cmd: 'sep' },
  { cmd: 'bulletList', label: '•', title: '글머리 기호' },
  { cmd: 'orderedList', label: '1.', title: '번호 목록' },
  { cmd: 'sep' },
  { cmd: 'heading3', label: 'H3', title: '제목' },
  { cmd: 'heading4', label: 'H4', title: '소제목' },
  { cmd: 'sep' },
  { cmd: 'insertTable', label: '⊞', title: '표 삽입' },
  { cmd: 'addColAfter', label: '+열', title: '열 추가' },
  { cmd: 'addRowAfter', label: '+행', title: '행 추가' },
  { cmd: 'deleteCol', label: '-열', title: '열 삭제' },
  { cmd: 'deleteRow', label: '-행', title: '행 삭제' },
  { cmd: 'mergeCells', label: '⊟', title: '셀 병합' },
  { cmd: 'sep' },
  { cmd: 'undo', label: '↩', title: '실행취소' },
  { cmd: 'redo', label: '↪', title: '다시실행' },
] as const;

function EditorToolbar({ editor, markingMode, onToggleMarking }: ToolbarProps) {
  function runCmd(cmd: string) {
    const chain = editor.chain().focus();
    const map: Record<string, () => void> = {
      bold: () => chain.toggleBold().run(),
      italic: () => chain.toggleItalic().run(),
      underline: () => chain.toggleUnderline().run(),
      bulletList: () => chain.toggleBulletList().run(),
      orderedList: () => chain.toggleOrderedList().run(),
      heading3: () => chain.toggleHeading({ level: 3 }).run(),
      heading4: () => chain.toggleHeading({ level: 4 }).run(),
      insertTable: () => chain.insertTable({ rows: 3, cols: 2, withHeaderRow: false }).run(),
      addColAfter: () => chain.addColumnAfter().run(),
      addRowAfter: () => chain.addRowAfter().run(),
      deleteCol: () => chain.deleteColumn().run(),
      deleteRow: () => chain.deleteRow().run(),
      mergeCells: () => chain.mergeCells().run(),
      undo: () => chain.undo().run(),
      redo: () => chain.redo().run(),
    };
    map[cmd]?.();
  }

  function isActive(cmd: string): boolean {
    const map: Record<string, boolean> = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      heading3: editor.isActive('heading', { level: 3 }),
      heading4: editor.isActive('heading', { level: 4 }),
    };
    return map[cmd] ?? false;
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
      {TB_CMDS.map((item, i) =>
        item.cmd === 'sep' ? (
          <div key={`sep-${i}`} className="w-px h-6 bg-gray-200 mx-1" />
        ) : (
          <button
            key={item.cmd}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-colors
              ${isActive(item.cmd) ? 'bg-primary/20 text-primary' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => runCmd(item.cmd)}
            title={item.title}
          >
            {item.label}
          </button>
        ),
      )}

      {/* 마킹 모드 토글 */}
      <button
        className={`ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 text-[13px] font-bold transition-all
          ${markingMode
            ? 'bg-primary border-primary text-white'
            : 'bg-white border-primary text-primary'
          }`}
        onClick={onToggleMarking}
      >
        <span className={`w-2.5 h-2.5 rounded-full transition-colors ${markingMode ? 'bg-white' : 'bg-gray-300'}`} />
        마킹 모드
      </button>
    </div>
  );
}
