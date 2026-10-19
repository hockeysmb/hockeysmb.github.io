
localStorage.setItem('smb-banco-autor','Carlos Manzano');
const SES={id:'ses-a1',kind:'',equipo:'Alevín A',fecha:'2026-10-05',entrenador:'Carlos Manzano',obj:{},fundamentos:[],bloques:[]};
window.__pub=[];
(function(){
 const docs={}; const subs=[];
 const snap=()=>({docs:Object.keys(docs).map(k=>({id:k,exists:true,data:()=>docs[k]})),size:Object.keys(docs).length,empty:false,docChanges:()=>[],metadata:{}});
 const fire=()=>setTimeout(()=>subs.forEach(f=>f(snap())),10);
 window.__votes=docs; window.__fire=fire;
 const db={collection:p=>({onSnapshot:(n,e)=>{subs.push(n);fire();return ()=>{}}}),doc:p=>({set:async d=>{docs[p.split('/')[1]]=d;fire();}})};
 const user={isOwner:async()=>OWNER,canEdit:async()=>OWNER,id:async()=>'u-me',can:async()=>true};
 const art={publish:async f=>{window.__pub.push(f);}};
 const dl={save:async()=>{}};
 window.claude={use:async n=>n==='db'?db:n==='user'?user:n==='artifact'?art:n==='downloads'?dl:null};
})();
