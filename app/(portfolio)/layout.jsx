import './portfolio.css';
import './stack-map.css';
import './cta.css';
import './interaction-effects.css';
import './brand.css';
import Interactions from './interactions';
import { isLocalPreview } from '../../lib/preview.mjs';
export default function Layout({children}){return <>{children}<Interactions/>{isLocalPreview()&&<aside role="status" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2147483647,background:'#fff',color:'#000',padding:10,textAlign:'center',fontSize:14}}>Local preview — database not connected. Saved data, submissions and login are unavailable.</aside>}</>;}
