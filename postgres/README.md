# Start database

1) cd postgres
2) ./start.sh
3) psql -h localhost -p 5439 -U automator 

Verify that you can connect to it.

# Apply migrations

1) cd postgres
2) ./migrate.sh

Now you have a running postgres without supabase. You can point your tests at it by editing db_tests.ts/dbconfig. (See migrate.sh script for creds.)