import React, { useEffect, useMemo, useState } from 'react';
import { Folder, Grid2X2, List, Search, X, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import './portfolio.css';
import './folderImage.css';

const FolderArt = () => <img className="pf-folder" src="/project-folder.png" alt="" aria-hidden="true" />;

export default function PortfolioFinder({ projects }) {
  const [category, setCategory] = useState('All Projects');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const categories = useMemo(() => ['All Projects', ...new Set(projects.map(project => project.category || 'Other'))], [projects]);
  const counts = useMemo(() => Object.fromEntries(categories.map(name => [name, name === 'All Projects' ? projects.length : projects.filter(project => (project.category || 'Other') === name).length])), [categories, projects]);
  const visible = useMemo(() => { const term = query.trim().toLowerCase(); return projects.filter(project => (category === 'All Projects' || (project.category || 'Other') === category) && (!term || [project.title, project.category, ...(project.technologies || [])].some(value => value?.toLowerCase().includes(term)))); }, [category, query, projects]);

  useEffect(() => { const keys = event => {
    if (event.key === 'Escape') activeImage !== null ? setActiveImage(null) : galleryOpen ? setGalleryOpen(false) : setSelected(null);
    if (activeImage !== null && event.key === 'ArrowLeft') setActiveImage((activeImage - 1 + selected.gallery_urls.length) % selected.gallery_urls.length);
    if (activeImage !== null && event.key === 'ArrowRight') setActiveImage((activeImage + 1) % selected.gallery_urls.length);
  }; window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys); }, [activeImage, galleryOpen, selected]);
  const chooseCategory = name => { setCategory(name); setSelected(null); setGalleryOpen(false); };
  const move = direction => { const index = visible.findIndex(p => p.id === selected.id); setSelected(visible[(index + direction + visible.length) % visible.length]); };

  return <section id="projects" className="portfolio-section" aria-labelledby="portfolio-heading">
    <div className="container">
      <header className="portfolio-intro"><h2 id="portfolio-heading">Explore My Projects</h2></header>
      <div className="portfolio-finder">
        <header className="finder-header"><div className="window-controls" aria-hidden="true"><i /><i /><i /></div><div className="finder-title"><strong>{category}</strong><span>{visible.length} project{visible.length === 1 ? '' : 's'}</span></div><div className="finder-tools"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2X2 /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}><List /></button></div></header>
        <div className="finder-body">
          <aside className="portfolio-sidebar" aria-label="Project categories"><h3>Portfolio</h3><p>Projects &amp; Case Studies</p><label className="portfolio-search"><Search /><span className="sr-only">Search projects</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects" /></label><nav>{categories.map(name => <button key={name} className={category === name ? 'active' : ''} onClick={() => chooseCategory(name)}><Folder /><span>{name}</span><small>{counts[name]}</small></button>)}</nav></aside>
          <main className="finder-content"><div className="mobile-categories"><select aria-label="Project category" value={category} onChange={e => chooseCategory(e.target.value)}>{categories.map(name => <option key={name}>{name}</option>)}</select><label className="portfolio-search"><Search /><input aria-label="Search projects" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects" /></label></div>
            {visible.length ? <div className={`project-browser ${view}`}>{visible.map(project => <button key={project.id} className="portfolio-project" onClick={() => setSelected(project)} aria-label={`Open ${project.title}`}><FolderArt /><span className="project-copy"><strong>{project.title}</strong></span></button>)}</div> : <div className="portfolio-empty"><Folder /><h3>No projects found in this category.</h3><button onClick={() => { chooseCategory('All Projects'); setQuery(''); }}>View All Projects</button></div>}
          </main>
        </div>
      </div>
    </div>
    {selected && <div className="project-preview-backdrop" onMouseDown={e => e.target === e.currentTarget && setSelected(null)}><article className="project-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title"><button className="preview-close" onClick={() => setSelected(null)} aria-label="Close project preview"><X /></button><div className="preview-visual"><img src={selected.poster_url || `/${selected.image}`} alt={`${selected.title} poster`} loading="lazy" /></div><div className="preview-content"><p>{selected.category || 'Other'}</p><h3 id="preview-title">{selected.title}</h3><p className="preview-description">{selected.description}</p><h4>Technologies</h4><div className="preview-chips">{(selected.technologies || []).map(item => <span key={item}>{item}</span>)}</div><div className="preview-actions">{selected.live_url && <a href={selected.live_url} target="_blank" rel="noreferrer">View Live Website <ExternalLink /></a>}{selected.github_url && <a className="secondary" href={selected.github_url} target="_blank" rel="noreferrer">View on GitHub</a>}{selected.gallery_urls?.length > 0 && <button type="button" onClick={() => setGalleryOpen(true)}>View Gallery</button>}</div>{visible.length > 1 && <div className="preview-nav"><button onClick={() => move(-1)}><ArrowLeft /> Previous</button><button onClick={() => move(1)}>Next <ArrowRight /></button></div>}</div></article></div>}
    {galleryOpen && selected && <div className="gallery-backdrop" onMouseDown={e => e.target === e.currentTarget && setGalleryOpen(false)}><section className="project-gallery" role="dialog" aria-modal="true" aria-labelledby="gallery-title"><header><h3 id="gallery-title">{selected.title} Gallery</h3><button onClick={() => setGalleryOpen(false)} aria-label="Close gallery"><X /></button></header><div>{selected.gallery_urls.map((image, index) => <button key={image} onClick={() => setActiveImage(index)} aria-label={`Open image ${index + 1}`}><img src={image} alt={`${selected.title} gallery ${index + 1}`} loading="lazy" /></button>)}</div></section></div>}
    {activeImage !== null && selected && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${selected.title} full-screen gallery`}><button className="lightbox-close" onClick={() => setActiveImage(null)} aria-label="Close full-screen image"><X /></button><button className="lightbox-arrow previous" onClick={() => setActiveImage((activeImage - 1 + selected.gallery_urls.length) % selected.gallery_urls.length)} aria-label="Previous image"><ArrowLeft /></button><img className="lightbox-main" src={selected.gallery_urls[activeImage]} alt={`${selected.title} gallery ${activeImage + 1}`} /><button className="lightbox-arrow next" onClick={() => setActiveImage((activeImage + 1) % selected.gallery_urls.length)} aria-label="Next image"><ArrowRight /></button><div className="lightbox-thumbnails" aria-label="Gallery thumbnails">{selected.gallery_urls.map((image, index) => <button key={image} className={index === activeImage ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`}><img src={image} alt="" /></button>)}</div></div>}
  </section>;
}
