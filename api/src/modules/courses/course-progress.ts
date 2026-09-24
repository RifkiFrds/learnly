// Logika murni progres & evaluasi kursus (FR-COURSE-05/06/07) — tanpa DB agar mudah dites.

/** Progres keseluruhan (%) = lesson selesai / total lesson, 2 desimal. */
export function calculateProgressPercent(totalLessons: number, completedLessons: number): number {
  if (totalLessons <= 0) return 0;
  const bounded = Math.min(Math.max(completedLessons, 0), totalLessons);
  return Math.round((bounded / totalLessons) * 10_000) / 100;
}

export interface QuizQuestionKey {
  id: bigint;
  options: { id: bigint; isCorrect: boolean }[];
}

/** Penilaian otomatis kuis pilihan ganda. Soal yang tidak dijawab dihitung salah. */
export function scoreQuiz(
  questions: QuizQuestionKey[],
  answers: { questionId: bigint; optionId: bigint }[],
) {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));
  const results = questions.map((question) => {
    const selectedOptionId = answerByQuestion.get(question.id) ?? null;
    const correctOptionId = question.options.find((option) => option.isCorrect)?.id ?? null;
    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId,
      isCorrect: selectedOptionId !== null && selectedOptionId === correctOptionId,
    };
  });
  const correctCount = results.filter((result) => result.isCorrect).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 10_000) / 100 : 0;
  return { score, correctCount, totalQuestions: questions.length, results };
}

/**
 * Rata-rata nilai evaluasi: nilai terbaik tiap kuis + nilai terakhir tiap tugas yang sudah dinilai.
 * null jika kursus tidak punya evaluasi bernilai.
 */
export function averageEvaluationScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
}

/**
 * FR-COURSE-07: sertifikat terbit jika kursus menerbitkan sertifikat, progres 100%,
 * semua tugas sudah dinilai, dan rata-rata nilai ≥ passing grade.
 */
export function certificateEligibility(params: {
  issuesCertificate: boolean;
  progressPercent: number;
  averageScore: number | null;
  passingGrade: number;
  ungradedAssignments: number;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!params.issuesCertificate) reasons.push('Kursus ini tidak menerbitkan sertifikat');
  if (params.progressPercent < 100) reasons.push('Selesaikan semua materi terlebih dahulu');
  if (params.ungradedAssignments > 0) reasons.push('Menunggu tugas dinilai instruktur');
  if (params.averageScore !== null && params.averageScore < params.passingGrade) {
    reasons.push(
      `Rata-rata nilai ${params.averageScore} belum mencapai passing grade ${params.passingGrade}`,
    );
  }
  return { eligible: reasons.length === 0, reasons };
}
