export const landingSubjectPrefix = 'Freelance landing page: ';
export const formSources = { contact: 'Contact form', service: 'Service form', landing: 'Landing page form' };
export function formSource(row) {
  return row.resource === 'appointments' || row.section === 'appointments' ? 'service'
    : String(row.subject || row.summary || '').startsWith(landingSubjectPrefix) ? 'landing' : 'contact';
}
