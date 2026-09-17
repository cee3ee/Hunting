package com.spawner.hunt;

import meteordevelopment.meteorclient.MeteorClient;
import meteordevelopment.meteorclient.events.world.TickEvent;
import meteordevelopment.orbit.EventHandler;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ConfirmScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.network.chat.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class GraalVMWarning {
    private static final Path WARNING_FILE = FabricLoader.getInstance()
        .getConfigDir()
        .resolve("hunter")
        .resolve("graalvm-warning-v1");

    private boolean warningOpened = false;

    public GraalVMWarning() {
        MeteorClient.EVENT_BUS.subscribe(this);
    }

    /**
     * Checks whether Minecraft is currently running on GraalVM JDK 25.
     */
    private boolean isGraalVM25() {
        String javaVersion = System.getProperty("java.version", "");
        String javaVmVendor = System.getProperty("java.vm.vendor", "");
        String javaVendorVersion = System.getProperty("java.vendor.version", "");

        boolean java25 = javaVersion.startsWith("25.");

        boolean graalVM =
            javaVmVendor.toLowerCase().contains("graalvm")
                || javaVendorVersion.toLowerCase().contains("graalvm");

        return java25 && graalVM;
    }

    /**
     * Checks whether the warning has already been shown.
     */
    private boolean wasWarningShown() {
        return Files.exists(WARNING_FILE);
    }

    /**
     * Saves a file so the warning isn't shown again.
     */
    private void markWarningShown() {
        try {
            Files.createDirectories(WARNING_FILE.getParent());
            Files.writeString(
                WARNING_FILE,
                "Hunter GraalVM warning shown."
            );
        } catch (IOException e) {
            MeteorClient.LOG.error(
                "Failed to save GraalVM warning state.",
                e
            );
        }
    }

    @EventHandler
    private void onTick(TickEvent.Post event) {
        // Don't do anything if we've already opened the warning this session.
        if (warningOpened) return;

        // GraalVM is being used, so no warning is needed.
        if (isGraalVM25()) return;

        // Don't show the warning again after it has already been acknowledged.
        if (wasWarningShown()) return;

        // Wait until the title screen is visible.
        if (!(Minecraft.getInstance().screen instanceof TitleScreen)) return;

        warningOpened = true;
        markWarningShown();

        Minecraft.getInstance().setScreen(
            new ConfirmScreen(
                accepted -> {
                    if (accepted) {
                        // Continue into Minecraft.
                        Minecraft.getInstance().setScreen(null);
                    } else {
                        // Exit Minecraft.
                        Minecraft.getInstance().stop();
                    }
                },

                Component.literal("Hunter - GraalVM JDK 25 Recommended"),

                Component.literal(
                    "Hunter is not running on GraalVM JDK 25.\n\n" +
                        "Hunter's seed-based spawner detection uses JavaScript " +
                        "and WebAssembly. Without GraalVM's optimizing runtime, " +
                        "these calculations can be significantly slower.\n\n" +
                        "This may result in slower spawner prediction and longer " +
                        "calculation times, especially when scanning large areas.\n\n" +
                        "Hunter can still run on a standard JDK 25, but GraalVM JDK 25 " +
                        "is strongly recommended for the best performance.\n\n" +
                        "You can install GraalVM JDK 25 and configure Minecraft to " +
                        "use it later."
                ),

                Component.literal("Continue Anyway"),
                Component.literal("Quit")
            )
        );
    }
}
