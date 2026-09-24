import { TutorProfileView } from '@/components/tutor/TutorProfileView';

export const metadata = { title: 'Profil tutor' };

export default async function TutorDetailPage({ params }: PageProps<'/tutor/[id]'>) {
  const { id } = await params;
  return <TutorProfileView id={id} />;
}
