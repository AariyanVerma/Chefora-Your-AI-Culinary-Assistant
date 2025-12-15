import React from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import EditPostForm from '../../components/EditPostForm';
import { getPost } from '../../actions';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }> | { postId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resolvedParams = params instanceof Promise ? await params : params;
  const post = await getPost(resolvedParams.postId);

  if (!post) {
    notFound();
  }

  // Verify ownership
  if (post.author_id !== user.id) {
    redirect(`/community/p/${resolvedParams.postId}`);
  }

  return (
    <DashboardLayout>
      <div className="community-create-page">
        <div className="community-header">
          <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '24px' }}>
            Edit Post
          </h1>
        </div>
        <EditPostForm post={post} />
      </div>
    </DashboardLayout>
  );
}
