import React from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import PostDetail from '../../components/PostDetail';
import { getPost, getComments } from '../../actions';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }> | { postId: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  
  const resolvedParams = params instanceof Promise ? await params : params;
  
  try {
    const [post, comments] = await Promise.all([
      getPost(resolvedParams.postId),
      getComments(resolvedParams.postId),
    ]);

    if (!post) {
      notFound();
    }

    return (
      <DashboardLayout>
        <div className="community-post-detail-page">
          <PostDetail post={post} initialComments={comments} currentUserId={user?.id} />
        </div>
      </DashboardLayout>
    );
  } catch (error: any) {
    console.error('Error loading post:', error);
    
    if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
      return (
        <DashboardLayout>
          <div className="container">
            <div className="community-neon-card" style={{
              padding: 'var(--pad-lg)',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              textAlign: 'center'
            }}>
              <h2 className="cardTitle">Database Setup Required</h2>
              <p className="subtitle" style={{ marginBottom: '24px', color: 'var(--muted)' }}>
                The community tables need to be created in your database.
              </p>
              <p className="subtitle" style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Please run the migration SQL from <code>src/app/community/migration.sql</code> in your PostgreSQL database.
              </p>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    throw error;
  }
}
