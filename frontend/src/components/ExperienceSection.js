import React, { useEffect, useRef, useState } from 'react';
import '../styles/ExperienceSection.css';

const experiences = [
  {
    company: 'Bugle Technologies', role: 'Web Developer', start: 'Jan 2023', end: 'Present', current: true,
    logo: '/experience/bugle-technologies.png',
    summary: 'Built 10+ business websites, custom WordPress plugins, ACF solutions, and React frontends.',
    description: 'Developed and maintained high-performance business websites, custom WordPress solutions, and React-based frontend applications while focusing on performance, scalability, and SEO.',
    highlights: ['Built and launched 10+ business websites across multiple industries.', 'Developed custom WordPress plugins to automate business workflows.', 'Created dynamic websites using Advanced Custom Fields (ACF).', 'Built responsive frontend interfaces using React.', 'Integrated REST APIs and third-party services.', 'Optimized website speed, SEO, and Core Web Vitals.', 'Customized Elementor themes and reusable components.', 'Maintained and improved existing client websites.'],
    technologies: ['React', 'PHP', 'WordPress', 'ACF', 'HTML', 'CSS', 'JavaScript', 'REST API']
  },
  {
    company: 'Genz Miner', role: 'Web Developer', start: 'May 2022', end: 'Dec 2022',
    logo: '/experience/genz-miner.jpg',
    summary: 'Developed eCommerce websites, inventory management systems, and client-focused business solutions.',
    description: 'Developed eCommerce platforms and internal business management systems while working closely with clients to deliver customized web solutions.',
    highlights: ['Developed responsive eCommerce websites.', 'Built stock and inventory management modules.', 'Worked directly with clients to gather requirements and implement features.', 'Customized dashboards and business workflows.', 'Improved website usability and frontend performance.', 'Integrated Firebase authentication and backend services.', 'Created reusable React components.'],
    technologies: ['React', 'Firebase', 'HTML', 'CSS', 'JavaScript', 'eCommerce Development']
  },
  {
    company: 'Kalpataru Innovation', role: 'Junior Web Developer', start: 'Jan 2022', end: 'Apr 2022',
    logo: '/experience/kalpataru-innovation.webp',
    summary: 'Created responsive WordPress websites, WooCommerce stores, and multi-vendor eCommerce platforms.',
    description: 'Worked on responsive WordPress websites, WooCommerce stores, and multi-vendor eCommerce platforms while gaining experience in full website development.',
    highlights: ['Developed responsive WordPress business websites.', 'Built WooCommerce eCommerce stores.', 'Created multi-vendor marketplace websites.', 'Customized WordPress themes and plugins.', 'Implemented responsive layouts for desktop and mobile devices.', 'Improved website performance and user experience.', 'Assisted in deployment and website maintenance.'],
    technologies: ['WordPress', 'WooCommerce', 'PHP', 'HTML', 'CSS', 'JavaScript']
  },
];

const ExperienceSection = () => {
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);
  const experience = experiences[active];
  const move = direction => setActive((active + direction + experiences.length) % experiences.length);

  useEffect(() => {
    if (window.matchMedia('(max-width: 720px)').matches) {
      const step = stepRefs.current[active];
      step?.parentElement?.scrollTo({ left: step.offsetLeft - (step.parentElement.clientWidth - step.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [active]);

  return (
    <section className="experience" id="experience">
      <div className="experience-shell">
        <header className="experience-intro"><div><h2>Experience</h2></div></header>
        <div className="experience-timeline" aria-label="Experience timeline">
          <button type="button" className="experience-arrow" onClick={() => move(-1)} aria-label="Previous experience">←</button>
          <div className="experience-steps">{experiences.map((item, index) => (
            <button ref={element => (stepRefs.current[index] = element)} type="button" key={item.company} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-current={index === active ? 'step' : undefined}>
              <b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5a4 4 0 0 1 8 0v2M4 7h16v12H4zM4 11h16" /></svg></b>
              <span className="experience-step-label"><strong>{item.role}</strong><small>{item.start} — {item.current ? <i className="experience-current-dot" aria-label="Present" /> : item.end}</small></span>
            </button>
          ))}</div>
          <button type="button" className="experience-arrow" onClick={() => move(1)} aria-label="Next experience">→</button>
        </div>
        <article className="experience-featured-card" key={experience.company}>
          <header className="experience-card-header"><img src={experience.logo} alt={`${experience.company} logo`} /><div><h3>{experience.company}</h3><p>{experience.role}</p></div><time>{experience.start} — {experience.end}</time></header>
          <p className="experience-summary">{experience.summary}</p>
          <section className="experience-overview"><h4>Description</h4><p className="experience-description">{experience.description}</p></section>
          <div className="experience-card-details"><section><h4>Key highlights</h4><ul>{experience.highlights.map(item => <li key={item}>{item}</li>)}</ul></section><section><h4>Technologies</h4><div className="experience-technologies">{experience.technologies.map(item => <span key={item}>{item}</span>)}</div></section></div>
        </article>
      </div>
    </section>
  );
};

export default ExperienceSection;
