import {
  AppWindow, Brush, ChartNoAxesCombined, Gauge, HelpCircle, LayoutTemplate,
  MonitorSmartphone, Search, Settings, ShoppingCart
} from 'lucide-react';

export const steps = ['Service', 'Project', 'Requirements', 'Budget', 'Contact', 'Review'];

export const serviceOptions = [
  { label: 'Website Design', icon: LayoutTemplate },
  { label: 'Web Application Development', icon: AppWindow },
  { label: 'E-commerce Website', icon: ShoppingCart },
  { label: 'Graphic Design', icon: Brush },
  { label: 'SEO & Website Optimization', icon: Search },
  { label: 'Website Maintenance', icon: Settings },
  { label: 'Not Sure Yet', icon: HelpCircle }
];

export const projectTypes = [
  'Business Website', 'Landing Page', 'Portfolio', 'Web Application', 'CRM',
  'Management System', 'Dashboard', 'E-commerce Website', 'Graphic Design', 'Branding', 'Other'
];

export const featureOptions = [
  'Responsive Design', 'Admin Dashboard', 'Booking System',
  'User Login', 'API Integration', 'SEO Optimization', 'CMS', 'Animations',
  'Custom Design', 'Multi-language', 'Other'
];

export const assetOptions = [
  'Logo', 'Brand Guidelines', 'Content', 'Images', 'Domain', 'Hosting',
  'Existing Website', 'Nothing Yet'
];

export const budgetOptions = [
  'Under ₹20,000', '₹20,000 – ₹50,000', '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹2,00,000', '₹2,00,000+', 'Let’s Discuss'
];

export const timelineOptions = [
  'ASAP', 'Within 2 Weeks', '2–4 Weeks', '1–2 Months', '2+ Months', 'Flexible / Not Sure'
];

export const emptyForm = {
  service: '',
  addSomethingElse: false,
  otherService: '',
  projectType: '',
  description: '',
  existingUrl: '',
  inspirationUrls: '',
  features: [],
  assets: [],
  requirementsNotes: '',
  budget: '',
  timeline: '',
  fullName: '',
  company: '',
  email: '',
  phone: '',
  country: '',
  additionalMessage: '',
  confirmed: false
};

export const promoBenefits = [
  { title: 'Fast & Secure', description: 'Built with performance and security in mind.', icon: Gauge },
  { title: 'Scalable Solutions', description: 'Designed to grow with your business.', icon: ChartNoAxesCombined },
  { title: 'Expert Support', description: 'We’re with you at every step.', icon: MonitorSmartphone }
];
