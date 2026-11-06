"""Bounded portfolio bridge using the existing server-held website session."""
import http.cookies
import json
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urlsplit, parse_qs, urlencode
import website_auth


def website(handler, path, body=None):
    module=sys.modules[handler.__class__.__module__]
    cookie=http.cookies.SimpleCookie(handler.headers.get('Cookie',''))
    with module.LOCK:
        token=module.SESSIONS.get(cookie['shiv_session'].value,{}).get('website_token')
    if not token: return 401,{'error':'Sign in with your website account.'}
    headers={'Origin':website_auth.ORIGIN,'Cookie':'shiv_admin='+token,'Accept':'application/json'}
    data=None
    if body is not None: data=json.dumps(body).encode();headers['Content-Type']='application/json'
    req=urllib.request.Request(website_auth.ORIGIN+'/api/admin/'+path,data=data,headers=headers)
    try:
        with urllib.request.build_opener(website_auth.NoRedirect).open(req,timeout=25) as response:
            data=response.read(2_000_001)
            if len(data)>2_000_000: raise ValueError('Oversized response')
            return 200,json.loads(data)
    except urllib.error.HTTPError as error:
        # Only the website's deliberately public validation message crosses the bridge.
        try: message=json.loads(error.read(8192)).get('message')
        except (ValueError,AttributeError): message=None
        return (error.code if error.code in (401,403,409,422,503) else 503),{'error':message or 'Portfolio service unavailable.'}


def worker(handler,body=None):
    import photo_routes
    config=json.loads((photo_routes.handler_module_state(handler)/'project-automation.json').read_text())
    req=urllib.request.Request('http://127.0.0.1:8793'+('/run' if body is not None else '/status'),
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization':'Bearer '+config['token'],'Content-Type':'application/json'})
    try:
        with urllib.request.build_opener(website_auth.NoRedirect).open(req,timeout=10) as response:
            return response.status,json.loads(response.read(65536))
    except urllib.error.HTTPError as error:
        return error.code,{'error':'Project worker could not accept this request.'}


def get(handler,path,root):
    files={'/projects':'projects.html','/projects.js':'projects.js','/projects.css':'projects.css'}
    if path in files:
        if not handler.session(): handler.reply(401,{'error':'Sign in at the master dashboard first.'});return True
        kind={'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8'}[files[path].rsplit('.',1)[1]]
        handler.reply(200,(root/'static'/files[path]).read_bytes(),kind);return True
    resources={'/api/website/stats':'stats','/api/website/projects':'projects','/api/website/contacts':'contacts','/api/website/appointments':'appointments','/api/website/categories':'categories','/api/project-drafts':'project-drafts','/api/website/session':'session'}
    if path not in resources and path!='/api/project-worker':return False
    if not handler.session():handler.reply(401,{'error':'Please sign in.'});return True
    try:
        if path=='/api/project-worker': status,data=worker(handler)
        else:
            target=resources[path]
            if target in ('projects','contacts','appointments'):
                params=parse_qs(urlsplit(handler.path).query)
                page=params.get('page',['1'])[0]
                if not re.fullmatch(r'[1-9]\d{0,5}',page):handler.reply(400,{'error':'Invalid page.'});return True
                target+='?'+urlencode({'page':page,'search':params.get('search',[''])[0][:255]})
            status,data=website(handler,target)
        handler.reply(status,data)
    except (OSError,ValueError,KeyError):handler.reply(503,{'error':'Connection unavailable. Check portfolio API or worker configuration.'})
    return True


def post(handler,path,body):
    match=re.fullmatch(r'/api/project-drafts/([1-9]\d*)',path)
    if not match and path!='/api/project-worker/run':return False
    if not handler.session():handler.reply(401,{'error':'Please sign in.'});return True
    try:
        if match:status,data=website(handler,'project-drafts/'+match[1],body)
        else:
            if body:handler.reply(400,{'error':'No run parameters are accepted.'});return True
            status,data=worker(handler,{})
        handler.reply(status,data)
    except (OSError,ValueError,KeyError):handler.reply(503,{'error':'Connection unavailable. Check portfolio API or worker configuration.'})
    return True
