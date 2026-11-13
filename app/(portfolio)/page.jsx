import Home from '../../components/site/pages/Home';
export const metadata = {
  title: 'Freelance Web Developer in Gujarat | Shiv Patel',
  description: 'Need a website or custom software in Gujarat? Work with Shiv Patel, a freelance developer in Ahmedabad, for business websites, web apps, and dashboards.',
  alternates: { canonical: 'https://www.shivpatel.in' },
  openGraph: {
    type: 'website',
    url: 'https://www.shivpatel.in',
    siteName: 'Shiv Patel — Sasta Tengo',
    title: 'Freelance Web & Software Developer in Gujarat | Shiv Patel',
    description: 'Responsive business websites, web applications, and custom software. Work directly with an Ahmedabad-based freelance developer serving Gujarat.',
    locale: 'en_IN'
  },
  twitter: {
    card: 'summary',
    title: 'Freelance Web Developer in Gujarat | Shiv Patel',
    description: 'Business websites, web apps, and custom software from Shiv Patel, a freelance developer based in Ahmedabad, Gujarat.'
  }
};
export default function Page(){return <Home/>;}
