<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Dashboard\AuthController;
use App\Http\Controllers\Dashboard\DashboardController;

// Dashboard Authentication Routes
Route::prefix('dashboard')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('dashboard.login');
    Route::post('/login', [AuthController::class, 'login'])->name('dashboard.login.submit');
    Route::post('/logout', [AuthController::class, 'logout'])->name('dashboard.logout');

    // Protected Dashboard Routes
    Route::middleware('check.dashboard.auth')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard.index');
        Route::get('/contacts', [DashboardController::class, 'contacts'])->name('dashboard.contacts');
        Route::get('/contacts/{id}', [DashboardController::class, 'showContact'])->name('dashboard.contact-detail');
        Route::put('/contacts/{contact}', [DashboardController::class, 'updateContact'])->name('dashboard.contact-update');
        Route::delete('/contacts/{id}', [DashboardController::class, 'deleteContact'])->name('dashboard.contact-delete');
        Route::get('/appointments', [DashboardController::class, 'appointments'])->name('dashboard.appointments');
        Route::get('/appointments/{appointment}', [DashboardController::class, 'showAppointment'])->name('dashboard.appointment-detail');
        Route::put('/appointments/{appointment}', [DashboardController::class, 'updateAppointment'])->name('dashboard.appointment-update');
        Route::get('/projects', [DashboardController::class, 'projects'])->name('dashboard.projects');
        Route::post('/projects/types', [DashboardController::class, 'storeProjectType'])->name('dashboard.project-types.store');
        Route::put('/projects/types/{projectType}', [DashboardController::class, 'updateProjectType'])->name('dashboard.project-types.update');
        Route::delete('/projects/types/{projectType}', [DashboardController::class, 'deleteProjectType'])->name('dashboard.project-types.delete');
        Route::get('/projects/{project}', [DashboardController::class, 'showProject'])->name('dashboard.projects.show');
        Route::post('/projects', [DashboardController::class, 'storeProject'])->name('dashboard.projects.store');
        Route::put('/projects/{project}', [DashboardController::class, 'updateProject'])->name('dashboard.projects.update');
        Route::delete('/projects/{project}', [DashboardController::class, 'deleteProject'])->name('dashboard.projects.delete');
        Route::get('/experiences', [DashboardController::class, 'experiences'])->name('dashboard.experiences');
        Route::post('/experiences', [DashboardController::class, 'storeExperience'])->name('dashboard.experiences.store');
        Route::put('/experiences/{experience}', [DashboardController::class, 'updateExperience'])->name('dashboard.experiences.update');
        Route::delete('/experiences/{experience}', [DashboardController::class, 'deleteExperience'])->name('dashboard.experiences.delete');
    });
});

// React frontend (keep this last so Laravel routes win).
Route::get('/{path?}', fn () => response()->file(public_path('index.html')))
    ->where('path', '^(?!api(?:/|$)|dashboard(?:/|$)).*');
