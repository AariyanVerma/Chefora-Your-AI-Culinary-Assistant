'use server';

export async function testSimple() {
  console.log('[testSimple] Called');
  return { success: true, message: 'Server action works!' };
}

export async function testWithDb() {
  try {
    console.log('[testWithDb] Starting...');
    const { sql } = await import('@/lib/db');
    console.log('[testWithDb] Database imported');
    const result = await sql`SELECT 1 as test`;
    console.log('[testWithDb] Database query successful');
    return { success: true, dbWorks: true, result: result.rows[0] };
  } catch (error: any) {
    console.error('[testWithDb] Error:', error?.message || error);
    return { success: false, error: error?.message || 'Database error' };
  }
}

export async function testWithAuth() {
  try {
    console.log('[testWithAuth] Starting...');
    const { getCurrentUser } = await import('@/lib/auth');
    console.log('[testWithAuth] Auth imported');
    const user = await getCurrentUser();
    console.log('[testWithAuth] User fetched:', user?.id || 'null');
    return { success: true, user: user ? { id: user.id, name: user.name } : null };
  } catch (error: any) {
    console.error('[testWithAuth] Error:', error?.message || error);
    return { success: false, error: error?.message || 'Auth error' };
  }
}
