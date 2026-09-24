import { CourseDetailView } from '@/components/course/CourseDetailView';

export const metadata = { title: 'Detail kursus' };

export default async function CourseDetailPage({ params }: PageProps<'/kursus/[slug]'>) {
  const { slug } = await params;
  return <CourseDetailView slug={slug} />;
}
