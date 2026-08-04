import React, { useEffect, useRef, useState } from 'react';
import '../styles/ExperienceSection.css';

const experiences = [
  { company: 'Bugle Technologies', role: 'Web Developer', dates: 'Jan 2023 — Present', logo: 'https://placehold.co/120x120/1d496f/ffffff?text=BT', description: 'Building fast, SEO-friendly business websites.', highlights: ['Responsive websites', 'SEO and page-speed improvements', 'API and WordPress integrations'], technologies: ['React', 'PHP', 'WordPress'] },
  { company: 'Genz Miner', role: 'Web Developer', dates: 'May 2022 — Dec 2022', logo: 'https://placehold.co/120x120/193b5a/ffffff?text=GM', description: 'Built a cryptocurrency dashboard and trading interface.', highlights: ['Dashboard interface', 'Secure authentication', 'Reusable React components'], technologies: ['React', 'Firebase'] },
  { company: 'Kalpataru Innovation', role: 'Junior Web Developer', dates: 'Jan 2022 — Apr 2022', logo: 'https://placehold.co/120x120/345e4f/ffffff?text=KI', description: 'Created responsive IoT dashboards and admin portals.', highlights: ['IoT dashboard layouts', 'Hardware integration UI', 'Cross-device testing'], technologies: ['HTML', 'CSS', 'JavaScript'] },
];

const ExperienceSection = () => {
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);
  const experience = experiences[active];
  const move = (direction) => setActive((active + direction + experiences.length) % experiences.length);

  useEffect(() => {
    if (window.matchMedia('(max-width: 720px)').matches) {
      const step = stepRefs.current[active];
      step?.parentElement?.scrollTo({
        left: step.offsetLeft - (step.parentElement.clientWidth - step.offsetWidth) / 2,
        behavior: 'smooth'
      });
    }
  }, [active]);

  return (
    <section className="experience" id="experience">
      <div className="experience-shell">
        <header className="experience-intro">
          <div><h2>Experience</h2></div>
         
        </header>
        <div className="experience-timeline" aria-label="Experience timeline">
          <button type="button" className="experience-arrow" onClick={() => move(-1)} aria-label="Previous experience">←</button>
          <div className="experience-steps">{experiences.map((item, index) => <button ref={(element) => (stepRefs.current[index] = element)} type="button" key={item.company} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-current={index === active ? 'step' : undefined}><b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5a4 4 0 0 1 8 0v2M4 7h16v12H4zM4 11h16" /></svg></b><span>{item.dates}</span></button>)}</div>
          <button type="button" className="experience-arrow" onClick={() => move(1)} aria-label="Next experience">→</button>
        </div>
        <article className="experience-featured-card" key={experience.company}>
          <header className="experience-card-header"><img src={experience.logo} alt={`${experience.company} logo`} /><div><h3>{experience.company}</h3><p>{experience.role}</p></div><time>{experience.dates}</time></header>
          <p className="experience-description">{experience.description}</p>
          <div className="experience-card-details"><section><h4>Key highlights</h4><ul>{experience.highlights.map(item => <li key={item}>{item}</li>)}</ul></section><section><h4>Technologies</h4><div className="experience-technologies">{experience.technologies.map(item => <span key={item}>{item}</span>)}</div></section></div>
        </article>
      </div>
    </section>
  );
};

export default ExperienceSection;
