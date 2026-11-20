'use client';
import { useEffect, useState } from 'react';
import { adminApi as api, jsonRequest } from '../../../lib/dashboard-client.mjs';
import { dateLabel } from '../../../lib/dashboard.mjs';
import { YoutubeLogo, ExternalLink, Check, ShieldCheck, RefreshCw } from './dashboard-icons';
import './control-room-neon.css';

export default function YouTubeStudio({ readOnly, refresh }) {
  const [data, setData] = useState({ uploads: [], channel: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [scheduledDates, setScheduledDates] = useState({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await api('youtube');
        if (active) {
          setData(res);
          setError('');
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

  async function updateStatus(id, action, privacy_status) {
    if (readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const scheduled_at = scheduledDates[id] || null;
      await api('youtube', jsonRequest('PATCH', { id, action, privacy_status, scheduled_at }));
      setNotice(`Updated upload ${id} (${action}).`);
      const updated = await api('youtube');
      setData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const uploads = data.uploads || [];

  return (
    <div className="youtube-studio">
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">VIDEO PUBLISHING PIPELINE</span>
            <h2><YoutubeLogo size={28} color="#ff0000" /> YouTube Shorts Management</h2>
            <p>Review and schedule YouTube Shorts. All automated uploads are held as <strong>PRIVATE</strong> until manual review.</p>
          </div>
          <div className="neon-actions">
            <span className="neon-badge live">
              <span className="neon-dot live" /> Channel: {data.channel?.handle || '@ShivPatel412'}
            </span>
          </div>
        </div>

        {/* Safety Gate Banner */}
        <div className="neon-delay-banner" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
          <ShieldCheck size={20} color="#98FF02" />
          <span><strong>Manual Review Gate:</strong> In accordance with SHIV OS security policy, no video is set to public automatically. Every Short must be approved below before public release.</span>
        </div>
      </section>

      {/* Uploads Queue & History */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">UPLOAD QUEUE & RELEASES</span>
            <h2>Shorts Upload Queue ({uploads.length})</h2>
          </div>
        </div>

        {notice && <p style={{ color: '#98FF02', marginBottom: '1rem', fontSize: '0.88rem' }}>{notice}</p>}
        {error && <p style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.88rem' }}>{error}</p>}

        {uploads.length === 0 ? (
          <p style={{ color: '#777', padding: '1rem 0' }}>No YouTube Shorts uploads recorded in the queue yet.</p>
        ) : (
          <div className="neon-table-wrapper">
            <table className="neon-table">
              <thead>
                <tr>
                  <th>Title & Video</th>
                  <th>YouTube ID & Link</th>
                  <th>Current Privacy</th>
                  <th>Upload Time</th>
                  <th>Scheduled Release</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(item => {
                  const isPublic = item.privacy_status === 'public';
                  const isScheduled = item.status === 'SCHEDULED' || Boolean(item.scheduled_at);

                  return (
                    <tr key={item.id || item.job_key}>
                      <td>
                        <strong>{item.title || 'Untitled Short'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          Streamer: @{item.streamer_handle || 'unknown'} · {item.job_key}
                        </div>
                      </td>
                      <td>
                        {item.youtube_url ? (
                          <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#98FF02', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {item.youtube_video_id || 'View Short'} <ExternalLink size={13} />
                          </a>
                        ) : (
                          <code>{item.youtube_video_id || 'Pending ID'}</code>
                        )}
                      </td>
                      <td>
                        <span className={`neon-badge ${isPublic ? 'live' : isScheduled ? 'paused' : 'neutral'}`}>
                          {item.privacy_status ? item.privacy_status.toUpperCase() : 'PRIVATE'}
                        </span>
                      </td>
                      <td>
                        <small>{dateLabel(item.created_at || item.createdAt, true)}</small>
                      </td>
                      <td>
                        <input
                          type="datetime-local"
                          className="neon-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', background: '#111' }}
                          disabled={readOnly || busy}
                          value={scheduledDates[item.id] || (item.scheduled_at ? item.scheduled_at.slice(0, 16) : '')}
                          onChange={e => setScheduledDates({ ...scheduledDates, [item.id]: e.target.value })}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!isPublic && (
                            <button
                              className="neon-button primary small"
                              disabled={readOnly || busy}
                              onClick={() => updateStatus(item.id, 'review_approve', 'public')}
                              title="Approve for public release"
                            >
                              <Check size={14} /> Make Public
                            </button>
                          )}
                          <button
                            className="neon-button secondary small"
                            disabled={readOnly || busy}
                            onClick={() => updateStatus(item.id, 'schedule', item.privacy_status)}
                          >
                            Save Schedule
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
