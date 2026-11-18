"""Checkout validation shared by authenticated polling and signed webhooks."""
import os
from urllib.parse import urlsplit

import stripe
from fastapi import HTTPException


def checkout_urls(origin):
    public_url = os.environ.get(
        'BACKEND_PUBLIC_URL', 'https://mipropertyguru-production.up.railway.app'
    ).rstrip('/')
    if not origin:
        return (f'{public_url}/api/payments/return?session_id={{CHECKOUT_SESSION_ID}}',
                f'{public_url}/api/payments/cancel')
    origin = origin.rstrip('/')
    allowed = {value.strip().rstrip('/') for value in
               os.environ.get('CHECKOUT_ALLOWED_ORIGINS', '').split(',') if value.strip()}
    parsed = urlsplit(origin)
    if (origin not in allowed or parsed.scheme != 'https' or not parsed.netloc
            or parsed.path or parsed.query or parsed.fragment or parsed.username):
        raise HTTPException(400, 'Checkout origin is not allowed')
    return (f'{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}',
            f'{origin}/payment')


def verify_stripe_event(body, signature, secret):
    if not secret:
        raise HTTPException(503, 'Payment webhook is not configured')
    if not signature:
        raise HTTPException(400, 'Missing payment signature')
    try:
        return stripe.Webhook.construct_event(body, signature, secret)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(400, 'Invalid payment signature or payload')


async def apply_checkout_session(db, session, expected_user_id=None):
    metadata = session.get('metadata') or {}
    user_id = metadata.get('user_id')
    if (not user_id or metadata.get('type') != 'contractor_subscription'
            or session.get('mode') != 'subscription'):
        raise HTTPException(400, 'Invalid subscription checkout')
    if expected_user_id is not None and user_id != expected_user_id:
        raise HTTPException(403, 'Payment belongs to another account')
    tx = await db.payment_transactions.find_one({
        'session_id': session['id'], 'user_id': user_id
    })
    if not tx:
        # A webhook can race the transaction insert. Non-2xx requests a retry.
        raise HTTPException(409, 'Payment transaction is not available yet')
    paid = session.get('payment_status') == 'paid'
    complete = session.get('status') == 'complete'
    if paid and complete:
        # Repeated signed events can safely repeat these assignments. Activate first
        # so a failed write never leaves a completed transaction without access.
        await db.users.update_one({'id': user_id, 'role': 'contractor'},
                                  {'$set': {'subscription_status': 'active'}})
    await db.payment_transactions.update_one(
        {'session_id': session['id'], 'user_id': user_id},
        {'$set': {'payment_status': session.get('payment_status'),
                  'status': 'completed' if paid and complete else session.get('status')}}
    )
