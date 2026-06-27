package com.jalanjyothi.crm;

import android.app.AlertDialog;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // PCI DSS 3.4: Prevent screenshots and screen recording of sensitive financial data
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // PCI DSS 5.2: Root detection - warn users on compromised devices
        if (isDeviceRooted()) {
            new AlertDialog.Builder(this)
                .setTitle("Security Warning")
                .setMessage("This device appears to be rooted. Running financial applications on rooted devices poses security risks. Data integrity cannot be guaranteed.")
                .setPositiveButton("I Understand", (dialog, which) -> dialog.dismiss())
                .setCancelable(false)
                .show();
        }
    }

    /**
     * PCI DSS 5.2: Check if device is rooted using multiple indicators
     */
    private boolean isDeviceRooted() {
        // Check for common su binary locations
        String[] suPaths = {
            "/system/app/Superuser.apk",
            "/system/xbin/su",
            "/system/bin/su",
            "/sbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/data/local/su",
            "/su/bin/su"
        };
        for (String path : suPaths) {
            if (new File(path).exists()) return true;
        }

        // Check for Magisk or similar
        String[] rootIndicators = {
            "/system/app/Magisk.apk",
            "/sbin/.magisk",
            "/data/adb/magisk"
        };
        for (String path : rootIndicators) {
            if (new File(path).exists()) return true;
        }

        // Check Build tags
        String buildTags = android.os.Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) return true;

        return false;
    }
}
