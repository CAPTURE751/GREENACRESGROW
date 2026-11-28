Crop lifecycle helpers stay in `src/lib/crop-lifecycle.ts` so crop cards and Finance selections share the same date/status rules.
Behavior tests live in the top-level `tests/` folder and use Bun's built-in test runner to stay outside the Vite app bundle.
Shared Edge Function input guards live in `supabase/functions/_shared` so handlers and behavior tests enforce the same allowlists.
Crop expense categories and activity presets live in `src/lib/crop-expense-taxonomy.ts` so Finance and crop expense entry stay aligned.