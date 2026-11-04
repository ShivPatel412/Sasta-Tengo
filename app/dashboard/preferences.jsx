'use client';
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {adminApi} from '../../lib/dashboard-client.mjs';
import {appearanceSchema,defaultAppearance} from '../../lib/dashboard-appearance.mjs';

const Preferences=createContext(null),cacheKey='shiv-dashboard-appearance';
function cachedAppearance(){
  try{const parsed=appearanceSchema.safeParse(JSON.parse(localStorage.getItem(cacheKey)));return parsed.success?parsed.data:null;}catch{return null;}
}
function remember(appearance){try{localStorage.setItem(cacheKey,JSON.stringify(appearance));}catch{}}
export default function DashboardPreferences({children}){
  const login=usePathname()==='/dashboard/login';
  const [appearance,setAppearance]=useState({...defaultAppearance});
  const [session,setSession]=useState({readOnly:true,uploadsEnabled:false});
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const pending=useRef(null),revision=useRef(0);
  const previewAppearance=useCallback(value=>{revision.current++;setAppearance(value);},[]);
  const commitAppearance=useCallback(value=>{const parsed=appearanceSchema.parse(value);revision.current++;setAppearance(parsed);remember(parsed);},[]);
  useLayoutEffect(()=>{const saved=cachedAppearance();if(saved)setAppearance(saved);},[]);
  const refreshSession=useCallback(()=>{
    if(pending.current)return pending.current;
    const started=revision.current;
    setError('');
    pending.current=adminApi('session').then(current=>{
      setSession(current);if(revision.current===started)commitAppearance(current.appearance);
    }).catch(e=>setError(e.message)).finally(()=>{setReady(true);pending.current=null;});
    return pending.current;
  },[commitAppearance]);
  useEffect(()=>{if(!login)refreshSession();},[login,refreshSession]);
  const clear=()=>{try{localStorage.removeItem(cacheKey);}catch{}setSession({readOnly:true,uploadsEnabled:false});setAppearance({...defaultAppearance});setReady(false);};
  return <Preferences.Provider value={{appearance,setAppearance:previewAppearance,commitAppearance,session,ready,error,refreshSession,clear}}>{children}</Preferences.Provider>;
}
export const useDashboardPreferences=()=>useContext(Preferences);
