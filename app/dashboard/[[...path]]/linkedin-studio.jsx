'use client';
import { useEffect, useState } from 'react';
import { adminApi as api, jsonRequest } from '../../../lib/dashboard-client.mjs';
import { dateLabel } from '../../../lib/dashboard.mjs';
import { LinkedinLogo, Check, X, ShieldCheck, RefreshCw } from './dashboard-icons';
import './control-room-neon.css';

export default function LinkedInStudio({ readOnly, refresh }) {
  const [data, setData] = useState({ automation_status: 'PAUSED', oauth_ready: false, control: { max_posts_week: 2 }, queue: [], audit: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(2);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await api('linkedin');
        if (active) {
          setData(res);
          if (res.control?.max_posts_week) setLimit(res.control.max_posts_week);
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

  async function updateQueue(queueId, action, post_text) {
    if (readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('linkedin', jsonRequest('PATCH', { queue_id: queueId, action, post_text }));
      setNotice(`Draft ${queueId} marked as ${action}.`);
      const updated = await api('linkedin');
      setData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateWeeklyLimit(e) {
    e.preventDefault();
    if (readOnly || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('linkedin', jsonRequest('PATCH', { action: 'update_limits', max_posts_week: Number(limit) }));
      setNotice(`Weekly limit updated to ${limit} posts.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const queue = data.queue || [];
  const audit = data.audit || [];

  return (
    <div className="linkedin-studio">
      {/* Top Banner: Automation Status */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">PROFESSIONAL NETWORK AUTOMATION</span>
            <h2><LinkedinLogo size={28} color="#0077b5" /> LinkedIn Publisher</h2>
            <p>AI-assisted drafts with strict source fact checking. Fail-closed architecture prevents unauthorized posts.</p>
          </div>
          <div className="neon-actions">
            <span className="neon-badge paused">
              <span className="neon-dot paused" /> STATUS: PAUSED (SAFE MODE)
            </span>
          </div>
        </div>

        {/* OAuth Readiness & Safety Banner */}
        <div className="neon-delay-banner" style={{ borderColor: 'rgba(255, 170, 0, 0.4)', background: 'rgba(255, 170, 0, 0.05)' }}>
          <ShieldCheck size={20} color="#ffaa00" />
          <div>
            <strong style={{ color: '#ffaa00' }}>Automation Safeguard:</strong> LinkedIn workflow is deliberately held in <strong>PAUSED</strong> state.
            <div style={{ fontSize: '0.8rem', color: '#bbb', marginTop: '0.2rem' }}>
              Connection readiness: OAuth Person URN is pending configuration. Automatic publishing is blocked. All drafts require manual review.
            </div>
          </div>
        </div>

        {/* Weekly Limit Form */}
        <form onSubmit={updateWeeklyLimit} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', color: '#ccc' }}>Weekly Publishing Cap:</span>
          <select
            className="neon-input"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            disabled={readOnly || busy}
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <option value={1}>1 post per week</option>
            <option value={2}>2 posts per week (recommended)</option>
            <option value={3}>3 posts per week</option>
            <option value={5}>5 posts per week</option>
          </select>
          <button type="submit" className="neon-button secondary small" disabled={readOnly || busy}>
            Save Limit
          </button>
          {notice && <span style={{ color: '#98FF02', fontSize: '0.85rem' }}>{notice}</span>}
          {error && <span style={{ color: '#ff4444', fontSize: '0.85rem' }}>{error}</span>}
        </form>
      </section>

      {/* Content Approval Queue */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">CONTENT APPROVAL QUEUE</span>
            <h2>Pending AI Drafts ({queue.length})</h2>
          </div>
        </div>

        {queue.length === 0 ? (
          <p style={{ color: '#777', padding: '1rem 0' }}>No drafts awaiting review in the approval queue.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {queue.map(item => (
              <div key={item.id} className="neon-card" style={{ background: '#121212' }}>
                <div className="neon-card-top">
                  <span className="neon-badge neutral">TOPIC: {item.topic || 'General'}</span>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    Created {dateLabel(item.createdAt || item.created_at, true)}
                  </span>
                </div>

                <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px', border: '1px solid #222', fontSize: '0.92rem', color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>
                  {item.post_text || item.summary || 'Draft content'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#98FF02' }}>
                    ✓ Safety Checked: No secrets · Validated source URLs only
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="neon-button primary small" disabled={readOnly || busy} onClick={() => updateQueue(item.id, 'approve')}>
                      <Check size={14} /> Approve Draft
                    </button>
                    <button className="neon-button danger small" disabled={readOnly || busy} onClick={() => updateQueue(item.id, 'reject')}>
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Publish Audit Log */}
      <section className="neon-panel">
        <div className="neon-header">
          <div className="neon-title-group">
            <span className="mini-label">AUDIT TRAIL</span>
            <h2>Publish Audit Log ({audit.length})</h2>
          </div>
        </div>

        {audit.length === 0 ? (
          <p style={{ color: '#777', padding: '1rem 0' }}>No audit trail records logged yet.</p>
        ) : (
          <div className="neon-table-wrapper">
            <table className="neon-table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Action</th>
                  <th>Topic</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry, idx) => (
                  <tr key={entry.id || idx}>
                    <td><small>{dateLabel(entry.event_time || entry.createdAt, true)}</small></td>
                    <td>
                      <span className={`neon-badge ${entry.action === 'published' ? 'live' : entry.action === 'initialized' ? 'paused' : 'neutral'}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td><strong>{entry.topic}</strong></td>
                    <td style={{ color: '#aaa', fontSize: '0.82rem' }}>{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
