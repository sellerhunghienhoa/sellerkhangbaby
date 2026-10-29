// Refresh stale data after returning from another tab/app, without interrupting edits.
const PAGE_RESUME_AFTER_MS = 15 * 60 * 1000;
let pageHiddenAt = null;
let pageResumePending = false;
let pageResumeBusy = false;
let pageResumeTimer = null;

function markPageHidden() {
  if (pageHiddenAt === null) pageHiddenAt = Date.now();
  clearTimeout(pageResumeTimer);
}

async function resumeStalePage() {
  if (document.visibilityState !== 'visible') return;
  if (pageHiddenAt !== null) {
    pageResumePending ||= Date.now() - pageHiddenAt >= PAGE_RESUME_AFTER_MS;
    pageHiddenAt = null;
  }
  if (!pageResumePending || pageResumeBusy || !navigator.onLine) return;
  clearTimeout(pageResumeTimer);
  const editing = document.querySelector('.modal.show') || (typeof state !== 'undefined' && Object.values(state.editingSessions || {}).some(Boolean));
  const authorizing = typeof tiktokAuthorizationWindow !== 'undefined' && tiktokAuthorizationWindow && !tiktokAuthorizationWindow.closed;
  if (editing || authorizing || (typeof authActionInProgress !== 'undefined' && authActionInProgress) || (typeof liveSyncInProgress !== 'undefined' && liveSyncInProgress) || (typeof orderSyncInProgress !== 'undefined' && orderSyncInProgress) || (typeof affiliateSyncInProgress !== 'undefined' && affiliateSyncInProgress)) {
    pageResumeTimer = setTimeout(resumeStalePage, 1000);
    return;
  }
  pageResumeBusy = true;
  try {
    if (productionSaveTimer) {
      clearTimeout(productionSaveTimer);
      productionSaveTimer = null;
      await writeProductionState();
    }
    await productionWriteChain;
    setAppLoading('Đang tải lại dữ liệu mới sau thời gian bạn rời trang.');
    window.location.reload();
  } catch {
    pageResumeBusy = false;
    toast('Chưa lưu được dữ liệu. Trang sẽ tải lại sau khi kết nối ổn định.');
    pageResumeTimer = setTimeout(resumeStalePage, 30000);
  }
}

document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' ? markPageHidden() : void resumeStalePage());
window.addEventListener('pagehide', markPageHidden);
window.addEventListener('pageshow', () => void resumeStalePage());
window.addEventListener('focus', () => void resumeStalePage());
window.addEventListener('online', () => void resumeStalePage());
