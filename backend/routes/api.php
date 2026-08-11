<?php   

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\EducationController;
use App\Http\Controllers\Api\ExperienceController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|--------------------------------------------------------------------------
*/

Route::get('/test', function () {
    return response()->json(['message'=> 'Laravel is working']);
});

Route::prefix('v1')->group(function () {
    // Public routes
    
    // Services (public read)
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/{service}', [ServiceController::class, 'show']);
    
    // Projects (public read)
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/featured', [ProjectController::class, 'featured']);
    Route::get('/projects/category/{category}', [ProjectController::class, 'byCategory']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    
    // Education (public read)
    Route::get('/education', [EducationController::class, 'index']);
    Route::get('/education/{education}', [EducationController::class, 'show']);
    
    // Experience (public read)
    Route::get('/experience', [ExperienceController::class, 'index']);
    Route::get('/experience/{experience}', [ExperienceController::class, 'show']);
    
    // Contacts (public create)
    Route::post('/contacts', [ContactController::class, 'store'])->middleware('throttle:10,1');
    
    // Public forms: limited to prevent spam. Appointment details are never public.
    Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('throttle:10,1');
    Route::post('/project-requests', [AppointmentController::class, 'storeProjectRequest'])->middleware('throttle:10,1');
    
    // Authentication routes
    Route::post('/login', [AuthController::class, 'login']);
    
    // Protected routes (admin/authenticated users)
    Route::middleware('auth:sanctum')->group(function () {
        // Authentication
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [AuthController::class, 'profile']);
        
        // Dashboard
        Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
        Route::get('/dashboard/appointments', [DashboardController::class, 'getRecentAppointments']);
        Route::get('/dashboard/contacts', [DashboardController::class, 'getRecentContacts']);
        
        // Services (admin)
        Route::post('/services', [ServiceController::class, 'store']);
        Route::put('/services/{service}', [ServiceController::class, 'update']);
        Route::delete('/services/{service}', [ServiceController::class, 'destroy']);
        
        // Appointments (admin)
        Route::get('/appointments', [AppointmentController::class, 'index']);
        Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']);
        Route::put('/appointments/{appointment}', [AppointmentController::class, 'update']);
        Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy']);
        Route::patch('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
        
        // Contacts (admin)
        Route::get('/contacts', [ContactController::class, 'index']);
        Route::get('/contacts/unread', [ContactController::class, 'unread']);
        Route::get('/contacts/{contact}', [ContactController::class, 'show']);
        Route::put('/contacts/{contact}', [ContactController::class, 'update']);
        Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);
        Route::patch('/contacts/{contact}/read', [ContactController::class, 'markAsRead']);
        
        // Projects (admin)
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::put('/projects/{project}', [ProjectController::class, 'update']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
        
        // Education (admin)
        Route::post('/education', [EducationController::class, 'store']);
        Route::put('/education/{education}', [EducationController::class, 'update']);
        Route::delete('/education/{education}', [EducationController::class, 'destroy']);
        
        // Experience (admin)
        Route::post('/experience', [ExperienceController::class, 'store']);
        Route::put('/experience/{experience}', [ExperienceController::class, 'update']);
        Route::delete('/experience/{experience}', [ExperienceController::class, 'destroy']);
        
    });
});
