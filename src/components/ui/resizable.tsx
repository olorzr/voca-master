'use client';

import { GripVertical } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { ComponentProps } from 'react';

/**
 * 드래그로 크기 조절이 가능한 패널 그룹 컴포넌트.
 * react-resizable-panels 기반 shadcn 스타일 래퍼.
 */
function ResizablePanelGroup({
  className,
  ...props
}: ComponentProps<typeof Group>) {
  return (
    <Group
      className={`flex h-full w-full ${className ?? ''}`}
      {...props}
    />
  );
}

const ResizablePanel = Panel;

/** 패널 사이 드래그 핸들. 수직 그립 아이콘을 표시한다. */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      className={`relative flex w-px items-center justify-center bg-gray-200 after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${className ?? ''}`}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-3 items-center justify-center rounded-sm border border-gray-200 bg-gray-100">
          <GripVertical className="h-3 w-3 text-gray-400" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
