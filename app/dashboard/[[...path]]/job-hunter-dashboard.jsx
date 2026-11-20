'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi as api, jsonRequest } from '../../../lib/dashboard-client.mjs';
import { dateLabel } from '../../../lib/dashboard.mjs';
import {
  Briefcase,
  Search,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Bot,
  FileText
} from './dashboard-icons';
import './control-room-neon.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'jobs', label: 'All Jobs' },
  { id: 'review', label: 'Review Queue' },
  { id: 'tracker', label: 'Applications Tracker' },
  { id: 'documents', label: 'CV & Documents' },
  { id: 'agent', label: 'AI Agent' }
];

const SOURCES = [
  'all', 'linkedin', 'indeed', 'wellfound', 'remoteok', 'weworkremotely', 'greenhouse', 'lever', 'manual'
];

export default function JobHunterDashboard({ readOnly, refresh, jobId }) {
  const [activeTab, setActiveTab] = useState(jobId ? 'jobs' : 'overview');
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');

  // Selected Job for AI Analysis & Documents modal/panel
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Agent command prompt
  const [agentPrompt, setAgentPrompt] = useState('');

  // Mark as applied modal/dialog state
  const [appliedModalJob, setAppliedModalJob] = useState(null);
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().slice(0, 10));
  const [appliedNotes, setAppliedNotes] = useState('');

  // Editing draft state
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftContentText, setDraftContentText] = useState('');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        // Load stats
        const statsData = await api('jobs?view=stats');
        if (active) {
          setStats(statsData);
          if (statsData.configured === false) setConfigured(false);
        }

        // Load jobs
        let url = `jobs?page=${page}&limit=25`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (sourceFilter && sourceFilter !== 'all') url += `&source=${encodeURIComponent(sourceFilter)}`;
        if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
        if (scoreFilter === 'high') url += '&score_min=80';
        else if (scoreFilter === 'moderate') url += '&score_min=60&score_max=79';
        else if (scoreFilter === 'low') url += '&score_max=59';

        const jobsData = await api(url);
        if (active) {
          setJobs(jobsData.jobs || []);
          setTotal(jobsData.total || 0);
          setError('');
        }

        // Load tasks if in agent tab
        if (activeTab === 'agent') {
          const tasksData = await api('jobs?view=tasks');
          if (active) setTasks(tasksData.tasks || []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [page, search, sourceFilter, statusFilter, scoreFilter, activeTab, refresh]);

  // Load job details when selected
  async function selectJob(job) {
    setSelectedJob(job);
    setJobDetails(null);
    if (!job?.id) return;
    try {
      setDetailsLoading(true);
      const details = await api(`jobs?job_id=${encodeURIComponent(job.id)}`);
      setJobDetails(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Update status
  async function changeStatus(id, newStatus) {
    if (readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('jobs', jsonRequest('PATCH', { action: 'update_status', job_id: id, status: newStatus }));
      setNotice(`Job status updated to ${newStatus}.`);
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
      if (selectedJob?.id === id) {
        setSelectedJob(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Confirm Mark as Applied
  async function confirmApplied(e) {
    e.preventDefault();
    if (!appliedModalJob || readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('jobs', jsonRequest('PATCH', {
        action: 'mark_applied',
        job_id: appliedModalJob.id,
        applied_at: new Date(appliedDate).toISOString(),
        notes: appliedNotes
      }));
      setNotice(`Job ${appliedModalJob.title} marked as APPLIED on ${appliedDate}.`);
      setJobs(prev => prev.map(j => j.id === appliedModalJob.id ? { ...j, status: 'applied', applied_at: appliedDate } : j));
      setAppliedModalJob(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Trigger AI analysis
  async function analyzeJob(id) {
    if (readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('jobs', jsonRequest('POST', { action: 'analyze_job', job_id: id }));
      setNotice('AI scoring task queued for analysis.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Trigger Agent Command
  async function sendAgentCommand(cmd) {
    const prompt = cmd || agentPrompt;
    if (!prompt.trim() || readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('jobs', jsonRequest('POST', {
        action: 'agent_task',
        message: prompt,
        reason: 'Dashboard command trigger'
      }));
      setNotice(`Agent task queued: "${prompt}"`);
      setAgentPrompt('');
      const updatedTasks = await api('jobs?view=tasks');
      setTasks(updatedTasks.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Save edited draft
  async function saveDraft() {
    if (!editingDraft || readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      let parsed = editingDraft.content;
      try {
        parsed = JSON.parse(draftContentText);
      } catch {
        parsed = { ...editingDraft.content, raw_text: draftContentText };
      }
      await api('jobs', jsonRequest('PATCH', {
        action: 'update_draft',
        draft_id: editingDraft.id,
        content: parsed
      }));
      setNotice('Draft updated successfully.');
      setEditingDraft(null);
      if (selectedJob) selectJob(selectedJob);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Export Resume as PDF via window.print
  function exportPDF(draft) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = draft.content || {};
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shiv Patel - Resume</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #111; padding: 40px; }
          h1 { margin-bottom: 4px; font-size: 26px; }
          .headline { font-size: 16px; color: #444; margin-bottom: 20px; font-weight: 600; }
          .summary { margin-bottom: 24px; font-size: 14px; color: #333; }
          h2 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; }
          .skills { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
          .skill { background: #eee; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
          .experience { margin-bottom: 12px; }
          .employer { font-weight: 700; font-size: 14px; }
          .bullet { font-size: 13px; color: #333; margin-left: 16px; }
        </style>
      </head>
      <body>
        <h1>Shiv Patel</h1>
        <div class="headline">${content.headline || 'Senior Full-Stack & Automation Engineer'}</div>
        <p class="summary">${content.summary || ''}</p>
        <h2>Core Skills</h2>
        <div class="skills">
          ${(content.ordered_skills || []).map(s => `<span class="skill">${s}</span>`).join('')}
        </div>
        <h2>Professional Experience</h2>
        ${(content.experience_bullets || []).map(b => `
          <div class="experience">
            <div class="employer">${b.employer}</div>
            <div class="bullet">• ${b.bullet}</div>
          </div>
        `).join('')}
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // Export as DOCX (formatted text blob download)
  function exportDOCX(draft) {
    const content = draft.content || {};
    let textDoc = `SHIV PATEL - RESUME\n\n`;
    textDoc += `Headline: ${content.headline || ''}\n\n`;
    textDoc += `Summary:\n${content.summary || ''}\n\n`;
    textDoc += `Skills: ${(content.ordered_skills || []).join(', ')}\n\n`;
    textDoc += `Experience:\n`;
    (content.experience_bullets || []).forEach(b => {
      textDoc += `${b.employer}: ${b.bullet}\n`;
    });
    const blob = new Blob([textDoc], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Shiv-Patel-Resume-${selectedJob?.company || 'Job'}.docx`;
    a.click();
  }

  // Copy to clipboard helper
  function copyText(str, label) {
    navigator.clipboard.writeText(str);
    setNotice(`${label} copied to clipboard!`);
    setTimeout(() => setNotice(''), 3000);
  }

  return (
    <div className="job-hunter-dashboard">
      {/* Top Banner & Navigation */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">AI CAREER ACCELERATOR</span>
            <h2><Briefcase size={28} color="#98FF02" /> SHIV OS Job Hunter</h2>
            <p>AI job scoring, verified CV tailoring, application materials and external submission tracking.</p>
          </div>
          <div className="neon-actions">
            <span className={`neon-badge ${configured ? 'live' : 'paused'}`}>
              <span className={`neon-dot ${configured ? 'live' : 'paused'}`} />
              {configured ? 'Supabase Connected' : 'Configuration Pending'}
            </span>
          </div>
        </div>

        {/* Configuration Notice if Supabase not configured */}
        {!configured && (
          <div className="neon-delay-banner" style={{ borderColor: 'rgba(255, 170, 0, 0.4)', background: 'rgba(255, 170, 0, 0.05)' }}>
            <ShieldCheck size={20} color="#ffaa00" />
            <div>
              <strong style={{ color: '#ffaa00' }}>Supabase Storage:</strong> Server-side credentials (<code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code>) are required in production Vercel to store and score job records.
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <nav className="forms-source-tabs" style={{ marginTop: '1rem' }} aria-label="Job Hunter Sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className="tab-button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => { setActiveTab(tab.id); setSelectedJob(null); }}
              style={{
                background: activeTab === tab.id ? '#1e1e1e' : 'transparent',
                color: activeTab === tab.id ? '#98FF02' : '#aaa',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {notice && <p role="status" style={{ color: '#98FF02', background: 'rgba(152, 255, 2, 0.08)', padding: '0.65rem 1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid rgba(152, 255, 2, 0.3)' }}>{notice}</p>}
      {error && <p role="alert" style={{ color: '#ff6666', background: 'rgba(255, 68, 68, 0.08)', padding: '0.65rem 1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid rgba(255, 68, 68, 0.3)' }}>{error}</p>}

      {/* ==================== SECTION A: OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">JOB INTELLIGENCE METRICS</span>
              <h2>Job Hunter Ecosystem Overview</h2>
            </div>
            <button type="button" className="neon-button secondary small" disabled={busy} onClick={() => setPage(1)}>
              <RefreshCw size={14} /> Refresh Stats
            </button>
          </div>

          <div className="neon-grid">
            <div className="neon-card">
              <span className="mini-label">TOTAL JOBS DISCOVERED</span>
              <strong className="neon-stat">{stats?.total ?? 0}</strong>
              <small style={{ color: '#888' }}>Across 7 supported job portals</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">SCORED BY AI</span>
              <strong className="neon-stat">{stats?.scored ?? 0}</strong>
              <small style={{ color: '#888' }}>Evaluated against master profile</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">HIGH MATCH (80–100)</span>
              <strong className="neon-stat" style={{ color: '#98FF02' }}>{stats?.high_match ?? 0}</strong>
              <small style={{ color: '#888' }}>Recommended for immediate application</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">AWAITING REVIEW</span>
              <strong className="neon-stat" style={{ color: '#ffaa00' }}>{stats?.review_queue ?? 0}</strong>
              <small style={{ color: '#888' }}>Drafts or scores ready for human check</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">RESUME DRAFTS GENERATED</span>
              <strong className="neon-stat">{stats?.resumes_generated ?? 0}</strong>
              <small style={{ color: '#888' }}>Verified CV adaptations</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">APPLICATIONS SUBMITTED</span>
              <strong className="neon-stat" style={{ color: '#98FF02' }}>{stats?.applications_submitted ?? 0}</strong>
              <small style={{ color: '#888' }}>Externally verified submissions</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">INTERVIEWS SCHEDULED</span>
              <strong className="neon-stat" style={{ color: '#98FF02' }}>{stats?.interviews_scheduled ?? 0}</strong>
              <small style={{ color: '#888' }}>Active interview pipeline</small>
            </div>
            <div className="neon-card">
              <span className="mini-label">REJECTED / ARCHIVED</span>
              <strong className="neon-stat" style={{ color: '#888' }}>{stats?.rejected_archived ?? 0}</strong>
              <small style={{ color: '#888' }}>Pass or filtered out positions</small>
            </div>
          </div>

          {/* Portal Distribution */}
          <div style={{ marginTop: '1.5rem', background: '#101010', padding: '1rem', borderRadius: '6px', border: '1px solid #222' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#ccc', marginBottom: '0.75rem' }}>Discovery Sources Distribution</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {Object.entries(stats?.sources || {}).map(([src, count]) => (
                <span key={src} className="neon-badge neutral" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                  {src.toUpperCase()}: <strong>{count}</strong>
                </span>
              ))}
              {Object.keys(stats?.sources || {}).length === 0 && (
                <span style={{ color: '#666', fontSize: '0.85rem' }}>No source data recorded yet.</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== SECTION B: ALL JOBS ==================== */}
      {(activeTab === 'jobs' || activeTab === 'review' || activeTab === 'tracker') && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">JOB REPOSITORY</span>
              <h2>
                {activeTab === 'review' ? 'Application Review Queue' :
                 activeTab === 'tracker' ? 'Application Submission Tracker' :
                 `Discovered Jobs (${total})`}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                className="neon-input"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                value={sourceFilter}
                onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Portals' : s.toUpperCase()}</option>)}
              </select>

              <select
                className="neon-input"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                value={scoreFilter}
                onChange={e => { setScoreFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Scores</option>
                <option value="high">High Match (80+)</option>
                <option value="moderate">Moderate (60–79)</option>
                <option value="low">Low Match (&lt;60)</option>
              </select>

              {activeTab === 'jobs' && (
                <select
                  className="neon-input"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="discovered">Discovered</option>
                  <option value="scored">Scored</option>
                  <option value="draft_ready">Draft Ready</option>
                  <option value="approved">Approved</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="search"
              className="neon-input"
              style={{ width: '100%', maxWidth: '400px' }}
              placeholder="Search by job title, company, or location…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {jobs.length === 0 ? (
            <p style={{ color: '#777', padding: '1.5rem 0' }}>No job records matching the selected filters.</p>
          ) : (
            <div className="neon-table-wrapper">
              <table className="neon-table">
                <thead>
                  <tr>
                    <th>Job Title & Company</th>
                    <th>Portal</th>
                    <th>Location / Remote</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const score = job.scores?.[0]?.score;
                    const isHigh = score >= 80;
                    const isMod = score >= 60 && score < 80;

                    return (
                      <tr key={job.id}>
                        <td>
                          <strong>{job.title}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#999' }}>
                            {job.company || 'Unknown Employer'}
                          </div>
                          {job.url && (
                            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#98FF02', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              Original posting <ExternalLink size={11} />
                            </a>
                          )}
                        </td>
                        <td>
                          <span className="neon-badge neutral">{job.source}</span>
                        </td>
                        <td>
                          <small>{job.location || 'Remote'}</small>
                        </td>
                        <td>
                          {score !== undefined ? (
                            <span className={`neon-badge ${isHigh ? 'live' : isMod ? 'paused' : 'neutral'}`} style={{ fontWeight: 800 }}>
                              {score}/100
                            </span>
                          ) : (
                            <button
                              className="neon-button secondary small"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              disabled={readOnly || busy}
                              onClick={() => analyzeJob(job.id)}
                            >
                              <Sparkles size={12} /> Score
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={`neon-badge ${job.status === 'applied' ? 'live' : job.status === 'interview' ? 'live' : job.status === 'approved' ? 'paused' : 'neutral'}`}>
                            {job.status ? job.status.toUpperCase() : 'DISCOVERED'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              className="neon-button secondary small"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                              onClick={() => selectJob(job)}
                            >
                              Analysis & CV
                            </button>

                            {/* Applied Action */}
                            {job.status !== 'applied' && job.status !== 'interview' && job.status !== 'offer' && (
                              <button
                                className="neon-button primary small"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                disabled={readOnly || busy}
                                onClick={() => setAppliedModalJob(job)}
                              >
                                Mark Applied
                              </button>
                            )}

                            {job.status === 'discovered' && (
                              <button
                                className="neon-button secondary small"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                disabled={readOnly || busy}
                                onClick={() => changeStatus(job.id, 'approved')}
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
            <span>Showing page {page}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="neon-button secondary small" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
              <button className="neon-button secondary small" disabled={jobs.length < 25} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </section>
      )}

      {/* ==================== SECTION C & D: AI MATCH ANALYSIS & DOCUMENTS (MODAL / DETAIL) ==================== */}
      {selectedJob && (
        <section className="neon-panel" style={{ borderColor: '#98FF02', boxShadow: '0 0 20px rgba(152, 255, 2, 0.15)' }}>
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">JOB DOSSIER</span>
              <h2>{selectedJob.title} — {selectedJob.company}</h2>
              <p>Source: {selectedJob.source?.toUpperCase()} · Posted: {dateLabel(selectedJob.published_at || selectedJob.created_at, true)}</p>
            </div>
            <button className="neon-button secondary small" onClick={() => setSelectedJob(null)}>
              <X size={16} /> Close Dossier
            </button>
          </div>

          {detailsLoading ? (
            <p style={{ color: '#aaa', padding: '1rem 0' }}>Loading job analysis and drafts from Supabase…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left Column: AI Match Breakdown */}
              <div style={{ background: '#101010', padding: '1.25rem', borderRadius: '6px', border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: 0 }}>AI Compatibility Analysis</h3>
                  {jobDetails?.scores?.[0] ? (
                    <span className="neon-badge live" style={{ fontSize: '1rem', fontWeight: 800 }}>
                      {jobDetails.scores[0].score}/100
                    </span>
                  ) : (
                    <button className="neon-button primary small" disabled={readOnly || busy} onClick={() => analyzeJob(selectedJob.id)}>
                      <Sparkles size={14} /> Run Analysis
                    </button>
                  )}
                </div>

                {jobDetails?.scores?.[0] ? (
                  <div>
                    {/* Breakdown bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                      {Object.entries(jobDetails.scores[0].breakdown || {}).map(([k, val]) => (
                        <div key={k}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#bbb' }}>
                            <span style={{ textTransform: 'capitalize' }}>{k}</span>
                            <span>{val} pts</span>
                          </div>
                          <div className="neon-progress-bar">
                            <div className="neon-progress-fill" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#98FF02', display: 'block', marginBottom: '4px' }}>MATCHED SKILLS</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(jobDetails.scores[0].matched_skills || []).map((s, idx) => (
                          <span key={idx} className="neon-badge live" style={{ fontSize: '0.72rem' }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#ffaa00', display: 'block', marginBottom: '4px' }}>MISSING GAPS</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(jobDetails.scores[0].gaps || []).map((s, idx) => (
                          <span key={idx} className="neon-badge paused" style={{ fontSize: '0.72rem' }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#ccc', display: 'block', marginBottom: '4px' }}>AI RECOMMENDATION</strong>
                      <p style={{ fontSize: '0.85rem', color: '#ddd', background: '#0a0a0a', padding: '0.75rem', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
                        Recommendation: <strong>{jobDetails.scores[0].recommendation?.toUpperCase()}</strong>. {(jobDetails.scores[0].reasons || []).join(' ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#777', fontSize: '0.85rem' }}>This position has not been scored yet. Click "Run Analysis" to evaluate compatibility.</p>
                )}
              </div>

              {/* Right Column: Tailored Resume & Application Documents */}
              <div style={{ background: '#101010', padding: '1.25rem', borderRadius: '6px', border: '1px solid #222' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem' }}>Tailored Application Documents</h3>

                {(jobDetails?.drafts || []).length === 0 ? (
                  <div>
                    <p style={{ color: '#777', fontSize: '0.85rem' }}>No AI drafts generated for this job yet.</p>
                    <button
                      className="neon-button secondary small"
                      style={{ marginTop: '0.5rem' }}
                      disabled={readOnly || busy}
                      onClick={() => sendAgentCommand(`Prepare tailored CV and cover letter for job ${selectedJob.id}`)}
                    >
                      <Bot size={14} /> Request Tailored Drafts from Agent
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {jobDetails.drafts.map(draft => (
                      <div key={draft.id} style={{ background: '#141414', padding: '1rem', borderRadius: '6px', border: '1px solid #282828' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className="neon-badge live">{draft.kind?.toUpperCase()} DRAFT</span>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>{dateLabel(draft.created_at, true)}</span>
                        </div>

                        {/* Resume preview */}
                        {draft.kind === 'resume' && (
                          <div>
                            <strong style={{ color: '#98FF02', fontSize: '0.95rem' }}>{draft.content?.headline}</strong>
                            <p style={{ fontSize: '0.85rem', color: '#ccc', margin: '0.5rem 0' }}>{draft.content?.summary}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button className="neon-button secondary small" onClick={() => exportPDF(draft)}>
                                <FileText size={14} /> Export PDF
                              </button>
                              <button className="neon-button secondary small" onClick={() => exportDOCX(draft)}>
                                <FileText size={14} /> Export DOCX
                              </button>
                              <button className="neon-button secondary small" onClick={() => { setEditingDraft(draft); setDraftContentText(JSON.stringify(draft.content, null, 2)); }}>
                                Edit Draft
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Application / Cover letter preview */}
                        {draft.kind === 'application' && (
                          <div>
                            <strong style={{ color: '#fff', fontSize: '0.88rem' }}>Cover Letter (Verified Facts):</strong>
                            <div style={{ background: '#0a0a0a', padding: '0.75rem', borderRadius: '4px', margin: '0.5rem 0', fontSize: '0.85rem', color: '#ddd', whiteSpace: 'pre-wrap' }}>
                              {draft.content?.cover_letter}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="neon-button secondary small" onClick={() => copyText(draft.content?.cover_letter || '', 'Cover letter')}>
                                Copy Cover Letter
                              </button>
                              {draft.content?.recruiter_message && (
                                <button className="neon-button secondary small" onClick={() => copyText(draft.content.recruiter_message, 'Recruiter message')}>
                                  Copy Recruiter DM
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Interview pack preview */}
                        {draft.kind === 'interview' && (
                          <div>
                            <strong style={{ color: '#fff', fontSize: '0.88rem' }}>Targeted Interview Prep:</strong>
                            <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '0.4rem 0' }}>
                              {draft.content?.questions?.length || 0} tailored interview questions and outlines prepared.
                            </p>
                            <button className="neon-button secondary small" onClick={() => copyText(JSON.stringify(draft.content?.questions || [], null, 2), 'Interview questions')}>
                              Copy Question Outlines
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================== SECTION F: AI AGENT CONTROL CENTER ==================== */}
      {activeTab === 'agent' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">AUTONOMOUS ORCHESTRATION</span>
              <h2><Bot size={28} color="#98FF02" /> AI Job Hunter Agent Control</h2>
              <p>Instruct the specialist n8n agent orchestrator (<code>JOB-00</code>) to discover, score, or tailor materials.</p>
            </div>
          </div>

          {/* Quick command buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              'Find matching WordPress jobs.',
              'Show my top 10 remote developer jobs.',
              'Prepare a CV for this job.',
              'Generate interview questions.',
              'Run daily discovery scan across all portals.'
            ].map(prompt => (
              <button
                key={prompt}
                type="button"
                className="neon-button secondary small"
                disabled={busy || readOnly}
                onClick={() => sendAgentCommand(prompt)}
              >
                "{prompt}"
              </button>
            ))}
          </div>

          {/* Custom Command Bar */}
          <form onSubmit={e => { e.preventDefault(); sendAgentCommand(agentPrompt); }} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              className="neon-input"
              style={{ flex: 1 }}
              placeholder="Enter instruction for Job Hunter Agent (e.g. Find remote Next.js roles paying $120k+)…"
              value={agentPrompt}
              onChange={e => setAgentPrompt(e.target.value)}
            />
            <button type="submit" className="neon-button primary" disabled={busy || readOnly}>
              <Sparkles size={16} /> Send Command
            </button>
          </form>

          {/* Agent Activity History */}
          <h3 style={{ fontSize: '1rem', color: '#ccc', marginBottom: '0.75rem' }}>Task Execution History</h3>
          {tasks.length === 0 ? (
            <p style={{ color: '#777', padding: '1rem 0' }}>No agent task history recorded yet.</p>
          ) : (
            <div className="neon-table-wrapper">
              <table className="neon-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Instruction / Message</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td><span className="neon-badge neutral">{t.skill?.toUpperCase()}</span></td>
                      <td><strong>{t.message}</strong></td>
                      <td><small style={{ color: '#aaa' }}>{t.reason}</small></td>
                      <td>
                        <span className={`neon-badge ${t.status === 'completed' ? 'live' : t.status === 'queued' ? 'paused' : 'neutral'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td><small>{dateLabel(t.created_at, true)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ==================== MARK AS APPLIED CONFIRMATION MODAL ==================== */}
      {appliedModalJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="neon-panel" style={{ maxWidth: '500px', width: '100%', background: '#121212', border: '1px solid #98FF02' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Mark Job as Applied</h3>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem' }}>
              Confirm that you have externally submitted your application for <strong>{appliedModalJob.title}</strong> at <strong>{appliedModalJob.company}</strong>.
            </p>

            <form onSubmit={confirmApplied}>
              <div className="neon-input-group">
                <label>Date Applied (UTC)</label>
                <input
                  type="date"
                  className="neon-input"
                  required
                  value={appliedDate}
                  onChange={e => setAppliedDate(e.target.value)}
                />
              </div>

              <div className="neon-input-group">
                <label>Optional Notes / Referral Details</label>
                <textarea
                  className="neon-input"
                  rows={3}
                  placeholder="e.g. Applied via Lever, contacted recruiter Jane on LinkedIn"
                  value={appliedNotes}
                  onChange={e => setAppliedNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="neon-button secondary" onClick={() => setAppliedModalJob(null)}>
                  Cancel
                </button>
                <button type="submit" className="neon-button primary" disabled={busy || readOnly}>
                  <Check size={16} /> Confirm Applied
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DRAFT EDITING MODAL ==================== */}
      {editingDraft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="neon-panel" style={{ maxWidth: '640px', width: '100%', background: '#121212', border: '1px solid #333' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Edit {editingDraft.kind?.toUpperCase()} Draft</h3>
            <p style={{ fontSize: '0.82rem', color: '#aaa', marginBottom: '1rem' }}>
              Only verified master CV facts are allowed. Never fabricate dates or employers.
            </p>

            <textarea
              className="neon-input"
              rows={12}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
              value={draftContentText}
              onChange={e => setDraftContentText(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="neon-button secondary" onClick={() => setEditingDraft(null)}>
                Cancel
              </button>
              <button type="button" className="neon-button primary" disabled={busy || readOnly} onClick={saveDraft}>
                <Check size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
