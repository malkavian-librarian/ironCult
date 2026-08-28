CREATE TABLE "buddy_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"voivodeship" text NOT NULL,
	"planned_date" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crews_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"voivodeship" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"starts_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence" (
	"rider_id" uuid PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_route_id_rater_id_unique" UNIQUE("route_id","rater_id")
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"motorcycle" text,
	"style" text,
	"experience" text,
	"pace" text,
	"language" text,
	"crew_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "riders_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"start_lat" double precision NOT NULL,
	"start_lon" double precision NOT NULL,
	"end_lat" double precision NOT NULL,
	"end_lon" double precision NOT NULL,
	"difficulty" text NOT NULL,
	"bike_type" text NOT NULL,
	"scenery_tags" text NOT NULL,
	"voivodeship" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buddy_posts" ADD CONSTRAINT "buddy_posts_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_creator_id_riders_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_id_riders_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_owner_id_riders_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;