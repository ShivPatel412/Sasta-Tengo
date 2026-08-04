@extends('dashboard.layout')

@section('page-title', 'Project Requests')

@section('content')
<div class="dashboard-container">
    <div class="section">
        <div class="section-header">
            <h2>Multi-Step Form Submissions</h2>
            <p class="text-muted">Total: {{ $stats['total_appointments'] }} | Pending: {{ $stats['pending_appointments'] }}</p>
        </div>

        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Email</th>
                        <th>Service</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($appointments as $appointment)
                        <tr>
                            <td><strong>{{ $appointment->client_name }}</strong></td>
                            <td>{{ $appointment->client_email }}</td>
                            <td>{{ $appointment->service->title ?? 'N/A' }}</td>
                            <td>{{ $appointment->appointment_date->format('M d, Y h:i A') }}</td>
                            <td>
                                <span class="badge badge-{{ $appointment->status }}">
                                    {{ ucfirst($appointment->status) }}
                                </span>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="text-center text-muted">No project requests found</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
            {{ $appointments->links() }}
        </div>
    </div>
</div>
@endsection
