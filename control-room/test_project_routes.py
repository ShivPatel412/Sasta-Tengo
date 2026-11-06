from pathlib import Path
import unittest
from unittest.mock import patch
import project_routes

class Handler:
    path=''
    def __init__(self,authenticated=False):self.authenticated=authenticated;self.result=None
    def session(self):return self.authenticated
    def reply(self,*args):self.result=args

class Routes(unittest.TestCase):
    def test_private_reads_and_reviews_require_session(self):
        for path in ('/api/project-drafts','/api/website/projects','/api/website/contacts','/api/project-worker'):
            h=Handler();self.assertTrue(project_routes.get(h,path,Path('.')));self.assertEqual(h.result[0],401)
        h=Handler();project_routes.post(h,'/api/project-drafts/1',{});self.assertEqual(h.result[0],401)
    def test_unknown_paths_are_not_proxies(self):
        for path in ('/api/website/logout','/api/website/../../login','/api/project-drafts/0','/api/project-worker/config'):
            self.assertFalse(project_routes.get(Handler(True),path,Path('.')))
            self.assertFalse(project_routes.post(Handler(True),path,{}))
    def test_only_bounded_pagination_is_forwarded(self):
        h=Handler(True);h.path='/api/website/projects?page=2&search=hello&url=http://localhost'
        with patch.object(project_routes,'website',return_value=(200,{})) as api:
            project_routes.get(h,'/api/website/projects',Path('.'))
            api.assert_called_once_with(h,'projects?page=2&search=hello')
    def test_run_cannot_override_configuration(self):
        h=Handler(True)
        with patch.object(project_routes,'worker') as worker:
            project_routes.post(h,'/api/project-worker/run',{'url':'http://localhost'})
            self.assertEqual(h.result[0],400);worker.assert_not_called()

if __name__=='__main__':unittest.main()
