// Keep a final inquiry intact until the real request settles. The ref also
// prevents a second submit before React has painted the pending state.
export async function sendTerminalContact({pending,send,answers,onPending,onSuccess,onFailure}){
  if(pending.current)return false;
  pending.current=true;onPending(true);
  try{
    if(typeof send!=='function')throw new Error('Contact delivery is not configured.');
    await send(answers);onSuccess();return true;
  }catch{onFailure();return false;}
  finally{pending.current=false;onPending(false);}
}
