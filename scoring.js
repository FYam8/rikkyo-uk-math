
window.MathScoring = (() => {
  const MAX_LEN=500, EPS=1e-8;
  function preprocess(s){
    let t=String(s??"").trim();
    if(t.length>MAX_LEN) return "__TOO_LONG__";
    return t.replace(/\s+/g,"")
      .replace(/[−–—]/g,"-").replace(/×/g,"*").replace(/÷/g,"/")
      .replace(/≦|≤/g,"<=").replace(/≧|≥/g,">=")
      .replace(/²/g,"^2").replace(/³/g,"^3")
      .replace(/π/g,"pi").replace(/√/g,"sqrt")
      .replace(/°/g,"")
      .replace(/cm\^?3|cm³|cm\^?2|cm²|cm|m\/s|秒|回転|回|人|点|分$/gi,"")
      .toLowerCase();
  }
  function tokenize(s){
    s=preprocess(s); if(s==="__TOO_LONG__") throw new Error("too long");
    const out=[]; let i=0;
    while(i<s.length){
      const c=s[i];
      if(/[0-9.]/.test(c)){
        let j=i+1;while(j<s.length&&/[0-9.]/.test(s[j]))j++;
        const v=Number(s.slice(i,j)); if(!Number.isFinite(v)) throw new Error("bad number");
        out.push({t:"num",v}); i=j; continue;
      }
      if(/[a-z]/.test(c)){
        let j=i+1;while(j<s.length&&/[a-z]/.test(s[j]))j++;
        const w=s.slice(i,j);
        if(w==="sqrt"||w==="pi") out.push({t:"id",v:w});
        else for(const ch of w) out.push({t:"id",v:ch});
        i=j;continue;
      }
      if("+-*/^()".includes(c)){out.push({t:c,v:c});i++;continue;}
      throw new Error("bad char "+c);
    }
    const res=[];
    const end=x=>x&&(x.t==="num"||x.t==="id"||x.t===")");
    const start=x=>x&&(x.t==="num"||x.t==="id"||x.t==="(");
    for(const tok of out){
      const prev=res[res.length-1];
      if(end(prev)&&start(tok)&&!(prev.t==="id"&&prev.v==="sqrt"&&tok.t==="(")&&!(prev.t==="id"&&prev.v==="sqrt")){
        res.push({t:"*",v:"*"});
      }
      res.push(tok);
    }
    return res;
  }
  function parseExprString(s){
    const toks=tokenize(s);let p=0;
    const peek=()=>toks[p],take=()=>toks[p++];
    function primary(){
      const z=take(); if(!z) throw new Error("eof");
      if(z.t==="num") return {k:"num",v:z.v};
      if(z.t==="id"){
        if(z.v==="pi") return {k:"num",v:Math.PI,symbol:"pi"};
        if(z.v==="sqrt"){
          let a;
          if(peek()?.t==="("){take();a=expr();if(take()?.t!==")")throw new Error(")");}
          else a=primary();
          return {k:"sqrt",a};
        }
        return {k:"var",n:z.v};
      }
      if(z.t==="("){const a=expr();if(take()?.t!==")")throw new Error(")");return a;}
      throw new Error("primary");
    }
    function power(){let a=primary();if(peek()?.t==="^"){take();a={k:"op",op:"^",a,b:unary()};}return a;}
    function unary(){if(peek()?.t==="+"){take();return unary();}if(peek()?.t==="-"){take();return {k:"neg",a:unary()};}return power();}
    function term(){let a=unary();while(peek()&&(peek().t==="*"||peek().t==="/")){const op=take().t;a={k:"op",op,a,b:unary()};}return a;}
    function expr(){let a=term();while(peek()&&(peek().t==="+"||peek().t==="-")){const op=take().t;a={k:"op",op,a,b:term()};}return a;}
    const ast=expr(); if(p!==toks.length) throw new Error("trailing"); return ast;
  }
  function evalAst(a,env){
    if(a.k==="num") return a.v;
    if(a.k==="var") return env[a.n];
    if(a.k==="sqrt"){const v=evalAst(a.a,env);return v<0?NaN:Math.sqrt(v);}
    if(a.k==="neg") return -evalAst(a.a,env);
    const x=evalAst(a.a,env),y=evalAst(a.b,env);
    if(!Number.isFinite(x)||!Number.isFinite(y)) return NaN;
    if(a.op==="+")return x+y;if(a.op==="-")return x-y;if(a.op==="*")return x*y;if(a.op==="/")return Math.abs(y)<EPS?NaN:x/y;if(a.op==="^")return Math.pow(x,y);
    return NaN;
  }
  function vars(a,set=new Set()){if(a.k==="var")set.add(a.n);if(a.a)vars(a.a,set);if(a.b)vars(a.b,set);return set;}
  function approx(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=EPS*Math.max(1,Math.abs(a),Math.abs(b));}
  const samples=[1,2,3,5,7,11,-2,-3];
  function exprEquivalent(u,e){
    try{
      const ua=parseExprString(u),ea=parseExprString(e);
      const vs=[...new Set([...vars(ua),...vars(ea)])];
      if(vs.length===0) return approx(evalAst(ua,{}),evalAst(ea,{}));
      let valid=0;
      for(let k=0;k<samples.length;k++){
        const env={};vs.forEach((v,i)=>env[v]=samples[(k+i)%samples.length]);
        const a=evalAst(ua,env),b=evalAst(ea,env);
        if(!Number.isFinite(a)||!Number.isFinite(b))continue;
        valid++;if(!approx(a,b))return false;
      }
      return valid>=3;
    }catch(_){return false;}
  }
  function equationEquivalent(u,e){
    const split=x=>{const i=preprocess(x).indexOf("=");return i<0?null:[preprocess(x).slice(0,i),preprocess(x).slice(i+1)];};
    const U=split(u),E=split(e);if(!U||!E)return false;
    try{
      const ur={k:"op",op:"-",a:parseExprString(U[0]),b:parseExprString(U[1])};
      const er={k:"op",op:"-",a:parseExprString(E[0]),b:parseExprString(E[1])};
      const vs=[...new Set([...vars(ur),...vars(er)])];
      let ratio=null,valid=0;
      for(let k=0;k<samples.length;k++){
        const env={};vs.forEach((v,i)=>env[v]=samples[(k+i)%samples.length]);
        const a=evalAst(ur,env),b=evalAst(er,env);if(!Number.isFinite(a)||!Number.isFinite(b))continue;
        if(Math.abs(b)<EPS){if(Math.abs(a)>=EPS)return false;continue;}
        const r=a/b;if(ratio===null)ratio=r;else if(!approx(r,ratio))return false;valid++;
      }
      return valid>=2 && ratio!==null && Math.abs(ratio)>EPS;
    }catch(_){return false;}
  }
  function stripAssignment(s){const t=preprocess(s);return t.replace(/^[a-z]=/,"");}
  function splitPlusMinus(s){
    const t=stripAssignment(s);
    if(!t.includes("±"))return [t];
    return [t.replace(/±/g,"+"),t.replace(/±/g,"-")];
  }
  function splitList(s){return String(s??"").replace(/[{}]/g,"").split(/[,、;]/).map(x=>x.trim()).filter(Boolean);}
  function scalarEq(u,e){return exprEquivalent(stripAssignment(u),stripAssignment(String(e)));}
  function formOk(raw,spec){
    const s=preprocess(raw).replace(/sqrt\([^)]*\)/g,"");
    if(spec.factorizedFormRequired) return /\([^)]*[+\-][^)]*\)/.test(s);
    if(spec.requiredForm==="expanded"||spec.expandedFormRequired) return !/\([^)]*[+\-][^)]*\)/.test(s);
    return true;
  }
  function symbolicExactRequired(type,raw,expected){
    const u=preprocess(raw),e=preprocess(expected);
    if(type==="radical_expression"&&e.includes("sqrt")&&!u.includes("sqrt"))return false;
    if(type==="pi_expression"&&e.includes("pi")&&!u.includes("pi"))return false;
    return true;
  }
  function gradeScalar(raw,spec){
    const type=spec.type,expected=spec.expected;
    if(raw==null||String(raw).trim()==="")return false;
    if(type==="label"){const acc=spec.accepted||[expected];return acc.some(x=>preprocess(raw)===preprocess(x));}
    if(type==="equation")return equationEquivalent(raw,expected);
    if(type==="factorized_expression"||type==="expression"){
      return formOk(raw,spec)&&exprEquivalent(raw,expected);
    }
    if(type==="radical_expression"||type==="pi_expression"){
      return formOk(raw,spec)&&symbolicExactRequired(type,raw,expected)&&exprEquivalent(raw,expected);
    }
    if(["numeric","integer","parameter_value","ratio_value","probability"].includes(type)){
      if(type==="parameter_value")return scalarEq(raw,expected);
      return exprEquivalent(raw,String(expected));
    }
    if(type==="rational"){
      const acc=spec.accepted||[];return acc.some(x=>exprEquivalent(raw,x));
    }
    if(type==="angle")return exprEquivalent(preprocess(raw),String(expected));
    if(type==="interval"){
      const u=preprocess(raw).replace(/,/g,""),e=preprocess(expected).replace(/,/g,"");
      return u===e || u===e.replace(/([\-0-9.]+)<=([a-z])<=([\-0-9.]+)/,"$2>=$1,$2<=$3");
    }
    return exprEquivalent(raw,String(expected));
  }
  function solutionSet(raw,spec){
    let got=[];for(const p of splitList(raw)){got.push(...splitPlusMinus(p));}
    const exp=(spec.solutions||[]).map(String);
    if(got.length!==exp.length)return false;
    const used=new Array(exp.length).fill(false);
    for(const g of got){let hit=-1;for(let i=0;i<exp.length;i++)if(!used[i]&&exprEquivalent(g,exp[i])){hit=i;break;}if(hit<0)return false;used[hit]=true;}
    return true;
  }
  function ratioEq(raw,arr){
    const parts=String(raw).replace(/：/g,":").split(":").map(x=>x.trim()).filter(Boolean);
    if(parts.length!==arr.length)return false;
    const u=parts.map(x=>{try{return evalAst(parseExprString(x),{});}catch(_){return NaN;}});
    const e=arr.map(x=>Number(x));
    if(u.some(x=>!Number.isFinite(x))||e.some(x=>!Number.isFinite(x)))return false;
    let scale=null;
    for(let i=0;i<u.length;i++){
      if(Math.abs(e[i])<EPS){if(Math.abs(u[i])>=EPS)return false;continue;}
      const s=u[i]/e[i];if(scale===null)scale=s;else if(!approx(s,scale))return false;
    }
    return scale!==null&&Math.abs(scale)>EPS;
  }
  function coordinatePair(raw){
    const s=String(raw??"").trim().replace(/[（）]/g,x=>x==="（"?"(":")").replace(/^\(/,"").replace(/\)$/,"");
    const p=splitList(s);if(p.length!==2)return null;return {x:p[0],y:p[1]};
  }
  function coordEq(g,e){return g&&scalarEq(g.x,e.x)&&scalarEq(g.y,e.y);}
  function grade(q,answer){
    const spec=q.answerSpec||{};
    const type=spec.type;
    if(q.answerAmbiguityStatus&&q.answerAmbiguityStatus!=="none_detected_in_independent_review"){
      if(type==="coordinate"){
        const g={x:answer.x,y:answer.y};
        const alts=spec.mathematicalSolutionsIfPointCoincidenceAllowed||[];
        if(alts.some(e=>coordEq(g,e))) return {correct:null,reviewRequired:true,slots:{}};
      }
    }
    if(type==="multi_response"){
      const exp=spec.expected||{},slots={};let ok=true;
      for(const [k,v] of Object.entries(exp)){slots[k]=scalarEq(answer[k],v);ok=ok&&slots[k];}
      return {correct:ok,slots};
    }
    if(type==="coordinate"){
      const ok=coordEq({x:answer.x,y:answer.y},spec.expected);return {correct:ok,slots:{x:ok,y:ok}};
    }
    if(type==="coordinate_set"){
      const got=(q.responseSlots||[]).map(k=>coordinatePair(answer[k])).filter(Boolean);
      const exp=spec.expected||[];if(got.length!==exp.length)return {correct:false,slots:{}};
      const used=new Array(exp.length).fill(false);
      for(const g of got){let hit=-1;for(let i=0;i<exp.length;i++)if(!used[i]&&coordEq(g,exp[i])){hit=i;break;}if(hit<0)return {correct:false,slots:{}};used[hit]=true;}
      return {correct:true,slots:{}};
    }
    if(type==="solution_set")return {correct:solutionSet(answer.value,spec),slots:{}};
    if(type==="integer_set"){
      const got=splitList(answer.value).map(Number).sort((a,b)=>a-b),exp=(spec.expected||[]).map(Number).sort((a,b)=>a-b);
      return {correct:JSON.stringify(got)===JSON.stringify(exp),slots:{}};
    }
    if(type==="ratio")return {correct:ratioEq(answer.value,spec.expected||[]),slots:{}};
    const raw=answer.value;
    const accepted=spec.accepted||[];
    let ok=gradeScalar(raw,spec);
    if(!ok&&accepted.length)ok=accepted.some(a=>gradeScalar(raw,{...spec,expected:a,accepted:[]}));
    return {correct:ok,slots:{}};
  }
  return {preprocess,parseExprString,exprEquivalent,equationEquivalent,grade};
})();
