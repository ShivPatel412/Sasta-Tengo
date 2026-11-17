'use client';
import { useState } from 'react';
import { submitHireInquiry } from '../../lib/hire-inquiry.mjs';

export default function HireForm() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (status === 'sending') return;
    const form = event.currentTarget;
    setStatus('sending');
    setError('');
    try {
      await submitHireInquiry(new FormData(form));
      setStatus('sent');
      form.reset();
    } catch (error) {
      setStatus('idle');
      setError(error.message || 'Your enquiry could not be sent. Please try again or email info@shivpatel.in.');
    }
  }
  return <div className="hire-form-wrap"><form onSubmit={submit} className="hire-form" aria-busy={status === 'sending'}>
    <h3 className="heading-5">A good project starts with a hello.</h3>
    <p className="body-6">A few details are all we need to start.</p>
    <fieldset disabled={status === 'sending' || status === 'sent'}>
      <div className="hire-form-row"><label className="title-4">Your name <span aria-hidden="true">*</span><input className="body-3" name="name" autoComplete="name" placeholder="Your full name" required maxLength={255} pattern=".*\S.*"/></label><label className="title-4">Email address <span aria-hidden="true">*</span><input className="body-3" name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={255}/></label></div>
      <div className="hire-form-row"><label className="title-4">What do you need? <span aria-hidden="true">*</span><select className="body-3" name="service" required defaultValue=""><option value="" disabled>Select a service</option><option>Website design</option><option>Web development</option><option>Custom software</option><option>Automation</option><option>Design and development</option><option>Not sure yet</option></select></label><label className="title-4">Phone <span className="caption-2">(optional)</span><input className="body-3" name="phone" type="tel" autoComplete="tel" placeholder="Your contact number" maxLength={20}/></label></div>
      <label className="title-4">A little about your project <span aria-hidden="true">*</span><textarea className="body-3" name="message" placeholder="What would you like to build? Include a budget or timeline if you have one." required maxLength={5000} rows={4}/></label>
      <button className="hire-button button-md" type="submit" disabled={status === 'sending' || status === 'sent'}>{status === 'sending' ? 'Sending your enquiry…' : status === 'sent' ? 'Enquiry received ✓' : <>Discuss my project <span aria-hidden="true">↗</span></>}</button>
    </fieldset>
    <p className="caption-5">By sending, you agree to be contacted about your project.</p>
    <div className="hire-form-policies"><details id="privacy"><summary className="caption-4">Privacy information</summary><p className="body-6">Your name, email, phone number, and project details are sent to Shiv Patel’s existing website enquiry system to respond to your request. Please do not include passwords or sensitive information. To request removal of your enquiry, email info@shivpatel.in.</p></details><details id="terms"><summary className="caption-4">Project enquiry terms</summary><p className="body-6">Sending an enquiry does not create a project agreement or payment obligation. Scope, pricing, timeline, and support are agreed separately before work begins.</p></details></div>
    <div aria-live="polite" role="status">{status === 'sent' && <p className="hire-success body-3">Thanks for reaching out. Your enquiry has been received. I’ll review it and get back to you.</p>}</div>
    {error && <p className="hire-form-error body-6" role="alert">{error} Your details are still here so you can retry.</p>}
  </form></div>;
}
