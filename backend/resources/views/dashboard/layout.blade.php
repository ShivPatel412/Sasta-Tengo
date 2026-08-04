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
                    <span class="icon">📊</span>
                    <span>Dashboard</span>
                </a>
                <a href="{{ route('dashboard.contacts') }}" class="nav-link {{ Route::currentRouteName() === 'dashboard.contacts' || Route::currentRouteName() === 'dashboard.contact-detail' ? 'active' : '' }}">
                    <span class="icon">📧</span>
                    <span>Contact Messages</span>
                </a>
                <a href="{{ route('dashboard.appointments') }}" class="nav-link {{ Route::currentRouteName() === 'dashboard.appointments' ? 'active' : '' }}">
                    <span class="icon">📅</span>
                    <span>Project Requests</span>
                </a>
                <a href="{{ route('dashboard.projects') }}" class="nav-link {{ str_starts_with(Route::currentRouteName(), 'dashboard.projects') ? 'active' : '' }}">
                    <span class="icon">📁</span>
                    <span>Projects</span>
                </a>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="dashboard-header">
                <h1>@yield('page-title', 'Dashboard')</h1>
                <div class="header-actions">
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
