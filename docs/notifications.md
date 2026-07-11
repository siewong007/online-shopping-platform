# Notifications

The shared notification system lives in `frontend/src/shared/notifications`. Mount one
`NotificationProvider` near the application root, and put `AppErrorBoundary` inside it:

```tsx
<NotificationProvider>
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
</NotificationProvider>
```

The provider owns notification lifecycle, queueing, auto-dismissal, retry locking,
deduplication, global runtime coverage, and offline/online messaging. Use the hook in
components; do not create page-specific toast state.

## Severity and presentation

| Severity | Use | Default behavior |
| --- | --- | --- |
| `info` | Neutral progress, instructions, or status | Temporary status |
| `success` | A confirmed completed action | Temporary status |
| `warning` | Attention is needed but work may continue | Longer alert |
| `error` | An operation failed | Persistent alert |
| `critical` | Availability, integrity, security, or core UI failure | Persistent alert |

Use `toast` for temporary, non-blocking feedback; `inline` or `field` beside the
affected form/section; `banner` for connectivity, session, maintenance, or application-wide
conditions; and `modal` only when a critical condition requires immediate action.

```tsx
const { notify, notifyError, dismiss, clearScope } = useNotifications();

notify({
  severity: "success",
  title: "Changes saved",
  message: "Your changes are available now.",
  scope: "product-editor",
  dedupeKey: "product-saved"
});

try {
  await saveProduct(input);
} catch (error) {
  notifyError(error, {
    operation: "save-product",
    scope: "product-editor",
    presentation: "inline",
    retry: { label: "Try saving again", run: () => saveProduct(input) }
  });
}

// Clear local feedback when leaving the editor; global notices remain.
clearScope("product-editor");
```

Only provide `retry` when repeating the operation is safe. The store prevents concurrent
clicks on the same retry, but the backend must still make mutating operations idempotent
where duplicate requests could create records, charge payments, or send messages.

## Errors, logging, and reference IDs

`notifyError` calls `reportError`, which normalizes unknown thrown values into safe copy.
Never put an exception message, stack, endpoint, token, request header, SQL/database text,
or submitted value into `title`, `message`, or `details`. Technical diagnostics remain in
the development console or go to the configured production reporter. A safe reference ID
is shown to users so support can correlate the message with diagnostics.

Configure a monitoring bridge once during application startup:

```ts
configureErrorReporter((normalized, context) => {
  monitoring.capture(normalized.technicalDetails, {
    referenceId: normalized.referenceId,
    code: normalized.code,
    operation: context?.operation,
    // Allow-list non-sensitive metadata. Do not forward tokens or form values.
  });
});
```

## Validation

Use `normalizeError(error).fieldErrors` to map server validation to known input names.
Keep the user's entered data, render each message beside its input, add `aria-invalid` and
`aria-describedby`, and focus or scroll to the first invalid field. When several fields
fail, add one `warning` summary with `presentation: "inline"`; do not report validation as
a server failure. Ignore unknown field names rather than turning them into selectors or
HTML, and use only allow-listed messages from the normalizer.

## Writing and testing messages

State what happened, whether the action completed, and what the user can do next. Keep
copy concise and avoid blame or jargon. Give repeated conditions a stable `dedupeKey` and
appropriate `scope`. `NotificationBox` carries the severity label, icon, border, ARIA role,
keyboard buttons, forced-color support, and reduced-motion behavior; custom message UIs
must preserve those cues. Real focus order, browser error boundaries, responsive layout,
and animation should be checked in browser QA in addition to unit tests.
