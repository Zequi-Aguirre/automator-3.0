CREATE TABLE public.user_permissions (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, permission)
);

-- Seed default permissions for existing users based on their role
INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, p.permission
FROM public.users u
CROSS JOIN (
    VALUES
        -- user role defaults
        ('user', 'leads.verify'),
        ('user', 'leads.queue'),
        ('user', 'activity.view'),
        -- admin role defaults
        ('admin', 'leads.verify'),
        ('admin', 'leads.queue'),
        ('admin', 'leads.import'),
        ('admin', 'leads.export'),
        ('admin', 'leads.send'),
        ('admin', 'leads.trash'),
        ('admin', 'sources.manage'),
        ('admin', 'managers.manage'),
        ('admin', 'activity.view'),
        -- superadmin role defaults
        ('superadmin', 'leads.verify'),
        ('superadmin', 'leads.queue'),
        ('superadmin', 'leads.import'),
        ('superadmin', 'leads.export'),
        ('superadmin', 'leads.send'),
        ('superadmin', 'leads.trash'),
        ('superadmin', 'sources.manage'),
        ('superadmin', 'managers.manage'),
        ('superadmin', 'buyers.manage'),
        ('superadmin', 'worker.toggle'),
        ('superadmin', 'settings.manage'),
        ('superadmin', 'users.manage'),
        ('superadmin', 'activity.view')
) AS p(role, permission)
WHERE u.role = p.role
  AND u.deleted IS NULL;
