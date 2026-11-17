package com.viharsetu;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import javax.annotation.Nullable;

/**
 * BatteryModule — Native Android module for Jinaarya Vihar Setu
 * Reads real-time battery level and charging state from Android BatteryManager.
 * Exposed to JS as NativeModules.BatteryModule
 */
public class BatteryModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "BatteryModule";
    private static final String BATTERY_EVENT = "BatteryStatusUpdate";

    private final ReactApplicationContext reactContext;
    private BroadcastReceiver batteryReceiver;

    public BatteryModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * getBatteryStatus() — returns { level: int (0-100), isCharging: boolean }
     */
    @ReactMethod
    public void getBatteryStatus(Promise promise) {
        try {
            IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = reactContext.getApplicationContext()
                    .registerReceiver(null, filter);

            if (batteryStatus == null) {
                promise.reject("BATTERY_ERROR", "Could not read battery status");
                return;
            }

            int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);

            int batteryPct = (level == -1 || scale == -1) ? -1 : (int) ((level / (float) scale) * 100);

            boolean isCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING
                    || status == BatteryManager.BATTERY_STATUS_FULL);

            WritableMap result = Arguments.createMap();
            result.putInt("level", batteryPct);
            result.putBoolean("isCharging", isCharging);
            result.putBoolean("isFull", status == BatteryManager.BATTERY_STATUS_FULL);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("BATTERY_ERROR", e.getMessage());
        }
    }

    /**
     * startBatteryListener() — emits BatteryStatusUpdate events when battery changes
     */
    @ReactMethod
    public void startBatteryListener() {
        if (batteryReceiver != null) return; // already listening

        batteryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                try {
                    int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                    int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                    int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);

                    int batteryPct = (level == -1 || scale == -1) ? -1 : (int) ((level / (float) scale) * 100);
                    boolean isCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING
                            || status == BatteryManager.BATTERY_STATUS_FULL);

                    WritableMap params = Arguments.createMap();
                    params.putInt("level", batteryPct);
                    params.putBoolean("isCharging", isCharging);
                    params.putBoolean("isFull", status == BatteryManager.BATTERY_STATUS_FULL);

                    sendEvent(BATTERY_EVENT, params);
                } catch (Exception ignored) {}
            }
        };

        IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        reactContext.getApplicationContext().registerReceiver(batteryReceiver, filter);
    }

    /**
     * stopBatteryListener() — unregisters the battery broadcast receiver
     */
    @ReactMethod
    public void stopBatteryListener() {
        if (batteryReceiver != null) {
            try {
                reactContext.getApplicationContext().unregisterReceiver(batteryReceiver);
            } catch (Exception ignored) {}
            batteryReceiver = null;
        }
    }

    // Required for event emitter (addListener/removeListeners)
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(int count) {}

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}
