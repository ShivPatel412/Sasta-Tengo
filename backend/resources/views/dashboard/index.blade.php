@extends('dashboard.layout')

@section('page-title', 'Dashboard')

@section('content')
<div class="dashboard-container">
    <!-- Stats Grid -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">📧</div>
            <div class="stat-content">
                <h3>Contact Messages</h3>
                <p class="stat-value">{{ $stats['total_contacts'] }}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon unread">🔴</div>
            <div class="stat-content">
                <h3>Unread Messages</h3>
                <p class="stat-value">{{ $stats['unread_contacts'] }}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
                <h3>Project Requests</h3>
                <p class="stat-value">{{ $stats['total_appointments'] }}</p>
            </div>
        </div>
    </div>

    <!-- Recent Contacts -->
    <div class="section">
        <div class="section-header">
            <h2>Recent Contact Messages</h2>
            <a href="{{ route('dashboard.contacts') }}" class="btn btn-secondary">View All</a>
        </div>
        
        <div class="table-responsive">
            <table class="table">
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
                    @forelse($contacts as $contact)
                        <tr class="{{ !$contact->is_read ? 'unread' : '' }}">
                            <td><strong>{{ $contact->name }}</strong></td>
                            <td>{{ $contact->email }}</td>
                            <td>{{ Str::limit($contact->subject, 30) }}</td>
                            <td>{{ $contact->created_at->format('M d, Y') }}</td>
                            <td>
                                <span class="badge {{ $contact->is_read ? 'badge-read' : 'badge-unread' }}">
                                    {{ $contact->is_read ? 'Read' : 'Unread' }}
                                </span>
                            </td>
                            <td>
                                <a href="{{ route('dashboard.contact-detail', $contact->id) }}" class="btn btn-small btn-primary">View</a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="text-center text-muted">No contacts found</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Recent Project Requests -->
    <div class="section">
        <div class="section-header">
            <h2>Recent Project Requests</h2>
            <a href="{{ route('dashboard.appointments') }}" class="btn btn-secondary">View All</a>
        </div>
        
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Service</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($appointments as $appointment)
                        <tr>
                            <td><strong>{{ $appointment->client_name }}</strong></td>
                            <td>{{ $appointment->service->title ?? 'N/A' }}</td>
                            <td>{{ $appointment->appointment_date->format('M d, Y h:i A') }}</td>
                            <td>
                                <span class="badge badge-{{ $appointment->status }}">{{ ucfirst($appointment->status) }}</span>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="4" class="text-center text-muted">No project requests found</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
