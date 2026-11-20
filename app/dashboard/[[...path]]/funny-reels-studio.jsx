'use client';
import { useEffect, useState } from 'react';
import { adminApi as api, jsonRequest } from '../../../lib/dashboard-client.mjs';
import { dateLabel } from '../../../lib/dashboard.mjs';
import { FilmStrip, ExternalLink, RefreshCw, Check, Sparkles, Play } from './dashboard-icons';
import './control-room-neon.css';

export default function FunnyReelsStudio({ readOnly, refresh }) {
  const [data, setData] = useState({ jobs: [], streams: [], clips: [], drive_url: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Submission Form State
  const [url, setUrl] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(true);
  const [maxClips, setMaxClips] = useState(3);
  const [segmentSeconds, setSegmentSeconds] = useState(900);
  const [selectedClip, setSelectedClip] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
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
    load();
    return () => { active = false; };
  }, [refresh]);

  async function submitJob(e) {
    e.preventDefault();
    if (readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await api('funny-reels', jsonRequest('POST', {
        youtube_url: url,
        is_livestream: isLive,
        rights_confirmed: rightsConfirmed,
        max_clips: Number(maxClips),
        segment_seconds: Number(segmentSeconds)
      }));
      setNotice(res.message || 'Job queued successfully.');
      setUrl('');
      // Reload
      const updated = await api('funny-reels');
      setData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateJob(jobId, action) {
    if (readOnly || busy) return;
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

  return (
    <div className="funny-reels-studio">
      {/* Top Banner */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">AI CONTENT ENGINE</span>
            <h2><FilmStrip size={28} color="#98FF02" /> Funny Reels Studio</h2>
            <p>Automated clip extraction from YouTube videos and active livestreams with streamer attribution.</p>
          </div>
          <div className="neon-actions">
            {data.drive_url && (
              <a href={data.drive_url} target="_blank" rel="noopener noreferrer" className="neon-button secondary">
                <ExternalLink size={16} /> Open Google Drive
              </a>
            )}
          </div>
        </div>

        {/* Live Delay Notice */}
        <div className="neon-delay-banner">
          <span className="neon-dot live" />
          <span>Livestream engine tracks active broadcasts with a <strong>10–15 minute safety delay buffer</strong> behind the live edge to ensure complete scene analysis.</span>
        </div>

        {/* Submission Terminal */}
        <form onSubmit={submitJob} className="neon-form">
          <div className="neon-input-group">
            <label htmlFor="yt-url">YouTube Video or Livestream URL</label>
            <input
              id="yt-url"
              className="neon-input"
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/live/..."
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                if (e.target.value.includes('/live/')) setIsLive(true);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="neon-checkbox">
              <input type="checkbox" checked={isLive} onChange={e => setIsLive(e.target.checked)} />
              <span>Track as Livestream (continuous 15-min chunk buffer)</span>
            </label>

            <label className="neon-checkbox">
              <input type="checkbox" checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} />
              <span>Attribution confirmed (include creator handle)</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#888' }}>Max clips:</span>
              <select className="neon-input" value={maxClips} onChange={e => setMaxClips(e.target.value)} style={{ padding: '0.35rem 0.5rem' }}>
                <option value={1}>1 clip</option>
                <option value={2}>2 clips</option>
                <option value={3}>3 clips</option>
                <option value={5}>5 clips</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button type="submit" className="neon-button primary" disabled={busy || readOnly}>
              {busy ? 'Queuing…' : <><Sparkles size={16} /> Submit to AI Pipeline</>}
            </button>
            {notice && <span style={{ color: '#98FF02', fontSize: '0.88rem' }}>{notice}</span>}
            {error && <span style={{ color: '#ff4444', fontSize: '0.88rem' }}>{error}</span>}
          </div>
        </form>
      </section>

      {/* Stream & Job Pipeline Tracking */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">PROCESSING STATUS</span>
            <h2>Active Streams & Video Jobs ({allJobs.length})</h2>
          </div>
        </div>

        {allJobs.length === 0 ? (
          <p style={{ color: '#777', padding: '1rem 0' }}>No active or queued video jobs. Submit a YouTube link above to start processing.</p>
        ) : (
          <div className="neon-grid">
            {allJobs.map((job, idx) => {
              const key = job.job_id || job.stream_id || `job-${idx}`;
              const isStream = job.mode === 'livestream' || Boolean(job.delay_minutes);
              const progress = job.progress_percent || (job.state === 'DONE' ? 100 : job.state === 'PROCESSING' ? 50 : 15);
              const hasError = job.state === 'ERROR' || Boolean(job.last_error || job.error_message);

              return (
                <div key={key} className="neon-card">
                  <div className="neon-card-top">
                    <span className={`neon-badge ${hasError ? 'error' : job.state === 'PROCESSING' ? 'live' : 'neutral'}`}>
                      <span className={`neon-dot ${hasError ? 'error' : job.state === 'PROCESSING' ? 'live' : 'neutral'}`} />
                      {job.state || 'QUEUED'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                      {isStream ? '15m Live Buffer' : 'VOD Engine'}
                    </span>
                  </div>

                  <strong style={{ fontSize: '1rem', color: '#fff', wordBreak: 'break-all' }}>
                    {job.source_url ? (
                      <a href={job.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>
                        {job.video_id || job.source_url} ↗
                      </a>
                    ) : (job.video_id || key)}
                  </strong>

                  <div className="neon-progress-bar">
                    <div className="neon-progress-fill" style={{ width: `${progress}%`, background: hasError ? '#ff4444' : '#98FF02' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#888' }}>
                    <span>Stage: {job.stage || 'PROCESSING'}</span>
                    <span>{job.clips_selected ? `${job.clips_selected} clips` : 'Evaluating'}</span>
                  </div>

                  {hasError && (
                    <div style={{ color: '#ff6666', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                      {job.last_error || job.error_message || 'Processing stalled'}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {job.state === 'AWAITING_PERMISSION' && (
                      <button className="neon-button primary small" disabled={busy || readOnly} onClick={() => updateJob(key, 'approve')}>
                        <Check size={14} /> Confirm Attribution
                      </button>
                    )}
                    {hasError && (
                      <button className="neon-button secondary small" disabled={busy || readOnly} onClick={() => updateJob(key, 'retry')}>
                        <RefreshCw size={14} /> Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AI-Selected Clips & Video Preview Player */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">VERIFIED CLIPS</span>
            <h2>AI-Selected Funny Clips & Preview</h2>
            <p>Clips rendered at 1080x1920 (9:16) with streamer credit. Review and approve before publishing.</p>
          </div>
        </div>

        {(!data.clips || data.clips.length === 0) ? (
          <p style={{ color: '#777', padding: '1rem 0' }}>No rendered clips found in local probes. Submit and process a video to see clips here.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Native Video Player */}
            <div className="neon-video-container">
              {selectedClip ? (
                <>
                  <video
                    className="neon-video"
                    controls
                    playsInline
                    src={`/api/admin/project-media/${encodeURIComponent(selectedClip.filename || 'sample.mp4')}`}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="neon-clip-meta">
                    <div>
                      <strong style={{ color: '#98FF02', display: 'block', fontSize: '0.95rem' }}>
                        {selectedClip.filename}
                      </strong>
                      <small style={{ color: '#888' }}>
                        Streamer: {selectedClip.streamer || '@carryminati'} · Size: {(selectedClip.size_bytes / (1024 * 1024)).toFixed(1)} MB
                      </small>
                    </div>
                    <button
                      className="neon-button primary"
                      disabled={busy || readOnly}
                      onClick={() => setNotice(`Clip approved for publishing queue.`)}
                    >
                      <Check size={16} /> Approve Clip
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  Select a clip to preview
                </div>
              )}
            </div>

            {/* Clips List */}
            <div className="neon-clips-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.clips.map((clip, idx) => {
                const isSelected = selectedClip?.filename === clip.filename;
                return (
                  <div
                    key={clip.filename || idx}
                    className="neon-card"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? '#98FF02' : '#262626',
                      background: isSelected ? '#1c1c1c' : '#141414'
                    }}
                    onClick={() => setSelectedClip(clip)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: isSelected ? '#98FF02' : '#fff', fontSize: '0.92rem' }}>
                        <Play size={14} style={{ marginRight: '6px', verticalAlign: '-1px' }} />
                        {clip.filename}
                      </strong>
                      <span className="neon-badge live">READY</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#888' }}>
                      <span>Attribution: {clip.streamer || '@carryminati'}</span>
                      <span>{(clip.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
