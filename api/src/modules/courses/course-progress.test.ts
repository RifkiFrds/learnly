import { describe, expect, it } from 'vitest';
import {
  averageEvaluationScore,
  calculateProgressPercent,
  certificateEligibility,
  scoreQuiz,
} from './course-progress';

describe('progres kursus (FR-COURSE-05)', () => {
  it('persentase lesson selesai, 2 desimal', () => {
    expect(calculateProgressPercent(4, 1)).toBe(25);
    expect(calculateProgressPercent(3, 1)).toBe(33.33);
    expect(calculateProgressPercent(3, 3)).toBe(100);
  });

  it('kursus tanpa lesson = 0%, nilai di luar batas dijepit', () => {
    expect(calculateProgressPercent(0, 0)).toBe(0);
    expect(calculateProgressPercent(4, 9)).toBe(100);
    expect(calculateProgressPercent(4, -1)).toBe(0);
  });
});

describe('penilaian kuis otomatis (FR-COURSE-06)', () => {
  const questions = [
    {
      id: 1n,
      options: [
        { id: 11n, isCorrect: false },
        { id: 12n, isCorrect: true },
      ],
    },
    {
      id: 2n,
      options: [
        { id: 21n, isCorrect: true },
        { id: 22n, isCorrect: false },
      ],
    },
    {
      id: 3n,
      options: [
        { id: 31n, isCorrect: true },
        { id: 32n, isCorrect: false },
      ],
    },
  ];

  it('menghitung skor dari jawaban benar', () => {
    const result = scoreQuiz(questions, [
      { questionId: 1n, optionId: 12n },
      { questionId: 2n, optionId: 21n },
      { questionId: 3n, optionId: 32n },
    ]);
    expect(result.correctCount).toBe(2);
    expect(result.score).toBe(66.67);
  });

  it('soal yang tidak dijawab dihitung salah', () => {
    const result = scoreQuiz(questions, [{ questionId: 1n, optionId: 12n }]);
    expect(result.correctCount).toBe(1);
    expect(result.results[1].selectedOptionId).toBeNull();
    expect(result.results[1].isCorrect).toBe(false);
  });
});

describe('rata-rata nilai & kelayakan sertifikat (FR-COURSE-07)', () => {
  it('rata-rata null jika tidak ada evaluasi', () => {
    expect(averageEvaluationScore([])).toBeNull();
    expect(averageEvaluationScore([100, 85])).toBe(92.5);
  });

  const base = {
    issuesCertificate: true,
    progressPercent: 100,
    averageScore: 80,
    passingGrade: 70,
    ungradedAssignments: 0,
  };

  it('layak jika progres 100%, semua tugas dinilai, rata-rata ≥ passing grade', () => {
    expect(certificateEligibility(base)).toEqual({ eligible: true, reasons: [] });
    expect(certificateEligibility({ ...base, averageScore: 70 }).eligible).toBe(true);
  });

  it('kursus tanpa evaluasi bernilai cukup diselesaikan', () => {
    expect(certificateEligibility({ ...base, averageScore: null }).eligible).toBe(true);
  });

  it.each([
    [{ progressPercent: 75 }, 'Selesaikan semua materi'],
    [{ averageScore: 69.99 }, 'belum mencapai passing grade'],
    [{ ungradedAssignments: 1 }, 'Menunggu tugas dinilai'],
    [{ issuesCertificate: false }, 'tidak menerbitkan sertifikat'],
  ])('tidak layak: %o', (override, reason) => {
    const result = certificateEligibility({ ...base, ...override });
    expect(result.eligible).toBe(false);
    expect(result.reasons.join(' ')).toContain(reason);
  });
});
