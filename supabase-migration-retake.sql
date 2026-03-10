-- 재시험 스레드 기능: exams 테이블에 parent_exam_id, retake_number 추가
-- parent_exam_id: 원본 시험 참조 (NULL이면 원본 시험)
-- retake_number: 재시험 차수 (0이면 원본, 1이면 1차, 2이면 2차...)

ALTER TABLE exams ADD COLUMN parent_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL;
ALTER TABLE exams ADD COLUMN retake_number INT DEFAULT 0;

CREATE INDEX idx_exams_parent ON exams(parent_exam_id);
