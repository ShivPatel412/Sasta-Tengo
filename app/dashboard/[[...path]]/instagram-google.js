let loading;
async function scripts(){
 if(!loading)loading=Promise.all(['https://accounts.google.com/gsi/client','https://apis.google.com/js/api.js'].map(src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(Error('Google could not load. Check your connection.'));document.head.appendChild(s);}))).catch(e=>{loading=null;throw e;});
 await loading;await new Promise(resolve=>window.gapi.load('picker',resolve));
}
export async function pickDrivePhotos(onImport,onToken){
 await scripts();
 const token=await new Promise((resolve,reject)=>window.google.accounts.oauth2.initTokenClient({client_id:process.env.NEXT_PUBLIC_STUDIO_GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/drive.file',callback:r=>r.error?reject(Error('Google Drive access was not granted.')):resolve(r.access_token),error_callback:()=>reject(Error('Google sign-in was cancelled.'))}).requestAccessToken());
 onToken(token);
 const ids=await new Promise(resolve=>{
  const view=new window.google.picker.DocsView().setMimeTypes('image/jpeg,image/png,image/webp,image/heic,image/heif');
  new window.google.picker.PickerBuilder().addView(view).setOAuthToken(token).setDeveloperKey(process.env.NEXT_PUBLIC_STUDIO_GOOGLE_PICKER_KEY).setAppId(process.env.NEXT_PUBLIC_STUDIO_GOOGLE_APP_ID).setOrigin(window.location.origin).enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED).setMaxItems(30).setCallback(r=>{if(r.action===window.google.picker.Action.PICKED)resolve(r.docs.map(d=>d.id));else if(r.action===window.google.picker.Action.CANCEL)resolve([]);}).build().setVisible(true);
 });
 for(const [index,id] of ids.entries())await onImport(id,token,index+1,ids.length);
}
export async function disconnectDrive(token){if(token)await new Promise(resolve=>window.google.accounts.oauth2.revoke(token,resolve));}
