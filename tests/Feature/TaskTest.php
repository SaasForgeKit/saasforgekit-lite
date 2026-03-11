<?php

use App\Models\Task;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('tasks.index'));
    $response->assertRedirect(route('login'));
});

test('non-subscribed users are redirected to the billing page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('tasks.index'));
    $response->assertRedirect(route('billing'));
});

test('subscribed users can view the tasks page', function () {
    $user = User::factory()->subscribed()->create();

    $response = $this->actingAs($user)->get(route('tasks.index'));

    $response->assertOk();
});

test('users can create a task', function () {
    $user = User::factory()->subscribed()->create();

    $response = $this->actingAs($user)->post(route('tasks.store'), [
        'title' => 'My first task',
        'description' => 'Some details',
    ]);

    $response->assertRedirect(route('tasks.index'));

    $this->assertDatabaseHas('tasks', [
        'title' => 'My first task',
        'description' => 'Some details',
        'tenant_id' => $user->tenant_id,
        'is_completed' => false,
    ]);
});

test('task creation requires a title', function () {
    $user = User::factory()->subscribed()->create();

    $response = $this->actingAs($user)->post(route('tasks.store'), [
        'title' => '',
    ]);

    $response->assertSessionHasErrors('title');
});

test('users can update a task', function () {
    $user = User::factory()->subscribed()->create();
    $task = Task::factory()->create(['tenant_id' => $user->tenant_id]);

    $response = $this->actingAs($user)->put(route('tasks.update', $task), [
        'title' => 'Updated title',
        'description' => 'Updated description',
        'is_completed' => true,
    ]);

    $response->assertRedirect(route('tasks.index'));

    $task->refresh();
    expect($task->title)->toBe('Updated title')
        ->and($task->description)->toBe('Updated description')
        ->and($task->is_completed)->toBeTrue();
});

test('users can toggle task completion', function () {
    $user = User::factory()->subscribed()->create();
    $task = Task::factory()->create([
        'tenant_id' => $user->tenant_id,
        'is_completed' => false,
    ]);

    $this->actingAs($user)->patch(route('tasks.update', $task), [
        'title' => $task->title,
        'is_completed' => true,
    ]);

    expect($task->refresh()->is_completed)->toBeTrue();
});

test('users can delete a task', function () {
    $user = User::factory()->subscribed()->create();
    $task = Task::factory()->create(['tenant_id' => $user->tenant_id]);

    $response = $this->actingAs($user)->delete(route('tasks.destroy', $task));

    $response->assertRedirect(route('tasks.index'));
    $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
});

test('users only see their own tenant tasks', function () {
    $userA = User::factory()->subscribed()->create();
    $userB = User::factory()->subscribed()->create();

    $taskA = Task::factory()->create(['tenant_id' => $userA->tenant_id, 'title' => 'Task A']);
    $taskB = Task::factory()->create(['tenant_id' => $userB->tenant_id, 'title' => 'Task B']);

    $response = $this->actingAs($userA)->get(route('tasks.index'));

    $response->assertOk();

    $tasks = $response->original->getData()['page']['props']['tasks'];
    $titles = collect($tasks)->pluck('title')->all();

    expect($titles)->toContain('Task A')
        ->and($titles)->not->toContain('Task B');
});

test('users cannot update tasks from another tenant', function () {
    $userA = User::factory()->subscribed()->create();
    $userB = User::factory()->subscribed()->create();

    $taskB = Task::factory()->create(['tenant_id' => $userB->tenant_id]);

    $response = $this->actingAs($userA)->put(route('tasks.update', $taskB), [
        'title' => 'Hacked',
    ]);

    $response->assertNotFound();
});

test('users cannot delete tasks from another tenant', function () {
    $userA = User::factory()->subscribed()->create();
    $userB = User::factory()->subscribed()->create();

    $taskB = Task::factory()->create(['tenant_id' => $userB->tenant_id]);

    $response = $this->actingAs($userA)->delete(route('tasks.destroy', $taskB));

    $response->assertNotFound();
    $this->assertDatabaseHas('tasks', ['id' => $taskB->id]);
});

test('users without a tenant are denied access to tenant routes', function () {
    $user = User::factory()->create(['tenant_id' => null]);

    $response = $this->actingAs($user)->get(route('tasks.index'));

    $response->assertForbidden();
});
