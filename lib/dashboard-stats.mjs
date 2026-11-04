import {serialize} from './validation.mjs';

export async function dashboardStats(run){
  const [countRows,pipeline,activity,recentContacts,requests,projects,experience]=await Promise.all([
    run(`SELECT
      (SELECT COUNT(*) FROM contacts) AS contacts,
      (SELECT COUNT(*) FROM appointments) AS appointments,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM experience) AS experience,
      (SELECT COUNT(*) FROM contacts WHERE is_read=0) AS unread_contacts,
      (SELECT COUNT(*) FROM appointments WHERE status='pending') AS pending_requests`),
    run('SELECT lead_status,COUNT(*) AS total FROM (SELECT lead_status FROM contacts UNION ALL SELECT lead_status FROM appointments) t GROUP BY lead_status'),
    run('SELECT DATE(created_at) AS day,COUNT(*) AS total FROM (SELECT created_at FROM contacts UNION ALL SELECT created_at FROM appointments) t WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY day'),
    run('SELECT id,name,email,subject,is_read,lead_status,created_at FROM contacts ORDER BY created_at DESC,id DESC LIMIT 6'),
    run('SELECT id,client_name,client_email,notes,request_data,status,lead_status,created_at FROM appointments ORDER BY created_at DESC,id DESC LIMIT 6'),
    run('SELECT id,title,category,poster,image,gallery,technologies,is_featured,live_url,github_url,created_at FROM projects ORDER BY updated_at DESC,id DESC LIMIT 4'),
    run('SELECT id,title,company,logo,start_date,end_date,is_current FROM experience ORDER BY `order`,start_date DESC LIMIT 4')
  ]);
  return {counts:countRows[0],pipeline,activity,recentContacts,recentRequests:requests.map(row=>serialize(row,'appointments')),recentProjects:projects.map(row=>serialize(row,'projects')),recentExperience:experience.map(row=>serialize(row,'experience'))};
}
