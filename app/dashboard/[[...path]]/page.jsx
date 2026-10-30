import Dashboard from './workspace';
export const metadata = { title: 'Dashboard | Shiv Patel', robots: { index: false, follow: false } };
export default async function DashboardPage({ params }) {
  const { path = [] } = await params;
  return <Dashboard key={path.join('/')} section={path[0] || 'overview'} recordId={path[1]} />;
}
