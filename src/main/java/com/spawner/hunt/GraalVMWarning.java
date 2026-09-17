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
     * Checks whether the JVM currently running Minecraft is Java 25
     * and has the GraalVM Polyglot API available.
     *
     * We deliberately use Class.forName() with a String so that
     * referencing this class does not itself cause a NoClassDefFoundError.
     */
    public static boolean isGraalVM25Available() {
        String javaVersion = System.getProperty("java.version", "");

        if (!javaVersion.startsWith("25.")) {
            return false;
        }

        try {
            Class.forName(
                "org.graalvm.polyglot.Context",
                false,
                GraalVMWarning.class.getClassLoader()
            );

            return true;
        } catch (ClassNotFoundException | LinkageError e) {
            return false;
        }
    }

    private boolean wasWarningShown() {
        return Files.exists(WARNING_FILE);
    }

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
        if (warningOpened) return;

        // Correct runtime: nothing to warn about.
        if (isGraalVM25Available()) return;

        // Already shown previously.
        if (wasWarningShown()) return;

        // Wait for the title screen.
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
                        // Quit Minecraft.
                        Minecraft.getInstance().stop();
                    }
                },

                Component.literal(
                    "Hunter Requires GraalVM JDK 25"
                ),

                Component.literal(
                    "Hunter is not running on GraalVM JDK 25.\n\n" +
                        "IMPORTANT: Hunter's Chunkbase/seed-based dungeon " +
                        "finder requires the GraalVM Polyglot runtime.\n\n" +
                        "Without GraalVM JDK 25, this feature will NOT work " +
                        "and dungeon calculations will fail.\n\n" +
                        "The rest of Hunter may continue to function, but " +
                        "seed-based spawner detection will be unavailable.\n\n" +
                        "Install GraalVM JDK 25 and configure Minecraft to use " +
                        "it for the full Hunter experience."
                ),

                Component.literal("Continue Anyway"),
                Component.literal("Quit")
            )
        );
    }
}
