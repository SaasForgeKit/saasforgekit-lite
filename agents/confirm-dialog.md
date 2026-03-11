# Confirm Dialog Pattern

Use the shadcn `Dialog` component for all destructive or state-changing actions that require user confirmation. Never use the browser's native `confirm()`.

## When to Use

- Archiving or deleting records
- Deactivating resources
- Reactivating resources
- Any irreversible or significant state change

## Pattern

```tsx
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

<Dialog>
    <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
            <Archive className="size-4" />
        </Button>
    </DialogTrigger>
    <DialogContent>
        <DialogTitle>Action title</DialogTitle>
        <DialogDescription>
            Describe what will happen and any consequences.
        </DialogDescription>
        <DialogFooter className="gap-2">
            <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
                variant="destructive"
                onClick={() => router.delete(url, { preserveScroll: true })}
            >
                Confirm
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

## Guidelines

- **DialogTitle**: Short action name (e.g. "Archive pricing", "Deactivate price")
- **DialogDescription**: Explain consequences. Use `&ldquo;` and `&rdquo;` for quoting resource names
- **Cancel button**: Always `variant="secondary"` wrapped in `DialogClose`
- **Confirm button**: Use `variant="destructive"` for destructive actions, default variant for non-destructive (e.g. reactivate)
- **preserveScroll**: Always pass `{ preserveScroll: true }` to keep scroll position after the action
- **No password confirmation**: This is a simple confirm, not a security gate. For security-sensitive actions (like account deletion), use the password-confirmation pattern from `delete-user.tsx` instead

## Examples in Codebase

- `resources/js/pages/admin/pricing/index.tsx` — archive and reactivate product dialogs
- `resources/js/pages/admin/pricing/show.tsx` — deactivate price dialog
- `resources/js/pages/tasks/index.tsx` — delete task dialog
- `resources/js/components/delete-user.tsx` — delete account dialog (with password confirmation)
