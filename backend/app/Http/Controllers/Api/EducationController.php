<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Education;
use Illuminate\Http\Request;

class EducationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $education = Education::orderBy('order', 'asc')
            ->orderBy('start_year', 'desc')
            ->get();
        
        return response()->json($education);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'degree' => 'required|string|max:255',
            'institution' => 'required|string|max:255',
            'field_of_study' => 'required|string|max:255',
            'start_year' => 'required|integer|min:1900|max:' . (date('Y') + 10),
            'end_year' => 'nullable|integer|min:1900|max:' . (date('Y') + 10),
            'is_current' => 'boolean',
            'description' => 'nullable|string',
            'gpa' => 'nullable|numeric|min:0|max:4',
            'order' => 'nullable|integer|min:0'
        ]);

        $education = Education::create($validated);
        return response()->json($education, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Education $education)
    {
        return response()->json($education);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Education $education)
    {
        $validated = $request->validate([
            'degree' => 'string|max:255',
            'institution' => 'string|max:255',
            'field_of_study' => 'string|max:255',
            'start_year' => 'integer|min:1900|max:' . (date('Y') + 10),
            'end_year' => 'nullable|integer|min:1900|max:' . (date('Y') + 10),
            'is_current' => 'boolean',
            'description' => 'nullable|string',
            'gpa' => 'nullable|numeric|min:0|max:4',
            'order' => 'nullable|integer|min:0'
        ]);

        $education->update($validated);
        return response()->json($education);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Education $education)
    {
        $education->delete();
        return response()->json(['message' => 'Education record deleted successfully'], 200);
    }
}
