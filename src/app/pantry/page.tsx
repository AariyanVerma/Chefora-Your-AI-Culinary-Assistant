import { getPantryStats, getPantryItems } from './actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PantryOverview from './components/PantryOverview';
import PantryFilters from './components/PantryFilters';
import PantryList from './components/PantryList';
import FilteredResults from './components/FilteredResults';
import DashboardLayout from '../components/DashboardLayout';

// Force dynamic rendering to ensure filters work correctly
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function PantryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Await searchParams if it's a Promise (Next.js 16+)
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;

  // Filter out cache-busting parameter
  const { _t, ...filteredParams } = resolvedSearchParams;
  
  const search = typeof filteredParams.search === 'string' ? filteredParams.search : '';
  const category = typeof filteredParams.category === 'string' ? filteredParams.category : undefined;
  const location = typeof filteredParams.location === 'string' ? filteredParams.location : undefined;
  const expiry_status = typeof filteredParams.expiry_status === 'string' ? filteredParams.expiry_status : undefined;
  const opened_only = filteredParams.opened_only === 'true';
  const sort_by = typeof filteredParams.sort_by === 'string' && filteredParams.sort_by ? filteredParams.sort_by : 'expiry_soonest';
  const page = typeof filteredParams.page === 'string' ? parseInt(filteredParams.page) : 1;

  // Debug logging - log raw searchParams safely (excluding cache-busting param)
  const rawParams: Record<string, string | string[] | undefined> = {};
  for (const key in filteredParams) {
    rawParams[key] = filteredParams[key];
  }
  console.log('PantryPage RAW searchParams (filtered):', rawParams);
  console.log('PantryPage PARSED searchParams:', {
    search,
    category,
    location,
    expiry_status,
    opened_only,
    sort_by,
    page
  });

  let stats, items, allItems;
  try {
    [stats, items, allItems] = await Promise.all([
      getPantryStats(),
      getPantryItems({
        search,
        category,
        location,
        expiry_status,
        opened_only,
        sort_by,
        page,
        limit: 50,
      }),
      // Get all items (unfiltered) for the main list
      getPantryItems({
        search: '',
        category: undefined,
        location: undefined,
        expiry_status: undefined,
        opened_only: false,
        sort_by: 'expiry_soonest',
        page: 1,
        limit: 1000,
      }),
    ]);
  } catch (error: any) {
    // Check if it's a table missing error
    if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
      return (
        <DashboardLayout>
          <div className="container">
            <div className="card-wrapper pantry-error-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="cardBody">
                  <div className="pantry-empty-icon">⚠️</div>
                  <h2 className="cardTitle">Database Setup Required</h2>
                  <p className="subtitle" style={{ marginBottom: '24px' }}>
                    The pantry tables need to be created in your database.
                  </p>
                  <p className="subtitle" style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--muted)' }}>
                    Please visit the migration endpoint to set up the database:
                  </p>
                  <a
                    href="/api/pantry/migrate"
                    target="_blank"
                    className="btn tap-ripple"
                    style={{ display: 'inline-block', textDecoration: 'none' }}
                  >
                    Run Database Migration
                  </a>
                  <p className="subtitle" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)' }}>
                    After running the migration, refresh this page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    // Re-throw other errors
    throw error;
  }

  // Create a key based on filters to force re-render when filters change
  const filterKey = `${search}-${category}-${location}-${expiry_status}-${opened_only}-${sort_by}`;
  
  // Check if any filters are active
  const hasActiveFilters = !!(search || category || location || expiry_status || opened_only);
  
  console.log('PantryPage - hasActiveFilters:', hasActiveFilters);
  console.log('PantryPage - filtered items count:', items.length);
  console.log('PantryPage - all items count:', allItems.length);

  return (
    <DashboardLayout>
      <div className="container">
        <PantryOverview stats={stats} />
        <PantryFilters
          search={search}
          category={category}
          location={location}
          expiry_status={expiry_status}
          opened_only={opened_only}
          sort_by={sort_by}
        />
        {hasActiveFilters && (
          <FilteredResults items={items} />
        )}
        {!hasActiveFilters && (
          <PantryList key={filterKey} items={items} />
        )}
      </div>
    </DashboardLayout>
  );
}

