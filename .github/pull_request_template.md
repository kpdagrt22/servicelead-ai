## Summary

<!-- What does this PR change and why? -->

## Changes

-

## Checks

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] New/changed business logic has tests

## Compliance review

- [ ] Does not enable cold/outbound messaging
- [ ] Honors STOP/opt-out; never messages opted-out contacts
- [ ] Stores/preserves consent status where applicable
- [ ] Maintains organization data isolation (RLS / service-role boundary)
- [ ] No medical-emergency triage or guaranteed-outcome claims

## Notes

<!-- Migrations to run, env vars to set, follow-ups, screenshots, etc. -->
