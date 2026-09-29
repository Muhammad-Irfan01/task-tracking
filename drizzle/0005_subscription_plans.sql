ALTER TABLE "tenants" ALTER COLUMN "plan" SET DEFAULT 'Small';--> statement-breakpoint
-- Old free-text plans map onto the fixed Small / Medium / Large tiers.
UPDATE "tenants" SET "plan" = CASE lower("plan")
  WHEN 'small' THEN 'Small'
  WHEN 'medium' THEN 'Medium'
  WHEN 'large' THEN 'Large'
  WHEN 'starter' THEN 'Small'
  WHEN 'business' THEN 'Medium'
  WHEN 'enterprise' THEN 'Large'
  ELSE 'Small'
END;--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "max_agents";
