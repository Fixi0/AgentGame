const ensureAgentFootAds = () => {
  window.AgentFootAds = {
    ...(window.AgentFootAds ?? {}),
  };
  return window.AgentFootAds;
};

const hasWebKitAdsBridge = () => Boolean(window.webkit?.messageHandlers?.ads);
const getAndroidAdsBridge = () => window.Capacitor?.Plugins?.AgentFootAds ?? null;

const isLocalPreview = () =>
  !window.Capacitor
  && !hasWebKitAdsBridge()
  && ['http:', 'https:', 'file:'].includes(window.location.protocol);

const postToWebKitAds = ({ message, successCallback, failCallback }) => new Promise((resolve, reject) => {
  const callbacks = ensureAgentFootAds();
  callbacks[successCallback] = (payload = {}) => resolve(payload);
  callbacks[failCallback] = ({ message: errorMessage } = {}) => reject(new Error(errorMessage || 'Ad unavailable'));

  try {
    window.webkit.messageHandlers.ads.postMessage(message);
  } catch (error) {
    reject(error);
  }
});

export const showRewardedAd = ({ offerId, placement = 'shop_reward' } = {}) => {
  const androidAds = getAndroidAdsBridge();

  if (hasWebKitAdsBridge()) {
    return postToWebKitAds({
      message: { type: 'rewarded', offerId, placement },
      successCallback: 'completeReward',
      failCallback: 'failReward',
    });
  }

  if (androidAds?.showRewardedAd) {
    return androidAds.showRewardedAd({ offerId, placement });
  }

  if (isLocalPreview()) {
    return Promise.resolve({ localPreview: true, rewarded: true });
  }

  return Promise.reject(new Error('AdMob reward bridge unavailable'));
};

export const showInterstitialAd = ({ placement = 'week_transition' } = {}) => {
  const androidAds = getAndroidAdsBridge();

  if (hasWebKitAdsBridge()) {
    return postToWebKitAds({
      message: { type: 'interstitial', placement },
      successCallback: 'completeInterstitial',
      failCallback: 'failInterstitial',
    });
  }

  if (androidAds?.showInterstitialAd) {
    return androidAds.showInterstitialAd({ placement });
  }

  if (isLocalPreview()) {
    return Promise.resolve({ localPreview: true, skipped: true });
  }

  return Promise.resolve({ skipped: true, reason: 'AdMob interstitial bridge unavailable' });
};
