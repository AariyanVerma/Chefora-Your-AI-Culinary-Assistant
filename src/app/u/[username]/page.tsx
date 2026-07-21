import React from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProfilePage from '../../community/components/ProfilePage';
import { getProfile, getPosts, getSavedPosts } from '../../community/actions';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const { username } = await params;
  const { tab: tabParam } = await searchParams;
  
  const profile = await getProfile(username);
  if (!profile) {
    notFound();
  }

  const tab = tabParam || 'posts';
  let posts: any[] = [];

  if (tab === 'posts') {
    
    const allPosts = await getPosts({ page: 1, limit: 50 });
    posts = allPosts.filter(p => p.author_username === username);
  } else if (tab === 'saved') {
    
    if (profile.user_id === user.id) {
      posts = await getSavedPosts(profile.user_id, user.id);
    }
  }

  return (
    <DashboardLayout>
      <ProfilePage profile={profile} initialPosts={posts} activeTab={tab} currentUserId={user.id} />
    </DashboardLayout>
  );
}
