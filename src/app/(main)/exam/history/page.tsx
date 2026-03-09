'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateKR } from '@/lib/format';

interface ExamRecord {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  created_at: string;
}

/**
 * 시험 이력 페이지. 생성된 시험지 목록을 조회하고 삭제할 수 있다.
 */
export default function ExamHistoryPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExams = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setExams(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험지를 삭제하시겠습니까?')) return;
    await supabase.from('exams').delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id));
    toast.success('시험지가 삭제되었습니다.');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">시험 이력</h1>
        <Link href="/exam/create">
          <Button className="bg-primary hover:bg-primary-hover text-white">
            <FileText className="h-4 w-4 mr-2" />
            새 시험지
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">생성된 시험지 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-24 text-center">문항 수</TableHead>
                  <TableHead className="w-28 text-center">합격 기준</TableHead>
                  <TableHead className="w-48">생성일</TableHead>
                  <TableHead className="w-24 text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{exam.total_questions}문항</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                        {exam.pass_count}개/{exam.total_questions}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateKR(exam.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/exam/view?id=${exam.id}`}>
                          <button className="p-1.5 hover:text-primary">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="p-1.5 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>아직 생성된 시험지가 없습니다.</p>
              <Link href="/exam/create">
                <Button variant="outline" className="mt-4">시험지 만들기</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
