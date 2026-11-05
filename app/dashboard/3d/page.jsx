import {redirect} from 'next/navigation';
import {admin} from '../../../lib/auth.mjs';
import Headquarters from './headquarters';
export const metadata={title:'AI Automation HQ | Shiv Patel',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function HQPage(){
  try{await admin();}catch(error){if(error.status===401)redirect('/dashboard/login');throw error;}
  return <Headquarters/>;
}
