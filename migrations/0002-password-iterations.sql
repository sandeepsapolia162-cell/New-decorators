-- Run once only if D1 was created with the earlier users schema.
-- No account existed during the failed setup attempt, so 100000 is correct here.
ALTER TABLE users ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 100000;
