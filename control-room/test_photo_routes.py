from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import photo_routes

class Handler:
    def __init__(self,authenticated=False): self.authenticated=authenticated;self.path='';self.result=None
    def session(self): return self.authenticated
    def reply(self,*args): self.result=args

class Routes(unittest.TestCase):
    def test_private_inventory_requires_session(self):
        handler=Handler()
        self.assertTrue(photo_routes.get(handler,'/api/photo-posts',Path('.')))
        self.assertEqual(handler.result[0],401)
    def test_publish_approval_requires_session(self):
        handler=Handler()
        self.assertTrue(photo_routes.post(handler,'/api/photo-posts/'+'a'*24+'/approve-without-music',{}))
        self.assertEqual(handler.result[0],401)
    def test_unsigned_media_is_not_exposed(self):
        handler=Handler();handler.path='/instagram-media/'+'a'*24+'/'+'b'*64+'.jpg'
        with patch.object(photo_routes,'worker') as upstream:
            self.assertTrue(photo_routes.get(handler,handler.path,Path('.')))
            self.assertEqual(handler.result[0],404);upstream.assert_not_called()
    def test_signed_media_only_uses_bounded_route(self):
        handler=Handler();path='/instagram-media/'+'a'*24+'/'+'b'*64+'.jpg'
        handler.path=path+'?expires=1999999999&sig='+'c'*64
        with patch.object(photo_routes,'worker',return_value=(404,b'{}','application/json')) as upstream:
            self.assertTrue(photo_routes.get(handler,path,Path('.')))
            upstream.assert_called_once_with(handler,handler.path,public=True)
    def test_arbitrary_media_path_is_not_a_proxy(self):
        self.assertFalse(photo_routes.get(Handler(),'/instagram-media/../../auth.json',Path('.')))

if __name__=='__main__': unittest.main()
