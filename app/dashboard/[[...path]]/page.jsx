import {admin} from '../../../lib/auth.mjs';
import {controlSnapshot} from '../../../lib/control-room.mjs';
import {gamingSnapshot} from '../../../lib/gaming-studio.mjs';
import Dashboard from './workspace';
import {isMasterDashboard,isLocalMaster} from '../../../lib/master-dashboard.mjs';
export const metadata = { title: 'Dashboard | Shiv Patel', robots: { index: false, follow: false } };
export default async function DashboardPage({ params }) {
  const { path = [] } = await params;
  let gamingInitial = null;
  if (path[0] === 'funny-reels' && isMasterDashboard()) {
    try {
      await admin();
      gamingInitial = gamingSnapshot(await controlSnapshot());
    } catch {
      // The existing session gate and client refresh handle unavailable data.
    }
  }
  return <Dashboard gamingInitial={gamingInitial} key={path.join('/')} section={path[0] || 'overview'} recordId={path[1]} master={isMasterDashboard()} local={isLocalMaster()} />;
}
