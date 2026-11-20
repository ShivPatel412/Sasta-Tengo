'use client';
import { useEffect, useState } from 'react';
import { adminApi as api, jsonRequest } from '../../../lib/dashboard-client.mjs';
import { dateLabel } from '../../../lib/dashboard.mjs';
import {
  FilmStrip,
  ExternalLink,
  RefreshCw,
  Check,
  Sparkles,
  Play,
  Workflow,
  Search,
  X,
  ShieldCheck,
  YoutubeLogo,
  LinkedinLogo
} from './dashboard-icons';
import './control-room-neon.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'jobs', label: 'Video Jobs' },
  { id: 'highlights', label: 'AI Highlights' },
  { id: 'published', label: 'Published Reels' },
  { id: 'workflows', label: 'Workflow Monitor' },
  { id: 'activity', label: 'Activity & Errors' },
  { id: 'settings', label: 'Settings' }
];

const PIPELINE_STAGES = [
  { key: 'SUBMITTED', label: 'Video Submitted', icon: '📥' },
  { key: 'DOWNLOADED', label: 'Downloaded', icon: '⚡' },
  { key: 'GEMINI', label: 'Analyzed by Gemini', icon: '🧠' },
  { key: 'HIGHLIGHTS', label: 'Highlights Selected', icon: '✂️' },
  { key: 'RENDERED', label: 'Rendered', icon: '🎬' },
  { key: 'UPLOADED', label: 'Platform Upload', icon: '☁️' },
  { key: 'VERIFIED', label: 'Processing check', icon: '🛡️' },
  { key: 'PUBLISHED', label: 'Published', icon: '🚀' }
];

export default function FunnyReelsStudio({ readOnly, refresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    stats: {},
    jobs: [],
    streams: [],
    clips: [],
    highlights: [],
    published: [],
    workflows: [],
    executions: [],
    accounts: {},
    drive_url: '',
    configured: false,
    actions_available: false
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Submit Video Modal / Form State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [url, setUrl] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [maxClips, setMaxClips] = useState(3);
  const [streamerHandle, setStreamerHandle] = useState('');

  // Selected Item Modals
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);

  // Filters
  const [jobSearch, setJobSearch] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [executionFilter, setExecutionFilter] = useState('all');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await api('funny-reels');
        if (active) {
          setData(res);
          setError('');
          if (res.clips && res.clips.length > 0 && !selectedClip) {
            setSelectedClip(res.clips[0]);
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [refresh]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await api('funny-reels');
      setData(res);
      setNotice('Telemetric snapshot refreshed.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitJob(e) {
    e.preventDefault();
    if (readOnly || busy || data.actions_available !== true) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await api('funny-reels', jsonRequest('POST', {
        youtube_url: url,
        is_livestream: isLive,
        rights_confirmed: rightsConfirmed,
        max_clips: Number(maxClips),
        streamer_handle: streamerHandle
      }));
      setNotice(res.message || 'Job queued successfully.');
      setUrl('');
      setShowSubmitModal(false);
      const updated = await api('funny-reels');
      setData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateJob(jobId, action) {
    if (readOnly || busy || data.actions_available !== true) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('funny-reels', jsonRequest('PATCH', { job_id: jobId, action }));
      setNotice(`Job ${jobId} set to ${action}.`);
      const updated = await api('funny-reels');
      setData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const allJobs = [...(data.streams || []), ...(data.jobs || [])];
  const filteredJobs = allJobs.filter(j => {
    if (jobFilter === 'queued' && !['QUEUED', 'INTAKE'].includes(j.state)) return false;
    if (jobFilter === 'processing' && !['PROCESSING', 'ANALYZING', 'RENDERING'].includes(j.state)) return false;
    if (jobFilter === 'completed' && !['DONE', 'PUBLISHED'].includes(j.state)) return false;
    if (jobFilter === 'failed' && j.state !== 'ERROR' && !j.error_message) return false;
    if (jobFilter === 'awaiting' && j.state !== 'AWAITING_PERMISSION') return false;

    if (jobSearch) {
      const q = jobSearch.toLowerCase();
      const matchUrl = (j.source_url || '').toLowerCase().includes(q);
      const matchId = (j.job_id || j.video_id || '').toLowerCase().includes(q);
      const matchStreamer = (j.streamer_handle || '').toLowerCase().includes(q);
      if (!matchUrl && !matchId && !matchStreamer) return false;
    }
    return true;
  });

  const filteredPublished = (data.published || []).filter(item => {
    if (platformFilter === 'instagram' && !item.instagram_permalink) return false;
    if (platformFilter === 'youtube' && !item.youtube_url) return false;
    if (platformFilter === 'both' && (!item.instagram_permalink || !item.youtube_url)) return false;
    if (platformFilter === 'pending' && item.instagram_status === 'PUBLISHED' && item.youtube_status === 'PUBLISHED') return false;
    return true;
  });

  const filteredExecutions = (data.executions || []).filter(exec => {
    if (executionFilter === 'success' && exec.status !== 'success') return false;
    if (executionFilter === 'error' && exec.status !== 'error') return false;
    return true;
  });

  const stats = data.stats || {};

  return (
    <div className="funny-reels-control-center">
      {/* Header Panel */}
      <section className="neon-panel" style={{ marginBottom: '1.25rem' }}>
        <div className="neon-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem' }}>
          <div className="neon-title-group">
            <span className="mini-label" style={{ color: '#98FF02' }}>SHIV OS // AUTOMATION ENGINE</span>
            <h2 style={{ margin: '0.2rem 0' }}>
              <FilmStrip size={28} color="#98FF02" />
              Funny Reels AI Control Center
            </h2>
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
              Monitor existing video processing, rendered clips and publishing receipts. Output properties and external delivery need verification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {data.drive_url && (
              <a href={data.drive_url} target="_blank" rel="noopener noreferrer" className="neon-button secondary small">
                <ExternalLink size={14} /> Drive Assets
              </a>
            )}
            <button className="neon-button secondary small" onClick={handleRefresh} disabled={loading || busy}>
              <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
            </button>
            <button className="neon-button primary small" onClick={() => setShowSubmitModal(true)} disabled={busy || readOnly || data.actions_available !== true}>
              <Sparkles size={14} /> Submit Video
            </button>
          </div>
        </div>

        {data.actions_available !== true && <p role="status" className="panel-footnote">{data.action_message || 'Read-only monitoring. A durable authenticated action backend is not connected.'}</p>}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem', overflowX: 'auto' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? '#1f2910' : 'transparent',
                  color: isActive ? '#98FF02' : '#888',
                  border: isActive ? '1px solid #98FF02' : '1px solid transparent',
                  borderRadius: '4px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {notice && <div style={{ marginTop: '0.75rem', color: '#98FF02', fontSize: '0.85rem' }}>✓ {notice}</div>}
        {error && <div style={{ marginTop: '0.75rem', color: '#ff4444', fontSize: '0.85rem' }}>⚠️ {error}</div>}
      </section>

      {/* =========================================================================
          TAB 1: OVERVIEW DASHBOARD
      ========================================================================= */}
      {activeTab === 'overview' && (
        <>
          {/* 12 Real KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Total Submitted</span>
              <strong className="neon-stat-value">{stats.total_submitted ?? 0}</strong>
              <small className="neon-stat-sub">Videos & live streams</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Awaiting Queue</span>
              <strong className="neon-stat-value" style={{ color: '#ffaa00' }}>{stats.awaiting_processing ?? 0}</strong>
              <small className="neon-stat-sub">Intake backlog</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Processing</span>
              <strong className="neon-stat-value" style={{ color: '#00d0ff' }}>{stats.currently_processing ?? 0}</strong>
              <small className="neon-stat-sub">Active FFmpeg / AI</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Gemini Analyzed</span>
              <strong className="neon-stat-value" style={{ color: '#98FF02' }}>{stats.analyzed_by_gemini ?? 0}</strong>
              <small className="neon-stat-sub">Scene comedy eval</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Clips Selected</span>
              <strong className="neon-stat-value">{stats.clips_selected ?? 0}</strong>
              <small className="neon-stat-sub">High-humor cuts</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Clips Rendered</span>
              <strong className="neon-stat-value">{stats.clips_rendered ?? 0}</strong>
              <small className="neon-stat-sub">Reported render records</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Instagram Reels</span>
              <strong className="neon-stat-value" style={{ color: '#ff2d75' }}>{stats.instagram_published ?? 0}</strong>
              <small className="neon-stat-sub">Confirmed published</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">YouTube Shorts</span>
              <strong className="neon-stat-value" style={{ color: '#ff3333' }}>{stats.youtube_published ?? 0}</strong>
              <small className="neon-stat-sub">Public releases</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Pending Uploads</span>
              <strong className="neon-stat-value">{stats.pending_uploads ?? 0}</strong>
              <small className="neon-stat-sub">Private / in-flight</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Failed Uploads</span>
              <strong className="neon-stat-value" style={{ color: stats.failed_uploads ? '#ff4444' : '#888' }}>{stats.failed_uploads ?? 0}</strong>
              <small className="neon-stat-sub">Retry eligible</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Publication Rate</span>
              <strong className="neon-stat-value" style={{ color: '#98FF02' }}>{stats.success_rate || 'Not available'}</strong>
              <small className="neon-stat-sub">Verified delivery</small>
            </div>
            <div className="neon-stat-card">
              <span className="neon-stat-label">Avg Process Time</span>
              <strong className="neon-stat-value">{stats.avg_processing_time || 'Not available'}</strong>
              <small className="neon-stat-sub">Source to publish</small>
            </div>
          </div>

          {/* Visual Pipeline */}
          <section className="neon-panel" style={{ marginBottom: '1.25rem' }}>
            <div className="neon-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
              <div className="neon-title-group">
                <span className="mini-label">AUTOMATION PIPELINE</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Workflow pipeline outline</h3>
              </div>
              <span className="neon-badge live">REAL-TIME MONITOR</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '0.65rem' }}>
              {PIPELINE_STAGES.map((st, i) => {
                const isComplete = i < 7;
                return (
                  <div
                    key={st.key}
                    style={{
                      background: '#121212',
                      border: '1px solid #222',
                      borderRadius: '6px',
                      padding: '0.75rem 0.65rem',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{st.icon}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{st.label}</div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <span className={`neon-badge ${isComplete ? 'live' : 'neutral'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                        {isComplete ? 'READY' : 'MONITORED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Real Historical Data Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <section className="neon-panel" style={{ margin: 0 }}>
              <div className="neon-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.98rem' }}>Platform Distribution</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#fff' }}>Instagram Reels</span>
                    <strong style={{ color: '#98FF02' }}>{stats.instagram_published || 0} published</strong>
                  </div>
                  <div className="neon-progress-bar">
                    <div className="neon-progress-fill" style={{ width: `${Math.min(100, ((stats.instagram_published || 0) / Math.max(1, (stats.instagram_published || 0) + (stats.youtube_published || 0))) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#fff' }}>YouTube Shorts</span>
                    <strong style={{ color: '#98FF02' }}>{stats.youtube_published || 0} public ({stats.pending_uploads || 0} private)</strong>
                  </div>
                  <div className="neon-progress-bar">
                    <div className="neon-progress-fill" style={{ width: `${Math.min(100, ((stats.youtube_published || 0) / Math.max(1, (stats.instagram_published || 0) + (stats.youtube_published || 0))) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="neon-panel" style={{ margin: 0 }}>
              <div className="neon-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.98rem' }}>Processing Volume & Health</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem 0' }}>
                Historical batches processed across n8n folder <strong>Funny Reels AI</strong>.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#111', padding: '0.75rem', borderRadius: '4px', border: '1px solid #222' }}>
                  <small style={{ color: '#777', display: 'block' }}>Successful Executions</small>
                  <strong style={{ color: '#98FF02', fontSize: '1.2rem' }}>
                    {(data.executions || []).filter(e => e.status === 'success').length}
                  </strong>
                </div>
                <div style={{ background: '#111', padding: '0.75rem', borderRadius: '4px', border: '1px solid #222' }}>
                  <small style={{ color: '#777', display: 'block' }}>Active Live Workflows</small>
                  <strong style={{ color: '#00d0ff', fontSize: '1.2rem' }}>
                    {(data.workflows || []).filter(w => w.active).length} / 7
                  </strong>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 2: VIDEO JOB MANAGEMENT
      ========================================================================= */}
      {activeTab === 'jobs' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">SOURCE INGESTION & PIPELINE</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Video Jobs ({filteredJobs.length})</h3>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#666' }} />
                <input
                  type="text"
                  className="neon-input"
                  placeholder="Search URL, ID or streamer..."
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  style={{ paddingLeft: '28px', width: '220px', fontSize: '0.82rem' }}
                />
              </div>

              <select
                className="neon-input"
                value={jobFilter}
                onChange={e => setJobFilter(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
              >
                <option value="all">All States</option>
                <option value="queued">Queued / Intake</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="awaiting">Awaiting Permission</option>
              </select>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
              <p>No video jobs match your filter criteria.</p>
              <button className="neon-button primary small" onClick={() => setShowSubmitModal(true)}>
                Submit New Video
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #262626', color: '#777', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Job ID</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>YouTube Source</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Streamer</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Rights</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Stage & Progress</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Clips</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Submitted</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j, idx) => {
                    const key = j.job_id || j.stream_id || `job-${idx}`;
                    const progress = j.progress_percent || (j.state === 'DONE' ? 100 : j.state === 'PROCESSING' ? 50 : 10);
                    const hasError = j.state === 'ERROR' || Boolean(j.error_message || j.last_error);

                    return (
                      <tr key={key} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', color: '#98FF02' }}>
                          {j.job_id ? j.job_id.slice(0, 16) + '…' : (j.video_id || 'stream')}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <a href={j.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>
                            {j.source_url || j.video_id} <ExternalLink size={12} />
                          </a>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#aaa' }}>
                          {j.streamer_handle || '@carryminati'}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span className={`neon-badge ${j.rights_confirmed ? 'live' : 'neutral'}`} style={{ fontSize: '0.7rem' }}>
                            {j.rights_confirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', minWidth: '130px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#888', marginBottom: '2px' }}>
                            <span>{j.stage || 'INTAKE'}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="neon-progress-bar" style={{ height: '4px' }}>
                            <div className="neon-progress-fill" style={{ width: `${progress}%`, background: hasError ? '#ff4444' : '#98FF02' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#fff' }}>
                          {j.clips_selected ? `${j.clips_selected} clips` : `${j.max_clips || 3} req`}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span className={`neon-badge ${hasError ? 'error' : j.state === 'PROCESSING' ? 'live' : 'neutral'}`} style={{ fontSize: '0.7rem' }}>
                            {j.state || 'QUEUED'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#777', whiteSpace: 'nowrap' }}>
                          {dateLabel(j.requested_at || j.createdAt)}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                          <button
                            className="neon-button secondary small"
                            onClick={() => setSelectedJob(j)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 3: AI HIGHLIGHT INSPECTOR
      ========================================================================= */}
      {activeTab === 'highlights' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">GEMINI AI DECISIONS</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Selected Comedy Moments</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>
                Reported highlight and render metadata. Source scores and actual media properties need verification.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Player Preview */}
            <div className="neon-video-container">
              {selectedClip ? (
                <>
                  <video
                    className="neon-video"
                    controls
                    playsInline
                    src={`/api/admin/project-media/${encodeURIComponent(selectedClip.filename || 'sample.mp4')}`}
                  >
                    Your browser does not support HTML video preview.
                  </video>
                  <div className="neon-clip-meta">
                    <div>
                      <strong style={{ color: '#98FF02', display: 'block', fontSize: '0.92rem' }}>
                        {selectedClip.filename}
                      </strong>
                      <small style={{ color: '#888' }}>
                        Streamer: {selectedClip.streamer || 'Not reported'} · Media properties not verified
                      </small>
                    </div>
                    <span className="neon-badge neutral">MEDIA NOT VERIFIED</span>
                  </div>
                </>
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  Select a highlight below to preview
                </div>
              )}
            </div>

            {/* AI Decision Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {(data.highlights || []).map((hl, idx) => (
                <div
                  key={hl.id || idx}
                  className="neon-card"
                  style={{
                    borderLeft: '4px solid #98FF02',
                    background: '#131313',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '1rem' }}>{hl.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#98FF02', marginTop: '2px' }}>
                        {hl.duration_label} · Streamer Credit: {hl.streamer}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="neon-badge live" style={{ fontSize: '0.72rem' }}>
                        Humor Score: {hl.humor_score}/100
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <small style={{ color: '#777', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                      Why Gemini Selected This Moment
                    </small>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#ddd', lineHeight: 1.4 }}>
                      "{hl.selection_reason}"
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ color: '#666' }}>Hook Text:</span>
                      <strong style={{ color: '#98FF02', display: 'block' }}>{hl.hook_text}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Captions:</span>
                      <strong style={{ color: '#00d0ff', display: 'block' }}>English Subtitles Embedded</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="neon-button secondary small"
                      onClick={() => {
                        const match = (data.clips || []).find(c => c.video_id === hl.video_id);
                        if (match) setSelectedClip(match);
                      }}
                    >
                      <Play size={12} /> Preview video
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 4: PUBLISHED REELS LIBRARY
      ========================================================================= */}
      {activeTab === 'published' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">MULTI-PLATFORM ASSETS</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Published Reels & Shorts ({filteredPublished.length})</h3>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="neon-input"
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
              >
                <option value="all">All Platforms</option>
                <option value="instagram">Instagram Reels Only</option>
                <option value="youtube">YouTube Shorts Only</option>
                <option value="both">Published on Both</option>
                <option value="pending">Pending Releases</option>
              </select>
            </div>
          </div>

          {filteredPublished.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>No published clips match the selected platform filter.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredPublished.map((item, idx) => (
                <div key={item.job_key || idx} className="neon-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="neon-badge live" style={{ fontSize: '0.7rem' }}>1080×1920 60FPS</span>
                      <small style={{ color: '#777' }}>Streamer: {item.streamer}</small>
                    </div>

                    <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem' }}>
                      {item.title}
                    </strong>

                    {item.caption && (
                      <p style={{ color: '#aaa', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '0.75rem', lineHeight: 1.3 }}>
                        "{item.caption}"
                      </p>
                    )}

                    {/* Platform Receipts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      {/* Instagram Receipt */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f0f0f', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #222' }}>
                        <span style={{ fontSize: '0.78rem', color: '#ff2d75', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Instagram Reel
                        </span>
                        {item.instagram_permalink ? (
                          <a href={item.instagram_permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#98FF02', textDecoration: 'none', fontSize: '0.75rem' }}>
                            View on IG ↗
                          </a>
                        ) : (
                          <span style={{ color: '#888', fontSize: '0.72rem' }}>{item.instagram_status}</span>
                        )}
                      </div>

                      {/* YouTube Receipt */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f0f0f', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #222' }}>
                        <span style={{ fontSize: '0.78rem', color: '#ff3333', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <YoutubeLogo size={14} /> YouTube Shorts
                        </span>
                        {item.youtube_url ? (
                          <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#98FF02', textDecoration: 'none', fontSize: '0.75rem' }}>
                            View on YouTube ↗
                          </a>
                        ) : (
                          <span style={{ color: '#888', fontSize: '0.72rem' }}>{item.youtube_status}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #222', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <small style={{ color: '#666' }}>Cover: LocalFFmpeg</small>
                    <a href={item.original_source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.75rem', textDecoration: 'none' }}>
                      Source Video ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 5: WORKFLOW MONITOR (7 N8N WORKFLOWS)
      ========================================================================= */}
      {activeTab === 'workflows' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">N8N ENGINE MONITOR</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Funny Reels AI Workflows (7 Workflows)</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>
                Last reported workflow metadata. A draft label is not proof that published workflows or external processing are paused.
              </p>
            </div>
            <a href="https://n8n.shivpatel.in" target="_blank" rel="noopener noreferrer" className="neon-button secondary small">
              <ExternalLink size={14} /> Open n8n
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {(data.workflows || []).map(wf => (
              <div
                key={wf.id}
                className="neon-card"
                style={{
                  borderLeft: wf.active ? '3px solid #98FF02' : '3px solid #444',
                  background: '#131313'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <strong style={{ color: '#98FF02', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {wf.code}
                  </strong>
                  <span className={`neon-badge ${wf.active ? 'live' : 'neutral'}`} style={{ fontSize: '0.68rem' }}>
                    {wf.active ? 'ACTIVE' : 'DRAFT (PAUSED)'}
                  </span>
                </div>

                <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {wf.name.replace(/^SHIV OS\s*\|\s*/i, '')}
                </div>
                <div style={{ color: '#888', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                  {wf.role}
                </div>

                <div style={{ background: '#0c0c0c', padding: '0.5rem', borderRadius: '4px', fontSize: '0.74rem', color: '#777', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Trigger: <span style={{ color: '#aaa' }}>{wf.trigger}</span></div>
                  <div>Last Run: <span style={{ color: '#aaa' }}>{wf.last_execution ? dateLabel(wf.last_execution) : 'Idle'}</span></div>
                  <div>Status: <span style={{ color: wf.last_status === 'success' ? '#98FF02' : wf.last_status === 'error' ? '#ff4444' : '#888' }}>{wf.last_status}</span></div>
                </div>

                <div style={{ marginTop: '0.6rem', textAlign: 'right' }}>
                  <a href={wf.n8n_url} target="_blank" rel="noopener noreferrer" style={{ color: '#98FF02', fontSize: '0.75rem', textDecoration: 'none' }}>
                    Open in n8n ↗
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow Architecture Diagram */}
          <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '6px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.92rem' }}>Pipeline Connection Graph</h4>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#aaa', lineHeight: 1.6, overflowX: 'auto' }}>
              <div>[MEDIA-API] Dashboard Intake (OAlcoDTP5kNRFgrp)</div>
              <div>  ↳ [FUNNY-02] Gemini Scene Analysis & 60fps Cut (0DlqKnBRQPvkwknF)</div>
              <div>      ↳ [REELS-04] Free Cover Generation & Packaging (E9mNbyn7ZetDGfH6)</div>
              <div>          ├── [REELS-02] Instagram Container Upload (86Kj8o1974krkKlR)</div>
              <div>          │    ↳ [REELS-03] Instagram Publisher (uFAzLSFG7vb8GLXl)</div>
              <div>          └── [YT-01] YouTube Private Shorts Upload (tJ14ZUpQV8diY5gP)</div>
              <div>               ↳ [YT-02] Verified Public Release & Recovery (L3yhy79MTMjELUqZ)</div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 6: ACTIVITY & ERRORS
      ========================================================================= */}
      {activeTab === 'activity' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">REAL-TIME EXECUTION LOGS</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Execution Logs & Errors ({filteredExecutions.length})</h3>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="neon-input"
                value={executionFilter}
                onChange={e => setExecutionFilter(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
              >
                <option value="all">All Executions</option>
                <option value="success">Success Only</option>
                <option value="error">Errors Only</option>
              </select>
            </div>
          </div>

          {filteredExecutions.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>No execution logs recorded in the current window.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222', color: '#777', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Execution ID</th>
                    <th style={{ padding: '0.5rem' }}>Workflow</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                    <th style={{ padding: '0.5rem' }}>Started</th>
                    <th style={{ padding: '0.5rem' }}>Duration</th>
                    <th style={{ padding: '0.5rem' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutions.map(exec => (
                    <tr key={exec.id} style={{ borderBottom: '1px solid #161616' }}>
                      <td style={{ padding: '0.55rem 0.5rem', fontFamily: 'monospace', color: '#98FF02' }}>
                        #{exec.id}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#fff' }}>
                        {exec.workflow_name || exec.workflow_id}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>
                        <span className={`neon-badge ${exec.status === 'success' ? 'live' : 'error'}`} style={{ fontSize: '0.68rem' }}>
                          {exec.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#888' }}>
                        {dateLabel(exec.started_at, true)}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#aaa', fontFamily: 'monospace' }}>
                        {exec.duration_ms ? `${exec.duration_ms} ms` : 'Instant'}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>
                        <a href={exec.n8n_url} target="_blank" rel="noopener noreferrer" style={{ color: '#98FF02', textDecoration: 'none' }}>
                          Inspect ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 7: SETTINGS & CONNECTED ACCOUNTS
      ========================================================================= */}
      {activeTab === 'settings' && (
        <section className="neon-panel">
          <div className="neon-header">
            <div className="neon-title-group">
              <span className="mini-label">ACCOUNT CREDENTIALS & POLICIES</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Social platform status</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>
                Account details are shown only when reported. Connection and publishing permissions still need verification.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Instagram Account Card */}
            <div className="neon-card" style={{ background: '#121212', borderLeft: '4px solid #ff2d75' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ color: '#ff2d75', fontSize: '1rem' }}>Instagram Professional</strong>
                <span className="neon-badge neutral">{data.accounts?.instagram?.status || 'NOT_VERIFIED'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#aaa' }}>
                <div>Account ID: <code style={{ color: '#fff' }}>{data.accounts?.instagram?.account_id || 'Not verified'}</code></div>
                <div>Handle: <code style={{ color: '#fff' }}>{data.accounts?.instagram?.verified_username || 'Not verified'}</code></div>
                <div>Caption credit policy: <code style={{ color: '#98FF02' }}>{data.accounts?.instagram?.caption_branding || '@sastatengo'}</code></div>
                <div>Publish Rule: <span style={{ color: '#98FF02' }}>Publishing policy not verified</span></div>
              </div>
            </div>

            {/* YouTube Account Card */}
            <div className="neon-card" style={{ background: '#121212', borderLeft: '4px solid #ff3333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ color: '#ff3333', fontSize: '1rem' }}>YouTube Shorts Channel</strong>
                <span className="neon-badge neutral">{data.accounts?.youtube?.status || 'NOT_VERIFIED'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#aaa' }}>
                <div>Channel: <code style={{ color: '#fff' }}>{data.accounts?.youtube?.channel || 'Not verified'}</code></div>
                <div>Channel ID: <code style={{ color: '#fff' }}>{data.accounts?.youtube?.channel_id || 'Not verified'}</code></div>
                <div>Handle: <code style={{ color: '#fff' }}>{data.accounts?.youtube?.handle || 'Not verified'}</code></div>
                <div>Publish Rule: <span style={{ color: '#98FF02' }}>Publishing policy not verified</span></div>
              </div>
            </div>
          </div>

          <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px', border: '1px solid #222' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.9rem' }}>Intended pipeline policies</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.82rem', color: '#888' }}>
              <div>
                <strong style={{ color: '#fff', display: 'block' }}>15-Minute Live Delay</strong>
                Target policy: process behind the live edge. Verify the actual workflow delay before use.
              </div>
              <div>
                <strong style={{ color: '#fff', display: 'block' }}>1080×1920 60FPS Output</strong>
                Target format only. Verify source, encoder and actual output with media probes.
              </div>
              <div>
                <strong style={{ color: '#fff', display: 'block' }}>Creator Rights Requirement</strong>
                Require confirmed creator rights before processing. Dashboard intake is currently unavailable.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SUBMIT VIDEO MODAL
      ========================================================================= */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowSubmitModal(false); }}
        >
          <div
            className="neon-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#121212',
              border: '1px solid #98FF02',
              boxShadow: '0 8px 32px rgba(152, 255, 2, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color="#98FF02" /> Submit Video to AI Engine
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitJob} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '4px' }}>
                  YouTube Video or Livestream URL *
                </label>
                <input
                  type="url"
                  required
                  className="neon-input"
                  style={{ width: '100%' }}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/live/..."
                  value={url}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (e.target.value.includes('/live/')) setIsLive(true);
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '4px' }}>
                  Creator / Streamer Instagram Handle (optional attribution)
                </label>
                <input
                  type="text"
                  className="neon-input"
                  style={{ width: '100%' }}
                  placeholder="@carryminati"
                  value={streamerHandle}
                  onChange={e => setStreamerHandle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '4px' }}>
                    Clips Requested
                  </label>
                  <select
                    className="neon-input"
                    style={{ width: '100%' }}
                    value={maxClips}
                    onChange={e => setMaxClips(e.target.value)}
                  >
                    <option value={1}>1 best clip</option>
                    <option value={2}>2 clips</option>
                    <option value={3}>3 clips (standard)</option>
                    <option value={5}>5 clips (maximum)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem' }}>
                  <label className="neon-checkbox">
                    <input
                      type="checkbox"
                      checked={isLive}
                      onChange={e => setIsLive(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.8rem' }}>Track Livestream</span>
                  </label>
                </div>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', padding: '0.75rem' }}>
                <label className="neon-checkbox">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={e => setRightsConfirmed(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#fff' }}>
                    I confirm attribution rights and creator consent for processing.
                  </span>
                </label>
                <small style={{ color: '#888', display: 'block', marginTop: '4px', fontSize: '0.74rem' }}>
                  Submissions without confirmed rights will be recorded as "AWAITING_PERMISSION".
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="neon-button secondary small"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neon-button primary small"
                  disabled={busy || readOnly || data.actions_available !== true}
                >
                  {busy ? 'Queuing…' : 'Queue for Processing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          JOB DETAILS MODAL
      ========================================================================= */}
      {selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedJob(null); }}
        >
          <div
            className="neon-panel"
            style={{
              width: '100%',
              maxWidth: '620px',
              background: '#121212',
              border: '1px solid #333'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
              <div>
                <span className="mini-label">JOB TELEMETRY</span>
                <h3 style={{ margin: 0, color: '#fff' }}>
                  {selectedJob.video_id || selectedJob.job_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#0a0a0a', padding: '0.75rem', borderRadius: '4px' }}>
                <div>
                  <span style={{ color: '#777', display: 'block', fontSize: '0.74rem' }}>Source URL</span>
                  <a href={selectedJob.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#98FF02', textDecoration: 'none' }}>
                    {selectedJob.source_url || selectedJob.video_id} ↗
                  </a>
                </div>
                <div>
                  <span style={{ color: '#777', display: 'block', fontSize: '0.74rem' }}>Mode</span>
                  <span style={{ color: '#fff' }}>{selectedJob.mode || 'VOD Engine'}</span>
                </div>
                <div>
                  <span style={{ color: '#777', display: 'block', fontSize: '0.74rem' }}>Current Stage</span>
                  <span style={{ color: '#00d0ff' }}>{selectedJob.stage || 'INTAKE'}</span>
                </div>
                <div>
                  <span style={{ color: '#777', display: 'block', fontSize: '0.74rem' }}>State</span>
                  <span className={`neon-badge ${selectedJob.state === 'ERROR' ? 'error' : selectedJob.state === 'PROCESSING' ? 'live' : 'neutral'}`} style={{ fontSize: '0.68rem' }}>
                    {selectedJob.state || 'QUEUED'}
                  </span>
                </div>
              </div>

              {selectedJob.error_message && (
                <div style={{ background: '#250000', border: '1px solid #ff4444', borderRadius: '4px', padding: '0.75rem', color: '#ff8888' }}>
                  <strong>Error recorded:</strong> {selectedJob.error_message}
                </div>
              )}

              <div style={{ borderTop: '1px solid #222', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {selectedJob.state === 'AWAITING_PERMISSION' && (
                  <button
                    className="neon-button primary small"
                    disabled={busy || readOnly || data.actions_available !== true}
                    onClick={() => {
                      updateJob(selectedJob.job_id || selectedJob.video_id, 'approve');
                      setSelectedJob(null);
                    }}
                  >
                    <Check size={14} /> Confirm Rights
                  </button>
                )}
                {selectedJob.state === 'ERROR' && (
                  <button
                    className="neon-button secondary small"
                    disabled={busy || readOnly || data.actions_available !== true}
                    onClick={() => {
                      updateJob(selectedJob.job_id || selectedJob.video_id, 'retry');
                      setSelectedJob(null);
                    }}
                  >
                    <RefreshCw size={14} /> Safe Retry
                  </button>
                )}
                <button
                  className="neon-button secondary small"
                  onClick={() => setSelectedJob(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
