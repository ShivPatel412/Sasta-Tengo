<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Sasta Tengo</title>
    <link rel="stylesheet" href="{{ asset('css/dashboard.css') }}">
    <link rel="stylesheet" href="{{ asset('css/projects.css') }}">
    <link rel="stylesheet" href="{{ asset('css/crm.css') }}">
</head>
<body>
    <div class="dashboard-wrapper">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>Sasta Tengo</h1>
                <p>Admin Dashboard</p>
            </div>
            
            <nav class="sidebar-nav">
                <a href="{{ route('dashboard.index') }}" class="nav-link {{ Route::currentRouteName() === 'dashboard.index' ? 'active' : '' }}">
                    <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg></span>
                    <span>Dashboard</span>
                </a>
                <a href="{{ route('dashboard.contacts') }}" class="nav-link {{ Route::currentRouteName() === 'dashboard.contacts' || Route::currentRouteName() === 'dashboard.contact-detail' ? 'active' : '' }}">
                    <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l9 7 9-7M3 6v12h18V6z" /></svg></span>
                    <span>Contact Messages</span>
                </a>
                <a href="{{ route('dashboard.appointments') }}" class="nav-link {{ Route::currentRouteName() === 'dashboard.appointments' ? 'active' : '' }}">
                    <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v17H5zM8 2v4M16 2v4M5 9h14" /></svg></span>
                    <span>Project Requests</span>
                </a>
                <a href="{{ route('dashboard.projects') }}" class="nav-link {{ str_starts_with(Route::currentRouteName(), 'dashboard.projects') ? 'active' : '' }}">
                    <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3z" /></svg></span>
                    <span>Projects</span>
                </a>
                <a href="{{ route('dashboard.experiences') }}" class="nav-link {{ str_starts_with(Route::currentRouteName(), 'dashboard.experiences') ? 'active' : '' }}">
                    <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM8 7V4h8v3M4 11h16M10 14h4" /></svg></span>
                    <span>Experience</span>
                </a>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="dashboard-header @yield('header-class')">
                <div class="dashboard-heading"><h1>@yield('page-title', 'Dashboard')</h1>@if(Route::currentRouteName() === 'dashboard.index')<p>Welcome back! Here’s what’s happening with your leads.</p>@endif</div>
                <div class="header-actions">
                    @if(Route::currentRouteName() === 'dashboard.index')<time class="dashboard-date" datetime="{{ now()->toDateString() }}">▣&nbsp; {{ now()->format('M j, Y') }}</time>@endif
                    <span class="user-info">{{ auth()->user()?->email ?? 'Admin' }}</span>
                    <form action="{{ route('dashboard.logout') }}" method="POST" style="display:inline;">
                        @csrf
                        <button type="submit" class="btn btn-logout">Logout</button>
                    </form>
                </div>
            </header>

            <!-- Content Area -->
            <div class="content-area">
                @yield('content')
            </div>
        </main>
    </div>

    @if(session('success'))
        <div class="alert alert-success">
            {{ session('success') }}
        </div>
    @endif

    @if(session('error'))
        <div class="alert alert-error">
            {{ session('error') }}
        </div>
    @endif
</body>
</html>
