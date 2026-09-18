/** Shared mathematical input editing. No school data, grading or persistence. */
export const canonicalMathKeys=[{label:'分数 a/b',text:'/'},{label:'√',text:'√()'},{label:'x²',text:'^2'},{label:'( )',text:'()'},{label:'−',text:'-'},{label:'±',text:'±'},{label:'π',text:'π'},{label:':',text:':'},{label:',',text:','},{label:'≦',text:'≦'},{label:'≧',text:'≧'},{label:'＜',text:'<'},{label:'＞',text:'>'},{label:'＝',text:'='}]
export type MathSelection={start:number;end:number}
export function insertCanonicalMathText(value:string,selection:MathSelection,text:string){
  const start=Math.min(selection.start,value.length),end=Math.min(selection.end,value.length)
  return {value:value.slice(0,start)+text+value.slice(end),position:start+text.length-(text.endsWith('()')?1:0)}
}
export function deleteCanonicalMathText(value:string,selection:MathSelection){
  const start=Math.min(selection.start,value.length),end=Math.min(selection.end,value.length)
  const position=start===end?Math.max(0,start-1):start
  return {value:value.slice(0,position)+value.slice(end),position}
}
