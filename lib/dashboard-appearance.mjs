import {z} from 'zod';

export const defaultAppearance={primary:'#8cbf88',secondary:'#e8a77a'};
export const appearancePresets=[
  {name:'Sage & amber',...defaultAppearance},
  {name:'Lilac & mint',primary:'#b8a2dd',secondary:'#8ecdb0'},
  {name:'Ocean & peach',primary:'#82b9cf',secondary:'#edb099'},
  {name:'Rose & sand',primary:'#d89fb5',secondary:'#cfbd91'}
];
const hex=z.string().regex(/^#[0-9a-f]{6}$/i,'Use a six-digit hex color, such as #8cbf88.').transform(value=>value.toLowerCase());
export const appearanceSchema=z.object({primary:hex,secondary:hex}).strict();
export function appearanceVariables(input){
  const parsed=appearanceSchema.safeParse(input),colors=parsed.success?parsed.data:defaultAppearance;
  const rgb=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)).join(',');
  return {'--glass-primary':colors.primary,'--glass-secondary':colors.secondary,'--glass-primary-rgb':rgb(colors.primary),'--glass-secondary-rgb':rgb(colors.secondary)};
}
export async function loadAppearance(userId,run){
  const [row]=await run('SELECT primary_color AS primaryColor,secondary_color AS secondaryColor FROM next_dashboard_preferences WHERE user_id=?',[userId]);
  return row?appearanceSchema.parse({primary:row.primaryColor,secondary:row.secondaryColor}):{...defaultAppearance};
}
export async function saveAppearance(userId,input,run){
  const colors=appearanceSchema.parse(input);
  await run('INSERT INTO next_dashboard_preferences (user_id,primary_color,secondary_color,updated_at) VALUES (?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE primary_color=VALUES(primary_color),secondary_color=VALUES(secondary_color),updated_at=UTC_TIMESTAMP()',[userId,colors.primary,colors.secondary]);
  return colors;
}
