'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowUpRight, ArrowDown, Code, Circuitry, Globe, GithubLogo, LinkedinLogo, EnvelopeSimple, Plus, X, List, Check } from '@phosphor-icons/react';
import RobotStage from '../components/RobotStage';
import api from '../services/api';
import { safePublicUrl, projectImage } from '../../../lib/landing.mjs';

const nav = [['projects', 'Work'], ['services', 'Expertise'], ['about', 'About'], ['contact', 'Contact']];
const skills = ['Next.js', 'React', 'WordPress', 'Three.js', 'n8n', 'Laravel', 'Supabase'];
const services = [
  { icon: Globe, title: 'Websites people enjoy using.', detail: 'Thoughtful layouts, clear navigation and responsive interfaces that make the next step obvious.', tags: 'WordPress / Elementor / UI design' },
  { icon: Code, title: 'Software that fits your work.', detail: 'Custom applications, dashboards and integrations built around the way your business actually operates.', tags: 'Next.js / React / Laravel' },
  { icon: Circuitry, title: 'Less repetition. More progress.', detail: 'Connected tools and practical AI workflows that take repetitive tasks off your plate.', tags: 'n8n / APIs / AI automation' },
];
const faqs = [
  ['What can we build together?', 'I build business websites, custom web applications, dashboards, WordPress plugins and automations. Tell me the problem you want to solve and we can choose a sensible starting point.'],
  ['Can you improve my existing website?', 'Yes. We can work with your current website, improve its design and performance, or connect it with your other tools. A rebuild is only one possible approach.'],
  ['Do you work with WordPress and Next.js?', 'Yes. I work with WordPress, Elementor, custom plugins, React and Next.js. The choice depends on your content, integrations and how you want to manage the site.'],
  ['Can you connect AI and automation to my business?', 'I can connect services through APIs and n8n, including workflows for content, forms, project data and internal tools. We will define the inputs, outputs and approval steps before building.'],
  ['How do you estimate the scope and timeline?', 'We start with your goals, existing setup and priorities. I then outline the scope and milestones so you can review the approach before development begins.'],
  ['What is the first step?', 'Use the project booking form or send me a message with your idea. Include your current website if you have one, what you want to change and any target launch date.'],
];

function ProjectArt({ project, index }) {
  const source = projectImage(project);
  return <div className={`work-art work-art-${index % 3}`}>
    {source ? <img src={source} alt={`${project.title} project preview`} loading="lazy" width="720" height="500" /> : <div className="work-illustration" aria-hidden="true"><div className="mini-browser"><div className="mini-toolbar"><i /><i /><i /><span>{project.category || 'Selected project'}</span></div><div className="mini-page"><div className="mini-sidebar"><i /><i /><i /></div><div className="mini-content"><div className="mini-line" /><div className="mini-line short" /><div className="mini-blocks"><i /><i /><i /></div><div className="mini-chart"><i /><i /><i /><i /><i /><i /><i /></div></div></div></div><span className="concept-label caption-5">Project illustration</span></div>}
    <span className="work-open" aria-hidden="true"><ArrowUpRight size={24} /></span>
  </div>;
}

export default function Home() {
  const root = useRef(null), dialog = useRef(null), menu = useRef(null), menuToggle = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [gsapReady, setGsapReady] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectState, setProjectState] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('All');
  const [experiences, setExperiences] = useState([]);
  const [formState, setFormState] = useState('idle');
  const [formError, setFormError] = useState('');
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    let alive = true;
    async function loadProjects() {
      try {
        const response = await api.get('/v1/projects');
        if (!Array.isArray(response.data)) throw new Error('Invalid project response');
        if (alive) { setProjects(response.data); setProjectState('ready'); }
      } catch { if (alive) setProjectState('error'); }
    }
    loadProjects();
    api.get('/v1/experience').then(({ data }) => { if (alive && Array.isArray(data)) setExperiences(data); }).catch(() => {});
    window.addEventListener('focus', loadProjects);
    return () => { alive = false; window.removeEventListener('focus', loadProjects); };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) setActiveSection(entry.target.id); }, { rootMargin: '-15% 0px -65% 0px' });
    root.current.querySelectorAll('section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!gsapReady || !window.gsap) return;
    const gsap = window.gsap, mm = gsap.matchMedia(), observers = [];
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(root.current.querySelectorAll('[data-hero]'), { y: 32, opacity: 0, duration: 0.85, stagger: 0.1, ease: 'power3.out', clearProps: 'all' });
      root.current.querySelectorAll('[data-reveal]').forEach(element => {
        gsap.set(element, { y: 32, opacity: 0 });
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { gsap.to(element, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', clearProps: 'all' }); observer.disconnect(); } }, { threshold: 0.08 });
        observer.observe(element); observers.push(observer);
      });
      root.current.querySelectorAll('[data-word]').forEach(element => {
        gsap.set(element, { opacity: 0.3 });
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { gsap.to(element, { opacity: 1, duration: 0.6, ease: 'power3.out' }); observer.disconnect(); } }, { rootMargin: '0px 0px -28% 0px', threshold: 1 });
        observer.observe(element); observers.push(observer);
      });
    }, root);
    return () => { observers.forEach(o => o.disconnect()); mm.revert(); };
  }, [gsapReady]);

  useEffect(() => {
    if (!menuOpen) return;
    const before = document.body.style.overflow, panel = menu.current;
    document.body.style.overflow = 'hidden'; panel.querySelector('a')?.focus();
    function keydown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key === 'Tab') {
        const items = [...panel.querySelectorAll('a,button')], first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = before; document.removeEventListener('keydown', keydown); menuToggle.current?.focus(); };
  }, [menuOpen]);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  const categories = ['All', ...new Set(projects.map(p => p.category || 'Other'))];
  const visible = category === 'All' ? projects : projects.filter(p => (p.category || 'Other') === category);
  const chooseProject = project => { setSelected(project); setActiveImage(projectImage(project) || ''); };

  async function sendMessage(event) {
    event.preventDefault(); if (formState === 'sending') return;
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
    setFormState('sending'); setFormError('');
    try {
      await api.post('/v1/contacts', { name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim(), subject: 'Website project inquiry', message: data.message.trim() });
      setFormState('sent'); form.reset();
    } catch { setFormState('error'); setFormError('Your message could not be sent. Please retry or email info@shivpatel.in.'); }
  }

  return <div className="studio" ref={root}>
    <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" strategy="afterInteractive" onReady={() => setGsapReady(true)} />
    <a href="#main" className="studio-skip button-md">Skip to content</a>
    <header className="studio-header">
      <a className="studio-brand title-3" href="#hero" aria-label="Shiv Patel home"><span className="brand-symbol">s<span>p</span><i /></span><span>Shiv Patel<span className="brand-role caption-5">Developer & creative thinker</span></span></a>
      <nav className="studio-nav" aria-label="Primary navigation">{nav.map(([id, label]) => <a className="title-4" key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined}>{label}</a>)}</nav>
      <Link href="/booking" className="studio-button studio-header-cta button-sm">Start a project <ArrowUpRight size={18} /></Link>
      <button ref={menuToggle} type="button" className="studio-menu-toggle" aria-expanded={menuOpen} aria-controls="studio-mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><List size={24} /></button>
    </header>
    {menuOpen && <div ref={menu} id="studio-mobile-menu" className="studio-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation"><a href="#hero" className="title-1" onClick={() => setMenuOpen(false)}>Shiv Patel</a><button type="button" className="studio-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={24} /></button><nav>{nav.map(([id, label], i) => <a key={id} href={`#${id}`} className="heading-3" onClick={() => setMenuOpen(false)} style={{ '--menu-delay': `${i * 60}ms` }}>{label}<ArrowUpRight /></a>)}</nav><Link href="/booking" className="studio-button button-md">Start a project <ArrowUpRight /></Link></div>}
    <main id="main">
      <section id="hero" className="studio-hero studio-container">
        <div className="studio-hero-copy"><p className="studio-eyebrow caption-4" data-hero><span className="status-dot" />Open to projects & collaborations</p><h1 className="heading-1" data-hero>From a spark.<br />To something<br /><span>people use.</span></h1><p className="body-3 hero-summary" data-hero>I’m Shiv, a web developer turning ideas into thoughtful websites, useful software and connected automations.</p><div className="hero-actions" data-hero><Link href="/booking" className="studio-button button-md">Let’s build your idea <ArrowUpRight size={20} /></Link><span className="caption-5">Based in Gujarat. Building for the web.</span></div><div className="hero-proof caption-4" data-hero><span>WordPress & custom development</span><span className="proof-divider" /><span>Design → code → launch</span></div></div>
        <div className="hero-visual" data-hero><span className="visual-index caption-5">THE STUDIO / 001</span><RobotStage /><span className="visual-coordinate caption-5">A human behind the code.</span></div>
        <div className="hero-bottom caption-5"><span>Independent developer. Connected thinking.</span><a href="#projects">Scroll to explore <ArrowDown size={16} /></a></div>
      </section>
      <div className="studio-stack studio-container"><span className="caption-5">A few tools in my toolkit</span><div>{skills.map(skill => <span key={skill} className="title-3">{skill}</span>)}</div></div>

      <section id="projects" className="studio-section studio-container"><header className="section-heading" data-reveal><div><p className="studio-eyebrow caption-4">01 / Selected work</p><h2 className="heading-2">Built with intent.</h2></div><p className="body-3">Websites, applications and experiments.<br />Different challenges. The same care.</p></header><div className="work-filters" aria-label="Filter projects">{categories.map(name => <button type="button" className="button-sm" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}</div>{projectState === 'loading' ? <div className="work-grid" aria-label="Loading projects" aria-busy="true"><div className="work-skeleton" /><div className="work-skeleton" /></div> : <div className="work-grid">{visible.map((project, index) => <article key={project.id} className="work-card"><button type="button" onClick={() => chooseProject(project)} aria-label={`Explore ${project.title}`}><ProjectArt project={project} index={index} /><div className="work-card-copy"><div><p className="caption-4">{project.category || 'Selected project'}</p><h3 className="heading-5">{project.title}</h3></div><span className="caption-5">{String(index + 1).padStart(2, '0')}</span></div></button><p className="body-6 work-description">{project.description}</p><div className="work-tags caption-5">{(project.technologies || []).slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div></article>)}</div>}{projectState === 'error' && <p className="studio-empty body-3" role="status">The project collection could not load. You can explore my work on GitHub below.</p>}{projectState === 'ready' && !visible.length && <p className="studio-empty body-3">New projects are on the way. Explore my GitHub in the meantime.</p>}<a href="https://github.com/ShivPatel412" target="_blank" rel="noreferrer" className="studio-text-link button-sm">More experiments on GitHub <ArrowUpRight size={18} /></a></section>

      <section id="services" className="studio-section studio-container"><header className="section-heading" data-reveal><div><p className="studio-eyebrow caption-4">02 / What I bring</p><h2 className="heading-2">Your next move,<br />made possible.</h2></div><p className="body-3">From your first website to the tools<br />that keep your business moving.</p></header><div className="expertise-grid">{services.map(({ icon: Icon, title, detail, tags }, index) => <article className="expertise-card" key={title} data-reveal><div className="expertise-top"><Icon size={32} weight="light" /><span className="caption-5">0{index + 1}</span></div><h3 className="heading-5">{title}</h3><p className="body-3">{detail}</p><p className="caption-5 expertise-tools">{tags}</p></article>)}</div></section>
      <section className="studio-manifesto studio-container" aria-label="My approach"><p className="studio-eyebrow caption-4">A simple philosophy</p><h2 className="heading-1">{'Good technology should feel simple. Even when the thinking behind it isn’t.'.split(' ').map((word, index) => <span data-word key={index}>{word} </span>)}</h2><span className="manifesto-mark" aria-hidden="true">↗</span></section>

      <section id="about" className="studio-section studio-container studio-about"><div className="about-portrait" data-reveal><img src="/Boy.jpg" alt="Shiv Patel" width="520" height="620" loading="lazy" /><div className="portrait-caption"><span className="title-3">Shiv Patel</span><span className="caption-5">Developer. Builder. Always learning.</span></div></div><div className="about-copy" data-reveal><p className="studio-eyebrow caption-4">03 / The person behind the pixels</p><h2 className="heading-2">Curious by nature.<br />A builder by choice.</h2><p className="body-3">I work at the intersection of design and development, bringing together clear interfaces, practical code and the tools that make them useful.</p><p className="body-3">My work spans WordPress websites, custom plugins, React applications and API integrations. Lately, I’ve been exploring 3D experiences and AI automation to connect more of the pieces.</p><div className="about-links"><a href="https://github.com/ShivPatel412" target="_blank" rel="noreferrer" className="studio-text-link button-sm"><GithubLogo size={20} /> GitHub <ArrowUpRight size={16} /></a><a href="https://linkedin.com/in/shivpatel412" target="_blank" rel="noreferrer" className="studio-text-link button-sm"><LinkedinLogo size={20} /> LinkedIn <ArrowUpRight size={16} /></a></div></div></section>
      {experiences.length > 0 && <section id="experience" className="studio-section studio-container"><header className="section-heading" data-reveal><div><p className="studio-eyebrow caption-4">Experience</p><h2 className="heading-2">Learning through building.</h2></div></header><div className="studio-experience">{experiences.map(item => <article key={item.id || item.company} className="experience-row"><span className="caption-4">{item.start_date?.slice(0, 4)} — {item.is_current ? 'Present' : item.end_date?.slice(0, 4)}</span><div><h3 className="heading-5">{item.company}</h3><p className="body-6">{item.title}</p></div><p className="body-6">{item.summary || item.description}</p></article>)}</div></section>}
      <section className="studio-section studio-container"><header className="section-heading" data-reveal><div><p className="studio-eyebrow caption-4">04 / Working together</p><h2 className="heading-2">A clear path from here.</h2></div></header><div className="process-grid">{[['Talk it through', 'Your goals, the problem and the people we’re building for. We define what matters first.'], ['Make it tangible', 'A focused design and working implementation, with room for feedback along the way.'], ['Launch with care', 'Responsive checks, connected integrations and a handover so you can keep moving.']].map(([title, copy], index) => <article key={title} data-reveal><span className="process-number heading-3">0{index + 1}<ArrowUpRight size={24} /></span><h3 className="heading-5">{title}</h3><p className="body-3">{copy}</p></article>)}</div></section>
      <section className="studio-section studio-container faq-section"><div data-reveal><p className="studio-eyebrow caption-4">A little clarity</p><h2 className="heading-2">Before we<br />get started.</h2></div><div className="studio-faq">{faqs.map(([question, answer]) => <details key={question}><summary className="title-3">{question}<Plus size={20} /></summary><p className="body-3">{answer}</p></details>)}</div></section>

      <section id="cta" className="studio-container studio-cta" aria-labelledby="cta-title"><div className="cta-copy" data-reveal><p className="studio-eyebrow caption-4">Small spark. Big possibilities.</p><h2 id="cta-title" className="heading-1">Have an idea?<br />Let’s give it<br /><span>a life online.</span></h2><p className="body-3">Bring the idea. We’ll figure out the right next step together.</p><Link href="/booking" className="studio-button button-md">Let’s build your idea <ArrowUpRight size={20} /></Link><span className="caption-5 cta-note">We’ll discuss the scope before you commit.</span></div><div className="cta-robot"><RobotStage compact /></div></section>
      <section id="contact" className="studio-section studio-container studio-contact"><div data-reveal><p className="studio-eyebrow caption-4">05 / Say hello</p><h2 className="heading-2">Let’s start with<br />a conversation.</h2><a href="mailto:info@shivpatel.in" className="contact-email title-1">info@shivpatel.in <ArrowUpRight size={24} /></a><p className="body-6">Gujarat, India · Open to remote collaboration</p></div><form className="studio-contact-form" onSubmit={sendMessage}><div className="form-row"><label className="title-4">Your name<input name="name" required maxLength={100} autoComplete="name" placeholder="Your name" /></label><label className="title-4">Email address<input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@example.com" /></label></div><label className="title-4">Phone number <span className="caption-5">(optional)</span><input name="phone" type="tel" maxLength={20} autoComplete="tel" placeholder="Your contact number" /></label><label className="title-4">What are you thinking?<textarea name="message" required minLength={10} maxLength={5000} rows={4} placeholder="A little about your idea, your goals and what you need." /></label><div aria-live="polite" aria-atomic="true">{formState === 'sent' && <p className="form-success body-6"><Check size={18} /> Your message has been sent. Thank you for reaching out.</p>}{formError && <p className="form-error body-6" role="alert">{formError}</p>}</div><button className="studio-button button-md" disabled={formState === 'sending'} type="submit">{formState === 'sending' ? 'Sending your message…' : 'Send your message'}<ArrowUpRight size={20} /></button></form></section>
    </main>
    <footer className="studio-footer studio-container"><a href="#hero" className="footer-name heading-2">Shiv Patel<span aria-hidden="true">↗</span></a><div className="footer-bottom caption-5"><span>© {new Date().getFullYear()} Shiv Patel</span><span>Made with intention. And a little curiosity.</span><div><a href="https://github.com/ShivPatel412" target="_blank" rel="noreferrer" aria-label="GitHub"><GithubLogo size={20} /></a><a href="https://linkedin.com/in/shivpatel412" target="_blank" rel="noreferrer" aria-label="LinkedIn"><LinkedinLogo size={20} /></a><a href="mailto:info@shivpatel.in" aria-label="Email Shiv"><EnvelopeSimple size={20} /></a></div></div></footer>
    <dialog ref={dialog} className="studio-project-dialog" onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }} aria-labelledby="project-dialog-title">{selected && <article><button type="button" className="dialog-close" onClick={() => setSelected(null)} aria-label="Close project"><X size={24} /></button>{safePublicUrl(activeImage) && <img className="dialog-image" src={safePublicUrl(activeImage)} alt={`${selected.title} preview`} />}<div className="dialog-copy"><p className="studio-eyebrow caption-4">{selected.category || 'Selected project'}</p><h2 id="project-dialog-title" className="heading-3">{selected.title}</h2><p className="body-3">{selected.description}</p><div className="work-tags caption-5">{(selected.technologies || []).map(tag => <span key={tag}>{tag}</span>)}</div>{selected.gallery_urls?.length > 0 && <div className="dialog-gallery">{selected.gallery_urls.map((url, index) => safePublicUrl(url) && <button type="button" key={url} onClick={() => setActiveImage(url)} aria-label={`Show project image ${index + 1}`}><img src={safePublicUrl(url)} alt="" loading="lazy" /></button>)}</div>}<div className="dialog-actions">{safePublicUrl(selected.live_url) && <a href={safePublicUrl(selected.live_url)} target="_blank" rel="noreferrer" className="studio-button button-sm">Visit website <ArrowUpRight /></a>}{safePublicUrl(selected.github_url) && <a href={safePublicUrl(selected.github_url)} target="_blank" rel="noreferrer" className="studio-text-link button-sm">View source <GithubLogo size={20} /></a>}</div></div></article>}</dialog>
  </div>;
}
