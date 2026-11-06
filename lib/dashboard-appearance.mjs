import {z} from 'zod';

export const defaultAppearance={primary:'#8cbf88',secondary:'#e8a77a',fontStyle:'system',textSize:14,headingSize:35};
export const dashboardFonts={
  system:{label:'Modern sans',family:'Manrope, ui-sans-serif, system-ui, sans-serif'},
  soft:{label:'Soft sans',family:'"Trebuchet MS", Verdana, sans-serif'},
  serif:{label:'Classic serif',family:'Georgia, "Times New Roman", serif'},
  mono:{label:'Monospace',family:'ui-monospace, "SFMono-Regular", Consolas, monospace'}
};
export const appearancePresets=[
  {name:'Sage & amber',...defaultAppearance},
  {name:'Lilac & mint',primary:'#b8a2dd',secondary:'#8ecdb0'},
  {name:'Ocean & peach',primary:'#82b9cf',secondary:'#edb099'},
  {name:'Rose & sand',primary:'#d89fb5',secondary:'#cfbd91'}
];
const hex=z.string().regex(/^#[0-9a-f]{6}$/i,'Use a six-digit hex color, such as #8cbf88.').transform(value=>value.toLowerCase());
export const appearanceSchema=z.object({primary:hex,secondary:hex,fontStyle:z.enum(['system','soft','serif','mono']).default('system'),textSize:z.number().int().min(12).max(20).default(14),headingSize:z.number().int().min(24).max(44).default(35)}).strict();
export function appearanceVariables(input){
  const colors=Object.fromEntries(Object.keys(defaultAppearance).map(key=>{
    const parsed=appearanceSchema.shape[key].safeParse(input?.[key]);
    return [key,parsed.success?parsed.data:defaultAppearance[key]];
  }));
  const rgb=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)).join(',');
  return {'--glass-primary':colors.primary,'--glass-secondary':colors.secondary,'--glass-primary-rgb':rgb(colors.primary),'--glass-secondary-rgb':rgb(colors.secondary),'--dashboard-font':dashboardFonts[colors.fontStyle].family,'--dashboard-text-size':`${colors.textSize}px`,'--dashboard-heading-size':`${colors.headingSize}px`};
}
