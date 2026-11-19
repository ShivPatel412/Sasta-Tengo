export const verificationJobId = '11111111-1111-4111-8111-111111111111';
export const missingJobId = '22222222-2222-4222-8222-222222222222';
export const profile = 'Synthetic backend verification candidate; no real qualifications or application.';
export const score = { score: 0, breakdown: { skills: 0, experience: 0, location: 0, salary: 0, role: 0 },
  matched_skills: [], gaps: ['Verification fixture only.'], eligibility: 'unknown', salary_fit: 'unknown',
  reasons: ['Synthetic API verification; not an assessment of a candidate.'], recommendation: 'review' };
export const resume = { headline: '[Verification only] Resume draft', summary: 'Synthetic API verification; not a usable resume.',
  ordered_skills: [], experience_bullets: [], projects: [], missing_facts: ['All real candidate facts.'], review_required: true };
export const application = { cover_letter: '[Verification only] This is a backend storage test, not an application.',
  recruiter_message: '', screening_answers: [], questions_for_candidate: ['Supply verified candidate facts.'], review_required: true };
export const interview = { questions: [{ question: '[Verification only] Explain a function.', focus: 'Backend fixture',
  answer_outline: ['Describe inputs and outputs.'] }], coding_exercises: [], study_plan: [], questions_to_ask_interviewer: [], review_required: true };
export const task = { message: '[Verification only] Backend queue test', job_id: verificationJobId, skill: 'help',
  reason: 'Synthetic API verification; do not execute.', requires_approval: true, status: 'queued' };
export const reminder = { job_id: verificationJobId, company: 'Verification only', title: '[Verification only] Backend test',
  reminder_type: 'review_followup', send_external_message: false };
export const generated = ai => ({ id: verificationJobId, verified_profile: profile, ai,
  title: '[Verification only] Backend test', candidate_location: 'India' });
