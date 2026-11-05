import http.client
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer
import server

class AuthTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        server.STATE=Path(self.tmp.name);server.AUTH=server.STATE/'auth.json'
        (server.STATE/'cloud-init').mkdir()
        server.SESSIONS.clear();server.ATTEMPTS.clear()
        self.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        threading.Thread(target=self.http.serve_forever,daemon=True).start()
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.tmp.cleanup()
    def req(self,path,data=None,origin='http://localhost:8787',host='localhost:8787',cookie=None):
        c=http.client.HTTPConnection('127.0.0.1',self.http.server_port)
        headers={'Host':host,'Origin':origin,'Content-Type':'application/json'}
        if cookie: headers['Cookie']=cookie
        c.request('POST' if data is not None else 'GET',path,json.dumps(data) if data is not None else None,headers)
        r=c.getresponse();status=r.status;h=dict(r.getheaders());body=r.read();c.close()
        return status,h,json.loads(body) if h.get('Content-Type')=='application/json' else body
    def setup_data(self):
        return {'password':'a-dashboard-password-test','password_confirm':'a-dashboard-password-test','cloud_password':'a-cloud-password-test','cloud_password_confirm':'a-cloud-password-test'}
    def test_authentication_and_csrf(self):
        self.assertEqual(self.req('/api/overview')[0],401)
        self.assertEqual(self.req('/api/setup',self.setup_data(),origin='https://evil.example')[0],403)
        self.assertEqual(self.req('/api/setup',self.setup_data(),host='dashboard.shivpatel.in',origin='https://dashboard.shivpatel.in')[0],403)
        self.assertEqual(self.req('/api/setup',self.setup_data())[0],200)
        self.assertEqual(self.req('/api/setup',self.setup_data())[0],409)
        self.assertNotIn('a-dashboard-password-test',server.AUTH.read_text())
        self.assertEqual(self.req('/api/login',{'username':'shiv','password':'wrong'})[0],401)
        status,h,_=self.req('/api/login',{'username':'shiv','password':'a-dashboard-password-test'})
        self.assertEqual(status,200);self.assertIn('HttpOnly',h['Set-Cookie'])
        cookie=h['Set-Cookie'].split(';')[0]
        self.assertTrue(self.req('/api/session',cookie=cookie)[2]['authenticated'])
        (server.STATE/'snapshot.json').write_text('{"workflows":[]}')
        self.assertEqual(self.req('/api/overview',cookie=cookie)[0],200)
        self.assertEqual(self.req('/api/logout',{},cookie=cookie)[0],200)
        self.assertEqual(self.req('/api/overview',cookie=cookie)[0],401)
    def test_password_validation_and_rate_limit(self):
        data=self.setup_data();data['cloud_password']=data['password'];data['cloud_password_confirm']=data['password']
        self.assertEqual(self.req('/api/setup',data)[0],400)
        for _ in range(8): self.assertEqual(self.req('/api/login',{'username':'shiv','password':'wrong'})[0],401)
        self.assertEqual(self.req('/api/login',{'username':'shiv','password':'wrong'})[0],429)

    def test_website_login_has_no_local_fallback_and_revalidates_session(self):
        self.assertEqual(self.req('/api/setup',self.setup_data())[0],200)
        (server.STATE/'use-website-login').touch()
        self.assertFalse(self.req('/api/session')[2]['setup_available'])
        self.assertEqual(self.req('/api/session')[2]['auth_provider'],'website')
        self.assertEqual(self.req('/api/setup',self.setup_data())[0],403)
        with patch('website_auth.login',side_effect=server.website_auth.AuthError(401,'Incorrect website account email or password.')):
            self.assertEqual(self.req('/api/login',{'username':'shiv','password':'a-dashboard-password-test'})[0],401)
        with patch('website_auth.login',return_value='a'*64) as login:
            status,headers,_=self.req('/api/login',{'username':'owner@example.test','password':'website-password-test'})
            self.assertEqual(status,200)
            login.assert_called_once_with('owner@example.test','website-password-test')
        cookie=headers['Set-Cookie'].split(';')[0]
        with patch('website_auth.validate',return_value={'email':'owner@example.test'}):
            self.assertTrue(self.req('/api/session',cookie=cookie)[2]['authenticated'])
        (server.STATE/'snapshot.json').write_text('{}')
        with patch('website_auth.validate',side_effect=server.website_auth.AuthError(401,'Please sign in again.')):
            self.assertEqual(self.req('/api/overview',cookie=cookie)[0],401)
        self.assertNotIn('website-password-test',server.AUTH.read_text())

    def test_website_outage_fails_closed(self):
        (server.STATE/'use-website-login').touch()
        with patch('website_auth.login',side_effect=server.website_auth.AuthError(503,'Website unavailable')):
            self.assertEqual(self.req('/api/login',{'username':'owner@example.test','password':'website-password-test'})[0],503)
        self.assertFalse(server.SESSIONS)

    def test_hq_keeps_existing_auth_and_only_serves_generated_assets(self):
        status,headers,_=self.req('/3d')
        self.assertEqual(status,303);self.assertEqual(headers['Location'],'/?view=3d')
        server.SESSIONS['hq-test']={'expires':time.time()+60}
        status,headers,body=self.req('/3d',cookie='shiv_session=hq-test')
        self.assertEqual(status,200);self.assertIn(b'/hq/app.js',body)
        self.assertIn("'wasm-unsafe-eval'",headers['Content-Security-Policy'])
        self.assertNotIn("'unsafe-eval'",headers['Content-Security-Policy'])
        self.assertNotIn("'wasm-unsafe-eval'",self.req('/')[1]['Content-Security-Policy'])
        self.assertEqual(self.req('/hq/app.js')[0],200)
        for path in ['/hq/../server.py','/hq/%2e%2e%2fserver.py','/hq/snapshot.json','/hq/auth.json']:
            self.assertEqual(self.req(path)[0],404)
        self.assertEqual(self.req('/api/overview')[0],401)

if __name__=='__main__': unittest.main()
