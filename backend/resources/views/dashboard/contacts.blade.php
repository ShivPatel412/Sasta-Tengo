@extends('dashboard.layout')

@section('page-title', 'Contact Messages')

@section('content')
<div class="dashboard-container crm-page">
    <p class="page-subtitle">View, qualify and manage leads from your contact form.</p>
    <section class="section crm-card">
        <div class="crm-toolbar">
            <nav class="message-toggle" aria-label="Message filter">
                <a href="{{ route('dashboard.contacts', ['search' => request('search')]) }}" class="{{ request('filter') !== 'unread' ? 'active' : '' }}">All Messages <span>{{ $stats['total_contacts'] }}</span></a>
                <a href="{{ route('dashboard.contacts', ['filter' => 'unread', 'search' => request('search')]) }}" class="{{ request('filter') === 'unread' ? 'active' : '' }}">Unread <span>{{ $stats['unread_contacts'] }}</span></a>
            </nav>
            <form class="crm-search" method="GET">
                @if(request('filter'))<input type="hidden" name="filter" value="{{ request('filter') }}">@endif
                <span>⌕</span><input name="search" value="{{ request('search') }}" placeholder="Search messages..."><button>Search</button>
            </form>
        </div>

        <div class="table-responsive">
            <table class="table crm-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Date</th><th>Stage</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    @forelse($contacts as $contact)
                        <tr class="{{ !$contact->is_read ? 'unread' : '' }}">
                            <td><span class="contact-name"><i>{{ strtoupper(substr($contact->name, 0, 1)) }}</i><strong>{{ $contact->name }}</strong></span></td>
                            <td>{{ $contact->email }}</td><td><a href="tel:{{ $contact->phone }}">{{ $contact->phone ?? '-' }}</a></td>
                            <td>{{ Str::limit($contact->subject, 28) }}</td><td>{{ $contact->created_at->setTimezone(config('app.timezone'))->format('M d, Y') }}<small>{{ $contact->created_at->setTimezone(config('app.timezone'))->format('h:i A') }}</small></td>
                            <td><span class="lead-stage stage-{{ $contact->lead_status }}">{{ ucfirst($contact->lead_status) }}</span></td>
                            <td><span class="badge {{ $contact->is_read ? 'badge-read' : 'badge-unread' }}">{{ $contact->is_read ? 'Read' : 'Unread' }}</span></td>
                            <td><a href="{{ route('dashboard.contact-detail', $contact->id) }}" class="btn btn-small btn-outline">◉ View</a></td>
                        </tr>
                    @empty
                        <tr><td colspan="8" class="text-center text-muted">No matching messages found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="crm-footer"><span>Showing {{ $contacts->firstItem() ?? 0 }}–{{ $contacts->lastItem() ?? 0 }} of {{ $contacts->total() }} messages</span>{{ $contacts->links() }}</div>
    </section>
</div>
@endsection
