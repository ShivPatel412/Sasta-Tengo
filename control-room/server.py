import base64
import hashlib
import hmac
import http.cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import threading
import time
from urllib.parse import urlsplit
import website_auth

ROOT=Path(__file__).resolve().parent
STATE=Path(os.environ.get('SHIV_STATE','/var/lib/shiv-control'))
AUTH=STATE/'auth.json'
SESSIONS={}
ATTEMPTS={}
LOCK=threading.Lock()

def website_login_enabled():
    return (STATE/'use-website-login').exists()

def password_hash(password,salt):
    return hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1).hex()

def create_auth(password):
    salt=secrets.token_hex(16)
    return {'salt':salt,'hash':password_hash(password,salt)}

class Handler(BaseHTTPRequestHandler):
    server_version='ShivControl'
    def log_message(self,format,*args): pass
    def reply(self,status,content,ctype='application/json',cookie=None):
        data=content if isinstance(content,bytes) else (json.dumps(content).encode() if ctype=='application/json' else content.encode())
        self.send_response(status)
        self.send_header('Content-Type',ctype)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY')
        self.send_header('Referrer-Policy','no-referrer')
        wasm=" 'wasm-unsafe-eval'" if urlsplit(self.path).path=='/3d' else ''
        self.send_header('Content-Security-Policy',f"default-src 'self'; script-src 'self'{wasm}; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        if cookie: self.send_header('Set-Cookie',cookie)
        self.end_headers();self.wfile.write(data)
    def host(self): return self.headers.get('Host','').lower()
    def local(self): return self.host() in ['localhost:8787','127.0.0.1:8787'] and not self.headers.get('X-Forwarded-For') and not self.headers.get('CF-Connecting-IP')
    def session(self):
        try:
            cookie=http.cookies.SimpleCookie(self.headers.get('Cookie',''))
            token=cookie['shiv_session'].value
            with LOCK:
                session=SESSIONS.get(token)
            if not session or session['expires']<=time.time(): return False
            if website_login_enabled():
                if not session.get('website_token'): return False
                try: website_auth.validate(session['website_token'])
                except website_auth.AuthError:
                    with LOCK: SESSIONS.pop(token,None)
                    return False
            return True
        except (KeyError,http.cookies.CookieError): return False
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/healthz': return self.reply(200,{'ok':True})
        if path=='/api/session': return self.reply(200,{'authenticated':self.session(),'setup_available':not website_login_enabled() and not AUTH.exists() and self.local(),'auth_provider':'website' if website_login_enabled() else 'local'})
        if path=='/api/overview':
            if not self.session(): return self.reply(401,{'error':'Please sign in.'})
            try: return self.reply(200,(STATE/'snapshot.json').read_bytes())
            except OSError: return self.reply(503,{'error':'Waiting for the first service snapshot.'})
        if path=='/3d':
            if not self.session():
                self.send_response(303);self.send_header('Location','/?view=3d');self.send_header('Cache-Control','no-store');self.end_headers();return
            return self.reply(200,(ROOT/'static/hq.html').read_bytes(),'text/html; charset=utf-8')
        if path.startswith('/hq/'):
            # Only generated JS/CSS assets; never serve state, paths or arbitrary files.
            filename=path.removeprefix('/hq/')
            if not re.fullmatch(r'[A-Za-z0-9_-]+\.(js|css)',filename): return self.reply(404,{'error':'Not found'})
            asset=ROOT/'static/hq'/filename
            if not asset.is_file(): return self.reply(404,{'error':'Not found'})
            return self.reply(200,asset.read_bytes(),'application/javascript; charset=utf-8' if filename.endswith('.js') else 'text/css; charset=utf-8')
        files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'}
        if path not in files: return self.reply(404,{'error':'Not found'})
        ctype={'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'application/javascript; charset=utf-8'}[files[path].rsplit('.',1)[1]]
        self.reply(200,(ROOT/'static'/files[path]).read_bytes(),ctype)
    def do_POST(self):
        path=urlsplit(self.path).path
        origin=self.headers.get('Origin','')
        if origin not in ['https://dashboard.shivpatel.in','http://localhost:8787','http://127.0.0.1:8787'] or urlsplit(origin).netloc.lower()!=self.host():
            return self.reply(403,{'error':'Invalid request origin.'})
        if self.headers.get('Content-Type','').split(';')[0]!='application/json': return self.reply(415,{'error':'JSON required.'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>8192: raise ValueError()
            body=json.loads(self.rfile.read(length))
            if not isinstance(body,dict): raise ValueError()
        except (ValueError,UnicodeError): return self.reply(400,{'error':'Invalid request.'})
        if path=='/api/setup':
            if website_login_enabled(): return self.reply(403,{'error':'Both dashboards use your website account. Local account setup is disabled.'})
            if not self.local(): return self.reply(403,{'error':'First setup is available only on this PC at localhost:8787.'})
            p=body.get('password','');c=body.get('cloud_password','')
            if not isinstance(p,str) or not isinstance(c,str) or not 12<=len(p)<=256 or not 12<=len(c)<=256: return self.reply(400,{'error':'Use at least 12 characters for each password.'})
            if p!=body.get('password_confirm') or c!=body.get('cloud_password_confirm'): return self.reply(400,{'error':'Password confirmation does not match.'})
            if p==c: return self.reply(400,{'error':'Choose different passwords for the dashboard and Nextcloud.'})
            with LOCK:
                if AUTH.exists(): return self.reply(409,{'error':'Setup has already been completed.'})
                auth=create_auth(p)
                fd=os.open(AUTH,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
                with os.fdopen(fd,'w') as stream: json.dump(auth,stream)
                secret=STATE/'cloud-init/admin-password'
                secret.write_text(c);secret.chmod(0o600)
                (STATE/'cloud-init/requested').touch()
            return self.reply(200,{'ok':True,'message':'Dashboard account created. Nextcloud is being initialized. Sign in as shiv.'})
        if path=='/api/login':
            key=self.headers.get('CF-Connecting-IP') or self.client_address[0]
            with LOCK:
                attempts=[t for t in ATTEMPTS.get(key,[]) if t>time.time()-900]
                ATTEMPTS[key]=attempts
                if len(attempts)>=8: return self.reply(429,{'error':'Too many attempts. Try again in 15 minutes.'})
                attempts.append(time.time())
            upstream_token=None
            p=body.get('password','');username=body.get('username','')
            if not isinstance(p,str) or not isinstance(username,str) or not 1<=len(p)<=256 or not 1<=len(username)<=254:
                return self.reply(401,{'error':'Enter your account email and password.'})
            if website_login_enabled():
                try: upstream_token=website_auth.login(username.strip(),p)
                except website_auth.AuthError as error: return self.reply(error.status,{'error':str(error)})
                good=True
            else:
                try:
                    auth=json.loads(AUTH.read_text())
                    good=username=='shiv' and hmac.compare_digest(password_hash(p,auth['salt']),auth['hash'])
                except (OSError,ValueError): good=False
            if not good: return self.reply(401,{'error':'Incorrect username or password.'})
            token=secrets.token_urlsafe(32)
            with LOCK:
                for old in [s for s,e in SESSIONS.items() if e['expires']<time.time()]: SESSIONS.pop(old,None)
                SESSIONS[token]={'expires':time.time()+28800,'website_token':upstream_token};ATTEMPTS.pop(key,None)
            secure='; Secure' if not self.local() else ''
            return self.reply(200,{'ok':True},cookie=f'shiv_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800{secure}')
        if path=='/api/logout':
            try:
                cookie=http.cookies.SimpleCookie(self.headers.get('Cookie',''))
                with LOCK: old=SESSIONS.pop(cookie['shiv_session'].value,None)
                if old and old.get('website_token'):
                    try: website_auth.logout(old['website_token'])
                    except website_auth.AuthError: pass
            except (KeyError,http.cookies.CookieError): pass
            return self.reply(200,{'ok':True},cookie='shiv_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
        return self.reply(404,{'error':'Not found'})

if __name__=='__main__':
    ThreadingHTTPServer(('127.0.0.1',8787),Handler).serve_forever()
