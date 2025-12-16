import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/app/components/DashboardLayout';
import MessagesClient from './MessagesClient';

export default async function MessagesPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayout>
      <MessagesClient />
    </DashboardLayout>
  );
}


