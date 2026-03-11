import { Form, Head, router } from '@inertiajs/react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Task = {
    id: number;
    title: string;
    description: string | null;
    is_completed: boolean;
    created_at: string;
    updated_at: string;
};

type Props = {
    tasks: Task[];
};

function TaskRow({ task, taskBaseUrl }: { task: Task; taskBaseUrl: string }) {
    const [editing, setEditing] = useState(false);
    const taskUrl = `${taskBaseUrl}/${task.id}`;

    function handleToggle(checked: boolean) {
        router.patch(
            taskUrl,
            {
                title: task.title,
                description: task.description,
                is_completed: checked,
            },
            { preserveScroll: true },
        );
    }

    if (editing) {
        return (
            <li className="rounded-lg border bg-card p-4">
                <Form
                    action={taskUrl}
                    method="patch"
                    onSuccess={() => setEditing(false)}
                    className="flex flex-col gap-3"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-title-${task.id}`}>
                                    Title
                                </Label>
                                <Input
                                    id={`edit-title-${task.id}`}
                                    name="title"
                                    defaultValue={task.title}
                                    required
                                    autoFocus
                                />
                                <InputError message={errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-desc-${task.id}`}>
                                    Description
                                </Label>
                                <Input
                                    id={`edit-desc-${task.id}`}
                                    name="description"
                                    defaultValue={task.description ?? ''}
                                />
                                <InputError message={errors.description} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditing(false)}
                                >
                                    <X className="size-4" />
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </li>
        );
    }

    return (
        <li className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <Checkbox
                checked={task.is_completed}
                onCheckedChange={handleToggle}
                className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
                <p
                    className={`font-medium ${task.is_completed ? 'text-muted-foreground line-through' : ''}`}
                >
                    {task.title}
                </p>
                {task.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {task.description}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(true)}
                >
                    <Pencil className="size-4" />
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="size-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete task</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete &ldquo;
                                {task.title}&rdquo;? This action cannot be
                                undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() =>
                                    router.delete(taskUrl, {
                                        preserveScroll: true,
                                    })
                                }
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </li>
    );
}

export default function Tasks({ tasks }: Props) {
    const taskBaseUrl = '/tasks';
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Tasks',
            href: taskBaseUrl,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
                <Heading
                    title="Tasks"
                    description="Create and manage your tasks."
                />

                <Form
                    action={taskBaseUrl}
                    method="post"
                    resetOnSuccess
                    className="flex flex-col gap-3 rounded-lg border bg-card p-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="What needs to be done?"
                                    required
                                />
                                <InputError message={errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    Description{' '}
                                    <span className="text-muted-foreground">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Add more details..."
                                />
                                <InputError message={errors.description} />
                            </div>
                            <div>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Add task
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                {tasks.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                        No tasks yet. Create one above to get started.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {tasks.map((task) => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                taskBaseUrl={taskBaseUrl}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </AppLayout>
    );
}
