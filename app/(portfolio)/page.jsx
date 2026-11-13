import Home from '../../components/site/pages/Home';
export const metadata = {
  title: 'Shiv Patel | Freelance Web & Software Developer',
  description: 'Work with Shiv Patel to build responsive websites, web applications, and custom software for your business. Explore projects and discuss your next idea.',
  alternates: { canonical: 'https://www.shivpatel.in' },
  openGraph: {
    type: 'website',
    url: 'https://www.shivpatel.in',
    siteName: 'Shiv Patel — Sasta Tengo',
    title: 'Shiv Patel | Freelance Web & Software Developer',
    description: 'Work with Shiv Patel to build responsive websites, web applications, and custom software for your business. Explore projects and discuss your next idea.',
    locale: 'en_IN'
  },
  twitter: {
    card: 'summary',
    title: 'Shiv Patel | Freelance Web & Software Developer',
    description: 'Work with Shiv Patel to build responsive websites, web applications, and custom software for your business. Explore projects and discuss your next idea.'
  }
};
export default function Page(){return <Home/>;}
