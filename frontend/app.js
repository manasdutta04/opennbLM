const views = [...document.querySelectorAll('.view')];
const show = id => { views.forEach(v => v.classList.toggle('active', v.id === id)); document.getElementById(id)?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => show(el.dataset.view)));
const form = document.getElementById('ask-form');
const question = document.getElementById('question');
const content = document.getElementById('conversation-content');
const toast = document.getElementById('toast');
const playerStatus = document.getElementById('player-status');
let speaking = false;
form.addEventListener('submit', event => { event.preventDefault(); const value = question.value.trim(); if (!value) return question.focus(); show('conversation'); content.innerHTML = '<div class="lesson-loading"><p class="eyebrow">Thinking</p><h2>Shaping your lesson<span class="loading-dots">...</span></h2></div>'; setTimeout(() => { content.innerHTML = `<p class="eyebrow">Curious · EN → HI · 0.9x</p><h2>${escapeHtml(value)}</h2><p class="intro" style="margin-left:0">I’ll start with the core idea, then build a clear example around it. Your lesson is ready to play.</p>`; playerStatus.textContent = 'Ready to speak'; }, 700); });
document.getElementById('orb').addEventListener('click', () => { toast.textContent = 'Voice input is ready for the next connection.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); });
document.getElementById('play-button').addEventListener('click', event => { speaking = !speaking; event.currentTarget.textContent = speaking ? 'Ⅱ' : '▶'; playerStatus.textContent = speaking ? 'Speaking · Curious · 0.9x' : 'Paused'; document.querySelector('.lesson-player').classList.toggle('is-playing', speaking); });
document.getElementById('provider-form').addEventListener('submit', event => { event.preventDefault(); const name = document.getElementById('provider-select').selectedOptions[0].textContent; document.getElementById('provider-summary').textContent = name; document.getElementById('provider-feedback').textContent = 'Provider preference saved locally.'; });
function escapeHtml(value) { return value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
