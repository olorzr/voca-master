-- 재시험 삭제 버그 수정: parent_exam_id FK를 SET NULL → CASCADE로 전환
-- UI(handleDelete, handleBulkDelete)는 이미 cascade 전제로 로컬 상태를 정리하고 있었으나,
-- 스키마가 SET NULL이었기 때문에 원본 시험 삭제 후 새로고침 시 고아 재시험이 되살아나는 문제가 있었음.

-- 1) 기존 고아 재시험 정리 (parent_exam_id가 NULL이면서 retake_number > 0)
DELETE FROM exams
WHERE parent_exam_id IS NULL
  AND retake_number > 0;

-- 2) 기존 FK 제약 드롭 후 CASCADE로 재생성
ALTER TABLE exams
  DROP CONSTRAINT IF EXISTS exams_parent_exam_id_fkey;

ALTER TABLE exams
  ADD CONSTRAINT exams_parent_exam_id_fkey
  FOREIGN KEY (parent_exam_id)
  REFERENCES exams(id)
  ON DELETE CASCADE;
