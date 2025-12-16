import DashboardLayout from '@/app/components/DashboardLayout';
import FriendsPage from '../components/FriendsPage';
import { getFriendRequests, getFriends, getFriendSuggestions } from '../actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function FriendsPageRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [friendRequests, friends, suggestions] = await Promise.all([
    getFriendRequests(),
    getFriends(),
    getFriendSuggestions(),
  ]);

  return (
    <DashboardLayout>
      <FriendsPage
        initialFriendRequests={friendRequests}
        initialFriends={friends}
        initialSuggestions={suggestions}
      />
    </DashboardLayout>
  );
}







