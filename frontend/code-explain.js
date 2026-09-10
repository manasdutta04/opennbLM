const input=document.getElementById('code'), output=document.getElementById('highlight'), status=document.getElementById('status');
const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function highlight(code){let html=escape(code);html=html.replace(/(\/\/.*|#.*)$/gm,'<span class="comment">$1</span>').replace(/(".*?"|'.*?')/g,'<span class="str">$1</span>').replace(/\b(def|class|return|import|from|const|let|var|function|if|else|for|while|public|private|include|using|new)\b/g,'<span class="kw">$1</span>');return html||' '}
input.addEventListener('input',()=>output.innerHTML=highlight(input.value));
document.getElementById('explain').addEventListener('click',()=>{if(!input.value.trim())return input.focus();status.textContent='Preparing a progressive explanation…';setTimeout(()=>status.textContent='Ready. Code is analyzed as text only; it was not executed.',500)});
