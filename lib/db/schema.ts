import { pgTable, text, uuid, timestamp, doublePrecision, integer, unique } from 'drizzle-orm/pg-core';

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const riders = pgTable('riders', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  motorcycle: text('motorcycle'),
  style: text('style'),
  experience: text('experience'),
  pace: text('pace'),
  language: text('language'),
  crewId: uuid('crew_id').references(() => crews.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => riders.id),
  title: text('title').notNull(),
  startLat: doublePrecision('start_lat').notNull(),
  startLon: doublePrecision('start_lon').notNull(),
  endLat: doublePrecision('end_lat').notNull(),
  endLon: doublePrecision('end_lon').notNull(),
  difficulty: text('difficulty').notNull(),
  bikeType: text('bike_type').notNull(),
  sceneryTags: text('scenery_tags').notNull(),
  voivodeship: text('voivodeship').notNull(),
  district: text('district'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id').notNull().references(() => routes.id),
  raterId: uuid('rater_id').notNull().references(() => riders.id),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniqueRatingPerRider: unique().on(t.routeId, t.raterId),
}));

export const buddyPosts = pgTable('buddy_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  riderId: uuid('rider_id').notNull().references(() => riders.id),
  voivodeship: text('voivodeship').notNull(),
  plannedDate: timestamp('planned_date').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => riders.id),
  title: text('title').notNull(),
  type: text('type').notNull(),
  voivodeship: text('voivodeship').notNull(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const presence = pgTable('presence', {
  riderId: uuid('rider_id').primaryKey().references(() => riders.id),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
