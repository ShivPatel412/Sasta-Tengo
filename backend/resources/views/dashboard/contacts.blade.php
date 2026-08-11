@extends('dashboard.layout')

@section('page-title', 'Contact Messages')

@section('content')
<div class="dashboard-container crm-page">
    <p class="page-subtitle">View and manage messages from your contact form.</p>
    <section class="section crm-card">
        <div class="crm-toolbar">
            <nav class="message-toggle" aria-label="Message filter">
                <a href="{{ route('dashboard.contacts', ['search' => request('search')]) }}" class="{{ request('filter') !== 'unread' ? 'active' : '' }}">All Messages <span>{{ $stats['total_contacts'] }}</span></a>
                <a href="{{ route('dashboard.contacts', ['filter' => 'unread', 'search' => request('search')]) }}" class="{{ request('filter') === 'unread' ? 'active' : '' }}">Unread <span>{{ $stats['unread_contacts'] }}</span></a>
            </nav>
            <form class="crm-search" method="GET">
                @if(request('filter'))<input type="hidden" name="filter" value="{{ request('filter') }}">@endif
                <input name="search" value="{{ request('search') }}" placeholder="Search messages..."><button aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>
            </form>
        </div>
        <div class="table-responsive">
            <table class="table crm-table contacts-clean">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    @forelse($contacts as $contact)
                        <tr class="{{ !$contact->is_read ? 'unread' : '' }}">
                            <td><span class="contact-name"><i>{{ strtoupper(substr($contact->name, 0, 1)) }}</i><strong>{{ $contact->name }}</strong></span></td>
                            <td>{{ $contact->email }}</td><td><a href="tel:{{ $contact->phone }}">{{ $contact->phone ?? '-' }}</a></td>
                            <td>{{ Str::limit($contact->subject, 28) }}</td><td>{{ $contact->created_at->setTimezone(config('app.timezone'))->format('M d, Y') }}<small>{{ $contact->created_at->setTimezone(config('app.timezone'))->format('h:i A') }}</small></td>
                            <td><span class="badge {{ $contact->is_read ? 'badge-read' : 'badge-unread' }}">{{ $contact->is_read ? 'Read' : 'Unread' }}</span></td>
                            <td><a href="{{ route('dashboard.contact-detail', $contact) }}" class="contact-view" aria-label="View message from {{ $contact->name }}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg></a></td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted">No matching messages found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="crm-footer"><span>Showing {{ $contacts->firstItem() ?? 0 }}–{{ $contacts->lastItem() ?? 0 }} of {{ $contacts->total() }} messages</span>{{ $contacts->links() }}</div>
    </section>
</div>
@endsection
