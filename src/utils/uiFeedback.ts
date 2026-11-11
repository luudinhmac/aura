export type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

const removeLater = (element: HTMLElement, delay: number) => {
  window.setTimeout(() => element.remove(), delay);
};

export function notify(message: string, tone: FeedbackTone = 'info'): void {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  const toneClass = tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800';
  toast.className = `fixed right-4 top-20 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${toneClass}`;
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  removeLater(toast, tone === 'error' ? 7000 : 4500);
}

export function confirmDialog(message: string, title = 'Xác nhận thao tác'): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm';
    const panel = document.createElement('div');
    panel.className = 'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl';
    panel.innerHTML = `<h2 class="text-base font-black text-slate-900"></h2><p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600"></p><div class="mt-5 flex justify-end gap-2"><button type="button" data-cancel class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">Hủy</button><button type="button" data-confirm class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Xác nhận</button></div>`;
    (panel.querySelector('h2') as HTMLElement).textContent = title;
    (panel.querySelector('p') as HTMLElement).textContent = message;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    const finish = (value: boolean) => { backdrop.remove(); resolve(value); };
    panel.querySelector('[data-cancel]')?.addEventListener('click', () => finish(false));
    panel.querySelector('[data-confirm]')?.addEventListener('click', () => finish(true));
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) finish(false); });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { document.removeEventListener('keydown', onKeyDown); finish(false); } };
    document.addEventListener('keydown', onKeyDown);
    (panel.querySelector('[data-confirm]') as HTMLButtonElement)?.focus();
  });
}
