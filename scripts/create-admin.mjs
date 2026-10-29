import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { mkdir,writeFile } from 'node:fs/promises';
import { database } from '../lib/db.mjs';
import { adminRecord,createInitialAdmin } from '../lib/database-setup.mjs';
import mysql from 'mysql2';
let pool,connection,rl;
try {
  if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal so the password is not stored in shell history.');
  if(!process.env.ADMIN_EMAIL)throw new Error('Set ADMIN_EMAIL privately before creating the initial admin.');
  // Password input is hidden and is never accepted as a command-line argument.
  const muted=new Writable({write(chunk,encoding,done){done();}});
  rl=createInterface({input:process.stdin,output:muted,terminal:true});
  process.stdout.write('New dashboard password (12+ characters, hidden): ');
  const password=await rl.question('');
  process.stdout.write('\nConfirm password (hidden): ');
  const confirmation=await rl.question('');
  process.stdout.write('\n');rl.close();rl=null;
  if(password!==confirmation)throw new Error('Passwords do not match.');
  const record=await adminRecord(process.env.ADMIN_EMAIL,'Shiv Patel',password);
  if(process.argv.includes('--sql')){
    const dir=new URL('../private/',import.meta.url);await mkdir(dir,{recursive:true});
    const statement=mysql.format('INSERT INTO users (name,email,password,created_at,updated_at) SELECT ?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP() WHERE NOT EXISTS (SELECT 1 FROM users);',[record.name,record.email,record.password]);
    await writeFile(new URL('initial-admin.sql',dir),'-- Private initial admin setup. Import only into the new portfolio database.\n'+statement+';\n',{flag:'wx',mode:0o600});
    console.log('Created private/initial-admin.sql with a password hash. Import it through phpMyAdmin, then remove the private SQL file. No existing user is updated.');
  }else{
    pool=database();connection=await pool.getConnection();await createInitialAdmin(connection,record);
    console.log('Initial dashboard admin created. Sign in at /dashboard/login. No existing account was changed.');
  }
}catch(error){
  const safe=/^(Run this command|Set ADMIN_EMAIL|Passwords do not match|Use a password|A user already exists)/.test(error.message);
  console.error(safe?error.message:'Admin setup failed. Check configuration and the new users table privately; nothing is printed from the database.');process.exitCode=1;
}finally{rl?.close();connection?.release();await pool?.end();}
