import React, { useEffect, useRef, useState } from 'react';
import '../styles/ExperienceSection.css';

const ExperienceSection = () => {
  const [experiences, setExperiences] = useState([]);
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);
  const experience = experiences[active];
  const move = direction => setActive((active + direction + experiences.length) % experiences.length);

  useEffect(() => {
    if (typeof fetch !== 'function') return;
    fetch(`${process.env.REACT_APP_API_URL || '/api'}/v1/experience`, { headers: { Accept: 'application/json' } }).then(response => {
      if (!response.ok) throw new Error('Could not load experience');
      return response.json();
    }).then(data => {
      const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      setExperiences(data.map(item => ({
        ...item,
        role: item.title,
        start: formatDate(item.start_date),
        end: item.is_current ? 'Present' : formatDate(item.end_date),
        current: item.is_current,
        logo: item.logo || '/favicon.ico',
        summary: item.summary || item.description,
        highlights: item.highlights || [],
        technologies: item.technologies || [],
      })));
      setActive(0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (window.matchMedia('(max-width: 720px)').matches) {
      const step = stepRefs.current[active];
      step?.parentElement?.scrollTo({ left: step.offsetLeft - (step.parentElement.clientWidth - step.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [active]);

  if (!experience) return null;

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
          <header className="experience-card-header"><a href={experience.website} target="_blank" rel="noopener noreferrer"><img src={experience.logo} alt={`${experience.company} logo`} /></a><div><h3><a href={experience.website} target="_blank" rel="noopener noreferrer">{experience.company}</a></h3><p>{experience.role}</p></div><time>{experience.start} — {experience.end}</time></header>
          <p className="experience-summary">{experience.summary}</p>
          <section className="experience-overview"><h4>Description</h4><p className="experience-description">{experience.description}</p></section>
          <div className="experience-card-details"><section><h4>Key highlights</h4><ul>{experience.highlights.map(item => <li key={item}>{item}</li>)}</ul></section><section><h4>Technologies</h4><div className="experience-technologies">{experience.technologies.map(item => <span key={item}>{item}</span>)}</div></section></div>
        </article>
      </div>
    </section>
  );
};

export default ExperienceSection;
