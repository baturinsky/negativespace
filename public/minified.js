{class _{constructor(e,t){this.val=e;this.pattern=t;(e=="."||e==null)&&(this.val=0)}render([e,t],r=!1){var n,h;let l=this.pattern==c||this.pattern==a;return`<td id=${e}_${t} style="color:${((n=this.pattern)==null?void 0:n.color)||""};background:${r?"#222":(h=this.pattern)==null?void 0:h.bgcolor(l)}">${this.val=="_"?" ":this.val||"."}</td>`}clone(e){let t=new _(this.val,this.pattern);return e&&Object.assign(t,e),t}sub(e){this.val=Math.max(0,this.val-e.val)}}class d{constructor(e){this.bits=[];this.at=[0,0];this.findWhereFits=e=>{for(let t=0;t<this.len;t++){let r=[~~(t/this.h),t%this.h];if(this.checkIfFits(e,r))return r}return null};Object.assign(this,e),this.len=this.w*this.h,this.len&&this.fill(0)}get color(){return`hsl(${this.hue} 100% 50%)`}bgcolor(e){return`hsl(${this.hue} 100% ${e?20:10}%)`}clone(e,t){let r=new d({w:this.w,h:this.h});r.bits=[],r.hue=t;for(let l=0;l<this.len;l++){let n=this.geti(l).clone();e&&n.val&&(n.val=e),n.pattern=r,r.seti(l,n)}return r}overlap(e,t=this.at){return k(t[0],this.w,e.at[0],e.w)&&k(t[1],this.h,e.at[1],e.h)}hasInsideBorder(e,t=e.at){return t[0]+e.w<=this.w&&t[1]+e.h<=this.h}fromString(e){let t=e.replace(/[\t ]/g,"").trim().split(`
`);return[this.w,this.h]=[t[0].length,t.length],this.bits=t.map(r=>[...r.trim()].map(l=>new _(l,this))),this.len=this.w*this.h,this}toString(){return this.bits.map(e=>e.map(t=>t.val).join("")).join(`
`)}fill(e){for(let t=0;t<this.len;t++)this.seti(t,new _(e instanceof Function?e(t):e,this))}values(){return $(this.len).map(e=>this.toXY(e))}get(e){return(this.bits[e[1]]||[])[e[0]]||I}set(e,t){var r,l;(r=this.bits)[l=e[1]]||(r[l]=[]),this.bits[e[1]][e[0]]=t}geti(e){return this.get(this.toXY(e))}seti(e,t){this.set(this.toXY(e),t)}toXY(e){return[e%this.w,~~(e/this.w)]}apply(e,t,r,l=!1){return e.each((n,h)=>{let m=v(h,t);return r(this.get(m),e.get(h),m,h)},l)}checkIfFitsWithNeighbors(e,t){return!this.apply(e,t,(r,l,n,h)=>!M.find(m=>e.get(v(m,h)).val&&this.get(v(m,n)).val))}_checkIfFits(e,t){return!this.apply(e,t,(r,l)=>(r.val||r.color)&&l.val,!0)}checkIfFits(e,t){if(!this.hasInsideBorder(e,t))return!1;for(let r of g)if(e.overlap(r,t))return!1;return!0}insert(e,t){this.apply(e,t,(r,l,n,h)=>this.set(n,l.clone())),e.at=t,this==f&&g.push(e)}sub(e,t){this.apply(e,t,(r,l,n,h)=>r.sub(l))}remove(e,t){this.apply(e,t,(r,l,n,h)=>this.set(n,new _(0,this))),g=g.filter(r=>r!=e)}advance(){let e=0;return this.each((t,r)=>{r[0]==0?e+=t.val:(this.get([r[0]-1,r[1]]).val=t.val,t.val=0)}),e}each(e,t=!1){let r=t?!1:[];for(let l=0;l<this.len;l++){let n=this.toXY(l),h=e(this.geti(l),n);if(t){if(h)return!0}else r.push(h)}return r}}let P=[[0,1],[1,0],[0,-1],[-1,0]],k=(i,e,t,r)=>i+e>t&&i<t+r,o,g=[],s=new d({w:24,h:8}),f=new d({w:s.w,h:7}),u=new d({w:s.w,h:3}),I=new _(0,null),M=[[0,0],...P],C,p=~~(Math.random()*1e9),w=1,A=!1,X,a,c,b,F=20,E=`___________Destroy_these
________________________    
_____________Using_these`,Y=(i,e)=>(p=p*16807%2147483647,e?~~((p%i**e)**(1/e)):p%i),$=i=>[...new Array(i)].map((e,t)=>t),D=(i,e)=>[...new Array(i)].map(()=>e),y=()=>{u.insert(new d().fromString(`Turn_${w}`),[0,1]),A&&(u.fill("_"),u.insert(new d().fromString(`_Game_over_in_${w}_turns`),[0,1])),U.innerHTML=`<table>${$(s.h+u.h+f.h).map(i=>["<tr>",...$(s.w).map(e=>{var l;let t=O([e,i]),r=N([e,i]);return t&&r&&r.pattern==s&&r.val>0?(r=r.clone(),r.sub(t),r.render([e,i],!0)):(l=t||r||I)==null?void 0:l.render([e,i],t!=null||i>=s.h&&i<s.h+u.h)}),"</tr>"]).flat().join("")}</table>`},v=(i,e)=>[i[0]+e[0],i[1]+e[1]],G=(i,e)=>[i[0]-e[0],i[1]-e[1]],H=(i,e)=>{let t=null;return(...r)=>{window.clearTimeout(t),t=window.setTimeout(()=>{i.apply(null,r)},e)}},T=i=>{var r;let e=i.target;if((e==null?void 0:e.nodeName)!="TD")return[];o=e.id.split("_").map(l=>Number(l));let t;return o[1]<s.h?t=s:t=(r=f.get([o[0],o[1]-s.h-u.h]))==null?void 0:r.pattern,[o,t]},N=([i,e])=>e<s.h?s.get([i,e]):e<s.h+u.h?u.get([i,e-s.h]):f.get([i,e-s.h-u.h]),O=i=>{if(!a||!o)return;let e=a.get(G(v(i,X),o));return e.val?e:null},S=i=>[i[0],i[1]-s.h-u.h],j=(i=1)=>{let e=0;for(let t=0;t<i;t++){let r=b.length-1-~~Y(b.length,2),l=b[r],n=f.findWhereFits(l),h=3-~~Y(3,2);if(n){let m=l.clone(h,n[0]*30+n[1]*43+b.length*27);m.pattern=!0,f.insert(m,n),e++}}return e},B=i=>{for(let e=0;e<i;e++){let t=[s.w-10+Y(10,3),Y(s.h)],r=s.get(t);r.val++}},W=()=>{b=C.map(e=>new d().fromString(e)),j(F),s.fill(0),B(30),u.fromString(E);let i=document.getElementById("U");i.onmousemove=e=>{let t=c,r=o,[l,n]=T(e);c=null,n&&(o=l,!a&&n.pattern&&(c=n),(c!=t||a&&r!=o)&&H(y,100)())},i.onmousedown=e=>{if(A)return;let[t,r]=T(e);if(a){if(r==f)t=G(S(t),X),f.checkIfFits(a,t)&&(f.insert(a,t),a=null);else if(r==s){t=G(t,X),s.sub(a,t),a=null,s.advance()&&(A=!0),g=g.filter(h=>h!=a);let n=10;for(;n-- >0&&g.length<F;)j();B(4+~~(w/10)),w++}}else r instanceof d&&r.pattern&&(a=r,X=G(S(t),r.at),f.remove(r,r.at),c=null);y()},y()};C=[`
###
`,`
#
#
#
`,`
##
##
`,`
###
###
###
`,`
#####
`,`
#
#
#
#
#
`,`
#.#
.#.
#.#
`,`
.#.
###
.#.
`,`
#####
#####
#####
#####
#####
`,`
..#..
..#..
#####
..#..
..#..
`,`
#.#.#
.#.#.
#.#.#
.#.#.
#.#.#
`,`
#.#
#.#
#.#
`,`
###
...
###
`],W()}
