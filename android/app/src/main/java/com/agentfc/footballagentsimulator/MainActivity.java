package com.agentfc.footballagentsimulator;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AgentFootBillingPlugin.class);
        registerPlugin(AgentFootAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
