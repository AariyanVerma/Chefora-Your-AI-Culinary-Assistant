import { redirect } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import { getCurrentUser } from '@/lib/auth';
import CommunityPageClient from './CommunityPageClient';

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayout>
      <CommunityPageClient currentUserId={user.id} />
    </DashboardLayout>
  );
}
