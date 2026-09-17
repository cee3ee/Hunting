package com.spawner.hunt;

import meteordevelopment.meteorclient.MeteorClient;
import meteordevelopment.meteorclient.events.world.TickEvent;
import meteordevelopment.orbit.EventHandler;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
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

    private static final String README_URL =
        "https://github.com/cee3ee/Hunting/blob/main/README.md";

    private boolean warningOpened = false;

    public GraalVMWarning() {
        MeteorClient.EVENT_BUS.subscribe(this);
    }

    /**
     * Checks whether the current Minecraft JVM is Java 25
     * and contains the GraalVM Polyglot API.
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

    /**
     * Opens the Hunter README in the user's default browser.
     */
    private static void openReadme() {
        try {
            String os = System.getProperty("os.name", "").toLowerCase();

            if (os.contains("win")) {
                // Windows
                new ProcessBuilder(
                    "rundll32",
                    "url.dll,FileProtocolHandler",
                    README_URL
                ).start();

            } else if (os.contains("mac")) {
                // macOS
                new ProcessBuilder(
                    "open",
                    README_URL
                ).start();

            } else {
                // Linux and other Unix-like systems
                new ProcessBuilder(
                    "xdg-open",
                    README_URL
                ).start();
            }

        } catch (Exception e) {
            MeteorClient.LOG.error(
                "Failed to open Hunter README.",
                e
            );
        }
    }

    @EventHandler
    private void onTick(TickEvent.Post event) {
        if (warningOpened) return;

        // GraalVM is available, so no warning is needed.
        if (isGraalVM25Available()) return;

        // Don't show the warning repeatedly.
        if (wasWarningShown()) return;

        // Wait until the title screen is visible.
        if (!(Minecraft.getInstance().screen instanceof TitleScreen)) {
            return;
        }

        warningOpened = true;
        markWarningShown();

        Minecraft.getInstance().setScreen(
            new GraalVMWarningScreen()
        );
    }

    private static class GraalVMWarningScreen extends Screen {

        protected GraalVMWarningScreen() {
            super(
                Component.literal(
                    "Hunter - GraalVM JDK 25 Required"
                )
            );
        }

        @Override
        protected void init() {
            super.init();

            int centerX = this.width / 2;

            int buttonWidth = 150;
            int buttonHeight = 20;

            int firstButtonX = centerX - buttonWidth - 5;
            int secondButtonX = centerX + 5;

            int buttonY = this.height - 65;

            // Open README
            this.addRenderableWidget(
                Button.builder(
                        Component.literal("Open README"),
                        button -> openReadme()
                    )
                    .bounds(
                        firstButtonX,
                        buttonY,
                        buttonWidth,
                        buttonHeight
                    )
                    .build()
            );

            // Continue
            this.addRenderableWidget(
                Button.builder(
                        Component.literal("Continue Anyway"),
                        button -> Minecraft.getInstance().setScreen(null)
                    )
                    .bounds(
                        secondButtonX,
                        buttonY,
                        buttonWidth,
                        buttonHeight
                    )
                    .build()
            );

            // Quit
            this.addRenderableWidget(
                Button.builder(
                        Component.literal("Quit"),
                        button -> Minecraft.getInstance().stop()
                    )
                    .bounds(
                        centerX - buttonWidth / 2,
                        buttonY + 25,
                        buttonWidth,
                        buttonHeight
                    )
                    .build()
            );
        }

        @Override
        public void extractRenderState(
            GuiGraphicsExtractor graphics,
            int mouseX,
            int mouseY,
            float delta
        ) {
            super.extractRenderState(
                graphics,
                mouseX,
                mouseY,
                delta
            );

            int centerX = this.width / 2;

            // Title
            graphics.text(
                this.font,
                "Hunter - GraalVM JDK 25 Required",
                centerX - this.font.width(
                    "Hunter - GraalVM JDK 25 Required"
                ) / 2,
                30,
                0xFFFFFFFF,
                true
            );

            // Message
            int y = 60;

            String[] lines = {
                "Hunter is not running on GraalVM JDK 25.",
                "",
                "The Chunkbase/seed-based dungeon finder requires",
                "the GraalVM Polyglot runtime.",
                "",
                "Without GraalVM JDK 25, seed-based dungeon",
                "detection will NOT work and calculations will fail.",
                "",
                "You can continue using Minecraft, but the full",
                "Chunkbase functionality will be unavailable.",
                "",
                "Install GraalVM JDK 25 using the instructions",
                "in the Hunter README."
            };

            for (String line : lines) {
                int x = centerX - this.font.width(line) / 2;

                graphics.text(
                    this.font,
                    line,
                    x,
                    y,
                    0xFFFFFFFF,
                    false
                );

                y += this.font.lineHeight + 2;
            }
        }
    }
}
