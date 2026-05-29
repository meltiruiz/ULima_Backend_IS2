ALTER TABLE "student"
ADD COLUMN IF NOT EXISTS "specialty_setup_completed" boolean DEFAULT false NOT NULL;
