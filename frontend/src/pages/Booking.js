import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BarChart3, Check, CircleCheckBig, Code2,
  BriefcaseBusiness, Camera, Mail, MapPin, MessageCircle, Pencil, Phone,
  Send, Sparkles
} from 'lucide-react';
import api from '../services/api';
import Footer from '../components/Footer';
import {
  assetOptions, budgetOptions, emptyForm, featureOptions,
  projectTypes, promoBenefits, serviceOptions, steps, timelineOptions
} from './bookingData';
import { getStepErrors } from './bookingValidation';
import '../styles/Booking.css';

const FieldError = ({ children }) => children
  ? <span className="booking-field-error" role="alert">{children}</span>
  : null;

const PromoPanel = () => (
  <aside className="booking-promo">
    <div className="promo-orbit one" aria-hidden="true" />
    <div className="promo-orbit two" aria-hidden="true" />
    <div className="booking-promo-content">
      <div className="promo-mark"><Code2 aria-hidden="true" /></div>
      <h1>Let’s Build<br /><span>Something Exceptional</span></h1>
      <p>High-performance websites, powerful applications and beautiful designs that grow your business.</p>
      <div className="promo-benefits">
        {promoBenefits.map(({ title, description, icon: Icon }) => (
          <div className="promo-benefit" key={title}>
            <span><Icon aria-hidden="true" /></span>
            <div><strong>{title}</strong><small>{description}</small></div>
          </div>
        ))}
      </div>
    </div>
    <div className="device-scene" aria-hidden="true">
      <div className="laptop">
        <div className="laptop-screen">
          <div className="mock-sidebar" />
          <div className="mock-dashboard">
            <i /><i /><i />
            <div className="mock-chart"><span /><span /><span /><span /><span /></div>
          </div>
        </div>
        <div className="laptop-base" />
      </div>
      <div className="phone">
        <div className="phone-notch" />
        <span /><strong /><i /><i /><i />
      </div>
      <div className="floating-stat"><BarChart3 /><span><strong>+38%</strong><small>Growth</small></span></div>
    </div>
  </aside>
);

const ContactPanel = () => (
  <aside className="booking-promo booking-contact-panel">
    <div className="contact-panel-content">
      <span className="contact-panel-eyebrow">LET’S CONNECT</span>
      <h1>Have a question?<br /><span>Reach out directly.</span></h1>
      <p>You can contact me before submitting your project inquiry.</p>

      <div className="contact-panel-list">
        <a href="mailto:admin@shivpatel412.com">
          <span><Mail aria-hidden="true" /></span>
          <div><strong>Email Me</strong><small>Send your questions anytime.</small><b>admin@shivpatel412.com →</b></div>
        </a>
        <a href="tel:+916351149722">
          <span><Phone aria-hidden="true" /></span>
          <div><strong>Call Me</strong><small>Let’s discuss your project requirements.</small><b>+91 6351149722 →</b></div>
        </a>
        <div className="contact-panel-item">
          <span><MapPin aria-hidden="true" /></span>
          <div><strong>Location</strong><small>Available for remote projects worldwide.</small><b>Gujarat, India</b></div>
        </div>
      </div>

      <div className="contact-panel-socials" aria-label="Social links">
        <a href="https://github.com/ShivPatel412" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Code2 /></a>
        <a href="https://linkedin.com/in/shivpatel412" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><BriefcaseBusiness /></a>
        <a href="https://instagram.com/shiv_patel_412" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Camera /></a>
        <a href="https://wa.me/916351149722" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
      </div>
    </div>
  </aside>
);

const ProgressStepper = ({ step, onStepChange }) => (
  <ol className="booking-progress" aria-label="Form progress">
    {steps.map((label, index) => {
      const number = index + 1;
      const complete = number < step;
      return (
        <li className={number === step ? 'active' : complete ? 'complete' : ''} key={label}>
          <button
            type="button"
            disabled={!complete}
            onClick={() => onStepChange(number)}
            aria-label={`${label}, step ${number}${complete ? ', completed' : number === step ? ', current' : ''}`}
            aria-current={number === step ? 'step' : undefined}
          >
            <span>{complete ? <Check aria-hidden="true" /> : number}</span>
            <small>{label}</small>
          </button>
        </li>
      );
    })}
  </ol>
);

const ChoiceGrid = ({ name, options, value, onChange, multiple = false, large = false, rows = false }) => (
  <div className={`booking-choice-grid${large ? ' large' : ''}${rows ? ' rows' : ''}`}>
    {options.map(option => {
      const label = typeof option === 'string' ? option : option.label;
      const Icon = typeof option === 'string' ? null : option.icon;
      const checked = multiple ? value.includes(label) : value === label;
      return (
        <label className={`booking-choice${checked ? ' selected' : ''}`} key={label}>
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={name}
            value={label}
            checked={checked}
            onChange={() => onChange(label)}
          />
          {Icon && <span className="booking-choice-icon"><Icon aria-hidden="true" /></span>}
          <strong>{label}</strong>
          <span className="choice-check"><Check aria-hidden="true" /></span>
        </label>
      );
    })}
  </div>
);

const ReviewSection = ({ title, step, children, onEdit, icon: Icon }) => (
  <section className="review-section">
    <div className="review-section-head">
      <span><Icon aria-hidden="true" /></span>
      <h3>{title}</h3>
      <button type="button" onClick={() => onEdit(step)}><Pencil aria-hidden="true" /> Edit</button>
    </div>
    <div className="review-section-body">{children}</div>
  </section>
);

const SuccessState = ({ onReset }) => (
  <div className="booking-success" role="status">
    <span><CircleCheckBig aria-hidden="true" /></span>
    <small>INQUIRY SENT</small>
    <h2>Thank you for your inquiry!</h2>
    <p>We’ve received your project details and will contact you shortly.</p>
    <button type="button" onClick={onReset}>Start Another Inquiry <ArrowRight aria-hidden="true" /></button>
  </div>
);

const Booking = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formTopRef = useRef(null);

  useEffect(() => {
    const serviceId = searchParams.get('service');
    if (!serviceId) return;
    api.get('/v1/services').then(response => {
      const selected = response.data.find(service => String(service.id) === serviceId);
      const serviceMap = {
        'Website Design': 'Website Design',
        'Software Development': 'Web Application Development',
        'Digital Strategy': 'Not Sure Yet'
      };
      if (selected && serviceMap[selected.title]) {
        setForm(current => ({ ...current, service: serviceMap[selected.title] }));
      }
    }).catch(() => {});
  }, [searchParams]);

  const scrollToForm = () => requestAnimationFrame(() => {
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const setField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setMessage('');
  };

  const toggleList = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter(item => item !== value)
        : [...current[field], value]
    }));
  };

  const goToStep = number => {
    setStep(number);
    setErrors({});
    setMessage('');
    scrollToForm();
  };

  const nextStep = () => {
    const nextErrors = getStepErrors(step, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage('Please review the highlighted fields.');
      return;
    }
    goToStep(Math.min(step + 1, 6));
  };

  const previousStep = () => goToStep(Math.max(step - 1, 1));

  const submitInquiry = async event => {
    event.preventDefault();
    const nextErrors = getStepErrors(6, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setMessage('');
    const details = [
      `Service: ${form.service}`,
      `Other service request: ${form.otherService || 'None'}`,
      `Project type: ${form.projectType}`,
      `Project description: ${form.description}`,
      `Existing website: ${form.existingUrl || 'None'}`,
      `Inspiration URLs: ${form.inspirationUrls || 'None'}`,
      `Features: ${form.features.join(', ') || 'None selected'}`,
      `Already has: ${form.assets.join(', ') || 'None selected'}`,
      `Additional requirements: ${form.requirementsNotes || 'None'}`,
      `Budget: ${form.budget}`,
      `Timeline: ${form.timeline}`,
      `Company: ${form.company || 'Not provided'}`,
      `Country: ${form.country}`,
      `Additional message: ${form.additionalMessage || 'None'}`
    ].join('\n');

    try {
      await api.post('/v1/contacts', {
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        subject: `Project inquiry: ${form.service}`,
        message: details
      });
      setSubmitted(true);
      scrollToForm();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not send your inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSubmitted(false);
    goToStep(1);
  };

  const stepContent = {
    1: {
      eyebrow: 'Step 1/6',
      title: 'What do you need help with?',
      description: 'Please choose the service that best matches your project.'
    },
    2: {
      eyebrow: 'Step 2/6',
      title: 'Tell us about your project',
      description: 'Share your goals, audience and project requirements.'
    },
    3: {
      eyebrow: 'Step 3/6',
      title: 'What features do you need?',
      description: 'Select all the features and integrations required for your project.'
    },
    4: {
      eyebrow: 'Step 4/6',
      title: 'What’s your budget and timeline?',
      description: 'This helps us recommend the right approach for your project.'
    },
    5: {
      eyebrow: 'Step 5/6',
      title: 'Almost there! Let’s connect',
      description: 'Please provide your details so we can get in touch.'
    },
    6: {
      eyebrow: 'Step 6/6',
      title: 'Review & Submit',
      description: 'Please review your information before submitting.'
    }
  };

  return (
    <>
      <Link className="booking-home-link" to="/" aria-label="Go to home page">SP</Link>
      <main className="booking-page">
        {step === 5 ? <ContactPanel /> : <PromoPanel />}
        <section className="booking-workspace" ref={formTopRef}>
          <div className="booking-shell">
            {!submitted && <ProgressStepper step={step} onStepChange={goToStep} />}
            {submitted ? <SuccessState onReset={resetForm} /> : (
              <form className="booking-form" onSubmit={submitInquiry} noValidate>
                <div className="booking-step" key={step}>
                  <header className="booking-step-header">
                    <span>{stepContent[step].eyebrow}</span>
                    <h2>{stepContent[step].title}</h2>
                    <p>{stepContent[step].description}</p>
                  </header>

                  {message && <p className="booking-message" role="alert">{message}</p>}

                  {step === 1 && (
                    <fieldset>
                      <legend className="sr-only">Choose a service</legend>
                      <ChoiceGrid name="service" options={serviceOptions} value={form.service} onChange={value => setField('service', value)} large />
                      <FieldError>{errors.service}</FieldError>
                      <label className="booking-inline-check">
                        <input type="checkbox" checked={form.addSomethingElse} onChange={event => setField('addSomethingElse', event.target.checked)} />
                        <span>I want to add something else</span>
                      </label>
                      {form.addSomethingElse && (
                        <label className="booking-field">
                          <span>Tell us what else you need</span>
                          <textarea value={form.otherService} onChange={event => setField('otherService', event.target.value)} />
                          <FieldError>{errors.otherService}</FieldError>
                        </label>
                      )}
                    </fieldset>
                  )}

                  {step === 2 && (
                    <fieldset>
                      <legend className="sr-only">Project details</legend>
                      <div className="booking-fields">
                        <label className="booking-field">
                          <span>Project Type *</span>
                          <select value={form.projectType} onChange={event => setField('projectType', event.target.value)}>
                            <option value="">Choose a project type</option>
                            {projectTypes.map(type => <option key={type}>{type}</option>)}
                          </select>
                          <FieldError>{errors.projectType}</FieldError>
                        </label>
                        <label className="booking-field full">
                          <span>Project Description *</span>
                          <textarea maxLength="1200" value={form.description} onChange={event => setField('description', event.target.value)} placeholder="Tell me about your project, goals, features, target audience, or share any inspiration." />
                          <small className="character-count">{form.description.length}/1200</small>
                          <FieldError>{errors.description}</FieldError>
                        </label>
                        <label className="booking-field">
                          <span>Existing Website URL <small>(Optional)</small></span>
                          <input type="url" value={form.existingUrl} onChange={event => setField('existingUrl', event.target.value)} />
                        </label>
                        <label className="booking-field">
                          <span>Inspiration or Reference URLs <small>(Optional)</small></span>
                          <input value={form.inspirationUrls} onChange={event => setField('inspirationUrls', event.target.value)} />
                        </label>
                      </div>
                    </fieldset>
                  )}

                  {step === 3 && (
                    <fieldset>
                      <legend className="sr-only">Project requirements</legend>
                      <ChoiceGrid name="features" options={featureOptions} value={form.features} onChange={value => toggleList('features', value)} multiple />
                      <h3 className="booking-subheading">Do you already have?</h3>
                      <ChoiceGrid name="assets" options={assetOptions} value={form.assets} onChange={value => toggleList('assets', value)} multiple />
                      <label className="booking-field">
                        <span>Additional requirements <small>(Optional)</small></span>
                        <textarea value={form.requirementsNotes} onChange={event => setField('requirementsNotes', event.target.value)} />
                      </label>
                    </fieldset>
                  )}

                  {step === 4 && (
                    <fieldset>
                      <legend className="sr-only">Budget and timeline</legend>
                      <h3 className="booking-subheading first">Budget</h3>
                      <ChoiceGrid name="budget" options={budgetOptions} value={form.budget} onChange={value => setField('budget', value)} rows />
                      <FieldError>{errors.budget}</FieldError>
                      <h3 className="booking-subheading">Expected Timeline</h3>
                      <ChoiceGrid name="timeline" options={timelineOptions} value={form.timeline} onChange={value => setField('timeline', value)} rows />
                      <FieldError>{errors.timeline}</FieldError>
                    </fieldset>
                  )}

                  {step === 5 && (
                    <fieldset>
                      <legend className="sr-only">Contact information</legend>
                      <div className="booking-fields">
                        <label className="booking-field"><span>Full Name *</span><input autoComplete="name" value={form.fullName} onChange={event => setField('fullName', event.target.value)} /><FieldError>{errors.fullName}</FieldError></label>
                        <label className="booking-field"><span>Company Name <small>(Optional)</small></span><input autoComplete="organization" value={form.company} onChange={event => setField('company', event.target.value)} /></label>
                        <label className="booking-field"><span>Email Address *</span><input type="email" autoComplete="email" value={form.email} onChange={event => setField('email', event.target.value)} /><FieldError>{errors.email}</FieldError></label>
                        <label className="booking-field"><span>Phone Number *</span><input type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={event => setField('phone', event.target.value)} /><FieldError>{errors.phone}</FieldError></label>
                        <label className="booking-field full"><span>Country *</span><input autoComplete="country-name" value={form.country} onChange={event => setField('country', event.target.value)} /><FieldError>{errors.country}</FieldError></label>
                      </div>
                      <label className="booking-field"><span>Additional Message <small>(Optional)</small></span><textarea value={form.additionalMessage} onChange={event => setField('additionalMessage', event.target.value)} /></label>
                    </fieldset>
                  )}

                  {step === 6 && (
                    <fieldset>
                      <legend className="sr-only">Review and submit</legend>
                      <div className="booking-review">
                        <ReviewSection title="Selected Service" step={1} onEdit={goToStep} icon={Sparkles}><p>{form.service}</p>{form.otherService && <small>{form.otherService}</small>}</ReviewSection>
                        <ReviewSection title="Project Details" step={2} onEdit={goToStep} icon={Code2}><p>{form.projectType}</p><small>{form.description}</small></ReviewSection>
                        <ReviewSection title="Requirements" step={3} onEdit={goToStep} icon={Check}><p>{form.features.join(', ') || 'No specific features selected'}</p><small>Available: {form.assets.join(', ') || 'Nothing selected'}</small></ReviewSection>
                        <ReviewSection title="Budget & Timeline" step={4} onEdit={goToStep} icon={BarChart3}><p>{form.budget}</p><small>{form.timeline}</small></ReviewSection>
                        <ReviewSection title="Contact Information" step={5} onEdit={goToStep} icon={Mail}><p>{form.fullName} · {form.email}</p><small>{form.phone} · {form.country}</small></ReviewSection>
                      </div>
                      <label className="booking-inline-check confirm">
                        <input type="checkbox" checked={form.confirmed} onChange={event => setField('confirmed', event.target.checked)} />
                        <span>I confirm that all the information is correct.</span>
                      </label>
                      <FieldError>{errors.confirmed}</FieldError>
                    </fieldset>
                  )}
                </div>

                <nav className="booking-actions" aria-label="Form navigation">
                  <button type="button" className="booking-back" onClick={previousStep} disabled={step === 1}><ArrowLeft aria-hidden="true" /> Back</button>
                  {step < 6
                    ? <button type="button" className="booking-next" onClick={nextStep}>{step === 1 ? 'Continue' : 'Next'} <ArrowRight aria-hidden="true" /></button>
                    : <button type="submit" className="booking-next submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Inquiry'} <Send aria-hidden="true" /></button>}
                </nav>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Booking;
