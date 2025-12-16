import { notFound, redirect } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProfilePage from '../../components/ProfilePage';
import { getProfileByUsername, getPostsByUser, getSavedPosts } from '../../actions';
import { getCurrentUser } from '@/lib/auth';

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { username } = await params;
  const { tab } = await searchParams;
  const profile = await getProfileByUsername(username, user.id);
  if (!profile) {
    notFound();
  }

  const activeTab = tab || 'posts';
  let posts: any[] = [];
  
  if (activeTab === 'posts') {
    posts = await getPostsByUser(profile.user_id, user.id);
  } else if (activeTab === 'saved') {
    // Only show saved posts if viewing your own profile
    if (profile.user_id === user.id) {
      posts = await getSavedPosts(profile.user_id, user.id);
    }
  }

  return (
    <DashboardLayout>
      <ProfilePage profile={profile} initialPosts={posts} activeTab={activeTab} currentUserId={user.id} />
    </DashboardLayout>
  );
}

