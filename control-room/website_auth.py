"""Use the existing website account without storing its password or sharing browser cookies."""
import http.cookies
import json
import re
import urllib.error
import urllib.request

ORIGIN='https://www.shivpatel.in'

class AuthError(Exception):
    def __init__(self,status,message):
        super().__init__(message)
        self.status=status

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        return None

def request(path,body=None,token=None):
    headers={'Origin':ORIGIN,'Accept':'application/json','User-Agent':'ShivControlRoom/1.0 (+https://dashboard.shivpatel.in)'}
    if body is not None: headers['Content-Type']='application/json'
    if token:
        if not re.fullmatch(r'[a-f0-9]{64}',token): raise AuthError(401,'Please sign in again.')
        headers['Cookie']='shiv_admin='+token
    req=urllib.request.Request(ORIGIN+'/api/admin/'+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
    try:
        with urllib.request.build_opener(NoRedirect).open(req,timeout=10) as response:
            data=response.read(65537)
            if len(data)>65536: raise ValueError('Oversized authentication response')
            return json.loads(data),response.headers
    except urllib.error.HTTPError as error:
        if error.code in (400,401,422): raise AuthError(401,'Incorrect website account email or password.') from None
        if error.code==429: raise AuthError(429,'Too many attempts. Please try again in 10 minutes.') from None
        raise AuthError(503,'Website sign-in is temporarily unavailable. Please try again shortly.') from None
    except (OSError,ValueError,urllib.error.URLError):
        raise AuthError(503,'Website sign-in is temporarily unavailable. Please try again shortly.') from None

def login(email,password):
    _,headers=request('login',{'email':email,'password':password})
    cookie=http.cookies.SimpleCookie()
    for header in headers.get_all('Set-Cookie',[]): cookie.load(header)
    token=cookie.get('shiv_admin')
    if token is None or not re.fullmatch(r'[a-f0-9]{64}',token.value):
        raise AuthError(503,'Website sign-in did not return a valid session.')
    validate(token.value)
    return token.value

def validate(token):
    data,_=request('session',token=token)
    if not isinstance(data,dict) or not isinstance(data.get('user'),dict) or not data['user'].get('email'):
        raise AuthError(401,'Please sign in again.')
    return data['user']

def logout(token):
    request('logout',{},token)
