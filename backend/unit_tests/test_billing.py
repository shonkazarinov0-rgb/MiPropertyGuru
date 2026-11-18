import hashlib
import hmac
import json
import os
import time
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from billing import apply_checkout_session, checkout_urls, verify_stripe_event


class SignatureTests(unittest.TestCase):
    def test_valid_signature(self):
        body = json.dumps({'id': 'evt_test', 'object': 'event', 'type': 'checkout.session.completed',
                           'data': {'object': {}}}).encode()
        timestamp = int(time.time())
        digest = hmac.new(b'whsec_test', str(timestamp).encode() + b'.' + body,
                          hashlib.sha256).hexdigest()
        event = verify_stripe_event(body, f't={timestamp},v1={digest}', 'whsec_test')
        self.assertEqual(event.id, 'evt_test')
        with self.assertRaises(HTTPException):
            verify_stripe_event(body + b' ', f't={timestamp},v1={digest}', 'whsec_test')

    def test_missing_invalid_and_unconfigured_signatures(self):
        for signature, secret, status in [(None, 'secret', 400), ('bad', 'secret', 400),
                                           ('bad', '', 503)]:
            with self.subTest(status=status), self.assertRaises(HTTPException) as exc:
                verify_stripe_event(b'{}', signature, secret)
            self.assertEqual(exc.exception.status_code, status)

    @patch.dict(os.environ, {'BACKEND_PUBLIC_URL': 'https://api.example.com',
                             'CHECKOUT_ALLOWED_ORIGINS': 'https://app.example.com'})
    def test_mobile_and_web_return_urls(self):
        self.assertEqual(checkout_urls('')[0],
                         'https://api.example.com/api/payments/return?session_id={CHECKOUT_SESSION_ID}')
        self.assertEqual(checkout_urls('https://app.example.com/')[1],
                         'https://app.example.com/payment')
        for origin in ['https://attacker.example', 'https://app.example.com/evil',
                       'http://app.example.com', 'https://app.example.com?x=1']:
            with self.subTest(origin=origin), self.assertRaises(HTTPException):
                checkout_urls(origin)


class PaymentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = SimpleNamespace(payment_transactions=SimpleNamespace(
            find_one=AsyncMock(return_value={'user_id': 'owner'}), update_one=AsyncMock()),
            users=SimpleNamespace(update_one=AsyncMock()))
        self.session = {'id': 'cs_test', 'metadata': {'user_id': 'owner',
                        'type': 'contractor_subscription'}, 'mode': 'subscription',
                        'payment_status': 'paid', 'status': 'complete'}

    async def test_paid_session_and_repeated_delivery(self):
        for _ in range(2):
            await apply_checkout_session(self.db, self.session, expected_user_id='owner')
        self.assertEqual(self.db.users.update_one.await_count, 2)
        self.assertEqual(self.db.payment_transactions.update_one.call_args.args[1]['$set']['status'],
                         'completed')

    async def test_complete_but_unpaid_does_not_activate(self):
        self.session['payment_status'] = 'unpaid'
        await apply_checkout_session(self.db, self.session)
        self.db.users.update_one.assert_not_awaited()

    async def test_paid_but_incomplete_does_not_activate(self):
        self.session['status'] = 'open'
        await apply_checkout_session(self.db, self.session)
        self.db.users.update_one.assert_not_awaited()

    async def test_other_users_session_is_rejected_without_writes(self):
        with self.assertRaises(HTTPException) as exc:
            await apply_checkout_session(self.db, self.session, expected_user_id='other')
        self.assertEqual(exc.exception.status_code, 403)
        self.db.users.update_one.assert_not_awaited()
        self.db.payment_transactions.update_one.assert_not_awaited()

    async def test_unrelated_checkout_rejected(self):
        self.session['metadata']['type'] = 'other_product'
        with self.assertRaises(HTTPException):
            await apply_checkout_session(self.db, self.session)
        self.db.users.update_one.assert_not_awaited()

    async def test_missing_transaction_requests_retry(self):
        self.db.payment_transactions.find_one.return_value = None
        with self.assertRaises(HTTPException) as exc:
            await apply_checkout_session(self.db, self.session)
        self.assertEqual(exc.exception.status_code, 409)
        self.db.users.update_one.assert_not_awaited()

    async def test_database_failure_propagates_for_retry(self):
        self.db.users.update_one.side_effect = RuntimeError('database unavailable')
        with self.assertRaises(RuntimeError):
            await apply_checkout_session(self.db, self.session)
        self.db.payment_transactions.update_one.assert_not_awaited()


if __name__ == '__main__':
    unittest.main()
