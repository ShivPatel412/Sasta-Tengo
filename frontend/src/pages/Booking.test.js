import { getStepErrors } from './bookingValidation';

test('project details require both a type and description', () => {
  const errors = getStepErrors(2, {
    projectType: 'Portfolio',
    description: '   '
  });

  expect(errors).toEqual({
    description: 'Please describe your project.'
  });
});
