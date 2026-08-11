@extends('dashboard.layout')

@section('page-title', 'Dashboard')

@section('content')
@php
    $pipelineTotal = max(array_sum($pipeline), 1);
    $newStop = $pipeline['new'] / $pipelineTotal * 100;
    $contactedStop = $newStop + $pipeline['contacted'] / $pipelineTotal * 100;
    $qualifiedStop = $contactedStop + $pipeline['qualified'] / $pipelineTotal * 100;
    $maxActivity = max($activity->max('value'), 1);
    $maxService = max($services->max() ?? 0, 1);
@endphp
<div class="dashboard-container crm-dashboard dashboard-modern">
    <svg class="dashboard-icon-sprite" aria-hidden="true">
        <symbol id="icon-contacts" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4.6V20"/></symbol>
        <symbol id="icon-mail" viewBox="0 0 24 24"><path d="M3 6l9 7 9-7M3 6v12h18V6z"/></symbol>
        <symbol id="icon-qualified" viewBox="0 0 24 24"><path d="M12 3l2 2 3-.2.8 2.8L20 9l-1.4 2.5.4 3-2.8 1-1.4 2.5-2.8-.8-2.8.8-1.4-2.5-2.8-1 .4-3L4 9l2.2-1.4L7 4.8l3 .2zM9 12l2 2 4-4"/></symbol>
        <symbol id="icon-request" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM15 3v5h5M9 12h7M9 16h7"/></symbol>
        <symbol id="icon-folder" viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></symbol>
    </svg>

    <div class="dashboard-kpis">
        @foreach([
            ['Contact Leads', $stats['total_contacts'], 'contacts', 'violet'],
            ['Unread Messages', $stats['unread_contacts'], 'mail', 'amber'],
            ['Qualified Leads', $stats['qualified_contacts'], 'qualified', 'green'],
            ['Project Requests', $stats['total_appointments'], 'request', 'blue'],
            ['Published Projects', $stats['total_projects'], 'folder', 'purple'],
        ] as [$label, $value, $icon, $tone])
            <article class="dashboard-kpi kpi-{{ $tone }}"><span><svg><use href="#icon-{{ $icon }}"/></svg></span><div><small>{{ $label }}</small><strong>{{ $value }}</strong><em>Current total</em></div></article>
        @endforeach
    </div>

    <div class="dashboard-charts">
        <section class="dashboard-panel pipeline-chart-panel"><header><div><h2>Lead Pipeline</h2><p>Contacts and project requests by stage</p></div></header><div class="pipeline-chart-body">
            <div class="pipeline-donut" style="--new:{{ $newStop }}%;--contacted:{{ $contactedStop }}%;--qualified:{{ $qualifiedStop }}%"><span><strong>{{ array_sum($pipeline) }}</strong>Total</span></div>
            <div class="pipeline-legend">@foreach(['new' => 'New', 'contacted' => 'Contacted', 'qualified' => 'Qualified', 'closed' => 'Closed'] as $stage => $label)<div class="legend-{{ $stage }}"><i></i><span>{{ $label }}</span><b>{{ $pipeline[$stage] }}</b><small>{{ round($pipeline[$stage] / $pipelineTotal * 100, 1) }}%</small></div>@endforeach</div>
        </div></section>
        <section class="dashboard-panel activity-panel"><header><div><h2>Activity Overview</h2><p>New messages and requests over the last 7 days</p></div></header><div class="activity-bars">@foreach($activity as $day)<div><span style="height:{{ max(6, $day['value'] / $maxActivity * 100) }}%" title="{{ $day['value'] }} activities"></span><b>{{ $day['value'] }}</b><small>{{ $day['label'] }}</small></div>@endforeach</div></section>
    </div>

    <div class="dashboard-bottom-grid">
        <section class="dashboard-panel recent-message-panel"><header><h2>Recent Messages</h2><a href="{{ route('dashboard.contacts') }}">View all</a></header><div class="dashboard-message-list">@forelse($contacts as $contact)<a href="{{ route('dashboard.contact-detail', $contact) }}"><i>{{ strtoupper(substr($contact->name, 0, 1)) }}</i><span><strong>{{ $contact->name }}</strong><small>{{ Str::limit($contact->subject, 38) }}</small></span><time>{{ $contact->created_at->diffForHumans(null, true) }}</time></a>@empty<p class="dashboard-empty">No messages yet.</p>@endforelse</div></section>
        <section class="dashboard-panel request-summary-panel"><header><h2>Project Requests</h2><a href="{{ route('dashboard.appointments') }}">View all</a></header><div class="status-summary">@foreach(['pending' => 'Pending', 'confirmed' => 'Confirmed', 'completed' => 'Completed', 'cancelled' => 'Cancelled'] as $status => $label)<div class="summary-{{ $status }}"><span>{{ $label }}</span><strong>{{ $requestStatuses[$status] ?? 0 }}</strong></div>@endforeach</div></section>
        <section class="dashboard-panel service-panel"><header><h2>Top Services Requested</h2></header><div class="service-list">@forelse($services as $service => $count)<div><span>{{ $service }}</span><i><b style="width:{{ $count / $maxService * 100 }}%"></b></i><strong>{{ $count }}</strong></div>@empty<p class="dashboard-empty">No project requests yet.</p>@endforelse</div></section>
    </div>
</div>
@endsection
