import './portfolio.css';
import './stack-map.css';
import './cta.css';
import './interaction-effects.css';
import './brand.css';
import './corner-frames.css';
import Interactions from './interactions';
import { isLocalPreview } from '../../lib/preview.mjs';

// Cache public page HTML for one hour; live API data keeps its own no-store policy.
export const revalidate = 3600;

export default function Layout({children}){return <>{children}<Interactions/>{isLocalPreview()&&<aside role="status" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2147483647,background:'#fff',color:'#000',padding:10,textAlign:'center',fontSize:14}}>Local preview — database not connected. Saved data, submissions and login are unavailable.</aside>}</>;}
