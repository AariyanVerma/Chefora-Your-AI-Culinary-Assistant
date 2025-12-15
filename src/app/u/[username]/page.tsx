import React from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProfilePage from '../../community/components/ProfilePage';
import { getProfile, getPosts } from '../../community/actions';
import { notFound } from 'next/navigation';

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { tab?: string };
}) {
  const profile = await getProfile(params.username);
  if (!profile) {
    notFound();
  }

  const tab = searchParams.tab || 'posts';
  let posts: any[] = [];

  if (tab === 'posts') {
    // Get user's posts
    const allPosts = await getPosts({ page: 1, limit: 50 });
    posts = allPosts.filter(p => p.author_username === params.username);
  }

  return (
    <DashboardLayout>
      <ProfilePage profile={profile} initialPosts={posts} activeTab={tab} />
    </DashboardLayout>
  );
}

