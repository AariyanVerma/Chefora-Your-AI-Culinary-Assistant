import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/app/components/DashboardLayout';
import NotificationsPageClient from './NotificationsPageClient';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayout>
      <NotificationsPageClient />
    </DashboardLayout>
  );
}
