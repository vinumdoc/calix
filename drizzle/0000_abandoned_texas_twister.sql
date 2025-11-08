CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vinum_document" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid,
	"relative_path" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vinum_project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vinum_project_access" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"allow_write" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinum_project" ADD CONSTRAINT "vinum_project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinum_project_access" ADD CONSTRAINT "vinum_project_access_project_id_vinum_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."vinum_project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinum_project_access" ADD CONSTRAINT "vinum_project_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;