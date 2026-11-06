"""Build an additive Gemini bridge from the installed n8n node definitions."""
import json
from pathlib import Path
import uuid

root=Path(__file__).resolve().parents[2]
types=json.loads((root/'.local/node-types.json').read_text())
wid='ShivProjectGemini01'
nodes=[]
def add(name,type_,version,parameters,x,credentials=None):
    definitions=[n for n in types if n.get('name')==type_ and version in (n['version'] if isinstance(n['version'],list) else [n['version']])]
    if not definitions or any(key not in {p['name'] for p in definitions[0]['properties']} for key in parameters):raise ValueError('Config does not match installed node: '+name)
    node={'id':str(uuid.uuid5(uuid.NAMESPACE_URL,wid+name)),'name':name,'type':type_,'typeVersion':version,'parameters':parameters,'position':[x,300]}
    if credentials:node['credentials']=credentials
    if type_.endswith('.webhook'):node['webhookId']='shiv-project-gemini-v1'
    nodes.append(node)

add('Project generation request','n8n-nodes-base.webhook',2.1,{'httpMethod':'POST','path':'shiv-project-gemini','authentication':'headerAuth','responseMode':'responseNode','options':{}},0,{'httpHeaderAuth':{'id':'ShivProjectGeminiAuth01','name':'Shiv Project Gemini Bridge'}})
add('Validate generation request','n8n-nodes-base.code',2,{'mode':'runOnceForAllItems','jsCode':'''const input=$input.first().json.body;
if(!input||!['models','text','image'].includes(input.action))throw new Error('Invalid project generation action');
if(input.action==='models')return [{json:{action:'models',request:{}}}];
if(typeof input.model!=='string'||!/^gemini-[a-zA-Z0-9.-]{1,90}$/.test(input.model))throw new Error('Invalid Gemini model');
if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>60000)throw new Error('Invalid generation prompt');
return [{json:{action:input.action,model:input.model,request:{contents:[{role:'user',parts:[{text:input.prompt}]}],generationConfig:input.action==='image'?{responseModalities:['TEXT','IMAGE']}:{responseMimeType:'application/json',maxOutputTokens:4000}}}}];'''},240)
add('Generate with existing Gemini account','n8n-nodes-base.httpRequest',4.4,{
    'method':'={{ $json.action === "models" ? "GET" : "POST" }}',
    'url':'={{ "https://generativelanguage.googleapis.com/v1beta/models" + ($json.action === "models" ? "?pageSize=1000" : "/" + $json.model + ":generateContent") }}',
    'authentication':'predefinedCredentialType','nodeCredentialType':'googlePalmApi',
    'sendBody':True,'contentType':'raw','rawContentType':'application/json','body':'={{ JSON.stringify($json.request) }}','options':{'timeout':180000,'response':{'response':{'neverError':True,'responseFormat':'json'}}}
},480,{'googlePalmApi':{'id':'queV87aVXtPFRaYE','name':'Xstream - Google Gemini(PaLM) Api account'}})
add('Return generation result','n8n-nodes-base.respondToWebhook',1.4,{'respondWith':'json','responseBody':'={{ $json }}','options':{}},720)
workflow={'id':wid,'name':'Shiv Portfolio | Gemini generation bridge','active':False,'nodes':nodes,'connections':{nodes[i]['name']:{'main':[[{'node':nodes[i+1]['name'],'type':'main','index':0}]]} for i in range(len(nodes)-1)},'settings':{'executionOrder':'v1','saveDataSuccessExecution':'none','saveDataErrorExecution':'none','saveManualExecutions':False},'versionId':str(uuid.uuid4()),'tags':[]}
(Path(__file__).parent/'gemini-workflow.json').write_text(json.dumps(workflow,indent=2))
print('Built four-node Gemini bridge; node configs match installed n8n definitions.')
