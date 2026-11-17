import api from '../components/site/services/api.js';
import { landingSubjectPrefix } from './form-sources.mjs';

export function submitHireInquiry(form) {
  const field = name => String(form.get(name) || '').trim();
  return api.post('/v1/contacts', {
    name: field('name'), email: field('email'), phone: field('phone'),
    subject: `${landingSubjectPrefix}${field('service')}`,
    message: field('message')
  });
}
