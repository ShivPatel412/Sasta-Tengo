import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appointmentsRes, contactsRes] = await Promise.all([
        api.get('/v1/dashboard/stats'),
        api.get('/v1/dashboard/appointments'),
        api.get('/v1/dashboard/contacts')
      ]);

      setStats(statsRes.data);
      setAppointments(appointmentsRes.data);
      setContacts(contactsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const markContactAsRead = async (contactId) => {
    try {
      const res = await api.patch(`/v1/contacts/${contactId}/read`);
      // update local lists so UI reflects change immediately
      setContacts(prev =>
        prev.map(c => (c.id === contactId ? { ...c, is_read: true } : c))
      );

      if (selectedContact && selectedContact.id === contactId) {
        setSelectedContact(res.data);
      }
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking contact as read:', error);
    }
  };

  const deleteContact = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await api.delete(`/v1/contacts/${contactId}`);
        fetchDashboardData();
        setSelectedContact(null);
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'read') return contact.is_read;
    if (filterStatus === 'unread') return !contact.is_read;
    return true;
  });


  // helper to convert ISO timestamp into a readable string
  // by default this will convert to the browser's local timezone.  If you
  // wish to show the *actual stored* time (UTC) or a particular zone, pass a
  // second argument with a valid IANA timezone name (e.g. 'UTC' or 'Asia/Kolkata').
  // default to Indian timezone if none specified
  const formatDateTime = (iso, timeZone = 'Asia/Kolkata') => {
    if (!iso) return '';
    try {
      const opts = { timeZone };
      return new Date(iso).toLocaleString(undefined, opts);
    } catch (e) {
      return iso;
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="header-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Project Requests</h3>
            <p className="stat-value">{stats?.total_appointments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Requests</h3>
            <p className="stat-value">{stats?.pending_appointments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Unread Messages</h3>
            <p className="stat-value">{stats?.unread_contacts || 0}</p>
          </div>
        </div>

        {/* Recent Project Requests */}
        <div className="dashboard-section">
          <h2>Recent Project Requests</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <div>{appointment.client_name}</div>
                      <div className="small">{appointment.client_email}</div>
                    </td>
                    <td>{appointment.service?.title}</td>
                    <td>{formatDateTime(appointment.appointment_date)}</td>
                    <td>
                      <span className={`status status-${appointment.status}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Contact Submissions</h2>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({contacts.length})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterStatus('unread')}
              >
                Unread ({contacts.filter(c => !c.is_read).length})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'read' ? 'active' : ''}`}
                onClick={() => setFilterStatus('read')}
              >
                Read ({contacts.filter(c => c.is_read).length})
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className={!contact.is_read ? 'unread-row' : ''}>
                      <td>{contact.name}</td>
                      <td>{contact.email}</td>
                      <td>{contact.subject}</td>
                      <td>{formatDateTime(contact.created_at)}</td>
                      <td>
                        <span className={`status ${contact.is_read ? 'status-read' : 'status-unread'}`}>
                          {contact.is_read ? 'Read' : 'Unread'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-small btn-primary"
                          onClick={() => {
                            setSelectedContact(contact);
                            if (!contact.is_read) {
                              markContactAsRead(contact.id);
                            }
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">No contacts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contact Details Modal */}
        {selectedContact && (
          <div className="modal-overlay" onClick={() => setSelectedContact(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Contact Details</h2>
                <button className="close-btn" onClick={() => setSelectedContact(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="detail-section">
                  <label>Name</label>
                  <p>{selectedContact.name}</p>
                </div>
                <div className="detail-section">
                  <label>Email</label>
                  <p>
                    <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                  </p>
                </div>
                <div className="detail-section">
                  <label>Phone</label>
                  <p>
                    {selectedContact.phone ? (
                      <a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>
                    ) : (
                      <span className="text-muted">Not provided</span>
                    )}
                  </p>
                </div>
                <div className="detail-section">
                  <label>Subject</label>
                  <p>{selectedContact.subject}</p>
                </div>
                <div className="detail-section">
                  <label>Message</label>
                  <p className="message-text">{selectedContact.message}</p>
                </div>
                <div className="detail-section">
                  <label>Submitted</label>
                  <p>{formatDateTime(selectedContact.created_at)}</p>
                </div>
                <div className="detail-section">
                  <label>Status</label>
                  <p>
                    <span className={`status ${selectedContact.is_read ? 'status-read' : 'status-unread'}`}>
                      {selectedContact.is_read ? 'Read' : 'Unread'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                {!selectedContact.is_read && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      markContactAsRead(selectedContact.id);
                    }}
                  >
                    Mark as Read
                  </button>
                )}
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    deleteContact(selectedContact.id);
                  }}
                >
                  Delete
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setSelectedContact(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
