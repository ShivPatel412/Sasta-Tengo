import {appearanceSchema,defaultAppearance} from './dashboard-appearance.mjs';

export async function loadAppearance(userId,run){
  const [row]=await run('SELECT primary_color AS primaryColor,secondary_color AS secondaryColor,font_style AS fontStyle,text_size AS textSize,heading_size AS headingSize FROM next_dashboard_preferences WHERE user_id=?',[userId]);
  return row?appearanceSchema.parse({primary:row.primaryColor,secondary:row.secondaryColor,fontStyle:row.fontStyle,textSize:row.textSize,headingSize:row.headingSize}):{...defaultAppearance};
}
export async function saveAppearance(userId,input,run){
  const colors=appearanceSchema.parse(input);
  // Older open dashboard tabs send only colors; keep their saved typography.
  if(['fontStyle','textSize','headingSize'].some(key=>!Object.hasOwn(input,key))){
    const current=await loadAppearance(userId,run);
    for(const key of ['fontStyle','textSize','headingSize'])if(!Object.hasOwn(input,key))colors[key]=current[key];
  }
  await run('INSERT INTO next_dashboard_preferences (user_id,primary_color,secondary_color,font_style,text_size,heading_size,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE primary_color=VALUES(primary_color),secondary_color=VALUES(secondary_color),font_style=VALUES(font_style),text_size=VALUES(text_size),heading_size=VALUES(heading_size),updated_at=UTC_TIMESTAMP()',[userId,colors.primary,colors.secondary,colors.fontStyle,colors.textSize,colors.headingSize]);
  return colors;
}
