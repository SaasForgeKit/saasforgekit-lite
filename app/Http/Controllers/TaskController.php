<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    protected function resolveTaskFromRoute(): Task
    {
        $task = request()->route('task');

        if ($task instanceof Task) {
            return $task;
        }

        return Task::query()->findOrFail($task);
    }

    public function index(): Response
    {
        return Inertia::render('tasks/index', [
            'tasks' => Task::query()->latest()->get(),
        ]);
    }

    public function store(StoreTaskRequest $request): RedirectResponse
    {
        Task::create($request->validated());

        return to_route('tasks.index');
    }

    public function update(UpdateTaskRequest $request): RedirectResponse
    {
        $task = $this->resolveTaskFromRoute();
        $task->update($request->validated());

        return to_route('tasks.index');
    }

    public function destroy(): RedirectResponse
    {
        $task = $this->resolveTaskFromRoute();
        $task->delete();

        return to_route('tasks.index');
    }
}
