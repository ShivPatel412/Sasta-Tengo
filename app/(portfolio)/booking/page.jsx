import { Suspense } from 'react';
import Booking from '../../../components/site/pages/Booking';
export default function Page(){return <Suspense fallback={<p>Loading booking form…</p>}><Booking/></Suspense>;}
