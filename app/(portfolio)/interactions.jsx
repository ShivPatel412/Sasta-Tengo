'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { mountPortfolioInteractions } from '../../lib/portfolio-interactions.mjs';
export default function Interactions(){const pathname=usePathname();useEffect(()=>mountPortfolioInteractions(),[pathname]);return null;}
