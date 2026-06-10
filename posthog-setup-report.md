<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into Tempo: Adaptive Circuit Workouts. PostHog is installed via `posthog-react-native` with Expo peer dependencies, configured through `app.config.js` extras and `expo-constants`, and wrapped in a `PostHogProvider` in `app/_layout.tsx` for autocapture (touch events) alongside the existing Vercel Analytics provider. Users are identified on session restore, sign-in, and sign-up using `posthog.identify()` with their Supabase user ID. PostHog is reset on sign-out. Manual screen tracking fires on every route change via `posthog.screen()`.

| Event | Description | File |
|---|---|---|
| `signed_up` | User successfully created a new account | `app/auth.tsx` |
| `signed_in` | User successfully signed in to an existing account | `app/auth.tsx` |
| `guest_mode_started` | User chose to continue as a guest without creating an account | `app/welcome.tsx` |
| `onboarding_completed` | New user finished the onboarding flow with fitness level, weight, and weekly goal | `app/onboarding.tsx` |
| `circuit_generated` | User generated a new workout circuit for their selected level | `app/(tabs)/workout.tsx` |
| `circuit_regenerated` | User discarded the current circuit and generated a new one | `app/(tabs)/workout.tsx` |
| `circuit_started` | User tapped Start to begin an active workout session | `app/(tabs)/workout.tsx` |
| `workout_completed` | User finished all rounds of a circuit session | `app/session.tsx` |
| `workout_quit` | User quit an in-progress workout session before completing it | `app/session.tsx` |
| `profile_updated` | User saved changes to their fitness level or body weight | `app/(tabs)/profile.tsx` |
| `exercise_viewed` | User opened the detail page for a specific exercise | `app/exercise/[slug].tsx` |
| `guest_upgrade_tapped` | Guest user tapped the 'Create free account' CTA on the profile screen | `app/(tabs)/profile.tsx` |
| `signed_out` | User signed out or exited guest mode | `app/(tabs)/profile.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/463266/dashboard/1691384)
- [User conversion funnel](https://us.posthog.com/project/463266/insights/dT8jb5HC) — Full funnel: signed_up → onboarding_completed → circuit_generated → circuit_started → workout_completed
- [Workouts completed over time](https://us.posthog.com/project/463266/insights/c2WEIwxE) — Daily trend of workout completions
- [Workout quit rate](https://us.posthog.com/project/463266/insights/XqVJkBV1) — quit vs completed side-by-side to surface churn signals
- [New users: registered vs guest](https://us.posthog.com/project/463266/insights/6Yi0rBA2) — Compare account sign-ups against guest-mode starts
- [Circuit generation to start funnel](https://us.posthog.com/project/463266/insights/US8fjB5d) — Browse-to-workout conversion within 1 hour

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
