"""Authenticated photo review and bounded signed Instagram media delivery."""
import json
import re
import urllib.error
import urllib.request
from urllib.parse import urlsplit


def worker(handler,path,body=None,public=False):
    headers={}
    if not public:
        config=json.loads((handler_module_state(handler)/'photo-automation.json').read_text())
        headers['Authorization']='Bearer '+config['token']
    data=json.dumps(body).encode() if body is not None else None
    if data is not None: headers['Content-Type']='application/json'
    request=urllib.request.Request('http://127.0.0.1:8792'+path,data=data,headers=headers)
    try:
        with urllib.request.urlopen(request,timeout=25) as response:
            return response.status,response.read(30_000_000),response.headers.get('Content-Type','application/json')
    except urllib.error.HTTPError as error:
        return error.code,error.read(8192),error.headers.get('Content-Type','application/json')


def handler_module_state(handler):
    import sys
    return sys.modules[handler.__class__.__module__].STATE


def get(handler,path,root):
    files={'/photos':'photos.html','/photos.js':'photos.js','/photos.css':'photos.css'}
    if path in files:
        if path=='/photos' and not handler.session():
            handler.send_response(303);handler.send_header('Location','/');handler.end_headers();return True
        kind={'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8'}[files[path].rsplit('.',1)[1]]
        handler.reply(200,(root/'static'/files[path]).read_bytes(),kind);return True
    private=path in ('/api/photo-posts','/api/photo-posts/inventory') or re.fullmatch(r'/api/photo-posts/thumb/[a-f0-9]{64}',path) or re.fullmatch(r'/api/photo-posts/[a-f0-9]{24}/pack',path)
    public=re.fullmatch(r'/instagram-media/[a-f0-9]{24}/[a-f0-9]{64}\.jpg',path)
    if not private and not public: return False
    if private and not handler.session(): handler.reply(401,{'error':'Please sign in.'});return True
    try:
        if public:
            query=urlsplit(handler.path).query
            if not re.fullmatch(r'expires=\d{10,11}&sig=[a-f0-9]{64}',query):
                handler.reply(404,{'error':'Not found'});return True
            upstream=path+'?'+query
        elif path=='/api/photo-posts': upstream='/drafts'
        elif path.endswith('/inventory'): upstream='/inventory'
        elif path.endswith('/pack'): upstream='/drafts/'+path.split('/')[-2]+'/pack'
        else: upstream='/thumb/'+path.rsplit('/',1)[-1]
        status,data,kind=worker(handler,upstream,public=bool(public))
        handler.reply(status,data,kind)
    except (OSError,ValueError): handler.reply(503,{'error':'Photo workflow service is unavailable.'})
    return True


def post(handler,path,body):
    if not (path=='/api/photo-posts/run' or re.fullmatch(r'/api/photo-posts/[a-f0-9]{24}/approve-without-music',path)): return False
    if not handler.session(): handler.reply(401,{'error':'Please sign in.'});return True
    try:
        upstream='/run' if path.endswith('/run') else '/drafts/'+path.split('/')[-2]+'/approve-without-music'
        status,data,kind=worker(handler,upstream,body)
        handler.reply(status,data,kind)
    except (OSError,ValueError): handler.reply(503,{'error':'Photo workflow service is unavailable.'})
    return True
