@extends('dashboard.layout')

@section('page-title', 'Project Details')

@section('content')
@php
    $category = $projectTypes[$project->category] ?? $project->category;
    $poster = $project->poster_url ?: ($project->image ? asset('images/'.$project->image) : null);
@endphp
<div class="dashboard-container project-detail-page">
    <a class="project-back" href="{{ route('dashboard.projects') }}">← Back to Projects</a>
    <header class="project-detail-hero project-card-{{ Str::slug($project->category) }}">
        <span class="project-folder-orb"><img src="{{ asset('images/project-folder.png') }}" alt=""></span>
        <div><h2>{{ $project->title }}</h2><div class="project-meta"><span class="project-category">{{ $category }}</span><span>Order: {{ $project->order }}</span>@if($project->is_featured)<span class="project-featured">Featured</span>@endif</div><p>Last updated: {{ $project->updated_at->format('M d, Y') }}</p></div>
        <a class="btn btn-outline" href="{{ route('dashboard.projects', ['edit' => $project->id]) }}">Edit</a>
    </header>

    <div class="project-detail-grid" id="overview">
        <div class="project-detail-column">
            <section class="project-info-card"><h3>About Project</h3><p>{{ $project->description }}</p></section>
            <section class="project-info-card"><h3>Tech Stack</h3><div class="technology-tags">@forelse($project->technologies ?? [] as $technology)<span>{{ $technology }}</span>@empty<p class="text-muted">No technologies added.</p>@endforelse</div></section>
            <section class="project-info-card" id="links"><h3>Links</h3>
                @if($project->github_url)<a class="project-link-row" href="{{ $project->github_url }}" target="_blank" rel="noopener"><span>GitHub</span><strong>{{ $project->github_url }}</strong><b>↗</b></a>@endif
                @if($project->live_url)<a class="project-link-row" href="{{ $project->live_url }}" target="_blank" rel="noopener"><span>Live Demo</span><strong>{{ $project->live_url }}</strong><b>↗</b></a>@endif
                @if(!$project->github_url && !$project->live_url)<p class="text-muted">No project links added.</p>@endif
            </section>
        </div>
        <div class="project-detail-column" id="images">
            <section class="project-info-card"><h3>Poster Image</h3>@if($poster)<img class="project-poster" src="{{ $poster }}" alt="{{ $project->title }} poster">@else<p class="project-image-empty">No poster image added.</p>@endif</section>
            <section class="project-info-card"><h3>Gallery ({{ count($project->gallery ?? []) }})</h3>@if($project->gallery)<div class="project-gallery">@foreach($project->gallery_urls as $image)<a href="{{ $image }}" target="_blank"><img src="{{ $image }}" alt="{{ $project->title }} gallery image"></a>@endforeach</div>@else<p class="project-image-empty">No gallery images added.</p>@endif</section>
        </div>
    </div>
</div>
@endsection
