from email.message import Message
import unittest
from unittest.mock import patch
import website_auth

class WebsiteAuthTests(unittest.TestCase):
    def test_login_requires_website_session_and_verifies_owner(self):
        headers=Message();headers.add_header('Set-Cookie','shiv_admin='+'b'*64+'; HttpOnly; Secure; Path=/')
        with patch('website_auth.request',side_effect=[({'ok':True},headers),({'user':{'email':'owner@example.test'}},Message())]) as request:
            self.assertEqual(website_auth.login('owner@example.test','test-password'),'b'*64)
            self.assertEqual(request.call_args_list[0].args,('login',{'email':'owner@example.test','password':'test-password'}))
            self.assertEqual(request.call_args_list[1].kwargs,{'token':'b'*64})
    def test_missing_or_invalid_session_cookie_is_rejected(self):
        for value in [None,'shiv_admin=not-a-valid-token','other_cookie='+'a'*64]:
            headers=Message()
            if value: headers.add_header('Set-Cookie',value)
            with patch('website_auth.request',return_value=({'ok':True},headers)):
                with self.assertRaises(website_auth.AuthError): website_auth.login('owner@example.test','test-password')
    def test_redirects_and_malformed_session_response_are_rejected(self):
        self.assertIsNone(website_auth.NoRedirect().redirect_request(None,None,302,'',{},'https://other.example'))
        with patch('website_auth.request',return_value=({'user':{}},Message())):
            with self.assertRaises(website_auth.AuthError): website_auth.validate('a'*64)

if __name__=='__main__': unittest.main()
