@extends('dashboard.layout')

@section('page-title', 'Contact Lead')
@section('header-class', 'lead-dashboard-header')

@section('content')
@include('dashboard.lead-icons')
<div class="dashboard-container lead-detail-page">
    <a class="lead-back" href="{{ route('dashboard.contacts') }}">← Back to Contact Messages</a>
    <header class="lead-header"><div><h2>{{ $contact->name }} <span class="badge {{ $contact->is_read ? 'badge-read' : 'badge-unread' }}">{{ $contact->is_read ? 'Read' : 'Unread' }}</span></h2><p>Submitted {{ $contact->created_at->format('M d, Y h:i A') }} <i>•</i> Message ID: CM-{{ $contact->created_at->format('Y') }}-{{ str_pad($contact->id, 4, '0', STR_PAD_LEFT) }}</p></div><nav class="lead-quick-actions" aria-label="Lead actions"><a href="mailto:{{ $contact->email }}"><svg><use href="#lead-email"/></svg>Email</a>@if($contact->phone)<a href="tel:{{ $contact->phone }}"><svg><use href="#lead-phone"/></svg>Call</a>@endif<a class="lead-edit-action" href="#contact-crm"><svg><use href="#lead-notes"/></svg>Edit CRM</a></nav></header>
    <section class="lead-overview"><h3>Lead Overview</h3><div>
        @foreach([['Name', $contact->name, 'user'], ['Email', $contact->email, 'email'], ['Phone', $contact->phone ?: 'Not provided', 'phone'], ['Status', $contact->is_read ? 'Read' : 'Unread', 'status']] as [$label, $value, $icon])
            <article><i><svg><use href="#lead-{{ $icon }}"/></svg></i><span><small>{{ $label }}</small><strong>{{ $value }}</strong></span></article>
        @endforeach
    </div></section>
    <div class="lead-layout">
        <main class="lead-main">
            <section class="lead-card"><h3><i><svg><use href="#lead-details"/></svg></i> Message Information</h3><div class="lead-info-grid"><article><i><svg><use href="#lead-message"/></svg></i><span><small>Subject</small><strong>{{ $contact->subject }}</strong></span></article><article><i><svg><use href="#lead-clock"/></svg></i><span><small>Submitted</small><strong>{{ $contact->created_at->format('M d, Y h:i A') }}</strong></span></article></div></section>
            <section class="lead-card"><h3><i><svg><use href="#lead-message"/></svg></i> Message</h3><div class="lead-message">{{ $contact->message }}</div></section>
        </main>
        <aside class="lead-sidebar"><form id="contact-crm" method="POST" action="{{ route('dashboard.contact-update', $contact) }}">@csrf @method('PUT')
            <section class="lead-card lead-control-card"><h3><i><svg><use href="#lead-status"/></svg></i> Message Status</h3><label><span>Current status</span><strong class="badge {{ $contact->is_read ? 'badge-read' : 'badge-unread' }}">{{ $contact->is_read ? 'Read' : 'Unread' }}</strong></label><label><span>Change status</span><select name="is_read"><option value="1" @selected($contact->is_read)>Read</option><option value="0" @selected(!$contact->is_read)>Unread</option></select></label></section>
            <section class="lead-card lead-control-card"><h3><i><svg><use href="#lead-notes"/></svg></i> Internal Notes</h3><textarea name="admin_notes" maxlength="5000" placeholder="Add follow-up notes or next action...">{{ $contact->admin_notes }}</textarea></section>
            <button class="btn btn-primary lead-save">Save Changes</button>
        </form></aside>
    </div>
</div>
@endsection
