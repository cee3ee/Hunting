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

        MeteorClient.LOG.info(
            "Hunter Java runtime: version={}, vendor={}, vendorVersion={}, runtime={}, vm={}, home={}",
            System.getProperty("java.version", ""),
            System.getProperty("java.vendor", ""),
            System.getProperty("java.vendor.version", ""),
            System.getProperty("java.runtime.name", ""),
            System.getProperty("java.vm.name", ""),
            System.getProperty("java.home", "")
        );
    }

    /**
     * Checks whether Minecraft is running on GraalVM JDK 25.
     */
    public static boolean isGraalVM25() {
        String javaVersion = System.getProperty(
            "java.version",
            ""
        );

        // Hunter specifically targets Java 25.
        if (!javaVersion.startsWith("25.")) {
            return false;
        }

        String javaVendor = System.getProperty(
            "java.vendor",
            ""
        );

        String javaVendorVersion = System.getProperty(
            "java.vendor.version",
            ""
        );

        String javaRuntimeName = System.getProperty(
            "java.runtime.name",
            ""
        );

        String javaVmName = System.getProperty(
            "java.vm.name",
            ""
        );

        String javaVmVendor = System.getProperty(
            "java.vm.vendor",
            ""
        );

        String javaVmVersion = System.getProperty(
            "java.vm.version",
            ""
        );

        String javaHome = System.getProperty(
            "java.home",
            ""
        );

        String runtimeInfo = (
            javaVendor + " " +
                javaVendorVersion + " " +
                javaRuntimeName + " " +
                javaVmName + " " +
                javaVmVendor + " " +
                javaVmVersion + " " +
                javaHome
        ).toLowerCase();

        return runtimeInfo.contains("graalvm");
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

    private static void openReadme() {
        try {
            String os = System.getProperty(
                "os.name",
                ""
            ).toLowerCase();

            if (os.contains("win")) {
                new ProcessBuilder(
                    "rundll32",
                    "url.dll,FileProtocolHandler",
                    README_URL
                ).start();
            }
            else if (os.contains("mac")) {
                new ProcessBuilder(
                    "open",
                    README_URL
                ).start();
            }
            else {
                new ProcessBuilder(
                    "xdg-open",
                    README_URL
                ).start();
            }
        }
        catch (Exception e) {
            MeteorClient.LOG.error(
                "Failed to open Hunter README.",
                e
            );
        }
    }

    @EventHandler
    private void onTick(TickEvent.Post event) {
        if (warningOpened) return;

        // Correct runtime.
        if (isGraalVM25()) return;

        // Warning has already been acknowledged.
        if (wasWarningShown()) return;

        // Only show it from the title screen.
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

            int firstButtonX =
                centerX - buttonWidth - 5;

            int secondButtonX =
                centerX + 5;

            int buttonY =
                this.height - 65;

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
                        button ->
                            Minecraft.getInstance()
                                .setScreen(null)
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
                        button ->
                            Minecraft.getInstance().stop()
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

            String title =
                "Hunter - GraalVM JDK 25 Required";

            graphics.text(
                this.font,
                title,
                centerX - this.font.width(title) / 2,
                30,
                0xFFFFFFFF,
                true
            );

            int y = 60;

            String[] lines = {
                "Hunter is not running on GraalVM JDK 25.",
                "",
                "The Chunkbase/seed-based dungeon finder",
                "requires the GraalVM runtime.",
                "",
                "Without GraalVM JDK 25, the full Chunkbase",
                "dungeon calculation system will not work",
                "as intended.",
                "",
                "Install GraalVM JDK 25 and configure",
                "Minecraft to use it before using Hunter."
            };

            for (String line : lines) {
                int x =
                    centerX -
                        this.font.width(line) / 2;

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
