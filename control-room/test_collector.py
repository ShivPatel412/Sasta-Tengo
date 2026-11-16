import json
import unittest
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import collector

class PersonalScopeTests(unittest.TestCase):
    def test_all_workflow_metrics_use_personal_project_ownership(self):
        calls=[]
        def command(args, **kwargs):
            calls.append((args, kwargs))
            if args[:2] == ['docker', 'inspect']:
                return json.dumps([{'Config': {'Env': ['DB_POSTGRESDB_DATABASE=test', 'POSTGRES_USER=test']}}])
            return json.dumps({'scope': collector.N8N_SCOPE, 'workflows': [], 'executions': [], 'today': {'total': 0}})
        with patch.object(collector, 'command', side_effect=command):
            result=collector.n8n_data()
        sql=calls[-1][1]['input']
        self.assertIn('WITH personal_workflows', sql)
        self.assertIn('FROM shared_workflow sw WHERE sw."workflowId"=w.id', sql)
        self.assertIn("""sw."projectId"='UWCIZeLCvuUGM9uC'""", sql)
        self.assertIn("sw.role='workflow:owner'", sql)
        self.assertIn('NOT w."isArchived"', sql)
        self.assertNotIn('parentFolderId', sql)
        self.assertIn('JOIN personal_workflows w ON w.id=e."workflowId"', sql)
        self.assertIn('"workflowId" IN (SELECT id FROM personal_workflows)', sql)
        self.assertEqual(result['scope'], collector.N8N_SCOPE)
        self.assertNotIn('LEFT JOIN workflow_entity', sql)

    def test_failed_collection_never_restores_the_old_unfiltered_feed(self):
        for scope in [None, {'project_id': 'UWCIZeLCvuUGM9uC', 'folder_id': 'zgcQe77hWdgdwdQZ'}, collector.N8N_SCOPE]:
            with tempfile.TemporaryDirectory() as temporary:
                state=Path(temporary)
                previous={'n8n': {'scope': scope, 'workflows': []}}
                (state/'snapshot.json').write_text(json.dumps(previous))
                with patch.object(collector, 'STATE', state), patch.object(collector, 'n8n_data', side_effect=RuntimeError), patch.object(collector, 'codex_data', return_value={}), patch.object(collector, 'cloud_status', return_value={}), patch.object(collector, 'command', return_value=''), patch.object(collector.shutil, 'disk_usage', return_value=SimpleNamespace(total=100, used=10, free=90)), patch.object(collector.os.path, 'ismount', return_value=False):
                    result=collector.collect()
                self.assertEqual('n8n' in result, scope == collector.N8N_SCOPE)

if __name__ == '__main__':
    unittest.main()
