import { Suspense } from 'react';
import Booking from '../../../components/site/pages/Booking';
export const metadata = {
  title: 'Discuss Your Website or Software Project | Shiv Patel',
  description: 'Plan your website or custom software project with Shiv Patel. Work directly with a freelance developer on your business website, web app, or custom software.',
  alternates: { canonical: 'https://www.shivpatel.in/booking' }
};
export default function Page(){return <Suspense fallback={<p>Loading booking form…</p>}><Booking/></Suspense>;}
