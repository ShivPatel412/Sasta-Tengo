export function outsideFrame(rect,gap=7) {
  return {left:rect.left-gap,top:rect.top-gap,width:rect.width+gap*2,height:rect.height+gap*2};
}

export function frameColor(styles,accent) {
  for(const style of styles){
    // Computed colors use RGB; a gradient's first stop covers transparent card bases.
    for(const value of [style.backgroundColor,style.backgroundImage]){
      const match=value?.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
      if(!match||Number(match[4]??1)<.5)continue;
      const brightness=(Number(match[1])*.2126+Number(match[2])*.7152+Number(match[3])*.0722)/255;
      return brightness>.55?'#000000':accent;
    }
  }
  return accent;
}
