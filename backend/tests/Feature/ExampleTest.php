<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_serves_the_react_frontend(): void
    {
        $response = $this->get('/');

        $response->assertOk();
    }
}
