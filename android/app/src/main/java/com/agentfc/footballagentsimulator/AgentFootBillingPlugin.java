package com.agentfc.footballagentsimulator;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AgentFootBilling")
public class AgentFootBillingPlugin extends Plugin {
    private static final String[] PRODUCT_IDS = {
        "gems_starter",
        "gems_player",
        "gems_pro",
        "gems_elite",
        "gems_legend",
        "remove_ads"
    };

    private BillingClient billingClient;
    private final Map<String, ProductDetails> productDetailsById = new HashMap<>();
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener((billingResult, purchases) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase purchase : purchases) {
                        handlePurchase(purchase);
                    }
                    return;
                }
                if (pendingPurchaseCall != null && billingResult.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) {
                    pendingPurchaseCall.reject("Achat Google Play impossible: " + billingResult.getDebugMessage());
                    pendingPurchaseCall = null;
                } else if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Achat annulé");
                    pendingPurchaseCall = null;
                }
            })
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .build();
        connectBilling(null);
    }

    @PluginMethod
    public void loadProducts(PluginCall call) {
        connectBilling(() -> queryProducts(call));
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        connectBilling(() -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build(),
            (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Restauration impossible: " + billingResult.getDebugMessage());
                    return;
                }
                for (Purchase purchase : purchases) {
                    handlePurchase(purchase);
                }
                JSObject result = new JSObject();
                result.put("restored", purchases.size());
                call.resolve(result);
            }
        ));
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Produit manquant");
            return;
        }

        connectBilling(() -> {
            ProductDetails details = productDetailsById.get(productId);
            if (details == null) {
                queryProducts(new ProductQueryCallback() {
                    @Override
                    public void onSuccess() {
                        launchPurchase(call, productId);
                    }

                    @Override
                    public void onError(String message) {
                        call.reject(message);
                    }
                });
                return;
            }
            launchPurchase(call, productId);
        });
    }

    private void launchPurchase(PluginCall call, String productId) {
        ProductDetails details = productDetailsById.get(productId);
        if (details == null) {
            call.reject("Produit Google Play introuvable");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activité Android indisponible");
            return;
        }

        List<BillingFlowParams.ProductDetailsParams> productParams = new ArrayList<>();
        productParams.add(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .build()
        );

        pendingPurchaseCall = call;
        BillingFlowParams params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productParams)
            .build();
        BillingResult result = billingClient.launchBillingFlow(activity, params);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            pendingPurchaseCall = null;
            call.reject("Achat Google Play impossible: " + result.getDebugMessage());
        }
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            return;
        }

        String productId = purchase.getProducts().isEmpty() ? null : purchase.getProducts().get(0);
        if (productId == null) {
            rejectPending("Achat reçu sans produit");
            return;
        }

        Runnable finish = () -> {
            if ("remove_ads".equals(productId)) {
                emitPurchase(productId, purchase.getOrderId() != null ? purchase.getOrderId() : purchase.getPurchaseToken());
                return;
            }
            consumePurchase(productId, purchase.getPurchaseToken(), purchase.getOrderId());
        };
        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams acknowledgeParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
            billingClient.acknowledgePurchase(acknowledgeParams, billingResult -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    finish.run();
                } else {
                    rejectPending("Validation Google Play impossible: " + billingResult.getDebugMessage());
                }
            });
            return;
        }
        finish.run();
    }

    private void consumePurchase(String productId, String purchaseToken, String orderId) {
        ConsumeParams consumeParams = ConsumeParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build();

        billingClient.consumeAsync(consumeParams, (billingResult, token) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                rejectPending("Crédit gemmes impossible: " + billingResult.getDebugMessage());
                return;
            }

            emitPurchase(productId, orderId != null ? orderId : token);
        });
    }

    private void emitPurchase(String productId, String transactionId) {
        JSObject data = new JSObject();
        data.put("productId", productId);
        data.put("transactionId", transactionId);
        data.put("platform", "android");

        notifyListeners("purchaseCompleted", data, true);
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.resolve(data);
            pendingPurchaseCall = null;
        }
    }

    private void rejectPending(String message) {
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject(message);
            pendingPurchaseCall = null;
        }
    }

    private void connectBilling(Runnable onReady) {
        if (billingClient == null) {
            if (onReady != null) onReady.run();
            return;
        }
        if (billingClient.isReady()) {
            if (onReady != null) onReady.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && onReady != null) {
                    onReady.run();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // The next call will reconnect.
            }
        });
    }

    private void queryProducts(PluginCall call) {
        queryProducts(new ProductQueryCallback() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("products", buildProductsArray());
                call.resolve(result);
            }

            @Override
            public void onError(String message) {
                call.reject(message);
            }
        });
    }

    private void queryProducts(ProductQueryCallback callback) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String productId : PRODUCT_IDS) {
            products.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            );
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                callback.onError("Produits Google Play indisponibles: " + billingResult.getDebugMessage());
                return;
            }

            productDetailsById.clear();
            List<ProductDetails> detailsList = productDetailsResult.getProductDetailsList();
            for (ProductDetails details : detailsList) {
                productDetailsById.put(details.getProductId(), details);
            }

            JSObject productsEvent = new JSObject();
            productsEvent.put("products", buildProductsArray());
            notifyListeners("productsLoaded", productsEvent, true);
            callback.onSuccess();
        });
    }

    private JSArray buildProductsArray() {
        JSArray products = new JSArray();
        for (String productId : PRODUCT_IDS) {
            ProductDetails details = productDetailsById.get(productId);
            if (details == null) continue;
            JSObject product = new JSObject();
            product.put("id", productId);
            product.put("title", details.getTitle());
            product.put("description", details.getDescription());
            ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
            if (offer != null) {
                product.put("displayPrice", offer.getFormattedPrice());
                product.put("priceAmountMicros", offer.getPriceAmountMicros());
                product.put("priceCurrencyCode", offer.getPriceCurrencyCode());
            }
            products.put(product);
        }
        return products;
    }

    private interface ProductQueryCallback {
        void onSuccess();
        void onError(String message);
    }
}
