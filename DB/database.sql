--
-- PostgreSQL database dump
--


-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: prj_nh0ZprNY877m; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "prj_nh0ZprNY877m";


--
-- Name: prj_nh0ZprNY877m_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "prj_nh0ZprNY877m_auth";


--
-- Name: prj_nh0ZprNY877m_storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "prj_nh0ZprNY877m_storage";


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: crm_campaigns; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text,
    html_body text,
    text_body text,
    channel text DEFAULT 'email'::text NOT NULL,
    status text DEFAULT 'draft'::text,
    list_id uuid,
    filter_query jsonb,
    list_ids jsonb,
    style_preset text,
    images jsonb,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    total_recipients integer DEFAULT 0,
    total_sent integer DEFAULT 0,
    total_opened integer DEFAULT 0,
    total_clicked integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_campaigns_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text]))),
    CONSTRAINT crm_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: crm_campaigns_claim_due(integer); Type: FUNCTION; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE FUNCTION "prj_nh0ZprNY877m".crm_campaigns_claim_due(p_limit integer) RETURNS SETOF "prj_nh0ZprNY877m".crm_campaigns
    LANGUAGE plpgsql
    AS $$
BEGIN
RETURN QUERY UPDATE crm_campaigns
SET status = 'sending', sent_at = NULL
WHERE id IN (
SELECT due_id FROM (
SELECT id AS due_id FROM crm_campaigns
WHERE status = 'scheduled' AND scheduled_at <= NOW()
ORDER BY scheduled_at
FOR UPDATE SKIP LOCKED
LIMIT p_limit
) due_rows
)
RETURNING *;
END $$;


--
-- Name: crm_flow_step_queue; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_flow_step_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    resume_step_order integer NOT NULL,
    run_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    last_error text,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    locked_at timestamp with time zone,
    locked_by text,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crm_flow_queue_claim(integer, text, integer); Type: FUNCTION; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE FUNCTION "prj_nh0ZprNY877m".crm_flow_queue_claim(p_limit integer, p_worker text, p_lock_seconds integer DEFAULT 300) RETURNS SETOF "prj_nh0ZprNY877m".crm_flow_step_queue
    LANGUAGE plpgsql
    AS $$
BEGIN
RETURN QUERY UPDATE crm_flow_step_queue
SET locked_at = NOW(),
locked_by = p_worker,
attempts = attempts + 1
WHERE id IN (
SELECT due_id FROM (
SELECT id AS due_id FROM crm_flow_step_queue
WHERE finished_at IS NULL
AND attempts < max_attempts
AND run_at <= NOW()
AND (locked_at IS NULL OR locked_at < NOW() - make_interval(secs => p_lock_seconds))
ORDER BY run_at
FOR UPDATE SKIP LOCKED
LIMIT p_limit
) due_rows
)
RETURNING *;
END $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE FUNCTION "prj_nh0ZprNY877m".handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
insert into "prj_nh0ZprNY877m".profiles (id, email, full_name)
values (new.id, new.email, new.raw_user_meta_data->>'full_name')
on conflict (id) do nothing;
return new;
end; $$;


--
-- Name: auth_uid(); Type: FUNCTION; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE FUNCTION "prj_nh0ZprNY877m_auth".auth_uid() RETURNS uuid
    LANGUAGE sql
    AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;


--
-- Name: role(); Type: FUNCTION; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE FUNCTION "prj_nh0ZprNY877m_auth".role() RETURNS text
    LANGUAGE sql
    AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

CREATE FUNCTION "prj_nh0ZprNY877m_storage".foldername(name text) RETURNS text[]
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT string_to_array(name, '/')
$$;


--
-- Name: crm_appointments; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid,
    contact_id uuid,
    contact_email text NOT NULL,
    contact_name text,
    contact_phone text,
    title text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'confirmed'::text,
    notes text,
    source text DEFAULT 'manual'::text,
    google_event_id text,
    calendly_event_id text,
    assigned_user_id text,
    assigned_membership_id uuid,
    participant_count integer DEFAULT 1,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_appointments_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'public_link'::text, 'google'::text, 'calendly'::text]))),
    CONSTRAINT crm_appointments_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text, 'rescheduled'::text])))
);


--
-- Name: crm_availability; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: crm_calendar_members; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_calendar_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid,
    user_id text NOT NULL,
    user_google_calendar_id text,
    user_outlook_calendar_id text,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: crm_calendars; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_calendars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT 'Default Calendar'::text NOT NULL,
    slug text,
    description text,
    calendar_type text DEFAULT 'personal'::text,
    owner_user_id text,
    max_participants integer DEFAULT 1,
    date_range_days integer,
    slot_duration integer DEFAULT 30,
    slot_interval integer DEFAULT 0,
    max_bookings_per_day integer,
    min_notice_hours integer DEFAULT 1,
    buffer_before integer DEFAULT 0,
    buffer_after integer DEFAULT 0,
    timezone text DEFAULT 'America/New_York'::text,
    is_active boolean DEFAULT true,
    meeting_location_type text DEFAULT 'custom'::text,
    meeting_location_value text,
    host_notify_on_booking boolean DEFAULT true,
    google_calendar_id text,
    google_refresh_token text,
    calendly_user_uri text,
    calendly_webhook_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    calendly_connection_id uuid,
    CONSTRAINT crm_calendars_calendar_type_check CHECK ((calendar_type = ANY (ARRAY['personal'::text, 'round_robin'::text, 'class'::text, 'collective'::text])))
);


--
-- Name: crm_calendly_connections; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_calendly_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    calendly_user_uri text NOT NULL,
    calendly_user_email text,
    calendly_user_name text,
    calendly_org_uri text,
    encrypted_access_token text NOT NULL,
    signing_key text NOT NULL,
    webhook_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: crm_contact_lists; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_contact_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    list_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: crm_contacts; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    phone text,
    sms_opt_in boolean DEFAULT false,
    address jsonb,
    source text DEFAULT 'manual'::text,
    tags text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    ecom_customer_id uuid,
    total_orders integer DEFAULT 0,
    total_spent integer DEFAULT 0,
    last_order_at timestamp with time zone,
    subscribed boolean DEFAULT true,
    subscribed_at timestamp with time zone DEFAULT now(),
    unsubscribed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: crm_events; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid,
    campaign_id uuid,
    channel text DEFAULT 'email'::text NOT NULL,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_events_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text]))),
    CONSTRAINT crm_events_event_type_check CHECK ((event_type = ANY (ARRAY['sent'::text, 'opened'::text, 'clicked'::text, 'bounced'::text, 'unsubscribed'::text, 'opt_out'::text, 'delivered'::text, 'failed'::text, 'undelivered'::text])))
);


--
-- Name: crm_flow_logs; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_flow_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_id uuid,
    step_id uuid,
    contact_id uuid,
    trigger_event text NOT NULL,
    status text DEFAULT 'executed'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_flow_logs_status_check CHECK ((status = ANY (ARRAY['executed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: crm_flow_steps; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_flow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_id uuid,
    step_order integer NOT NULL,
    action_type text NOT NULL,
    action_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_flow_steps_action_type_check CHECK ((action_type = ANY (ARRAY['send_email'::text, 'send_sms'::text, 'add_tag'::text, 'add_to_list'::text, 'wait'::text])))
);


--
-- Name: crm_flows; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    trigger_type text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    cron_job_name text,
    last_fired_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_flows_trigger_type_check CHECK ((trigger_type = ANY (ARRAY[(('contact'::text || chr(46)) || 'subscribed'::text), (('order'::text || chr(46)) || 'placed'::text), (('contact'::text || chr(46)) || 'tagged'::text), (('user'::text || chr(46)) || 'registered'::text), (('appointment'::text || chr(46)) || 'booked'::text), (('schedule'::text || chr(46)) || 'cron'::text)])))
);


--
-- Name: crm_lists; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".crm_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    filter_query jsonb,
    is_dynamic boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exercises; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    instructions text,
    body_part text NOT NULL,
    phase text NOT NULL,
    movement_pattern text,
    muscle_groups text[] DEFAULT '{}'::text[] NOT NULL,
    equipment text DEFAULT 'none'::text NOT NULL,
    default_reps integer,
    default_duration_seconds integer,
    met_value numeric DEFAULT 6 NOT NULL,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    fitness_level text DEFAULT 'intermediate'::text NOT NULL,
    body_weight_kg numeric DEFAULT 75 NOT NULL,
    weekly_goal integer DEFAULT 3 NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workout_sessions; Type: TABLE; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m".workout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id text,
    phase text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_seconds integer,
    total_reps integer DEFAULT 0 NOT NULL,
    rounds_completed integer DEFAULT 0 NOT NULL,
    calories_estimate numeric,
    status text DEFAULT 'completed'::text NOT NULL,
    exercises jsonb DEFAULT '[]'::jsonb NOT NULL,
    user_id uuid
);


--
-- Name: identities; Type: TABLE; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m_auth".identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    provider text NOT NULL,
    identity_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m_auth".users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    encrypted_password text,
    email_confirmed_at timestamp with time zone,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    is_anonymous boolean DEFAULT false,
    phone_confirmed_at timestamp with time zone,
    confirmation_token text,
    confirmation_sent_at timestamp with time zone,
    recovery_token text,
    recovery_sent_at timestamp with time zone
);


--
-- Name: buckets; Type: TABLE; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m_storage".buckets (
    id text NOT NULL,
    name text NOT NULL,
    public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    file_size_limit bigint,
    allowed_mime_types text[]
);


--
-- Name: objects; Type: TABLE; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

CREATE TABLE "prj_nh0ZprNY877m_storage".objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    path_tokens text[],
    version text
);


--
-- Data for Name: crm_appointments; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_appointments (id, calendar_id, contact_id, contact_email, contact_name, contact_phone, title, starts_at, ends_at, status, notes, source, google_event_id, calendly_event_id, assigned_user_id, assigned_membership_id, participant_count, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: crm_availability; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_availability (id, calendar_id, day_of_week, start_time, end_time, is_active, created_at) FROM stdin;
e4885148-8c39-4837-895c-092de6d74945	a14accec-2f00-4bb9-a6f2-888878187e8a	1	09:00:00	17:00:00	t	2026-06-08 19:18:13.292994+00
b80e0681-3313-4bce-8c75-f36c10abb590	a14accec-2f00-4bb9-a6f2-888878187e8a	2	09:00:00	17:00:00	t	2026-06-08 19:18:13.292994+00
b3d122bf-47a1-4e90-961e-15a5bfa2d948	a14accec-2f00-4bb9-a6f2-888878187e8a	3	09:00:00	17:00:00	t	2026-06-08 19:18:13.292994+00
6d9c7297-4a99-410b-88c7-219e14b4a711	a14accec-2f00-4bb9-a6f2-888878187e8a	4	09:00:00	17:00:00	t	2026-06-08 19:18:13.292994+00
5458ee1b-2c36-44fd-936e-7723b4ae335a	a14accec-2f00-4bb9-a6f2-888878187e8a	5	09:00:00	17:00:00	t	2026-06-08 19:18:13.292994+00
\.


--
-- Data for Name: crm_calendar_members; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_calendar_members (id, calendar_id, user_id, user_google_calendar_id, user_outlook_calendar_id, priority, created_at) FROM stdin;
7561159f-415c-4c84-a568-2955d99d0196	a14accec-2f00-4bb9-a6f2-888878187e8a	6a27152d57b02b1e9955ebc2	\N	\N	0	2026-06-08 19:18:13.181733+00
\.


--
-- Data for Name: crm_calendars; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_calendars (id, name, slug, description, calendar_type, owner_user_id, max_participants, date_range_days, slot_duration, slot_interval, max_bookings_per_day, min_notice_hours, buffer_before, buffer_after, timezone, is_active, meeting_location_type, meeting_location_value, host_notify_on_booking, google_calendar_id, google_refresh_token, calendly_user_uri, calendly_webhook_id, metadata, created_at, updated_at, calendly_connection_id) FROM stdin;
a14accec-2f00-4bb9-a6f2-888878187e8a	Default Calendar	\N	\N	personal	6a27152d57b02b1e9955ebc2	1	\N	30	0	\N	1	0	0	America/New_York	t	custom	\N	t	\N	\N	\N	\N	{}	2026-06-08 19:18:13.106553+00	2026-06-08 19:18:13.106553+00	\N
\.


--
-- Data for Name: crm_calendly_connections; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_calendly_connections (id, user_id, calendly_user_uri, calendly_user_email, calendly_user_name, calendly_org_uri, encrypted_access_token, signing_key, webhook_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: crm_campaigns; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_campaigns (id, name, subject, html_body, text_body, channel, status, list_id, filter_query, list_ids, style_preset, images, scheduled_at, sent_at, total_recipients, total_sent, total_opened, total_clicked, created_at) FROM stdin;
\.


--
-- Data for Name: crm_contact_lists; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_contact_lists (id, contact_id, list_id, created_at) FROM stdin;
\.


--
-- Data for Name: crm_contacts; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_contacts (id, email, name, phone, sms_opt_in, address, source, tags, metadata, ecom_customer_id, total_orders, total_spent, last_order_at, subscribed, subscribed_at, unsubscribed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: crm_events; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_events (id, contact_id, campaign_id, channel, event_type, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: crm_flow_logs; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_flow_logs (id, flow_id, step_id, contact_id, trigger_event, status, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: crm_flow_step_queue; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_flow_step_queue (id, flow_id, contact_id, resume_step_order, run_at, attempts, max_attempts, last_error, event_data, locked_at, locked_by, finished_at, created_at) FROM stdin;
\.


--
-- Data for Name: crm_flow_steps; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_flow_steps (id, flow_id, step_order, action_type, action_config, created_at) FROM stdin;
\.


--
-- Data for Name: crm_flows; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_flows (id, name, trigger_type, trigger_config, is_active, cron_job_name, last_fired_at, created_at, updated_at) FROM stdin;
3ccda4e9-d596-4ab2-92d8-952e4d486e8f	Welcome Email	contact.subscribed	{}	f	\N	\N	2026-06-08 19:18:11.694165+00	2026-06-08 19:18:11.694165+00
\.


--
-- Data for Name: crm_lists; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".crm_lists (id, name, description, filter_query, is_dynamic, created_at) FROM stdin;
\.


--
-- Data for Name: exercises; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".exercises (id, name, slug, description, instructions, body_part, phase, movement_pattern, muscle_groups, equipment, default_reps, default_duration_seconds, met_value, image_url, is_active, created_at) FROM stdin;
3eb05507-27f7-4cff-b1c4-9e3a94206746	Incline Push-up	incline-push-up	Beginner-friendly chest builder.	Hands on an elevated surface, lower chest to the edge, press back up.	Chest	foundation	push	{chest,triceps,shoulders}	none	12	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946445526_cf913608.png	t	2026-06-08 19:21:35.652944+00
72e786e1-b6f9-479a-80ab-1e505c5fd75b	Knee Push-up	knee-push-up	Scaled push-up on knees.	Knees down, keep a straight line from knees to head, lower and press.	Chest	foundation	push	{chest,triceps}	none	12	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946441106_b85b2ccf.jpg	t	2026-06-08 19:21:35.652944+00
5b42ca03-5445-4ef0-ae47-f31a8b577d00	Push-up	push-up	Classic full push-up.	Plank position, lower chest to floor, press back up keeping core tight.	Chest	build	push	{chest,triceps,shoulders}	none	15	\N	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png	t	2026-06-08 19:21:35.652944+00
e7621096-ec82-4a7f-9423-8a816dd19eb7	Diamond Push-up	diamond-push-up	Triceps-focused push-up.	Hands form a diamond under chest, lower and press.	Chest	build	push	{triceps,chest}	none	12	\N	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946443299_ed6cbdcd.jpg	t	2026-06-08 19:21:35.652944+00
c09af68a-8394-4fe3-882b-3ddbe21ce0bf	Archer Push-up	archer-push-up	Advanced unilateral push-up.	Shift weight to one arm as you lower, alternate sides.	Chest	peak	push	{chest,triceps,shoulders}	none	8	\N	7	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946466454_782f04c4.png	t	2026-06-08 19:21:35.652944+00
6a341843-781f-4c39-a393-2f30582584ca	Plyo Push-up	plyo-push-up	Explosive push-up.	Lower then push explosively so hands leave the floor.	Chest	peak	push	{chest,triceps,shoulders}	none	8	\N	8	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946447308_e49881af.png	t	2026-06-08 19:21:35.652944+00
9596abf1-b80e-416e-be05-eedd4a8ce28b	Superman	superman	Lower-back and posterior chain.	Lie face down, lift arms and legs, hold briefly, lower.	Back	foundation	pull	{back}	none	\N	30	3	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946418885_cb6e5008.png	t	2026-06-08 19:21:35.652944+00
785ee079-ddbe-48f4-ad72-966f3a09ddbc	Bird Dog	bird-dog	Core and back stability.	On all fours, extend opposite arm and leg, hold, switch.	Back	foundation	pull	{back,core}	none	10	\N	3	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946406655_b9003cc2.png	t	2026-06-08 19:21:35.652944+00
5f9fdf01-014f-41b9-bfff-5ccadee87489	Inverted Row	inverted-row	Horizontal pull.	Under a sturdy bar, pull chest to bar, lower with control.	Back	build	pull	{back,biceps}	bar	12	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png	t	2026-06-08 19:21:35.652944+00
800bc3d5-a5a6-4a1f-9048-8091c763a8e9	Towel Row	towel-row	Door-frame back row.	Loop a towel around a sturdy anchor and row your body up.	Back	build	pull	{back,biceps}	towel	12	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg	t	2026-06-08 19:21:35.652944+00
92d88645-114c-4eec-8e40-f89ce653cc4a	Pull-up	pull-up	Vertical pull.	Hang from a bar, pull chin over the bar, lower fully.	Back	peak	pull	{back,biceps}	bar	8	\N	7	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946413781_8c69871a.png	t	2026-06-08 19:21:35.652944+00
493c7234-b6c9-41b9-99a0-46e628968c26	Archer Row	archer-row	Advanced unilateral row.	Row to one side emphasizing one arm at a time.	Back	peak	pull	{back,biceps}	bar	8	\N	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946420241_36babe2a.png	t	2026-06-08 19:21:35.652944+00
f2c80342-ef3e-44c8-994b-54de7511863b	Bodyweight Squat	bodyweight-squat	Foundational squat.	Feet shoulder width, sit back and down, drive through heels.	Legs	foundation	squat	{quads,glutes}	none	15	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946418885_cb6e5008.png	t	2026-06-08 19:21:35.652944+00
cadb48a4-0118-4a6c-b0a0-1cfcf448188e	Glute Bridge	glute-bridge	Hip hinge for glutes.	Lie on back, drive hips up, squeeze glutes, lower.	Legs	foundation	hinge	{glutes,hamstrings}	none	15	\N	4	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946406655_b9003cc2.png	t	2026-06-08 19:21:35.652944+00
61047ed8-5368-4ddb-9ea1-90fc0d9393b5	Reverse Lunge	reverse-lunge	Single-leg strength.	Step back into a lunge, drive back to standing, alternate.	Legs	build	squat	{quads,glutes}	none	12	\N	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png	t	2026-06-08 19:21:35.652944+00
5d02e2c2-060c-446c-b9d5-e04da881ecbf	Bulgarian Split Squat	bulgarian-split-squat	Rear-foot elevated squat.	Back foot elevated, lower into a deep lunge, drive up.	Legs	build	squat	{quads,glutes}	none	10	\N	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg	t	2026-06-08 19:21:35.652944+00
49baa63b-63ea-4ede-a27c-bab5fe6d5ced	Pistol Squat	pistol-squat	Single-leg squat.	Squat on one leg keeping the other extended forward.	Legs	peak	squat	{quads,glutes,core}	none	6	\N	7	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946413781_8c69871a.png	t	2026-06-08 19:21:35.652944+00
51652b5a-8a89-4195-833d-dd059ee241cb	Jump Squat	jump-squat	Explosive squat.	Squat then jump explosively, land soft, repeat.	Legs	peak	squat	{quads,glutes}	none	12	\N	8	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946420241_36babe2a.png	t	2026-06-08 19:21:35.652944+00
179753b1-910e-413d-8ef9-09777df37770	Pike Push-up (knees)	pike-push-up-knees	Shoulder builder scaled.	Hips high on knees, lower head toward floor, press up.	Shoulders	foundation	push	{shoulders,triceps}	none	10	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946445526_cf913608.png	t	2026-06-08 19:21:35.652944+00
e64b30a5-065c-4711-b5be-5618035cbe4a	Pike Push-up	pike-push-up	Shoulder push.	Hips high, lower crown to floor, press back up.	Shoulders	build	push	{shoulders,triceps}	none	10	\N	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png	t	2026-06-08 19:21:35.652944+00
ca9e14ea-a25a-42a4-a3bb-0d633c4fdfd2	Handstand Hold	handstand-hold	Advanced shoulder hold.	Kick to a wall handstand and hold a tight line.	Shoulders	peak	push	{shoulders,core}	wall	\N	30	6	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946466454_782f04c4.png	t	2026-06-08 19:21:35.652944+00
4529e223-689a-46f4-874d-d60d32e8d366	Plank	plank	Core stability hold.	Forearms down, body straight, brace and hold.	Core	foundation	core	{core}	none	\N	30	3	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946418885_cb6e5008.png	t	2026-06-08 19:21:35.652944+00
5068a600-d813-47bc-b775-5b119272cba0	Dead Bug	dead-bug	Anti-rotation core.	On back, extend opposite arm and leg, return, switch.	Core	foundation	core	{core}	none	12	\N	3	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946406655_b9003cc2.png	t	2026-06-08 19:21:35.652944+00
6935e116-b6e2-4f05-bb65-89b7d336a5ad	Bicycle Crunch	bicycle-crunch	Dynamic ab work.	Alternate elbow to opposite knee in a pedaling motion.	Core	build	core	{core}	none	20	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png	t	2026-06-08 19:21:35.652944+00
969f4265-5bbd-4082-8011-96e57fd3915e	Russian Twist	russian-twist	Rotational core.	Seated, lean back, rotate side to side.	Core	build	core	{core,obliques}	none	20	\N	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg	t	2026-06-08 19:21:35.652944+00
a6b5629d-37b7-4894-81c3-2ed3b009a740	Hollow Body Hold	hollow-body-hold	Advanced core hold.	Lower back pressed down, arms and legs extended, hold.	Core	peak	core	{core}	none	\N	30	5	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946413781_8c69871a.png	t	2026-06-08 19:21:35.652944+00
4437cc44-dbf9-4171-8dd7-1a5bcb4ab0fa	March in Place	march-in-place	Gentle cardio.	March lifting knees, pump arms, keep a steady pace.	Cardio	foundation	cardio	{cardio}	none	\N	30	4	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg	t	2026-06-08 19:21:35.652944+00
a63abe2a-1311-409b-94c6-cf7d8f563118	Jumping Jacks	jumping-jacks	Classic cardio.	Jump feet out while raising arms, return, repeat.	Cardio	foundation	cardio	{cardio}	none	\N	30	7	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg	t	2026-06-08 19:21:35.652944+00
286d73e2-da21-4f80-b3b4-2d89f353a6e9	High Knees	high-knees	Cardio drive.	Run in place driving knees high and fast.	Cardio	build	cardio	{cardio}	none	\N	30	8	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg	t	2026-06-08 19:21:35.652944+00
4d493676-e65d-4aee-bc4c-277b3bc8f434	Mountain Climbers	mountain-climbers	Core cardio.	In a plank, drive knees to chest alternately at pace.	Cardio	build	cardio	{cardio,core}	none	\N	30	8	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg	t	2026-06-08 19:21:35.652944+00
2da73754-c54e-43e9-8e0f-726eadc63b54	Burpee	burpee	Full-body cardio.	Squat, kick to plank, push-up, jump up.	Cardio	peak	cardio	{cardio}	none	\N	30	10	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg	t	2026-06-08 19:21:35.652944+00
a72709a1-384e-4a7a-8391-d58af96d2ba5	Burpee Tuck Jump	burpee-tuck-jump	Advanced burpee.	Burpee finishing with a tuck jump.	Cardio	peak	cardio	{cardio}	none	\N	30	11	https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg	t	2026-06-08 19:21:35.652944+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".profiles (id, email, full_name, fitness_level, body_weight_kg, weekly_goal, onboarding_completed, created_at) FROM stdin;
\.


--
-- Data for Name: workout_sessions; Type: TABLE DATA; Schema: prj_nh0ZprNY877m; Owner: -
--

COPY "prj_nh0ZprNY877m".workout_sessions (id, device_id, phase, started_at, completed_at, duration_seconds, total_reps, rounds_completed, calories_estimate, status, exercises, user_id) FROM stdin;
5cf0f391-f813-45ff-b84b-3561bdbc8422	tempo-demo	build	2026-06-08 19:21:38.900144+00	2026-06-08 19:41:38.900144+00	1210	305	4	153.0	completed	[{"name": "Push-up", "reps": 54, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 39, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 52, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 61, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
886f9e30-ac95-420a-8077-604a794f96e4	tempo-demo	build	2026-06-06 09:45:38.900144+00	2026-06-06 10:05:38.900144+00	1211	307	4	143.0	completed	[{"name": "Push-up", "reps": 50, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 37, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 49, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 69, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
507e6c4b-4f9e-45b9-bd29-1883be4603d4	tempo-demo	build	2026-06-04 00:09:38.900144+00	2026-06-04 00:29:38.900144+00	1185	298	4	155.0	completed	[{"name": "Push-up", "reps": 54, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 42, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 55, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 69, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
c0208233-88a6-421a-b3d6-2e821aee8e96	tempo-demo	build	2026-06-01 14:33:38.900144+00	2026-06-01 14:53:38.900144+00	1203	309	4	143.9	completed	[{"name": "Push-up", "reps": 60, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 43, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 50, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 74, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
4e59349a-941c-474f-9aa1-0c03167d6c70	tempo-demo	build	2026-05-30 04:57:38.900144+00	2026-05-30 05:17:38.900144+00	1215	294	4	141.2	completed	[{"name": "Push-up", "reps": 55, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 46, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 42, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 75, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
2a51a6b7-1063-4dfe-8444-eaaf70a22260	tempo-demo	build	2026-05-27 19:21:38.900144+00	2026-05-27 19:41:38.900144+00	1188	302	4	141.1	completed	[{"name": "Push-up", "reps": 45, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 40, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 50, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 73, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
a556f198-b6d9-4456-9d60-bde1b603ad61	tempo-demo	build	2026-05-25 09:45:38.900144+00	2026-05-25 10:05:38.900144+00	1215	283	4	150.5	completed	[{"name": "Push-up", "reps": 46, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 51, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 45, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 73, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
bff542e9-5917-4efc-b776-7e2032cf8068	tempo-demo	build	2026-05-23 00:09:38.900144+00	2026-05-23 00:29:38.900144+00	1203	275	4	143.4	completed	[{"name": "Push-up", "reps": 60, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 41, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 47, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 67, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
5d550a45-a8ec-444d-8b05-b7bb32217f35	tempo-demo	build	2026-05-20 14:33:38.900144+00	2026-05-20 14:53:38.900144+00	1183	274	4	147.9	completed	[{"name": "Push-up", "reps": 57, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 48, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 43, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 68, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
2cdc4fe0-0ff2-4bdf-903a-36be1eead7ef	tempo-demo	build	2026-05-18 04:57:38.900144+00	2026-05-18 05:17:38.900144+00	1220	257	4	144.2	completed	[{"name": "Push-up", "reps": 57, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 36, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 46, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 78, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
05674b5b-8c5c-45c5-bfb7-c8adf7dd9b6f	tempo-demo	build	2026-05-15 19:21:38.900144+00	2026-05-15 19:41:38.900144+00	1183	255	4	127.1	completed	[{"name": "Push-up", "reps": 52, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 37, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 41, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 71, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
49e954e3-8fd5-46a8-b278-81906551a0c5	tempo-demo	build	2026-05-13 09:45:38.900144+00	2026-05-13 10:05:38.900144+00	1196	248	4	130.2	completed	[{"name": "Push-up", "reps": 47, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 47, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 49, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 61, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
4d96c74e-b75d-4d9e-a129-d8ae6e1805cf	tempo-demo	build	2026-05-11 00:09:38.900144+00	2026-05-11 00:29:38.900144+00	1191	266	4	143.1	completed	[{"name": "Push-up", "reps": 42, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 51, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 42, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 73, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
3abee8e6-85cf-4d0b-902a-2756ef63b406	tempo-demo	build	2026-05-08 14:33:38.900144+00	2026-05-08 14:53:38.900144+00	1216	255	4	143.0	completed	[{"name": "Push-up", "reps": 59, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 46, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 41, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 61, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
917064cf-1a6d-4b75-b304-288376c21c7c	tempo-demo	build	2026-05-06 04:57:38.900144+00	2026-05-06 05:17:38.900144+00	1201	235	4	124.5	completed	[{"name": "Push-up", "reps": 53, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 41, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 55, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 66, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
b3ec50e7-1758-42ac-9452-f9e64254a4c1	tempo-demo	build	2026-05-03 19:21:38.900144+00	2026-05-03 19:41:38.900144+00	1190	250	4	136.1	completed	[{"name": "Push-up", "reps": 50, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 47, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 41, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 70, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
67110e63-0a0f-4f19-8f73-ac44a926546c	tempo-demo	build	2026-05-01 09:45:38.900144+00	2026-05-01 10:05:38.900144+00	1212	246	4	125.6	completed	[{"name": "Push-up", "reps": 48, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 40, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 50, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 66, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
36652e62-f9b7-4f9a-8f76-3c90b77b887d	tempo-demo	build	2026-04-29 00:09:38.900144+00	2026-04-29 00:29:38.900144+00	1212	243	4	123.8	completed	[{"name": "Push-up", "reps": 45, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 36, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 50, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 79, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
0c5d308e-c247-4144-a98c-696d950ca8cb	tempo-demo	build	2026-04-26 14:33:38.900144+00	2026-04-26 14:53:38.900144+00	1189	225	4	127.6	completed	[{"name": "Push-up", "reps": 55, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 47, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 42, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 78, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
fc955197-a0e9-470f-b90d-3942f8d24a5c	tempo-demo	build	2026-04-24 04:57:38.900144+00	2026-04-24 05:17:38.900144+00	1195	220	4	121.1	completed	[{"name": "Push-up", "reps": 43, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 52, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 42, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 75, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
9438b24c-c728-4621-a865-d65034bbda6a	tempo-demo	build	2026-04-21 19:21:38.900144+00	2026-04-21 19:41:38.900144+00	1194	211	4	127.1	completed	[{"name": "Push-up", "reps": 53, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 37, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 46, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 70, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
32e1fe30-93c2-4e93-8e42-d2e3b9d30b22	tempo-demo	build	2026-04-19 09:45:38.900144+00	2026-04-19 10:05:38.900144+00	1207	207	4	132.8	completed	[{"name": "Push-up", "reps": 54, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 44, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 45, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 76, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
1c020224-442a-42cd-882c-ac74d2dd4488	tempo-demo	build	2026-04-17 00:09:38.900144+00	2026-04-17 00:29:38.900144+00	1219	218	4	129.3	completed	[{"name": "Push-up", "reps": 45, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 43, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 46, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 78, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
f36e14c7-0cf5-4baf-889c-5c4cb7ecbfc5	tempo-demo	build	2026-04-14 14:33:38.900144+00	2026-04-14 14:53:38.900144+00	1198	200	4	118.6	completed	[{"name": "Push-up", "reps": 52, "body_part": "Chest", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946458882_d5314f87.png"}, {"name": "Inverted Row", "reps": 39, "body_part": "Back", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946407984_4f04a7a9.png"}, {"name": "Reverse Lunge", "reps": 45, "body_part": "Legs", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "Russian Twist", "reps": 65, "body_part": "Core", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946402532_3d4f4280.jpg"}, {"name": "High Knees", "reps": 0, "body_part": "Cardio", "image_url": "https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg"}]	\N
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

COPY "prj_nh0ZprNY877m_auth".identities (id, user_id, provider, identity_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

COPY "prj_nh0ZprNY877m_auth".users (id, email, encrypted_password, email_confirmed_at, phone, created_at, updated_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_anonymous, phone_confirmed_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

COPY "prj_nh0ZprNY877m_storage".buckets (id, name, public, created_at, updated_at, file_size_limit, allowed_mime_types) FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

COPY "prj_nh0ZprNY877m_storage".objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, path_tokens, version) FROM stdin;
\.


--
-- Name: crm_appointments crm_appointments_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_appointments
    ADD CONSTRAINT crm_appointments_pkey PRIMARY KEY (id);


--
-- Name: crm_availability crm_availability_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_availability
    ADD CONSTRAINT crm_availability_pkey PRIMARY KEY (id);


--
-- Name: crm_calendar_members crm_calendar_members_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_calendar_members
    ADD CONSTRAINT crm_calendar_members_pkey PRIMARY KEY (id);


--
-- Name: crm_calendars crm_calendars_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_calendars
    ADD CONSTRAINT crm_calendars_pkey PRIMARY KEY (id);


--
-- Name: crm_calendly_connections crm_calendly_connections_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_calendly_connections
    ADD CONSTRAINT crm_calendly_connections_pkey PRIMARY KEY (id);


--
-- Name: crm_campaigns crm_campaigns_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_campaigns
    ADD CONSTRAINT crm_campaigns_pkey PRIMARY KEY (id);


--
-- Name: crm_contact_lists crm_contact_lists_contact_id_list_id_key; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_contact_lists
    ADD CONSTRAINT crm_contact_lists_contact_id_list_id_key UNIQUE (contact_id, list_id);


--
-- Name: crm_contact_lists crm_contact_lists_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_contact_lists
    ADD CONSTRAINT crm_contact_lists_pkey PRIMARY KEY (id);


--
-- Name: crm_contacts crm_contacts_email_key; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_contacts
    ADD CONSTRAINT crm_contacts_email_key UNIQUE (email);


--
-- Name: crm_contacts crm_contacts_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_contacts
    ADD CONSTRAINT crm_contacts_pkey PRIMARY KEY (id);


--
-- Name: crm_events crm_events_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_events
    ADD CONSTRAINT crm_events_pkey PRIMARY KEY (id);


--
-- Name: crm_flow_logs crm_flow_logs_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_logs
    ADD CONSTRAINT crm_flow_logs_pkey PRIMARY KEY (id);


--
-- Name: crm_flow_step_queue crm_flow_step_queue_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_step_queue
    ADD CONSTRAINT crm_flow_step_queue_pkey PRIMARY KEY (id);


--
-- Name: crm_flow_steps crm_flow_steps_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_steps
    ADD CONSTRAINT crm_flow_steps_pkey PRIMARY KEY (id);


--
-- Name: crm_flows crm_flows_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flows
    ADD CONSTRAINT crm_flows_pkey PRIMARY KEY (id);


--
-- Name: crm_lists crm_lists_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_lists
    ADD CONSTRAINT crm_lists_pkey PRIMARY KEY (id);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: exercises exercises_slug_key; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".exercises
    ADD CONSTRAINT exercises_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: workout_sessions workout_sessions_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".workout_sessions
    ADD CONSTRAINT workout_sessions_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_auth".identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_auth".users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_auth".users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_name_key; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_storage".buckets
    ADD CONSTRAINT buckets_name_key UNIQUE (name);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_storage".buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: objects objects_bucket_id_name_key; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_storage".objects
    ADD CONSTRAINT objects_bucket_id_name_key UNIQUE (bucket_id, name);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_storage".objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: crm_calendar_members_calendar_user_unique; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE UNIQUE INDEX crm_calendar_members_calendar_user_unique ON "prj_nh0ZprNY877m".crm_calendar_members USING btree (calendar_id, user_id);


--
-- Name: crm_calendars_slug_unique; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE UNIQUE INDEX crm_calendars_slug_unique ON "prj_nh0ZprNY877m".crm_calendars USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: crm_calendly_connections_user_uri_unique; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE UNIQUE INDEX crm_calendly_connections_user_uri_unique ON "prj_nh0ZprNY877m".crm_calendly_connections USING btree (user_id, calendly_user_uri);


--
-- Name: crm_events_channel_event_type_created_idx; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX crm_events_channel_event_type_created_idx ON "prj_nh0ZprNY877m".crm_events USING btree (channel, event_type, created_at DESC);


--
-- Name: crm_events_contact_channel_event_type_idx; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX crm_events_contact_channel_event_type_idx ON "prj_nh0ZprNY877m".crm_events USING btree (contact_id, channel, event_type);


--
-- Name: idx_crm_appointments_assigned_user_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_appointments_assigned_user_id ON "prj_nh0ZprNY877m".crm_appointments USING btree (assigned_user_id);


--
-- Name: idx_crm_appointments_calendar_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_appointments_calendar_id ON "prj_nh0ZprNY877m".crm_appointments USING btree (calendar_id);


--
-- Name: idx_crm_appointments_contact_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_appointments_contact_id ON "prj_nh0ZprNY877m".crm_appointments USING btree (contact_id);


--
-- Name: idx_crm_appointments_starts_at; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_appointments_starts_at ON "prj_nh0ZprNY877m".crm_appointments USING btree (starts_at);


--
-- Name: idx_crm_appointments_status; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_appointments_status ON "prj_nh0ZprNY877m".crm_appointments USING btree (status);


--
-- Name: idx_crm_availability_calendar_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_availability_calendar_id ON "prj_nh0ZprNY877m".crm_availability USING btree (calendar_id);


--
-- Name: idx_crm_calendar_members_calendar_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_calendar_members_calendar_id ON "prj_nh0ZprNY877m".crm_calendar_members USING btree (calendar_id);


--
-- Name: idx_crm_calendar_members_user_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_calendar_members_user_id ON "prj_nh0ZprNY877m".crm_calendar_members USING btree (user_id);


--
-- Name: idx_crm_calendars_calendly_connection; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_calendars_calendly_connection ON "prj_nh0ZprNY877m".crm_calendars USING btree (calendly_connection_id) WHERE (calendly_connection_id IS NOT NULL);


--
-- Name: idx_crm_calendars_is_active; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_calendars_is_active ON "prj_nh0ZprNY877m".crm_calendars USING btree (is_active);


--
-- Name: idx_crm_calendars_owner_user_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_calendars_owner_user_id ON "prj_nh0ZprNY877m".crm_calendars USING btree (owner_user_id);


--
-- Name: idx_crm_calendly_connections_user_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_calendly_connections_user_id ON "prj_nh0ZprNY877m".crm_calendly_connections USING btree (user_id);


--
-- Name: idx_crm_campaigns_created_at; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_campaigns_created_at ON "prj_nh0ZprNY877m".crm_campaigns USING btree (created_at);


--
-- Name: idx_crm_campaigns_status; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_campaigns_status ON "prj_nh0ZprNY877m".crm_campaigns USING btree (status);


--
-- Name: idx_crm_contact_lists_contact_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_contact_lists_contact_id ON "prj_nh0ZprNY877m".crm_contact_lists USING btree (contact_id);


--
-- Name: idx_crm_contact_lists_list_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_contact_lists_list_id ON "prj_nh0ZprNY877m".crm_contact_lists USING btree (list_id);


--
-- Name: idx_crm_contacts_created_at; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_contacts_created_at ON "prj_nh0ZprNY877m".crm_contacts USING btree (created_at);


--
-- Name: idx_crm_contacts_email; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE UNIQUE INDEX idx_crm_contacts_email ON "prj_nh0ZprNY877m".crm_contacts USING btree (email);


--
-- Name: idx_crm_contacts_source; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_contacts_source ON "prj_nh0ZprNY877m".crm_contacts USING btree (source);


--
-- Name: idx_crm_contacts_subscribed; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_contacts_subscribed ON "prj_nh0ZprNY877m".crm_contacts USING btree (subscribed);


--
-- Name: idx_crm_contacts_tags; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_contacts_tags ON "prj_nh0ZprNY877m".crm_contacts USING gin (tags);


--
-- Name: idx_crm_events_campaign_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_events_campaign_id ON "prj_nh0ZprNY877m".crm_events USING btree (campaign_id);


--
-- Name: idx_crm_events_channel; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_events_channel ON "prj_nh0ZprNY877m".crm_events USING btree (channel);


--
-- Name: idx_crm_events_contact_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_events_contact_id ON "prj_nh0ZprNY877m".crm_events USING btree (contact_id);


--
-- Name: idx_crm_events_created_at; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_events_created_at ON "prj_nh0ZprNY877m".crm_events USING btree (created_at);


--
-- Name: idx_crm_events_event_type; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_events_event_type ON "prj_nh0ZprNY877m".crm_events USING btree (event_type);


--
-- Name: idx_crm_flow_logs_contact_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flow_logs_contact_id ON "prj_nh0ZprNY877m".crm_flow_logs USING btree (contact_id);


--
-- Name: idx_crm_flow_logs_created_at; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flow_logs_created_at ON "prj_nh0ZprNY877m".crm_flow_logs USING btree (created_at);


--
-- Name: idx_crm_flow_logs_flow_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flow_logs_flow_id ON "prj_nh0ZprNY877m".crm_flow_logs USING btree (flow_id);


--
-- Name: idx_crm_flow_step_queue_due; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flow_step_queue_due ON "prj_nh0ZprNY877m".crm_flow_step_queue USING btree (run_at) WHERE ((finished_at IS NULL) AND (attempts < max_attempts));


--
-- Name: idx_crm_flow_steps_flow_id; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flow_steps_flow_id ON "prj_nh0ZprNY877m".crm_flow_steps USING btree (flow_id);


--
-- Name: idx_crm_flows_is_active; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flows_is_active ON "prj_nh0ZprNY877m".crm_flows USING btree (is_active);


--
-- Name: idx_crm_flows_trigger_type; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_crm_flows_trigger_type ON "prj_nh0ZprNY877m".crm_flows USING btree (trigger_type);


--
-- Name: idx_exercises_phase; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_exercises_phase ON "prj_nh0ZprNY877m".exercises USING btree (phase);


--
-- Name: idx_sessions_device; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_sessions_device ON "prj_nh0ZprNY877m".workout_sessions USING btree (device_id, started_at DESC);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE INDEX idx_sessions_user ON "prj_nh0ZprNY877m".workout_sessions USING btree (user_id, started_at DESC);


--
-- Name: idx_identities_user_id; Type: INDEX; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE INDEX idx_identities_user_id ON "prj_nh0ZprNY877m_auth".identities USING btree (user_id);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON "prj_nh0ZprNY877m_auth".users FOR EACH ROW EXECUTE FUNCTION "prj_nh0ZprNY877m".handle_new_user();


--
-- Name: crm_appointments crm_appointments_calendar_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_appointments
    ADD CONSTRAINT crm_appointments_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES "prj_nh0ZprNY877m".crm_calendars(id) ON DELETE CASCADE;


--
-- Name: crm_appointments crm_appointments_contact_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_appointments
    ADD CONSTRAINT crm_appointments_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "prj_nh0ZprNY877m".crm_contacts(id) ON DELETE SET NULL;


--
-- Name: crm_availability crm_availability_calendar_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_availability
    ADD CONSTRAINT crm_availability_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES "prj_nh0ZprNY877m".crm_calendars(id) ON DELETE CASCADE;


--
-- Name: crm_calendar_members crm_calendar_members_calendar_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_calendar_members
    ADD CONSTRAINT crm_calendar_members_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES "prj_nh0ZprNY877m".crm_calendars(id) ON DELETE CASCADE;


--
-- Name: crm_calendars crm_calendars_calendly_connection_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_calendars
    ADD CONSTRAINT crm_calendars_calendly_connection_id_fkey FOREIGN KEY (calendly_connection_id) REFERENCES "prj_nh0ZprNY877m".crm_calendly_connections(id) ON DELETE SET NULL;


--
-- Name: crm_campaigns crm_campaigns_list_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_campaigns
    ADD CONSTRAINT crm_campaigns_list_id_fkey FOREIGN KEY (list_id) REFERENCES "prj_nh0ZprNY877m".crm_lists(id) ON DELETE SET NULL;


--
-- Name: crm_contact_lists crm_contact_lists_contact_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_contact_lists
    ADD CONSTRAINT crm_contact_lists_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "prj_nh0ZprNY877m".crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_contact_lists crm_contact_lists_list_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_contact_lists
    ADD CONSTRAINT crm_contact_lists_list_id_fkey FOREIGN KEY (list_id) REFERENCES "prj_nh0ZprNY877m".crm_lists(id) ON DELETE CASCADE;


--
-- Name: crm_events crm_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_events
    ADD CONSTRAINT crm_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES "prj_nh0ZprNY877m".crm_campaigns(id) ON DELETE CASCADE;


--
-- Name: crm_events crm_events_contact_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_events
    ADD CONSTRAINT crm_events_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "prj_nh0ZprNY877m".crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_flow_logs crm_flow_logs_contact_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_logs
    ADD CONSTRAINT crm_flow_logs_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "prj_nh0ZprNY877m".crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_flow_logs crm_flow_logs_flow_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_logs
    ADD CONSTRAINT crm_flow_logs_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES "prj_nh0ZprNY877m".crm_flows(id) ON DELETE CASCADE;


--
-- Name: crm_flow_logs crm_flow_logs_step_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_logs
    ADD CONSTRAINT crm_flow_logs_step_id_fkey FOREIGN KEY (step_id) REFERENCES "prj_nh0ZprNY877m".crm_flow_steps(id) ON DELETE SET NULL;


--
-- Name: crm_flow_step_queue crm_flow_step_queue_contact_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_step_queue
    ADD CONSTRAINT crm_flow_step_queue_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "prj_nh0ZprNY877m".crm_contacts(id) ON DELETE CASCADE;


--
-- Name: crm_flow_step_queue crm_flow_step_queue_flow_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_step_queue
    ADD CONSTRAINT crm_flow_step_queue_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES "prj_nh0ZprNY877m".crm_flows(id) ON DELETE CASCADE;


--
-- Name: crm_flow_steps crm_flow_steps_flow_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".crm_flow_steps
    ADD CONSTRAINT crm_flow_steps_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES "prj_nh0ZprNY877m".crm_flows(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES "prj_nh0ZprNY877m_auth".users(id) ON DELETE CASCADE;


--
-- Name: workout_sessions workout_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m".workout_sessions
    ADD CONSTRAINT workout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES "prj_nh0ZprNY877m_auth".users(id) ON DELETE CASCADE;


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_auth".identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES "prj_nh0ZprNY877m_auth".users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucket_id_fkey; Type: FK CONSTRAINT; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE ONLY "prj_nh0ZprNY877m_storage".objects
    ADD CONSTRAINT objects_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES "prj_nh0ZprNY877m_storage".buckets(id) ON DELETE CASCADE;


--
-- Name: crm_appointments CRM appointments deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM appointments deletable" ON "prj_nh0ZprNY877m".crm_appointments FOR DELETE USING (true);


--
-- Name: crm_appointments CRM appointments insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM appointments insertable" ON "prj_nh0ZprNY877m".crm_appointments FOR INSERT WITH CHECK (true);


--
-- Name: crm_appointments CRM appointments readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM appointments readable" ON "prj_nh0ZprNY877m".crm_appointments FOR SELECT USING (true);


--
-- Name: crm_appointments CRM appointments updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM appointments updatable" ON "prj_nh0ZprNY877m".crm_appointments FOR UPDATE USING (true);


--
-- Name: crm_availability CRM availability deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM availability deletable" ON "prj_nh0ZprNY877m".crm_availability FOR DELETE USING (true);


--
-- Name: crm_availability CRM availability insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM availability insertable" ON "prj_nh0ZprNY877m".crm_availability FOR INSERT WITH CHECK (true);


--
-- Name: crm_availability CRM availability readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM availability readable" ON "prj_nh0ZprNY877m".crm_availability FOR SELECT USING (true);


--
-- Name: crm_availability CRM availability updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM availability updatable" ON "prj_nh0ZprNY877m".crm_availability FOR UPDATE USING (true);


--
-- Name: crm_calendar_members CRM calendar members deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendar members deletable" ON "prj_nh0ZprNY877m".crm_calendar_members FOR DELETE USING (true);


--
-- Name: crm_calendar_members CRM calendar members insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendar members insertable" ON "prj_nh0ZprNY877m".crm_calendar_members FOR INSERT WITH CHECK (true);


--
-- Name: crm_calendar_members CRM calendar members readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendar members readable" ON "prj_nh0ZprNY877m".crm_calendar_members FOR SELECT USING (true);


--
-- Name: crm_calendar_members CRM calendar members updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendar members updatable" ON "prj_nh0ZprNY877m".crm_calendar_members FOR UPDATE USING (true);


--
-- Name: crm_calendars CRM calendars deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendars deletable" ON "prj_nh0ZprNY877m".crm_calendars FOR DELETE USING (true);


--
-- Name: crm_calendars CRM calendars insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendars insertable" ON "prj_nh0ZprNY877m".crm_calendars FOR INSERT WITH CHECK (true);


--
-- Name: crm_calendars CRM calendars readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendars readable" ON "prj_nh0ZprNY877m".crm_calendars FOR SELECT USING (true);


--
-- Name: crm_calendars CRM calendars updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM calendars updatable" ON "prj_nh0ZprNY877m".crm_calendars FOR UPDATE USING (true);


--
-- Name: crm_campaigns CRM campaigns deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM campaigns deletable" ON "prj_nh0ZprNY877m".crm_campaigns FOR DELETE USING (true);


--
-- Name: crm_campaigns CRM campaigns insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM campaigns insertable" ON "prj_nh0ZprNY877m".crm_campaigns FOR INSERT WITH CHECK (true);


--
-- Name: crm_campaigns CRM campaigns readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM campaigns readable" ON "prj_nh0ZprNY877m".crm_campaigns FOR SELECT USING (true);


--
-- Name: crm_campaigns CRM campaigns updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM campaigns updatable" ON "prj_nh0ZprNY877m".crm_campaigns FOR UPDATE USING (true);


--
-- Name: crm_contact_lists CRM contact lists deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contact lists deletable" ON "prj_nh0ZprNY877m".crm_contact_lists FOR DELETE USING (true);


--
-- Name: crm_contact_lists CRM contact lists insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contact lists insertable" ON "prj_nh0ZprNY877m".crm_contact_lists FOR INSERT WITH CHECK (true);


--
-- Name: crm_contact_lists CRM contact lists readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contact lists readable" ON "prj_nh0ZprNY877m".crm_contact_lists FOR SELECT USING (true);


--
-- Name: crm_contacts CRM contacts deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contacts deletable" ON "prj_nh0ZprNY877m".crm_contacts FOR DELETE USING (true);


--
-- Name: crm_contacts CRM contacts insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contacts insertable" ON "prj_nh0ZprNY877m".crm_contacts FOR INSERT WITH CHECK (true);


--
-- Name: crm_contacts CRM contacts readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contacts readable" ON "prj_nh0ZprNY877m".crm_contacts FOR SELECT USING (true);


--
-- Name: crm_contacts CRM contacts updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM contacts updatable" ON "prj_nh0ZprNY877m".crm_contacts FOR UPDATE USING (true);


--
-- Name: crm_events CRM events insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM events insertable" ON "prj_nh0ZprNY877m".crm_events FOR INSERT WITH CHECK (true);


--
-- Name: crm_events CRM events readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM events readable" ON "prj_nh0ZprNY877m".crm_events FOR SELECT USING (true);


--
-- Name: crm_flow_logs CRM flow logs insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow logs insertable" ON "prj_nh0ZprNY877m".crm_flow_logs FOR INSERT WITH CHECK (true);


--
-- Name: crm_flow_logs CRM flow logs readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow logs readable" ON "prj_nh0ZprNY877m".crm_flow_logs FOR SELECT USING (true);


--
-- Name: crm_flow_step_queue CRM flow queue deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow queue deletable" ON "prj_nh0ZprNY877m".crm_flow_step_queue FOR DELETE USING (true);


--
-- Name: crm_flow_step_queue CRM flow queue insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow queue insertable" ON "prj_nh0ZprNY877m".crm_flow_step_queue FOR INSERT WITH CHECK (true);


--
-- Name: crm_flow_step_queue CRM flow queue readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow queue readable" ON "prj_nh0ZprNY877m".crm_flow_step_queue FOR SELECT USING (true);


--
-- Name: crm_flow_step_queue CRM flow queue updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow queue updatable" ON "prj_nh0ZprNY877m".crm_flow_step_queue FOR UPDATE USING (true);


--
-- Name: crm_flow_steps CRM flow steps deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow steps deletable" ON "prj_nh0ZprNY877m".crm_flow_steps FOR DELETE USING (true);


--
-- Name: crm_flow_steps CRM flow steps insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow steps insertable" ON "prj_nh0ZprNY877m".crm_flow_steps FOR INSERT WITH CHECK (true);


--
-- Name: crm_flow_steps CRM flow steps readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow steps readable" ON "prj_nh0ZprNY877m".crm_flow_steps FOR SELECT USING (true);


--
-- Name: crm_flow_steps CRM flow steps updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flow steps updatable" ON "prj_nh0ZprNY877m".crm_flow_steps FOR UPDATE USING (true);


--
-- Name: crm_flows CRM flows deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flows deletable" ON "prj_nh0ZprNY877m".crm_flows FOR DELETE USING (true);


--
-- Name: crm_flows CRM flows insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flows insertable" ON "prj_nh0ZprNY877m".crm_flows FOR INSERT WITH CHECK (true);


--
-- Name: crm_flows CRM flows readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flows readable" ON "prj_nh0ZprNY877m".crm_flows FOR SELECT USING (true);


--
-- Name: crm_flows CRM flows updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM flows updatable" ON "prj_nh0ZprNY877m".crm_flows FOR UPDATE USING (true);


--
-- Name: crm_lists CRM lists deletable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM lists deletable" ON "prj_nh0ZprNY877m".crm_lists FOR DELETE USING (true);


--
-- Name: crm_lists CRM lists insertable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM lists insertable" ON "prj_nh0ZprNY877m".crm_lists FOR INSERT WITH CHECK (true);


--
-- Name: crm_lists CRM lists readable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM lists readable" ON "prj_nh0ZprNY877m".crm_lists FOR SELECT USING (true);


--
-- Name: crm_lists CRM lists updatable; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "CRM lists updatable" ON "prj_nh0ZprNY877m".crm_lists FOR UPDATE USING (true);


--
-- Name: crm_calendly_connections Calendly connections service only; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "Calendly connections service only" ON "prj_nh0ZprNY877m".crm_calendly_connections USING (false) WITH CHECK (false);


--
-- Name: crm_appointments; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_availability; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_calendar_members; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_calendar_members ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_calendars; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_calendars ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_calendly_connections; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_calendly_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_campaigns; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_contact_lists; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_contact_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_contacts; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_events; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_events ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_flow_logs; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_flow_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_flow_step_queue; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_flow_step_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_flow_steps; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_flow_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_flows; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_lists; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".crm_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: exercises; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: exercises exercises public read; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "exercises public read" ON "prj_nh0ZprNY877m".exercises FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles insert own; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "profiles insert own" ON "prj_nh0ZprNY877m".profiles FOR INSERT WITH CHECK ((id = (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid));


--
-- Name: profiles profiles read own; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "profiles read own" ON "prj_nh0ZprNY877m".profiles FOR SELECT USING ((id = (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid));


--
-- Name: profiles profiles update own; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "profiles update own" ON "prj_nh0ZprNY877m".profiles FOR UPDATE USING ((id = (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid)) WITH CHECK ((id = (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid));


--
-- Name: workout_sessions sessions owner all; Type: POLICY; Schema: prj_nh0ZprNY877m; Owner: -
--

CREATE POLICY "sessions owner all" ON "prj_nh0ZprNY877m".workout_sessions USING ((user_id = (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid)) WITH CHECK ((user_id = (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid));


--
-- Name: workout_sessions; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m".workout_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: users Admin can delete all users; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Admin can delete all users" ON "prj_nh0ZprNY877m_auth".users FOR DELETE TO "prj_nh0ZprNY877m_role" USING (true);


--
-- Name: identities Admin can delete identities; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Admin can delete identities" ON "prj_nh0ZprNY877m_auth".identities FOR DELETE TO "prj_nh0ZprNY877m_role" USING (true);


--
-- Name: users Admin can insert users; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Admin can insert users" ON "prj_nh0ZprNY877m_auth".users FOR INSERT TO "prj_nh0ZprNY877m_role" WITH CHECK (true);


--
-- Name: users Admin can update all users; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Admin can update all users" ON "prj_nh0ZprNY877m_auth".users FOR UPDATE TO "prj_nh0ZprNY877m_role" USING (true);


--
-- Name: users Admin can view all users; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Admin can view all users" ON "prj_nh0ZprNY877m_auth".users FOR SELECT TO "prj_nh0ZprNY877m_role" USING (true);


--
-- Name: identities Users can delete own identities; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can delete own identities" ON "prj_nh0ZprNY877m_auth".identities FOR DELETE USING ((user_id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: users Users can delete own profile; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can delete own profile" ON "prj_nh0ZprNY877m_auth".users FOR DELETE USING ((id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: identities Users can insert own identities; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can insert own identities" ON "prj_nh0ZprNY877m_auth".identities FOR INSERT WITH CHECK ((user_id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: users Users can insert own profile; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can insert own profile" ON "prj_nh0ZprNY877m_auth".users FOR INSERT WITH CHECK ((id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: identities Users can update own identities; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can update own identities" ON "prj_nh0ZprNY877m_auth".identities FOR UPDATE USING ((user_id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: users Users can update own profile; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can update own profile" ON "prj_nh0ZprNY877m_auth".users FOR UPDATE USING ((id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: identities Users can view own identities; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can view own identities" ON "prj_nh0ZprNY877m_auth".identities FOR SELECT USING ((user_id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: users Users can view own profile; Type: POLICY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

CREATE POLICY "Users can view own profile" ON "prj_nh0ZprNY877m_auth".users FOR SELECT USING ((id = "prj_nh0ZprNY877m_auth".auth_uid()));


--
-- Name: identities; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m_auth".identities ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m_auth; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m_auth".users ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets Service role can manage buckets; Type: POLICY; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

CREATE POLICY "Service role can manage buckets" ON "prj_nh0ZprNY877m_storage".buckets USING (true);


--
-- Name: objects Service role can manage objects; Type: POLICY; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

CREATE POLICY "Service role can manage objects" ON "prj_nh0ZprNY877m_storage".objects USING (true);


--
-- Name: buckets; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m_storage".buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: prj_nh0ZprNY877m_storage; Owner: -
--

ALTER TABLE "prj_nh0ZprNY877m_storage".objects ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


