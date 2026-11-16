'use client';
import { useEffect, useRef } from 'react';

export default function Tagline() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.IntersectionObserver) return;
    const words = ref.current.querySelectorAll('span');
    ref.current.dataset.animate = 'true';
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 1 });
    words.forEach(word => observer.observe(word));
    return () => observer.disconnect();
  }, []);
  return <section className="hire-manifesto" ref={ref} aria-label="One person. From your first idea to your next big thing."><p className="hire-eyebrow caption-3">LESS BACK AND FORTH. MORE MOVING FORWARD.</p><h2 className="heading-1" aria-hidden="true">{'One person. From your first idea'.split(' ').map((word, i) => <span style={{ transitionDelay: `${i * 60}ms` }} key={i}>{word} </span>)}<br/>{'to your next big thing.'.split(' ').map((word, i) => <span style={{ transitionDelay: `${(i + 6) * 60}ms` }} key={i}>{word} </span>)}</h2></section>;
}
