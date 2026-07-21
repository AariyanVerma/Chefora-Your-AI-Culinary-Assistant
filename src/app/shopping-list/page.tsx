import { getShoppingLists, getShoppingList, getShoppingItems } from './actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import ShoppingListShell from './components/ShoppingListShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;

  const listId = typeof resolvedSearchParams.list === 'string' ? resolvedSearchParams.list : undefined;

  let lists, selectedList, items;

  try {
    [lists, selectedList, items] = await Promise.all([
      getShoppingLists(),
      listId ? getShoppingList(listId) : Promise.resolve(null),
      listId ? getShoppingItems(
        listId,
        {
          search: typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined,
          category: typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined,
          store: typeof resolvedSearchParams.store === 'string' ? resolvedSearchParams.store : undefined,
          priority: typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined,
          purchased: typeof resolvedSearchParams.purchased === 'string' ? resolvedSearchParams.purchased === 'true' : undefined,
          pantry_linked_only: typeof resolvedSearchParams.pantry_linked === 'string' ? resolvedSearchParams.pantry_linked === 'true' : undefined,
        },
        typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined
      ) : Promise.resolve([]),
    ]);

    if (!listId && lists.length > 0 && !selectedList) {
      selectedList = await getShoppingList(lists[0].id);
      if (selectedList) {
        items = await getShoppingItems(selectedList.id);
      }
    }
  } catch (error: any) {
    
    if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
      return (
        <DashboardLayout>
          <div className="container">
            <div className="card-wrapper shopping-error-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="cardBody">
                  <div className="shopping-empty-icon">⚠️</div>
                  <h2 className="cardTitle">Database Setup Required</h2>
                  <p className="subtitle" style={{ marginBottom: '24px' }}>
                    The shopping list tables need to be created in your database.
                  </p>
                  <p className="subtitle" style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--muted)' }}>
                    Please run the migration SQL to set up the database tables.
                  </p>
                  <p className="subtitle" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)' }}>
                    See: src/app/shopping-list/migration.sql
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    
    throw error;
  }

  return (
    <DashboardLayout>
      <ShoppingListShell
        initialLists={lists}
        initialSelectedList={selectedList}
        initialItems={items}
      />
    </DashboardLayout>
  );
}
