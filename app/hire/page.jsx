import HireForm from './project-form';
import Tagline from './tagline';
import './hire.css';

export const metadata = {
  title: 'Websites, software & n8n automation | Shiv Patel',
  description: 'Work directly with Shiv Patel, a freelance developer for website design, web development, custom software, and n8n workflow automation. Tell me about your project.',
  robots: { index: false, follow: true },
  icons: { icon: '/favicon.ico' },
  openGraph: { title: 'Your next idea. Built with Shiv.', description: 'Website design, web development, custom software, and n8n automation. One developer, from first conversation to launch.', url: 'https://www.shivpatel.in/hire', images: [{ url: 'https://www.shivpatel.in/Boy.jpg', alt: 'Shiv Patel, freelance developer' }] }
};

const services = [
  ['01', 'Website design', 'Make the right first impression.', 'Thoughtful layouts, clear messaging, and a visual identity that feels like your business.', ['Business websites', 'Landing pages', 'Website redesigns']],
  ['02', 'Web development', 'Turn a good design into a working website.', 'Responsive websites built to help people explore your business and get in touch, on any screen.', ['Responsive development', 'Forms & integrations', 'Website launches']],
  ['03', 'Custom software', 'Make your everyday work simpler.', 'Practical applications built around the way you work, rather than making you work around a tool.', ['Business dashboards', 'Web applications', 'Workflow tools']],
  ['04', 'n8n workflows & automation', 'Let your tools handle the repetitive work.', 'Connect your apps with n8n workflows that move data, route enquiries, and automate recurring tasks around your business.', ['n8n workflows', 'App integrations', 'Business automation']]
];
const faqs = [
  ['How much will my project cost?', 'The quote depends on your pages, features, and integrations. Share your idea through the form and I will discuss the scope and pricing with you before work starts.'],
  ['How long does a project take?', 'Timing depends on the scope and how ready your content is. We will agree on a realistic schedule and milestones before starting.'],
  ['Can you redesign my existing website?', 'Yes. Include your current website address and what you want to improve in your enquiry. We can discuss design changes, development, or both.'],
  ['Can you build software for my business?', 'Yes. I build custom web applications, dashboards, and business tools. Tell me about the task you want to simplify and any systems it needs to connect to.'],
  ['Can you automate my business workflows?', 'Yes. I build n8n workflows to connect apps and automate tasks such as routing enquiries, syncing data, and sending notifications. Tell me which tools you use and what you currently do manually.'],
  ['Can we work together remotely?', 'Yes. We can discuss requirements, review designs, and share project updates remotely. You work directly with me throughout the project.'],
  ['What do you need to get started?', 'A short description of your idea is enough for our first conversation. If you have a website, references, budget, or a target date, include those too.']
];

export default function HirePage() {
  return <div className="hire-page">
    <a className="hire-skip" href="#main-content">Skip to content</a>
    <header className="hire-header">
      <a href="/hire" className="hire-brand title-2" aria-label="Shiv Patel landing page" aria-current="page"><span className="hire-monogram">s<span>.</span></span>shiv patel<span className="hire-brand-caption caption-4">Independent developer</span></a>
      <nav aria-label="Page navigation"><a className="title-4" href="#services">What I do</a><a className="title-4" href="#approach">The approach</a><a className="hire-button hire-button-small button-sm" href="#project">Let’s talk <span aria-hidden="true">↗</span></a></nav>
    </header>
    <main id="main-content">
      <section className="hire-hero hire-container" aria-labelledby="hero-title">
        <div className="hire-hero-copy">
          <p className="hire-eyebrow caption-3"><span className="hire-dot"/> YOUR IDEA. MY NEXT BUILD.</p>
          <h1 className="heading-1" id="hero-title">A better website.<br/>A smarter business.</h1>
          <p className="hire-intro body-3">I’m Shiv, a freelance developer turning ideas into thoughtful websites, practical software, and n8n automations. From the first sketch to the final launch, you work directly with me.</p>
          <a className="hire-button button-md" href="#project">Discuss my project <span aria-hidden="true">↗</span></a>
          <p className="hire-hero-note caption-2">Website design <span>·</span> Web development <span>·</span> Custom software <span>·</span> n8n automation</p>
          <div className="hire-person-proof"><img src="/Boy.jpg" alt="" width="48" height="48"/><p className="caption-2"><strong className="title-4">A person behind every pixel.</strong><br/>Direct conversations. Thoughtful execution.</p></div>
        </div>
        <div className="hire-hero-art" aria-label="Shiv Patel and an illustrative website design">
          <div className="hire-art-label caption-3"><span>DESIGNED WITH PURPOSE</span><span>BUILT BY SHIV ↗</span></div>
          <div className="hire-browser"><div className="hire-browser-bar"><span>● ● ●</span><span className="caption-5">your next website</span><span>↗</span></div><div className="hire-demo"><div className="hire-demo-nav caption-3"><strong>your brand.</strong><span>Make it yours ↗</span></div><span className="hire-demo-kicker caption-4">A SMALL IDEA. A BIG POSSIBILITY.</span><h2 className="heading-3">Good things<br/>start here<span>.</span></h2><div className="hire-demo-bottom"><span className="caption-3">Made for your business ↗</span><div className="hire-shape" aria-hidden="true"><div/><div/><div/></div></div></div></div>
          <div className="hire-developer-card"><img src="/Boy.jpg" alt="Shiv Patel" width="112" height="128"/><div><p className="caption-3">THE DEVELOPER BEHIND YOUR IDEA</p><h2 className="heading-5">Hey, I’m Shiv <span aria-hidden="true">↗</span></h2><p className="body-6">Designer’s eye.<br/>Developer’s mindset.</p></div></div>
          <p className="hire-art-foot caption-4">A little design. A lot of possibility.<span>Concept preview / 01</span></p>
        </div>
      </section>
      <div className="hire-service-strip caption-3" aria-label="Services"><span>THOUGHTFUL DESIGN</span><span aria-hidden="true">✳</span><span>RELIABLE DEVELOPMENT</span><span aria-hidden="true">✳</span><span>SOFTWARE THAT FITS</span><span aria-hidden="true">✳</span><span>n8n WORKFLOW AUTOMATION</span></div>
      <section className="hire-container hire-section" id="services" aria-labelledby="services-title"><div className="hire-section-heading"><div><p className="hire-eyebrow caption-3">01 / WHAT I CAN HELP WITH</p><h2 className="heading-2" id="services-title">Built for what<br/>comes next.</h2></div><p className="body-3">Starting something new or improving what you have? Let’s build the right thing for your business.</p></div><div className="hire-services">{services.map(([number, title, benefit, description, tags]) => <article className="hire-service" key={number}><div className="hire-service-top"><span className="caption-4">/{number}</span><span aria-hidden="true">↗</span></div><h3 className="heading-5">{title}</h3><p className="title-3">{benefit}</p><p className="body-6">{description}</p><ul>{tags.map(tag => <li className="caption-4" key={tag}>{tag}</li>)}</ul></article>)}</div></section>
      <Tagline/>
      <section className="hire-container hire-section hire-about" id="approach" aria-labelledby="approach-title"><div className="hire-about-image"><img src="/Boy.jpg" alt="Shiv Patel, your freelance design and development partner" width="600" height="700" loading="lazy"/><span className="caption-3">SHIV PATEL / FREELANCE DEVELOPER</span></div><div><p className="hire-eyebrow caption-3">02 / A MORE PERSONAL APPROACH</p><h2 className="heading-2" id="approach-title">Your project.<br/>My full attention.</h2><p className="body-3">Great work starts with understanding what you need. I bring design and development together, so the person who understands your idea is also the person building it.</p><div className="hire-approach-list">{[['01', 'We talk about your idea', 'Your business, your goals, and what a successful project looks like.'], ['02', 'We define the right build', 'A clear scope, design direction, and agreed milestones before development.'], ['03', 'I build. We review. We launch.', 'You see the progress, share feedback, and get a project ready for its next chapter.']].map(([n, title, text]) => <div key={n}><span className="caption-3">{n}</span><div><h3 className="title-2">{title}</h3><p className="body-6">{text}</p></div></div>)}</div><a className="hire-text-link button-md" href="/#projects">Explore my portfolio <span aria-hidden="true">↗</span></a></div></section>
      <section className="hire-container hire-section hire-faq" aria-labelledby="faq-title"><div><p className="hire-eyebrow caption-3">03 / BEFORE WE START</p><h2 className="heading-2" id="faq-title">A little clarity,<br/>before the code.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary className="title-3">{q}<span aria-hidden="true">+</span></summary><p className="body-6">{a}</p></details>)}</div></section>
      <section className="hire-contact" id="project" aria-labelledby="project-title"><div className="hire-container hire-contact-grid"><div><p className="hire-eyebrow caption-3">04 / LET’S MAKE IT HAPPEN</p><h2 className="heading-2" id="project-title">Have an idea?<br/>Let’s give it <br/>a place to grow.</h2><p className="body-3">Tell me a little about your project. I’ll review your requirements and get back to you to discuss the next step.</p><div className="hire-contact-person"><img src="/Boy.jpg" alt="" width="48" height="48"/><p className="caption-2"><strong className="title-3">Straight to Shiv.</strong><br/>Your enquiry comes directly to me.</p></div><div className="hire-contact-links"><a className="hire-text-link title-4" href="mailto:info@shivpatel.in">Prefer email? info@shivpatel.in ↗</a><a className="hire-text-link title-4" href="tel:+916351149722">Call me: +91 63511 49722 ↗</a></div></div><HireForm/></div></section>
    </main>
    <footer className="hire-container hire-footer"><p className="title-3">shiv patel<span>.</span></p><p className="caption-2">© {new Date().getFullYear()} Shiv Patel</p><div><a className="caption-2" href="#privacy">Privacy</a><a className="caption-2" href="#terms">Project terms</a><a className="caption-2" href="/">Main portfolio ↗</a></div><details id="privacy"><summary className="caption-4">Privacy information</summary><p className="body-6">Your name, email, phone number, and project details are sent to Shiv Patel’s existing website enquiry system to respond to your request. Please do not include passwords or sensitive information. To request removal of your enquiry, email info@shivpatel.in.</p></details><details id="terms"><summary className="caption-4">Project enquiry terms</summary><p className="body-6">Sending an enquiry does not create a project agreement or payment obligation. Scope, pricing, timeline, and support are agreed separately before work begins.</p></details></footer>
  </div>;
}
