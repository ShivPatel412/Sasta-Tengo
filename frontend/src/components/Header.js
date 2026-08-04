import React, { useState, useEffect, useRef } from 'react';
import '../styles/Header.css';

const navItems = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' }
];

const Header = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const closeRef = useRef(null);
  const itemRefs = useRef([]);

  const scrollToSection = (sectionId, index) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = `/#${sectionId}`;
      return;
    }
    setActiveIndex(index);
    setMenuOpen(false);
  };

  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = itemRefs.current[activeIndex];
      const nav = navRef.current;
      
      if (activeButton && nav) {
        const buttonRect = activeButton.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        
        const left = buttonRect.left - navRect.left;
        const width = buttonRect.width;
        const height = buttonRect.height;
        
        nav.style.setProperty('--indicator-left', `${left}px`);
        nav.style.setProperty('--indicator-width', `${width}px`);
        nav.style.setProperty('--indicator-height', `${height}px`);
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeIndex]);

  useEffect(() => {
    const updateActiveSection = () => {
      const sections = navItems.map(item => document.getElementById(item.id)).filter(Boolean);
      let currentIndex = 0;

      sections.forEach((section, index) => {
        if (section.getBoundingClientRect().top <= window.innerHeight / 2) {
          currentIndex = index;
        }
      });

      setActiveIndex(currentIndex);
    };

    window.addEventListener('scroll', updateActiveSection);
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === 'Escape' && setMenuOpen(false);

    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className="header">
      <button type="button" className="mobile-brand" onClick={() => scrollToSection('hero', 0)} aria-label="Go to home">SP</button>
      <button
        type="button"
        className={`menu-toggle ${menuOpen ? 'open' : ''}`}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen(open => !open)}
      >
        <span></span><span></span><span></span>
      </button>
      {menuOpen && <button type="button" className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu"></button>}
      <nav id="primary-navigation" className={`nav ${menuOpen ? 'open' : ''}`} ref={navRef} aria-label="Primary navigation">
        <div className="mobile-nav-header">
          <span>SP</span>
          <button ref={closeRef} type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu">×</button>
        </div>
        {navItems.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => (itemRefs.current[index] = el)}
            onClick={() => scrollToSection(item.id, index)}
            className={`nav-item ${activeIndex === index ? 'active' : ''}`}
            aria-current={activeIndex === index ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Header;
