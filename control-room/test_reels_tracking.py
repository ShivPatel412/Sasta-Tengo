import tempfile
import unittest
from pathlib import Path
from reels_tracking import enrich_reel_jobs
import importlib.util

class ReelTrackingTests(unittest.TestCase):
    def test_progress_reporter_rejects_injection_and_records_existing_tables(self):
        spec=importlib.util.spec_from_file_location('progress',Path(__file__).with_name('reels-progress.py'))
        progress=importlib.util.module_from_spec(spec);spec.loader.exec_module(progress)
        calls=[]
        def command(args,**options):
            calls.append((args,options))
            return '[{"Config":{"Env":[]}}]' if args[1]=='inspect' else ''
        with self.assertRaises(ValueError): progress.record("job'; DROP TABLE x",'ANALYZING',20,command=command)
        self.assertEqual(calls,[])
        progress.record('job','ANALYZING',20,segment=2,total=3,command=command)
        self.assertIn("WHERE job_id='job'",calls[-1][1]['input'])
        self.assertIn('data_table_user_WatVsMggkgeC0mRr',calls[-1][1]['input'])
        with self.assertRaises(ValueError):
            progress.record('job','ANALYZING',20,segment=2,total=3,event_type='SEGMENT_FAILED',execution_id='wrong',command=command)
        for event_type in progress.SEGMENT_EVENTS:
            progress.record('job','ANALYZING',20,segment=2,total=3,event_type=event_type,execution_id='42',command=command)
            sql=calls[-1][1]['input']
            self.assertEqual(sql.count("AND execution_id='42'"),2)
            self.assertIn(f"'{event_type}','ANALYZING','Analyzing · segment 2/3'",sql)
            self.assertIn('segments_processed=GREATEST(COALESCE(segments_processed,0),'+('2' if event_type=='SEGMENT_COMPLETED' else '1')+')',sql)
    def test_handoff_does_not_mean_publication(self):
        data={'funny_jobs':[{'job_id':'job','state':'DISPATCHED','clips_selected':1}]}
        with tempfile.TemporaryDirectory() as directory:
            row=enrich_reel_jobs(data,[],Path(directory))[0]
        self.assertEqual(row['state'],'DISPATCHED')
        self.assertEqual(row['youtube_published'],0)

    def test_both_platform_receipts_are_required(self):
        data={'funny_jobs':[{'job_id':'job','state':'DISPATCHED','clips_selected':1}],
              'instagram_reels':[{'parent_job_id':'job','state':'PUBLISHED','instagram_media_id':'ig','permalink':'https://www.instagram.com/reel/example/'}],
              'youtube_uploads':[{'parent_job_id':'job','status':'PUBLISHED','privacy_status':'public','youtube_video_id':'youtube'}]}
        with tempfile.TemporaryDirectory() as directory:
            row=enrich_reel_jobs(data,[],Path(directory))[0]
        self.assertEqual(row['state'],'PUBLISHED')
        self.assertEqual(row['progress_percent'],100)

    def test_worker_failure_is_visible_and_unrelated_posts_do_not_count(self):
        data={'funny_jobs':[{'job_id':'job','execution_id':'12','state':'PROCESSING'}],
              'worker_executions':[{'id':12,'status':'error'}],
              'instagram_reels':[{'parent_job_id':'different','state':'PUBLISHED','instagram_media_id':'ig','permalink':'https://example.com'}]}
        with tempfile.TemporaryDirectory() as directory:
            row=enrich_reel_jobs(data,[],Path(directory))[0]
        self.assertEqual(row['state'],'ERROR')
        self.assertEqual(row['instagram_published'],0)

if __name__=='__main__': unittest.main()
