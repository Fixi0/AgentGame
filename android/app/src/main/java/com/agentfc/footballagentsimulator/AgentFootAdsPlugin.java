package com.agentfc.footballagentsimulator;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AgentFootAds")
public class AgentFootAdsPlugin extends Plugin {
    private InterstitialAd interstitialAd;
    private RewardedAd rewardedAd;
    private boolean loadingInterstitial = false;
    private boolean loadingRewarded = false;

    @Override
    public void load() {
        Activity activity = getActivity();
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            MobileAds.initialize(getContext(), initializationStatus -> {});
            preloadInterstitial();
            preloadRewarded();
        });
    }

    @PluginMethod
    public void showInterstitialAd(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        activity.runOnUiThread(() -> {
            if (interstitialAd != null) {
                presentInterstitial(call);
                return;
            }

            InterstitialAd.load(
                activity,
                getContext().getString(R.string.admob_interstitial_ad_unit_id),
                new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull InterstitialAd ad) {
                        interstitialAd = ad;
                        presentInterstitial(call);
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        interstitialAd = null;
                        call.reject(loadAdError.getMessage());
                    }
                }
            );
        });
    }

    @PluginMethod
    public void showRewardedAd(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        activity.runOnUiThread(() -> {
            if (rewardedAd != null) {
                presentRewarded(call);
                return;
            }

            RewardedAd.load(
                activity,
                getContext().getString(R.string.admob_rewarded_ad_unit_id),
                new AdRequest.Builder().build(),
                new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull RewardedAd ad) {
                        rewardedAd = ad;
                        presentRewarded(call);
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        rewardedAd = null;
                        call.reject(loadAdError.getMessage());
                    }
                }
            );
        });
    }

    private void presentInterstitial(PluginCall call) {
        Activity activity = getActivity();
        InterstitialAd ad = interstitialAd;
        if (activity == null || ad == null) {
            call.reject("Interstitial ad unavailable");
            return;
        }

        interstitialAd = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                JSObject result = new JSObject();
                result.put("shown", true);
                result.put("placement", call.getString("placement", "week_transition"));
                call.resolve(result);
                preloadInterstitial();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                call.reject(adError.getMessage());
                preloadInterstitial();
            }
        });
        ad.show(activity);
    }

    private void presentRewarded(PluginCall call) {
        Activity activity = getActivity();
        RewardedAd ad = rewardedAd;
        if (activity == null || ad == null) {
            call.reject("Rewarded ad unavailable");
            return;
        }

        rewardedAd = null;
        AtomicBoolean rewardEarned = new AtomicBoolean(false);
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                preloadRewarded();
                if (!rewardEarned.get()) {
                    call.reject("Reward not earned");
                    return;
                }
                JSObject result = new JSObject();
                result.put("rewarded", true);
                result.put("offerId", call.getString("offerId", ""));
                result.put("placement", call.getString("placement", "shop_reward"));
                call.resolve(result);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                preloadRewarded();
                call.reject(adError.getMessage());
            }
        });
        ad.show(activity, rewardItem -> rewardEarned.set(true));
    }

    private void preloadInterstitial() {
        Activity activity = getActivity();
        if (activity == null || interstitialAd != null || loadingInterstitial) return;
        loadingInterstitial = true;
        InterstitialAd.load(
            activity,
            getContext().getString(R.string.admob_interstitial_ad_unit_id),
            new AdRequest.Builder().build(),
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    interstitialAd = ad;
                    loadingInterstitial = false;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    interstitialAd = null;
                    loadingInterstitial = false;
                }
            }
        );
    }

    private void preloadRewarded() {
        Activity activity = getActivity();
        if (activity == null || rewardedAd != null || loadingRewarded) return;
        loadingRewarded = true;
        RewardedAd.load(
            activity,
            getContext().getString(R.string.admob_rewarded_ad_unit_id),
            new AdRequest.Builder().build(),
            new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    rewardedAd = ad;
                    loadingRewarded = false;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    rewardedAd = null;
                    loadingRewarded = false;
                }
            }
        );
    }
}
