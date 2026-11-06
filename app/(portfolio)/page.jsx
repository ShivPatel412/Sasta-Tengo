import Home from '../../components/site/pages/Home';
import './studio.css';
export const metadata = {
  title: 'Shiv Patel | Websites, software & automation',
  description: 'Thoughtful websites, custom applications and practical AI automations by Shiv Patel. Explore selected work and start your next project.',
  alternates: { canonical: 'https://shivpatel.in' },
  openGraph: { title: 'Shiv Patel | Developer & creative thinker', description: 'From a spark to something people use. Websites, software and connected automations.', url: 'https://shivpatel.in', type: 'website', images: [{ url: 'https://shivpatel.in/models/robot-poster.png', width: 640, height: 640, alt: 'Shiv Patel’s robot studio companion' }] },
};
export default function Page(){return <Home/>;}
