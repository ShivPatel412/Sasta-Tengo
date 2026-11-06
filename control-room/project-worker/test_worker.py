import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('project_worker',Path(__file__).with_name('worker.py'))
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)

class Worker(unittest.TestCase):
    def test_revision_covers_pushes_and_metadata(self):
        repo={'id':1,'name':'project','pushed_at':'one','description':'a'}
        self.assertNotEqual(worker.revision(repo),worker.revision({**repo,'pushed_at':'two'}))
        self.assertNotEqual(worker.revision(repo),worker.revision({**repo,'description':'b'}))
        self.assertEqual(worker.revision(repo),worker.revision({**repo,'stargazers_count':99}))
    def test_screenshot_gate_blocks_private_dns_credentials_ports_and_redirect_destinations(self):
        for url in ('http://example.com','https://example.com:444','https://user@example.com','https://127.0.0.1','https://example.com.evil.test'):
            self.assertFalse(worker.allowed_url(url,['example.com']))
        self.assertTrue(worker.allowed_url('https://example.com/path',['example.com']))
        for ip in ('127.0.0.1','169.254.169.254','192.168.1.1','::1'):
            with patch.object(worker.socket,'getaddrinfo',return_value=[(None,None,None,None,(ip,443))]):
                with self.assertRaises(ValueError):worker.resolved_hosts(['example.com'])
    def test_repeated_scan_skips_generation_and_unchanged_rejection(self):
        repo={'name':'example','pushed_at':'one'};key=worker.revision(repo)
        with patch.object(worker,'repositories',return_value=iter([repo])),patch.object(worker,'portfolio',return_value={'data':[{'repository':'owner/example','revision':key,'status':'rejected'}]}),patch.object(worker,'prepare') as prepare:
            result=worker.scan({'github_owner':'owner'});self.assertEqual(result['created'],0);prepare.assert_not_called()
    def test_private_forks_archives_and_other_owners_are_skipped(self):
        base={'name':'example','owner':{'login':'owner'}}
        batch=[base,{**base,'private':True},{**base,'fork':True},{**base,'archived':True},{**base,'owner':{'login':'other'}}]
        with patch.object(worker,'github',return_value=batch):self.assertEqual(list(worker.repositories({'github_owner':'owner'})),[base])
    def test_failed_screenshot_never_fabricates_evidence_and_retry_reuses_ai(self):
        with tempfile.TemporaryDirectory() as folder,patch.object(worker,'STATE',Path(folder)),patch.object(worker,'github',side_effect=lambda c,path,raw=False:'' if raw else {}),patch.object(worker,'gemini',side_effect=[{'title':'Project','description':'Facts','technologies':[],'cover_brief':'Abstract'},b'image']) as ai,patch.object(worker,'portfolio',return_value={'url':'https://media.example/cover.jpg'}),patch.object(worker,'screenshot',side_effect=ValueError('Blocked')):
            c={'github_owner':'owner','category':'web','text_model':'text','image_model':'image'};repo={'name':'example','homepage':'https://example.com'}
            first=worker.prepare(c,repo,'a'*64);second=worker.prepare(c,repo,'a'*64)
            self.assertEqual(ai.call_count,2);self.assertEqual(first,second)
            self.assertEqual(first['project']['gallery'],[]);self.assertIsNone(first['provenance']['captured_at']);self.assertTrue(first['provenance']['warnings'])
    def test_ai_output_validated_before_media_or_backend(self):
        with self.assertRaises(ValueError):worker.details({'title':'invented'})
        with self.assertRaises(ValueError):worker.details({'title':'x','description':'x','cover_brief':'x','technologies':'not a list'})
    def test_provider_failure_never_becomes_generated_project_details(self):
        with patch.object(worker,'http',return_value=b'{"error":{"code":503,"status":"UNAVAILABLE"}}'):
            with self.assertRaises(worker.GenerationError):worker.gemini({'gemini_key':'test'},'gemini-test','Public project prompt')
    def test_missing_image_quota_labels_the_repository_preview(self):
        with tempfile.TemporaryDirectory() as folder,patch.object(worker,'STATE',Path(folder)),patch.object(worker,'gemini') as ai:
            key='b'*64
            worker.atomic(worker.STATE/'cache'/(key+'.json'),{'warnings':[],'details':{'title':'Project','description':'Facts','technologies':[],'cover_brief':'Abstract'},'generated_at':worker.now()})
            worker.atomic(worker.STATE/'image-backoff.json',{'until':worker.time.time()+900,'code':429})
            c={'github_owner':'owner','category':'web','text_model':'text','image_model':'image'}
            result=worker.prepare(c,{'name':'example'},key)
            ai.assert_not_called();self.assertEqual(result['provenance']['cover_status'],'unavailable')
            self.assertIn('opengraph.githubassets.com',result['project']['poster']);self.assertTrue(result['provenance']['warnings'])
    def test_pending_publish_retries_without_skipping_and_reports_published(self):
        repo={'name':'example','pushed_at':'one'};key=worker.revision(repo)
        responses=[{'data':[{'repository':'owner/example','revision':key,'status':'pending'}]},{'status':'published'}]
        with patch.object(worker,'repositories',return_value=iter([repo])),patch.object(worker,'portfolio',side_effect=responses),patch.object(worker,'prepare',return_value={}) as prepare:
            result=worker.scan({'github_owner':'owner','auto_publish':True})
            self.assertEqual(result['published'],1);prepare.assert_called_once()

if __name__=='__main__':unittest.main()
