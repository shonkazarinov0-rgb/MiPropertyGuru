# Payment verification changes

This branch fixes Checkout ownership checks, signed Stripe webhooks, HTTPS-to-app return redirects, and false payment-success UI. It does not establish App Store readiness.

## Before deploying

- Set `STRIPE_WEBHOOK_SECRET` on the backend to the endpoint signing secret for `/api/webhook/stripe`. It is different from `STRIPE_API_KEY`. Missing configuration now returns 503; unsigned or invalid requests return 400.
- Enable `checkout.session.completed` and `checkout.session.async_payment_succeeded` for that Stripe endpoint. Failed database writes return non-2xx for Stripe to retry.
- Set `BACKEND_PUBLIC_URL` if the backend is hosted anywhere other than the current Railway URL. The mobile Checkout flow returns via its HTTPS `/api/payments/return` or `/api/payments/cancel` endpoint, then redirects to the existing `mipropertyguru` app scheme.
- If web Checkout is used, set `CHECKOUT_ALLOWED_ORIGINS` to comma-separated trusted HTTPS frontend origins. Unknown origins are rejected. An empty origin selects the mobile flow.
- Existing JWT and administrator secret defaults are still present in `server.py` and require a separate security change and a coordinated secret rotation before release.

## Verification

With backend dependencies installed, run:

```
PYTHONPATH=backend python -m unittest discover -s backend/unit_tests -v
```

Unit tests use the real Stripe signature verifier and mocked database writes. No live customers or payments are created. Backend Python syntax and `git diff --check` were also checked.

Still required: a real Stripe test-mode Checkout on an iPhone/TestFlight build, cancellation and app-return tests, webhook delivery tests against the deployed test backend, and confirmation of production environment variables. An iOS build and frontend type check have not been run in this environment.

## Remaining launch work

- Add an in-app account deletion flow with the required associated-data cleanup and subscription handling.
- Audit authentication and Socket.IO authorization, including room membership.
- Handle subscription renewal, cancellation, failed renewals, and entitlement expiry; this change covers initial Checkout verification only.
- Check the subscription purchase flow against Apple's rules for the intended storefronts and business model.
- AI contract generation remains disabled; the subscription screen now accurately describes service agreement templates.
- Complete an iPhone build, functional testing, privacy disclosures, and App Store submission assets.
