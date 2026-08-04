import { render, screen } from '@testing-library/react';
import ExperienceSection from './ExperienceSection';

test('shows the position before the current date and a present status dot', () => {
  window.matchMedia = () => ({ matches: false });
  render(<ExperienceSection />);
  const currentStep = screen.getByRole('button', { name: /Web Developer Jan 2023.*Present/i });
  expect(currentStep.querySelector('strong')).toHaveTextContent('Web Developer');
  expect(screen.getByLabelText('Present')).toHaveClass('experience-current-dot');
});
