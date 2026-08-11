@extends('dashboard.layout')

@section('page-title', 'Project Requests')

@section('content')
<div class="dashboard-container crm-page">
    <p class="page-subtitle">Track and follow up every project inquiry.</p>
    <div class="request-stats">
        @foreach([
            ['Total', $stats['total_appointments'], 'total'],
            ['Pending', $stats['pending_appointments'], 'pending'],
            ['Confirmed', $stats['confirmed_appointments'], 'confirmed'],
            ['Completed', $stats['completed_appointments'], 'completed'],
        ] as [$label, $value, $tone])
            <article class="request-stat request-stat-{{ $tone }}"><span>{{ $value }}</span><strong>{{ $label }}</strong></article>
        @endforeach
    </div>
    <section class="section request-filter-card">
        <form class="crm-search" method="GET">
            <select name="status"><option value="">All statuses</option>@foreach(['pending','confirmed','completed','cancelled'] as $status)<option value="{{ $status }}" @selected(request('status') === $status)>{{ ucfirst($status) }}</option>@endforeach</select>
            <input name="search" value="{{ request('search') }}" placeholder="Search client or service...">
            <button>Filter</button>
        </form>
    </section>
    <section class="section crm-card">
        <div class="table-responsive">
            <table class="table crm-table requests-clean">
                <thead><tr><th>Client</th><th>Contact</th><th>Service</th><th>Date & Time</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    @forelse($appointments as $appointment)
                        <tr>
                            <td><strong>{{ $appointment->client_name }}</strong></td>
                            <td>{{ $appointment->client_email }}<small>{{ $appointment->client_phone }}</small></td>
                            <td>{{ $appointment->service->title ?? data_get($appointment->request_data, 'service', 'N/A') }}</td>
                            <td>{{ ($appointment->appointment_date ?? $appointment->created_at)->format('M d, Y') }}<small>{{ ($appointment->appointment_date ?? $appointment->created_at)->format('h:i A') }}</small></td>
                            <td><span class="badge badge-{{ $appointment->status }}">{{ ucfirst($appointment->status) }}</span></td>
                            <td><a href="{{ route('dashboard.appointment-detail', $appointment) }}" class="contact-view" aria-label="View request from {{ $appointment->client_name }}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg></a></td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-center text-muted">No matching project requests found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="crm-footer"><span>Showing {{ $appointments->firstItem() ?? 0 }}–{{ $appointments->lastItem() ?? 0 }} of {{ $appointments->total() }} requests</span>{{ $appointments->links() }}</div>
    </section>
</div>
@endsection
