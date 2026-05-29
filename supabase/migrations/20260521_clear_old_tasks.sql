-- Soft-delete all tasks for the owner account (Barok Mulatu)
-- that currently have no deleted_at but were deleted from the app.
-- Run this in Supabase SQL Editor if the app delete did not sync.

UPDATE public.tasks
SET deleted_at = now()::text
WHERE user_id = 'b79ea118-5822-4e35-849a-a641375c1ffc'
AND deleted_at IS NULL;

-- Verify the count (should be 0 after running)
SELECT COUNT(*) as remaining_active_tasks
FROM public.tasks
WHERE user_id = 'b79ea118-5822-4e35-849a-a641375c1ffc'
AND deleted_at IS NULL;
