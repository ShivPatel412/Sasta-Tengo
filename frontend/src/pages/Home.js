import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import AnimatedBorderButton from '../components/AnimatedBorderButton';
import NeumorphicButton from '../components/NeumorphicButton';
import SplitText from '../components/SplitText';
import TextGenerateEffect from '../components/TextGenerateEffect';
import Loader from '../components/Loader';
import Footer from '../components/Footer';
import LightRays from '../component/LightRays';
import LaserFlow from '../component/LaserFlow';
import TerminalForm from '../components/TerminalForm';
import ExperienceSection from '../components/ExperienceSection';
import PortfolioFinder from '../components/portfolio/PortfolioFinder';
import '../styles/Home.css';
import '../styles/TextGenerateEffect.css';

const ServiceIcon = ({ title }) => {
  const paths = title === 'Website Design'
    ? <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.2 2.2 13.8 0 16M12 4c-2.2 2.2-2.2 13.8 0 16" /></>
    : title === 'Software Development'
      ? <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></>
      : <><circle cx="12" cy="12" r="8" /><path d="m15 9-2 5-5 2 2-5 5-2Z" /></>;

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>;
};

const defaultServices = [
  { id: 1, title: 'Website Design', description: 'A responsive, modern website that makes your business look professional and easy to trust.' },
  { id: 2, title: 'Software Development', description: 'Practical web applications, dashboards, and custom tools built around your workflow.' },
  { id: 3, title: 'Digital Strategy', description: 'A focused planning session to turn your idea into a clear website or software roadmap.' }
];

const Home = () => {
  const [services, setServices] = useState(defaultServices);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const revealImgRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const refreshProjects = () => api.get('/v1/projects')
      .then(response => setProjects(response.data))
      .catch(error => console.error('Error refreshing projects:', error));

    window.addEventListener('focus', refreshProjects);
    return () => window.removeEventListener('focus', refreshProjects);
  }, []);

  useLayoutEffect(() => {
    // Prevent browser scroll restoration from jumping to the end
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Remove any hash that might force scroll to a section
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    scrollToTop();
    requestAnimationFrame(scrollToTop);
    setTimeout(scrollToTop, 50);
    window.addEventListener("load", scrollToTop);
    window.addEventListener("pageshow", scrollToTop);

    return () => {
      window.removeEventListener("load", scrollToTop);
      window.removeEventListener("pageshow", scrollToTop);
    };
  }, []);

  const fetchData = async () => {
    // Set a maximum loading time of 5000ms (5 seconds)
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2500));
    
    const [servicesRes, projectsRes] = await Promise.allSettled([api.get('/v1/services'), api.get('/v1/projects')]);

    if (servicesRes.status === 'fulfilled' && servicesRes.value.data.length) setServices(servicesRes.value.data);
    if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data);
    if (servicesRes.status === 'rejected') console.error('Error fetching services:', servicesRes.reason);
    if (projectsRes.status === 'rejected') console.error('Error fetching projects:', projectsRes.reason);

    await minLoadingTime;
    setLoading(false);
  };

  const handleContactSubmit = async (formData) => {
    try {
      const payload = {
        name: formData.name?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.mobile?.trim() || '',
        subject: formData.subject?.trim() || 'General Inquiry',
        message: formData.message?.trim() || ''
      };

      await api.post('/v1/contacts', payload);

      console.log('Message sent successfully!', payload);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <Header />
      <div className="home">
        {/* Hero Section */}
        <section id="hero" className="hero">
        <div 
          style={{ 
            position: 'absolute',
            top: isMobile ? -200 : -340,
            left: isMobile ? -50 : -100,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: 0
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const el = revealImgRef.current;
            if (el) {
              el.style.setProperty('--mx', `${x}px`);
              el.style.setProperty('--my', `${y + rect.height * 0.5}px`);
            }
          }}
          onMouseLeave={() => {
            const el = revealImgRef.current;
            if (el) {
              el.style.setProperty('--mx', '-9999px');
              el.style.setProperty('--my', '-9999px');
            }
          }}
        >
          <LaserFlow 
            selectedExample="basic"
            horizontalSizing={isMobile ? 0.3 : 0.6}
            verticalSizing={isMobile ? 15 : 25}
            wispDensity={isMobile ? 2 : 5}
            wispSpeed={isMobile ? 10 : 20}
            wispIntensity={isMobile ? 5 : 10}
            flowSpeed={1.32}
            flowStrength={0.07}
            fogIntensity={isMobile ? 0.05 : 0.01}
            fogScale={1}
            fogFallSpeed={0.57}
            decay={1.34}
            falloffStart={0.9}
            mouseTiltStrength={isMobile ? 5 : 10.02}
            mouseSmoothTime={10.1}
          />
          
          <img
            ref={revealImgRef}
            src="/Boy.jpg"
            alt="Reveal effect"
            style={{
              position: 'absolute',
              width: '100%',
              top: '-50%',
              zIndex: 5,
              mixBlendMode: 'lighten',
              opacity: 0.3,
              pointerEvents: 'none',
              '--mx': '-9999px',
              '--my': '-9999px',
              WebkitMaskImage: 'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.6) 120px, rgba(255,255,255,0.25) 180px, rgba(255,255,255,0) 240px)',
              maskImage: 'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.6) 120px, rgba(255,255,255,0.25) 180px, rgba(255,255,255,0) 240px)',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat'
            }}
          />
        </div>
        {/* <SplineScene scene="https://prod.spline.design/sStWXVF-OFW3bMVX/scene.splinecode" /> */}
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="hero-box-container">
            <div className="hero-box">
              <div className="hero-content">
                <div className="hero-left">
                  <div className="availability-badge">
                    <span className="availability-dot"></span>
                    Available for freelance work
                  </div>
                  <h1>
                    <TextGenerateEffect
                      words="Hi, I'm Shiv Patel"
                      className="gradient-text"
                    />
                  </h1>
                  <h2 className="hero-subtitle">
                    <SplitText
                      text="Full Stack Developer"
                      animationType="slide"
                    />
                  </h2>
                  <p className="hero-description">
                    I create beautiful, functional, and user-centered digital experiences. With 3+ years of experience in web development, I bring ideas to life through clean code and thoughtful design.
                  </p>
                  <div className="hero-info">
                    <div className="hero-info-item">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>Ahmedabad, India</span>
                    </div>
                    <div className="hero-info-item">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span>Available Now</span>
                    </div>
                  </div>
                  <div className="hero-buttons">
                    <AnimatedBorderButton
                      text="Hire Me"
                      href="#contact"
                      variant="light"
                    />
                    <AnimatedBorderButton
                      text="Download CV"
                      href="/cv.pdf"
                      variant="light"
                    />
                  </div>
                  <div className="hero-social">
                    <span className="follow-text">Follow me:</span>
                    <div className="hero-social-links">
                      <a href="https://github.com/ShivPatel412" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </a>
                      <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
                        </svg>
                      </a>
                      <a href="https://linkedin.com/in/shivpatel412" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>
                      <a href="https://instagram.com/shiv_patel_412" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="hero-right">
                  <div className="hero-image-wrapper">
                    <img src="/Boy.jpg" alt="Shiv Patel" className="hero-image" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <LightRays />
        <div className="container">
          <h2>About Me</h2>
          <div className="about-content">
            <div className="about-text">
              <p>
                I am Shiv Patel, popularly known as Sasta Tengo, a computer science student exploring diverse fields of technology - from software and web development to building innovative solutions. My goal is to continuously grow my skills and expand my horizons.
              </p>
              <h3>Skills & Technologies</h3>
              <div className="skills-grid">
                <span className="skill-tag">HTML5</span>
                <span className="skill-tag">CSS3</span>
                <span className="skill-tag">JavaScript</span>
                <span className="skill-tag">React</span>
                <span className="skill-tag">Node.js</span>
                <span className="skill-tag">PHP</span>
                <span className="skill-tag">Laravel</span>
                <span className="skill-tag">MySQL</span>
                <span className="skill-tag">Python</span>
                <span className="skill-tag">Git</span>
                <span className="skill-tag">UI/UX</span>
              </div>
              <div style={{ marginTop: '30px' }}>
                <NeumorphicButton
                  text="View My GitHub"
                  onClick={() => window.open('https://github.com/ShivPatel412', '_blank')}
                />
              </div>
            </div>
            <div className="about-code">
              <div className="code-block">
                <pre><code>{`const developer = {
  name: 'Shiv Patel (Sasta Tengo)',
  role: 'Full Stack Developer',
  location: 'Ahmedabad, India',
  passion: 'Creating innovative
            web solutions and
            exploring new tech'
};`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
     
      <ExperienceSection />

      <PortfolioFinder projects={projects} />

      {/* Services Section */}
      <section id="services" className="services">
        <div className="container">
          <header className="services-intro">
          
            <h2>Services</h2>
           
          </header>
          <div className="services-scroll">
            {services.map((service) => (
              <article key={service.id} className="service-card">
                <div className="service-icon"><ServiceIcon title={service.title} /></div>
                <h3>{service.title}</h3>
                <p className="service-description">{service.description}</p>
                <div className="service-meta">
                  <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10M7 12h6M7 17h10M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></svg>₹{service.price}</span>
                  <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>{service.duration} min</span>
                </div>
                <Link className="service-book-button" to={`/booking?service=${service.id}`}>Book Now <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="cta">
        <div className="container">
          <div className="cta-content">
            <p className="cta-label">GET A PERSONALIZED DEMO</p>
            <h2>Ready to see the Giga<br />AI agent in action?</h2>
            <p className="cta-description">Start scaling your customer support with powerful AI.</p>
            <Link to="/booking" className="btn btn-cta">Talk to us</Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <p className="contact-label">CONTACT</p>
          <h2>Get in Touch with Us</h2>
          <div className="contact-wrapper">
            <div className="contact-left">
              <p className="contact-description">
                I'm always open to discuss exciting projects and new opportunities. Let's collaborate!
              </p>
              <div className="contact-details">
                <div className="contact-detail-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  <span  href="mailto:admin@shivpatel412.com">admin@shivpatel412.com</span>
                </div>
                <div className="contact-detail-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  <span href="tel:+916351149722">+91 6351149722</span>
                </div>
                <div className="contact-detail-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span>Gujarat, India</span>
                </div>
              </div>
              <div className="contact-social">
                <a href="https://instagram.com/shiv_patel_412" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://github.com/ShivPatel412" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/in/shivpatel412" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="https://wa.me/916351149722" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="contact-right">
              <TerminalForm onSubmit={handleContactSubmit} />
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
};

export default Home;
