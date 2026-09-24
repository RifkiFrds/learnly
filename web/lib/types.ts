// Tipe response API Learnly (bentuk mengikuti docs/06-api-spec.md & contoh di api/postman).
// Didefinisikan ulang di FE secara sadar (tanpa package shared — docs/03-tech-stack.md §2.5).

export type Role = 'student' | 'parent' | 'tutor' | 'admin';

export type BookingStatus =
  | 'pending_confirmation'
  | 'rejected'
  | 'menunggu_pembayaran'
  | 'dikonfirmasi'
  | 'tutor_bersiap'
  | 'tutor_dalam_perjalanan'
  | 'tutor_tiba'
  | 'sesi_berlangsung'
  | 'sesi_selesai'
  | 'dibatalkan';

export type PaymentStatus =
  | 'menunggu_pembayaran'
  | 'menunggu_verifikasi'
  | 'paid'
  | 'ditolak'
  | 'expired'
  | 'refunded';

export type CourseStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type VerificationStatus = 'pending_verification' | 'verified' | 'rejected';
export type TeachingMode = 'online' | 'tatap_muka' | 'both';
export type BookingMode = 'online' | 'tatap_muka';
export type LessonType = 'video' | 'article' | 'quiz' | 'assignment';
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount?: number;
}

export interface Polling {
  shouldPoll: boolean;
  intervalSeconds: number;
}

export interface MasterItem {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: 'active' | 'suspended';
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface Learner {
  id: number;
  fullName: string;
  isSelf: boolean;
  dateOfBirth: string | null;
  educationLevelId?: number | null;
  educationLevel: { id: number; name: string; slug?: string } | null;
}

export interface Me extends User {
  learners: Learner[];
  tutorProfile: {
    id: number;
    verificationStatus: VerificationStatus;
    verificationNotes: string | null;
  } | null;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  devEmailVerificationToken?: string;
}

export interface Address {
  id: number;
  label: string;
  fullAddress: string;
  detailNote: string | null;
  latitude: number;
  longitude: number;
  createdAt?: string;
}

export interface ServiceArea {
  id: number;
  areaType: 'area_name' | 'radius';
  areaName: string | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusKm: number | null;
}

export interface Availability {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Certification {
  id: number;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  fileUrl?: string | null;
}

export interface ReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  replyText: string | null;
  repliedAt: string | null;
  createdAt: string;
  reviewerName?: string;
  reviewer?: { id: number; fullName: string };
  subjectName?: string;
  bookingId?: number;
  isHidden?: boolean;
}

export interface TutorProfile {
  id: number;
  userId: number;
  fullName: string;
  email?: string;
  phone?: string | null;
  autoAccept?: boolean;
  verificationNotes?: string | null;
  bio: string | null;
  educationBackground: string | null;
  teachingExperienceYears: number | null;
  curriculum: string | null;
  hourlyRate: number;
  teachingMode: TeachingMode;
  verificationStatus: VerificationStatus;
  avgRating: number;
  reviewCount: number;
  memberSince: string;
  subjects: MasterItem[];
  educationLevels: MasterItem[];
  serviceAreas: ServiceArea[];
  availabilities: Availability[];
  certifications: Certification[];
  blockedDates?: { id: number; blockedDate: string; reason: string | null }[];
  onboarding?: { isComplete: boolean; missing: string[] };
  recentReviews?: ReviewItem[];
  updatedAt: string;
}

export interface TutorCard {
  id: number;
  fullName: string;
  bio: string | null;
  hourlyRate: number;
  teachingMode: TeachingMode;
  teachingExperienceYears: number | null;
  avgRating: number;
  reviewCount: number;
  isVerified: boolean;
  subjects: MasterItem[];
  educationLevels: MasterItem[];
  serviceAreaNames: string[];
  distanceKm: number | null;
}

export interface Slot {
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
}

export interface SlotsResponse {
  tutorProfileId: number;
  date: string;
  timezone: string;
  slotMinutes: number;
  isBlocked: boolean;
  slots: Slot[];
}

export interface Booking {
  id: number;
  status: BookingStatus;
  statusLabel: string;
  isFinal: boolean;
  mode: BookingMode;
  scheduledStartAt: string;
  scheduledEndAt: string;
  scheduledDate: string;
  durationMinutes: number;
  hourlyRateSnapshot: number;
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  learner: { id: number; fullName: string };
  tutor: { tutorProfileId: number; fullName: string; phone: string | null };
  bookedBy: { userId: number; fullName: string; phone: string | null };
  subject: MasterItem;
  address: Omit<Address, 'createdAt'> | null;
  meetingLink: string | null;
  meetingLinkAvailableAt: string | null;
  payment: {
    id: number;
    status: PaymentStatus;
    statusLabel: string;
    amount: number;
    refundAmount: number | null;
  } | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  actualDurationMinutes: number | null;
  cancelReason: string | null;
  cancelledBy: 'student' | 'tutor' | 'system' | null;
  hasProgressReport: boolean;
  latestLocation: { latitude: number; longitude: number; recordedAt: string } | null;
  statusHistory?: {
    status: string;
    statusLabel: string;
    changedAt: string;
    changedByUserId: number | null;
  }[];
  availableActions: string[];
  polling: Polling;
  createdAt: string;
  refundAmount?: number | null;
  /** hanya di GET /bookings/:id */
  review?: BookingReview | null;
}

export interface BookingReview {
  id: number;
  rating: number;
  comment: string | null;
  replyText: string | null;
  repliedAt: string | null;
  isHidden: boolean;
  createdAt: string;
  editableUntil: string | null;
}

export interface PaymentMethods {
  qris: { imageUrl: string } | null;
  bankTransfer: { bankName: string; accountNumber: string; accountName: string } | null;
}

export interface PaymentSummary {
  id: number;
  status: PaymentStatus;
  statusLabel: string;
  amount: number;
  proofImageUrl: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  expiresAt: string | null;
}

export interface BookingPaymentInfo {
  bookingId: number;
  bookingStatus: BookingStatus;
  bookingStatusLabel: string;
  breakdown: {
    hourlyRate: number;
    durationMinutes: number;
    subtotal: number;
    serviceFee: number;
    total: number;
  };
  payment: PaymentSummary | null;
  paymentMethods: PaymentMethods;
  instructions: string[];
  canUploadProof: boolean;
  message?: string;
}

export interface Payment {
  id: number;
  payableType: 'booking' | 'course_enrollment';
  payableId: number;
  amount: number;
  method: string;
  status: PaymentStatus;
  statusLabel: string;
  proofImageUrl: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  refundAmount: number | null;
  refundNote: string | null;
  refundedAt: string | null;
  createdAt: string;
  polling: Polling;
  payer?: { id: number; fullName: string; email: string; phone: string | null };
  booking: {
    id: number;
    status: BookingStatus;
    statusLabel: string;
    mode: BookingMode;
    scheduledStartAt: string;
    durationMinutes: number;
    learnerName: string;
    subjectName: string;
    tutorProfileId: number;
    tutorName: string;
  } | null;
  enrollment: {
    id: number;
    learnerName: string;
    courseId: number;
    courseTitle: string;
    courseSlug: string;
  } | null;
  paymentMethods?: PaymentMethods;
  instructions?: string[];
  canUploadProof?: boolean;
  alreadyProcessed?: boolean;
}

export interface ProgressReport {
  id: number;
  bookingId: number;
  materialsCovered: string;
  understandingLevel: number;
  understandingLabel: string;
  masteredSkills: string | null;
  areasToImprove: string | null;
  homeworkGiven: string | null;
  recommendationNotes: string | null;
  createdAt: string;
  session: {
    mode: BookingMode;
    scheduledStartAt: string;
    durationMinutes: number;
    checkedInAt: string | null;
    checkedOutAt: string | null;
  };
  learner: { id: number; fullName: string };
  subject: MasterItem;
  tutor: { tutorProfileId: number; fullName: string };
}

export interface CourseCard {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: MasterItem;
  educationLevel: MasterItem | null;
  level: 'pemula' | 'menengah' | 'lanjut';
  price: number;
  isFree: boolean;
  thumbnailUrl: string | null;
  issuesCertificate: boolean;
  avgRating: number;
  reviewCount: number;
  instructorName: string;
  enrollmentCount: number;
  lessonCount: number;
}

export interface QuizQuestion {
  id: number;
  questionText: string;
  options: { id: number; optionText: string; isCorrect?: boolean }[];
}

export interface Lesson {
  id: number;
  title: string;
  type: LessonType;
  durationSeconds: number | null;
  orderIndex: number;
  questionCount: number;
  contentUrl?: string | null;
  contentBody?: string | null;
  questions?: QuizQuestion[];
  progressStatus?: LessonProgressStatus;
  completedAt?: string | null;
}

export interface CourseModule {
  id: number;
  title: string;
  orderIndex?: number;
  lessons: Lesson[];
}

export interface CourseDetail {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: MasterItem;
  educationLevel: MasterItem | null;
  level: 'pemula' | 'menengah' | 'lanjut';
  price: number;
  isFree: boolean;
  thumbnailUrl: string | null;
  status: CourseStatus;
  statusLabel: string;
  passingGrade: number;
  issuesCertificate: boolean;
  avgRating: number;
  reviewCount: number;
  instructor: { id: number; fullName: string };
  enrollmentCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  modules: CourseModule[];
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: number;
  status: 'active' | 'completed';
  progressPercent: number;
  enrolledAt: string;
  completedAt: string | null;
  hasAccess: boolean;
  learner: { id: number; fullName: string };
  course: {
    id: number;
    slug: string;
    title: string;
    thumbnailUrl: string | null;
    isFree: boolean;
    price: number;
    passingGrade: number;
    issuesCertificate: boolean;
  };
  payment: { id: number; status: PaymentStatus; statusLabel: string; amount: number } | null;
  modules: CourseModule[];
  evaluation: {
    quizzes: { lessonId: number; title: string; attempts: number; bestScore: number | null; passed: boolean }[];
    assignments: {
      lessonId: number;
      title: string;
      submission: {
        id: number;
        fileUrl: string | null;
        submittedAt: string;
        score: number | null;
        feedback: string | null;
        gradedAt: string | null;
      } | null;
    }[];
    averageScore: number | null;
    passingGrade: number;
  };
  certificate: { certificateNumber: string; fileUrl: string | null; issuedAt: string } | null;
  certificateEligibility: { eligible: boolean; reasons: string[] };
  review: BookingReview | null;
}

export interface EnrollmentListItem {
  id: number;
  status: 'active' | 'completed';
  progressPercent: number;
  enrolledAt: string;
  completedAt: string | null;
  hasAccess: boolean;
  paymentStatus: PaymentStatus | null;
  learner: { id: number; fullName: string };
  course: {
    id: number;
    slug: string;
    title: string;
    thumbnailUrl: string | null;
    isFree: boolean;
    price: number;
    level: string;
  };
  certificate: { certificateNumber: string; issuedAt: string } | null;
}

export interface EnrollResult {
  enrollment: Enrollment;
  requiresPayment: boolean;
  payment?: PaymentSummary | null;
  paymentMethods?: PaymentMethods;
  instructions?: string[];
}

export interface QuizResult {
  attemptId: number;
  score: number;
  passed: boolean;
  passingGrade: number;
  correctCount: number;
  totalQuestions: number;
  results: { questionId: number; selectedOptionId: number | null; isCorrect: boolean; correctOptionId?: number | null }[];
  message: string;
  enrollment: {
    id: number;
    status: string;
    progressPercent: number;
    certificate: Enrollment['certificate'];
    certificateEligibility: Enrollment['certificateEligibility'];
  };
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface PlatformSettings {
  serviceFee: { type: 'flat' | 'percent'; value: number };
  cancellationPolicy: { freeCancelHours: number; lateRefundPercent: number };
  bookingResponseHours: number;
  paymentWindowHours: number;
  defaultPassingGrade: number;
  reviewEditDays: number;
  meetingLinkVisibleHours: number;
  qrisImageUrl: string | null;
  bankTransfer: { bankName: string; accountNumber: string; accountName: string } | null;
}

export interface Earnings {
  periodStart: string;
  periodEnd: string;
  completedSessions: number;
  completedHours: number;
  totalEarnings: number;
  upcomingEarnings: number;
  items: {
    bookingId: number;
    status: BookingStatus;
    statusLabel: string;
    scheduledStartAt: string;
    durationMinutes: number;
    subjectName: string;
    learnerName: string;
    earning: number;
    isCompleted: boolean;
  }[];
}

export interface PublicSettings {
  serviceFee: { type: 'flat' | 'percent'; value: number };
  cancellationPolicy: { freeCancelHours: number; lateRefundPercent: number };
  bookingResponseHours: number;
  paymentWindowHours: number;
  meetingLinkVisibleHours: number;
  reviewEditDays: number;
}

/** GET /admin/tutors — profil lengkap + email/telepon untuk verifikasi */
export type AdminTutor = Omit<TutorProfile, 'certifications'> & {
  email: string;
  phone: string | null;
  certifications: (Certification & { fileUrl: string })[];
};

export type DisputeType = 'refund_pending' | 'verify_before_refund' | 'payment_rejected' | 'session_not_checked_out' | 'session_not_started';

export interface DisputeItem {
  type: DisputeType;
  severity: 'high' | 'medium';
  title: string;
  description: string;
  payment: {
    id: number;
    status: PaymentStatus;
    statusLabel: string;
    amount: number;
    refundAmount: number | null;
    payer: { id: number; fullName: string; email: string; phone: string | null };
  } | null;
  related: {
    type: 'booking' | 'course_enrollment';
    id: number;
    status?: BookingStatus;
    statusLabel?: string;
    summary: string;
    scheduledStartAt?: string;
  } | null;
  suggestedActions: string[];
}

export interface DisputeList {
  summary: { total: number; refundPending: number; verifyBeforeRefund: number; paymentRejected: number; stuckBookings: number };
  items: DisputeItem[];
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: 'active' | 'suspended';
  emailVerifiedAt: string | null;
  createdAt: string;
  tutorProfile: { id: number; verificationStatus: VerificationStatus } | null;
}

export interface AdminReview {
  id: number;
  reviewableType: 'tutor_booking' | 'course';
  reviewableId: number;
  rating: number;
  comment: string | null;
  replyText: string | null;
  repliedAt: string | null;
  isHidden: boolean;
  createdAt: string;
  reviewer: { id: number; fullName: string; email: string };
  target: { type: 'tutor'; tutorProfileId: number; name: string } | { type: 'course'; courseId: number; slug: string; name: string } | null;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  bookings: { total: number; byStatus: Record<string, number>; completed: number };
  gmv: { total: number; bookings: number; courses: number };
  platformRevenue: { bookingServiceFee: number };
  refunds: { pendingCount: number; pendingAmount: number; refundedCount: number; refundedAmount: number };
  payments: { awaitingVerification: number };
  tutors: { active: number; pendingVerification: number };
  users: { students: number; parents: number; tutors: number; admins: number };
  courses: { published: number; inReview: number; draft: number };
  topCourses: { courseId: number; title: string; slug: string; enrollments: number; revenue: number }[];
}
