# Supabase Admin Documentation

## Admin Management

### Grant admin rights

```sql
insert into public.admin_emails(email) values ('new.admin@example.com')
on conflict (email) do nothing;
```

Admin checks in RLS use `public.is_admin()` which reads the `email` claim from `auth.jwt()`.
