const collectCriticalAssets = () =>
  Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[href]'))
    .map((element) =>
      element instanceof HTMLScriptElement ? element.src : element.href,
    )
    .filter((assetUrl) => {
      const url = new URL(assetUrl, window.location.origin)
      return url.origin === window.location.origin && url.pathname.startsWith('/assets/')
    })

export const registerAssetCache = async () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    await navigator.serviceWorker.ready

    const worker = navigator.serviceWorker.controller || registration.active
    worker?.postMessage({ type: 'WARM_ASSETS', assets: collectCriticalAssets() })
  } catch {
    // Asset caching is an optional speed-up and must never affect app startup.
  }
}
