import { render, screen } from '@testing-library/react';
import ExperienceSection from './ExperienceSection';

test('renders experience returned by the API', async () => {
  window.matchMedia = () => ({ matches: false });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      company: 'API Company',
      title: 'Web Developer',
      website: 'https://example.com',
      start_date: '2023-01-01',
      end_date: null,
      is_current: true,
      summary: 'API summary',
      description: 'API description',
      highlights: [],
      technologies: [],
    }],
  });

  render(<ExperienceSection />);

  expect(await screen.findByRole('link', { name: 'API Company' })).toHaveAttribute('href', 'https://example.com');
  expect(screen.getByText('API summary')).toBeInTheDocument();
});
