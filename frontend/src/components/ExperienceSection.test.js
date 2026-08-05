import { fireEvent, render, screen } from '@testing-library/react';
import ExperienceSection from './ExperienceSection';

test('shows the position before the current date and a present status dot', () => {
  window.matchMedia = () => ({ matches: false });
  render(<ExperienceSection />);
  const currentStep = screen.getByRole('button', { name: /Web Developer Jan 2023.*Present/i });
  expect(currentStep.querySelector('strong')).toHaveTextContent('Web Developer');
  expect(screen.getByLabelText('Present')).toHaveClass('experience-current-dot');
  expect(screen.getByRole('link', { name: 'Bugle Technologies' })).toHaveAttribute('href', 'https://bugle.in/');

  fireEvent.click(screen.getByRole('button', { name: /Web Developer May 2022/i }));
  expect(screen.getByRole('link', { name: 'Genz Miner' })).toHaveAttribute('href', 'https://www.saifeeinfotech.com/');

  fireEvent.click(screen.getByRole('button', { name: /Junior Web Developer Jan 2022/i }));
  expect(screen.getByRole('link', { name: 'Kalpataru Innovation' })).toHaveAttribute('href', 'https://www.kalpataruinnovation.com/');
});
