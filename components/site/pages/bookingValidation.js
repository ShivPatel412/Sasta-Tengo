export const getStepErrors = (step, form) => {
  const errors = {};

  if (step === 1) {
    if (!form.service) errors.service = 'Please choose a service.';
    if (form.addSomethingElse && !form.otherService.trim()) errors.otherService = 'Please tell us what else you need.';
  }

  if (step === 2) {
    if (!form.projectType) errors.projectType = 'Please choose a project type.';
    if (!form.description.trim()) errors.description = 'Please describe your project.';
  }

  if (step === 4) {
    if (!form.budget) errors.budget = 'Please choose a budget.';
    if (!form.timeline) errors.timeline = 'Please choose a timeline.';
  }

  if (step === 5) {
    if (!form.fullName.trim()) errors.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address.';
    if (!/^\+?[0-9\s().-]{7,20}$/.test(form.phone.trim())) errors.phone = 'Please enter a valid international phone number.';
    if (!form.country.trim()) errors.country = 'Please enter your country.';
  }

  if (step === 6 && !form.confirmed) errors.confirmed = 'Please confirm that the information is correct.';

  return errors;
};

export const isStepComplete = (step, form) => Object.keys(getStepErrors(step, form)).length === 0;
