package com.spawner.hunt.modules;

import meteordevelopment.meteorclient.MeteorClient;
import meteordevelopment.meteorclient.events.render.Render3DEvent;
import meteordevelopment.meteorclient.events.world.TickEvent;
import meteordevelopment.meteorclient.pathing.BaritoneUtils;
import meteordevelopment.meteorclient.pathing.PathManagers;
import meteordevelopment.meteorclient.renderer.ShapeMode;
import meteordevelopment.meteorclient.settings.*;
import meteordevelopment.meteorclient.systems.modules.Categories;
import meteordevelopment.meteorclient.systems.modules.Module;
import meteordevelopment.meteorclient.utils.Utils;
import meteordevelopment.meteorclient.utils.player.ChatUtils;
import meteordevelopment.meteorclient.utils.player.FindItemResult;
import meteordevelopment.meteorclient.utils.player.InvUtils;
import meteordevelopment.meteorclient.utils.render.RenderUtils;
import meteordevelopment.meteorclient.utils.render.color.SettingColor;
import meteordevelopment.meteorclient.utils.world.BlockUtils;
import meteordevelopment.orbit.EventHandler;
import net.minecraft.SharedConstants;
import net.minecraft.network.protocol.game.ServerboundMovePlayerPacket;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.tags.ItemTags;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.SpawnerBlockEntity;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

// Requires GraalJS Polyglot + JS runtime dependencies in build.gradle.

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.proxy.ProxyExecutable;
import org.graalvm.polyglot.PolyglotAccess;

public class SpawnerHunt extends Module {
    private static final int PICKUP_TIMEOUT_TICKS = 200;
    private static final double PICKUP_SEARCH_RANGE = 8.0;

    private final SettingGroup sgGeneral = settings.getDefaultGroup();
    private final SettingGroup sgAutomation = settings.createGroup("Automation");
    private final SettingGroup sgStealth = settings.createGroup("Stealth");
    private final SettingGroup sgRender = settings.createGroup("Render");

    public enum ExplorationMode {
        None,
        RTP,
        TargetCoordinates
    }

    /** Selects the source used to locate spawner targets. */
    public enum DetectionMethod {
        WorldScan,
        ChunkbasePrediction,
        DualVerification
    }

    private final Setting<DetectionMethod> detectionMethod = sgGeneral.add(new EnumSetting.Builder<DetectionMethod>()
        .name("finder-method")
        .description("Choose loaded-world scanning, Chunkbase seed prediction, or dual verification (predict then confirm in the loaded world).")
        .defaultValue(DetectionMethod.WorldScan)
        .build()
    );

    private final Setting<List<String>> mobFilter = sgGeneral.add(new StringListSetting.Builder()
        .name("mob-filter")
        .description("Only targets spawners whose mob id exactly matches this value. Must be in format minecraft:mob-id")
        .defaultValue("minecraft:skeleton")
        .build()
    );

    private final Setting<Boolean> useBaritone = sgAutomation.add(new BoolSetting.Builder()
        .name("use-baritone")
        .description("Uses Meteor's path manager (Baritone when available) to route to the nearest matching spawner.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Boolean> ignoreY = sgAutomation.add(new BoolSetting.Builder()
        .name("ignore-y")
        .description("When enabled, pathing only targets X/Z and ignores Y.")
        .defaultValue(false)
        .build()
    );

    private final Setting<Boolean> dynamicReroute = sgAutomation.add(new BoolSetting.Builder()
        .name("dynamic-reroute")
        .description("Automatically reroutes when a newly detected spawner is meaningfully closer.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Double> rerouteAdvantage = sgAutomation.add(new DoubleSetting.Builder()
        .name("reroute-advantage")
        .description("How many blocks closer a new spawner must be before rerouting.")
        .defaultValue(5.0)
        .min(0)
        .sliderMax(32)
        .build()
    );

    private final Setting<Integer> repathDelay = sgAutomation.add(new IntSetting.Builder()
        .name("repath-delay")
        .description("Ticks between path refreshes while traveling.")
        .defaultValue(20)
        .min(1)
        .sliderRange(1, 100)
        .build()
    );

    private final Setting<Boolean> autoMine = sgAutomation.add(new BoolSetting.Builder()
        .name("auto-mine")
        .description("Automatically starts mining the target spawner when in range.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Boolean> requireSilkTouch = sgAutomation.add(new BoolSetting.Builder()
        .name("require-silk-touch")
        .description("Only mines using a Silk Touch pickaxe unless disabled.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Boolean> verifySpawnerPickup = sgAutomation.add(new BoolSetting.Builder()
        .name("verify-spawner-pickup")
        .description("Verifies that mined spawners were picked up and attempts to collect dropped spawner items if needed.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Double> mineRange = sgAutomation.add(new DoubleSetting.Builder()
        .name("mine-range")
        .description("Distance in blocks at which the module starts mining the current target.")
        .defaultValue(1.5)
        .min(1)
        .sliderMax(6)
        .build()
    );

    private final Setting<ExplorationMode> explorationMode = sgAutomation.add(new EnumSetting.Builder<ExplorationMode>()
        .name("exploration-mode")
        .description("What to do when no matching spawners are currently detected.")
        .defaultValue(ExplorationMode.None)
        .build()
    );

    private final Setting<Integer> rtpChestSlot = sgAutomation.add(new IntSetting.Builder()
        .name("rtp-chest-slot")
        .description("The slot index of the chest in the RTP GUI to click. 0-indexed.")
        .defaultValue(11)
        .min(0)
        .sliderMax(26)
        .visible(() -> explorationMode.get() == ExplorationMode.RTP)
        .build()
    );

    private final Setting<Integer> targetX = sgAutomation.add(new IntSetting.Builder()
        .name("target-x")
        .description("The X coordinate to travel towards when searching.")
        .defaultValue(0)
        .sliderRange(-30000000, 30000000)
        .visible(() -> explorationMode.get() == ExplorationMode.TargetCoordinates)
        .build()
    );

    private final Setting<Integer> targetZ = sgAutomation.add(new IntSetting.Builder()
        .name("target-z")
        .description("The Z coordinate to travel towards when searching.")
        .defaultValue(0)
        .sliderRange(-30000000, 30000000)
        .visible(() -> explorationMode.get() == ExplorationMode.TargetCoordinates)
        .build()
    );


    private final Setting<Boolean> stayBelowMaxY = sgStealth.add(new BoolSetting.Builder()
        .name("stay-below-max-y")
        .description("Returns to below a specified Y level after mining a spawner above it.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Integer> maxYLevel = sgStealth.add(new IntSetting.Builder()
        .name("max-y-level")
        .description("The maximum Y level to stay below.")
        .defaultValue(32)
        .sliderRange(-64, 319)
        .visible(stayBelowMaxY::get)
        .build()
    );

    private final Setting<Boolean> digDownBeforeRtp = sgStealth.add(new BoolSetting.Builder()
        .name("dig-down-before-rtp")
        .description("Digs down below the max Y level and waits 5 seconds before RTPing if no spawners are found.")
        .defaultValue(true)
        .visible(() -> explorationMode.get() == ExplorationMode.RTP && stayBelowMaxY.get())
        .build()
    );

    private final Setting<Boolean> DungeonPacketmethod = sgStealth.add(new BoolSetting.Builder()
        .name("dungeon-packet-method")
        .description("Uses an anticheat bypass method that prevents anti esp plugins on servers.")
        .defaultValue(false)
        .build()
    );

    private final Setting<Boolean> tracers = sgRender.add(new BoolSetting.Builder()
        .name("tracers")
        .description("Draws a tracer from your eye position to each matching spawner.")
        .defaultValue(true)
        .build()
    );

    private final Setting<Boolean> box = sgRender.add(new BoolSetting.Builder()
        .name("box")
        .description("Draws a box around each matching spawner.")
        .defaultValue(true)
        .build()
    );

    private final Setting<SettingColor> tracerColor = sgRender.add(new ColorSetting.Builder()
        .name("tracer-color")
        .description("Tracer color.")
        .defaultValue(new SettingColor(255, 255, 255, 255))
        .build()
    );

    private final Setting<SettingColor> boxColor = sgRender.add(new ColorSetting.Builder()
        .name("box-color")
        .description("Box color.")
        .defaultValue(new SettingColor(255, 80, 80, 75))
        .build()
    );

    private final Setting<Boolean> predictionBox = sgRender.add(new BoolSetting.Builder()
        .name("prediction-box")
        .description("Draws a box at each predicted coordinate (or dual-verified coordinate in Dual Verification mode).")
        .defaultValue(true)
        .visible(() -> detectionMethod.get() == DetectionMethod.ChunkbasePrediction
            || detectionMethod.get() == DetectionMethod.DualVerification)
        .build()
    );

    private final Setting<Boolean> predictionTracers = sgRender.add(new BoolSetting.Builder()
        .name("prediction-tracers")
        .description("Draws a tracer to each predicted coordinate (or dual-verified coordinate in Dual Verification mode).")
        .defaultValue(true)
        .visible(() -> detectionMethod.get() == DetectionMethod.ChunkbasePrediction
            || detectionMethod.get() == DetectionMethod.DualVerification)
        .build()
    );

    private final List<BlockPos> matchingSpawners = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final List<BlockPos> dualVerifiedSpawners = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final Map<BlockPos, String> fallbackEntityIdCache = new HashMap<>();
    private final Set<BlockPos> packetedDungeons = new HashSet<>(); // NEW: Prevents packet spam

    private BlockPos currentTarget;
    private BlockPos explorationTarget;
    private BlockPos pendingPickupTarget;
    private boolean pathOwnedByModule;
    private boolean warnedBaritoneUnavailable;
    private int expectedSpawnerItemCount;
    private int pickupTicks;
    private int pickupPathRefreshTicks;
    private int ticksSincePathRefresh;
    private int silkWarningCooldown;
    private int spawnerScanCooldown;
    private int waitingForTeleportTicks;


    private boolean returningBelowMaxY;
    private boolean diggingDownForRtp;
    private int ticksBelowMaxY;


    public SpawnerHunt() {
        super(Categories.Misc, "SpawnerHunt", "Routes to and mines mob spawners filtered by mob type.");
    }

    @Override
    public void onDeactivate() {
        matchingSpawners.clear();
        fallbackEntityIdCache.clear();
        packetedDungeons.clear();
        predictedDungeons.clear();
        dualVerifiedSpawners.clear();
        invalidPredictedTargets.clear();
        clearDungeonScanState();
        clearDungeonCache();
        currentTarget = null;
        clearExploration();
        clearPickupVerification();
        warnedBaritoneUnavailable = false;
        ticksSincePathRefresh = 0;
        silkWarningCooldown = 0;
        stopOwnedPathing();
        firstStuckCheckPos = null;
        stuckTimer = 0;
        waitingForConfirmation = false;
        playerIsStuck = false;
        waitingForTeleport = false;
        waitingForRtpGui = false;
        rtpGuiWaitTicks = 0;
        rtpCooldown = 0;
        rtpStartPos = null;
        recoveryMineRangeActive = false;
        unreachableSpawners.clear();
        recoveryAttemptsForTarget = 0;
        spawnerScanCooldown = 0;
        waitingForTeleportTicks = 0;

        returningBelowMaxY = false;
        diggingDownForRtp = false;
        ticksBelowMaxY = 0;
    }

    @EventHandler
    private void onTick(TickEvent.Post event) {
        if (mc.level == null || mc.player == null) {
            matchingSpawners.clear();
            fallbackEntityIdCache.clear();
            currentTarget = null;
            clearExploration();
            clearPickupVerification();
            stopOwnedPathing();
            return;
        }

        if (detectionMethod.get() != lastDetectionMethod) {
            lastDetectionMethod = detectionMethod.get();
            matchingSpawners.clear();
            predictedDungeons.clear();
            dualVerifiedSpawners.clear();
            invalidPredictedTargets.clear();
            currentTarget = null;
            clearDungeonScanState();
            stopOwnedPathing();
        }

        int playerChunkX = Math.floorDiv(mc.player.getBlockX(), 16);
        int playerChunkZ = Math.floorDiv(mc.player.getBlockZ(), 16);
        String seed = worldSeed.get().trim();

        boolean usesPrediction = detectionMethod.get() == DetectionMethod.ChunkbasePrediction
            || detectionMethod.get() == DetectionMethod.DualVerification;

        if (usesPrediction) {
            int radius = predictionRadius.get();

            // Prediction runs in both Chunkbase and Dual Verification modes. While
            // a scan is active, retain only the newest requested position/radius/seed.
            if (mc.player.tickCount % 20 == 0) {
                boolean requestedStateChanged = playerChunkX != activeDungeonScanChunkX
                    || playerChunkZ != activeDungeonScanChunkZ
                    || !seed.equals(activeDungeonScanSeed)
                    || radius != activeDungeonScanRadius;

                if (dungeonScanRunning) {
                    if (requestedStateChanged) {
                        pendingDungeonScan = true;
                        pendingDungeonScanChunkX = playerChunkX;
                        pendingDungeonScanChunkZ = playerChunkZ;
                        pendingDungeonScanSeed = seed;
                        pendingDungeonScanRadius = radius;
                    }
                } else if (requestedStateChanged) {
                    requestDungeonScan(playerChunkX, playerChunkZ, seed, radius);
                }
            }
        } else {
            predictedDungeons.clear();
            dualVerifiedSpawners.clear();
            clearDungeonScanState();
        }

        if (rtpCooldown > 0) rtpCooldown--;

        if (waitingForRtpGui) {
            handleRtpGui();
        }

        if (PathManagers.get().isPathing() && pathOwnedByModule) {
            handleStuckDetection();
        } else {
            resetStuckDetection();
        }

        if (playerIsStuck) {
            doRecovery();
        }

        spawnerScanCooldown++;

        if (detectionMethod.get() == DetectionMethod.WorldScan
            || detectionMethod.get() == DetectionMethod.DualVerification) {
            if (spawnerScanCooldown >= 10) {
                spawnerScanCooldown = 0;
                updateMatchingSpawners();
                if (detectionMethod.get() == DetectionMethod.DualVerification) {
                    updateDualVerifiedSpawners();
                } else {
                    dualVerifiedSpawners.clear();
                }
            }
        } else {
            matchingSpawners.clear();
            dualVerifiedSpawners.clear();
            spawnerScanCooldown = 0;
        }

        if (waitingForTeleport && rtpStartPos != null) {
            waitingForTeleportTicks++;
            double dist = mc.player.position().distanceTo(rtpStartPos);

            if (dist > 50 || waitingForTeleportTicks > 400) {
                waitingForTeleport = false;
                waitingForTeleportTicks = 0;
                unreachableSpawners.clear();
                info("RTP completed.");
            }
        }

        if (silkWarningCooldown > 0) silkWarningCooldown--;

        if (!verifySpawnerPickup.get() && pendingPickupTarget != null) {
            clearPickupVerification();
            stopOwnedPathing();
            checkAndSetReturningBelowMaxY();
        }

        if (verifySpawnerPickup.get() && handlePickupVerification()) return;

        if (!useBaritone.get()) {
            currentTarget = null;
            stopOwnedPathing();
            return;
        }

        if (!BaritoneUtils.IS_AVAILABLE) {
            currentTarget = null;
            stopOwnedPathing();

            if (!warnedBaritoneUnavailable) {
                MeteorClient.LOG.warn("[SpawnerHunt] Baritone path manager is not available.");
                warnedBaritoneUnavailable = true;
            }

            return;
        }

        warnedBaritoneUnavailable = false;

        BlockPos nearest = findNearestSpawner();

        if (nearest == null) {
            currentTarget = null;

            if (returningBelowMaxY) {
                handleReturningBelowMaxY();
                return;
            }

            switch (explorationMode.get()) {
                case None:
                    clearExploration();
                    stopOwnedPathing();
                    break;
                case RTP:
                    clearExploration();
                    if (waitingForRtpGui || waitingForTeleport) {
                        stopOwnedPathing();
                        break;
                    }
                    if (stayBelowMaxY.get() && digDownBeforeRtp.get()) {
                        handleRtpDigDown();
                    }else {
                        stopOwnedPathing();
                        rtpPlayer();
                    }
                    break;
                case TargetCoordinates:
                    handleTargetExploration();
                    break;
            }

            return;
        }

        returningBelowMaxY = false;
        diggingDownForRtp = false;
        ticksBelowMaxY = 0;

        clearExploration();

        if (currentTarget == null
            || !isKnownTarget(currentTarget)
            || !mc.level.getWorldBorder().isWithinBounds(currentTarget)) {
            setCurrentTarget(nearest);
            pathToCurrentTarget();
        } else if (dynamicReroute.get() && shouldReroute(nearest)) {
            setCurrentTarget(nearest);
            pathToCurrentTarget();
        } else if (!isWithinMineRange(currentTarget)) {
            ticksSincePathRefresh++;
            if (!PathManagers.get().isPathing() || ticksSincePathRefresh >= repathDelay.get()) {
                pathToCurrentTarget();
            }
        }

        if (currentTarget != null && isWithinMineRange(currentTarget)) {
            stopOwnedPathing();

            if (autoMine.get() && mc.level.getBlockState(currentTarget).is(Blocks.SPAWNER)) {
                int beforeMineSpawnerCount = verifySpawnerPickup.get() ? countSpawnerItemsInInventory() : -1;
                mineTargetSpawner(currentTarget);

                if (!mc.level.getBlockState(currentTarget).is(Blocks.SPAWNER)) {
                    if (verifySpawnerPickup.get()) {
                        beginPickupVerification(currentTarget, beforeMineSpawnerCount);
                    } else {
                        checkAndSetReturningBelowMaxY();
                    }
                    currentTarget = null;
                }
            }
        }
    }

    private boolean handlePickupVerification() {
        if (pendingPickupTarget == null) return false;

        if (mc.level == null || mc.player == null) {
            clearPickupVerification();
            stopOwnedPathing();
            return false;
        }

        if (countSpawnerItemsInInventory() > expectedSpawnerItemCount) {
            clearPickupVerification();
            stopOwnedPathing();
            checkAndSetReturningBelowMaxY();
            return false;
        }

        pickupTicks++;

        if (pickupTicks >= PICKUP_TIMEOUT_TICKS) {
            MeteorClient.LOG.warn("[SpawnerHunt] Timed out trying to confirm pickup for mined spawner at {}.", pendingPickupTarget.toShortString());
            clearPickupVerification();
            stopOwnedPathing();
            checkAndSetReturningBelowMaxY();
            return false;
        }

        ItemEntity drop = findNearestSpawnerDrop();
        if (drop == null) {
            return true;
        }

        double dropDistSq = mc.player.distanceToSqr(drop.getX(), drop.getY(), drop.getZ());
        if (dropDistSq <= 4.0) {
            return true;
        }

        if (BaritoneUtils.IS_AVAILABLE) {
            pickupPathRefreshTicks++;

            if (!PathManagers.get().isPathing() || pickupPathRefreshTicks >= 5) {
                PathManagers.get().moveTo(drop.blockPosition(), false);
                pathOwnedByModule = true;
                pickupPathRefreshTicks = 0;
            }
        }

        return true;
    }

    private void checkAndSetReturningBelowMaxY() {
        if (stayBelowMaxY.get() && mc.player != null && mc.player.getBlockY() > maxYLevel.get()) {
            returningBelowMaxY = true;
        }
    }

    private void handleReturningBelowMaxY() {
        if (mc.player == null) return;

        if (mc.player.getBlockY() <= maxYLevel.get()) {
            returningBelowMaxY = false;
            stopOwnedPathing();
            return;
        }

        if (!PathManagers.get().isPathing() || !pathOwnedByModule) {
            BlockPos targetPos = new BlockPos(mc.player.getBlockX(), maxYLevel.get(), mc.player.getBlockZ());
            PathManagers.get().moveTo(targetPos, false);
            pathOwnedByModule = true;
        }
    }

    private final Setting<String> worldSeed = sgStealth.add(new StringSetting.Builder()
        .name("world-seed")
        .description("The known 64-bit world seed used by the bundled dungeon finder.")
        .defaultValue("0")
        .visible(() -> detectionMethod.get() == DetectionMethod.ChunkbasePrediction
            || detectionMethod.get() == DetectionMethod.DualVerification)
        .build()
    );

    private final Setting<Integer> predictionRadius = sgStealth.add(new IntSetting.Builder()
        .name("prediction-radius")
        .description("How many chunks to scan outward from the player's current chunk in each direction.")
        .defaultValue(8)
        .min(1)
        .sliderRange(1, 16)
        .visible(() -> detectionMethod.get() == DetectionMethod.ChunkbasePrediction
            || detectionMethod.get() == DetectionMethod.DualVerification)
        .build()
    );

    /** Predicted dungeons returned by the bundled Chunkbase worker/WASM. */
    private final List<PredictedDungeon> predictedDungeons = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final Set<BlockPos> invalidPredictedTargets = new HashSet<>();
    private final ChunkbaseDungeonFinder dungeonFinder = new ChunkbaseDungeonFinder();
    private DetectionMethod lastDetectionMethod = DetectionMethod.WorldScan;
    private String activeDungeonScanSeed;
    private int activeDungeonScanRadius = -1;
    private int activeDungeonScanChunkX = Integer.MIN_VALUE;
    private int activeDungeonScanChunkZ = Integer.MIN_VALUE;
    private boolean dungeonScanRunning;

    private boolean pendingDungeonScan;
    private int pendingDungeonScanChunkX = Integer.MIN_VALUE;
    private int pendingDungeonScanChunkZ = Integer.MIN_VALUE;
    private String pendingDungeonScanSeed;
    private int pendingDungeonScanRadius = -1;

    // Exact per-chunk Chunkbase cache. A chunk is marked as scanned even when it
    // contained no dungeon, so later overlapping radius scans do not regenerate it.
    private final Map<ChunkKey, List<PredictedDungeon>> dungeonChunkCache = new HashMap<>();
    private final Set<ChunkKey> scannedDungeonChunks = new HashSet<>();
    private String dungeonCacheSeed;
    private int dungeonCacheJavaVersion = -1;
    private static final int MAX_CACHED_DUNGEON_CHUNKS = 100_000;

    private record ChunkKey(int x, int z) {
    }

    private record DungeonScanArea(int startChunkX, int startChunkZ, int sizeX, int sizeZ) {
        int endChunkX() { return startChunkX + sizeX - 1; }
        int endChunkZ() { return startChunkZ + sizeZ - 1; }
    }

    private void clearDungeonCache() {
        dungeonChunkCache.clear();
        scannedDungeonChunks.clear();
        dungeonCacheSeed = null;
        dungeonCacheJavaVersion = -1;
    }

    private void ensureDungeonCache(String seed, int javaVersion) {
        if (!seed.equals(dungeonCacheSeed) || javaVersion != dungeonCacheJavaVersion) {
            clearDungeonCache();
            dungeonCacheSeed = seed;
            dungeonCacheJavaVersion = javaVersion;
        }
    }

    private void trimDungeonCacheIfNeeded() {
        if (scannedDungeonChunks.size() <= MAX_CACHED_DUNGEON_CHUNKS) return;

        String preservedSeed = dungeonCacheSeed;
        int preservedJavaVersion = dungeonCacheJavaVersion;
        clearDungeonCache();
        dungeonCacheSeed = preservedSeed;
        dungeonCacheJavaVersion = preservedJavaVersion;

        MeteorClient.LOG.info("[SpawnerHunt] Chunkbase dungeon cache exceeded {} chunks; cache cleared.", MAX_CACHED_DUNGEON_CHUNKS);
    }

    private void clearDungeonScanState() {
        dungeonScanRunning = false;
        pendingDungeonScan = false;
        activeDungeonScanSeed = null;
        activeDungeonScanRadius = -1;
        activeDungeonScanChunkX = Integer.MIN_VALUE;
        activeDungeonScanChunkZ = Integer.MIN_VALUE;
        pendingDungeonScanSeed = null;
        pendingDungeonScanRadius = -1;
        pendingDungeonScanChunkX = Integer.MIN_VALUE;
        pendingDungeonScanChunkZ = Integer.MIN_VALUE;
    }

    /**
     * Starts the newest requested Chunkbase scan, or records it as the only
     * pending request when another scan is already running. Older queued scans
     * are intentionally never accumulated.
     */
    private void requestDungeonScan(int centerChunkX, int centerChunkZ, String seedText, int radius) {
        if (mc.level == null || mc.player == null) return;

        if (dungeonScanRunning) {
            pendingDungeonScan = true;
            pendingDungeonScanChunkX = centerChunkX;
            pendingDungeonScanChunkZ = centerChunkZ;
            pendingDungeonScanSeed = seedText;
            pendingDungeonScanRadius = radius;

            MeteorClient.LOG.debug(
                "[SpawnerHunt] Dungeon scan already running; keeping newest pending request centerChunk=({}, {}), radius={}, seed={}",
                centerChunkX, centerChunkZ, radius, seedText
            );
            return;
        }

        ScanDungeonAttempts(centerChunkX, centerChunkZ, seedText, radius);
    }

    private void ScanDungeonAttempts(int centerChunkX, int centerChunkZ, String seedText, int radius) {
        if (mc.level == null || mc.player == null) return;

        if (seedText.isEmpty() || !seedText.matches("[-+]?\\d+")) {
            MeteorClient.LOG.warn("[SpawnerHunt] Invalid world seed: {}", seedText);
            return;
        }

        if (radius < 1) radius = 1;
        if (radius > 16) radius = 16;

        final int requestedChunkX = centerChunkX;
        final int requestedChunkZ = centerChunkZ;
        final int requestedRadius = radius;
        final String requestedSeed = seedText;
        final long seed;

        try {
            seed = Long.parseLong(requestedSeed);
        } catch (NumberFormatException e) {
            MeteorClient.LOG.warn("[SpawnerHunt] World seed is outside signed 64-bit range: {}", requestedSeed);
            return;
        }

        final int javaVersion = resolveWorkerJavaVersion();
        ensureDungeonCache(requestedSeed, javaVersion);

        final int startChunkX = requestedChunkX - requestedRadius;
        final int startChunkZ = requestedChunkZ - requestedRadius;
        final int scanSize = requestedRadius * 2 + 1;
        final DungeonScanArea requestedArea = new DungeonScanArea(
            startChunkX,
            startChunkZ,
            scanSize,
            scanSize
        );

        dungeonScanRunning = false;
        activeDungeonScanChunkX = requestedChunkX;
        activeDungeonScanChunkZ = requestedChunkZ;
        activeDungeonScanSeed = requestedSeed;
        activeDungeonScanRadius = requestedRadius;

        List<DungeonScanArea> missingAreas = buildMissingDungeonScanAreas(requestedArea);

        if (missingAreas.isEmpty()) {
            applyCachedDungeonResults(requestedArea);
            MeteorClient.LOG.info(
                "[SpawnerHunt] Dungeon cache hit for centerChunk=({}, {}), radius={}; no new Chunkbase calculation needed.",
                requestedChunkX, requestedChunkZ, requestedRadius
            );
            return;
        }

        dungeonScanRunning = true;

        MeteorClient.LOG.info(
            "[SpawnerHunt] Dungeon scan request: seed={}, javaVersion={}, centerChunk=({}, {}), radius={}, size={}x{}, missingAreas={}",
            seed, javaVersion, requestedChunkX, requestedChunkZ, requestedRadius, scanSize, scanSize, missingAreas.size()
        );

        runDungeonScanAreas(
            seed,
            javaVersion,
            requestedSeed,
            requestedArea,
            missingAreas,
            0
        );
    }

    private List<DungeonScanArea> buildMissingDungeonScanAreas(DungeonScanArea requestedArea) {
        int totalChunks = requestedArea.sizeX() * requestedArea.sizeZ();
        int missingChunks = 0;

        for (int z = requestedArea.startChunkZ(); z <= requestedArea.endChunkZ(); z++) {
            for (int x = requestedArea.startChunkX(); x <= requestedArea.endChunkX(); x++) {
                if (!scannedDungeonChunks.contains(new ChunkKey(x, z))) {
                    missingChunks++;
                }
            }
        }

        if (missingChunks == 0) return List.of();
        if (missingChunks == totalChunks) return List.of(requestedArea);

        // Decompose the missing cells into horizontal runs. After moving one
        // chunk, this normally becomes one narrow strip rather than another
        // complete radius scan, avoiding repeated work on cached chunks.
        List<DungeonScanArea> areas = new ArrayList<>();

        for (int z = requestedArea.startChunkZ(); z <= requestedArea.endChunkZ(); z++) {
            int runStartX = Integer.MIN_VALUE;

            for (int x = requestedArea.startChunkX(); x <= requestedArea.endChunkX(); x++) {
                boolean missing = !scannedDungeonChunks.contains(new ChunkKey(x, z));

                if (missing && runStartX == Integer.MIN_VALUE) {
                    runStartX = x;
                } else if (!missing && runStartX != Integer.MIN_VALUE) {
                    areas.add(new DungeonScanArea(
                        runStartX,
                        z,
                        x - runStartX,
                        1
                    ));
                    runStartX = Integer.MIN_VALUE;
                }
            }

            if (runStartX != Integer.MIN_VALUE) {
                areas.add(new DungeonScanArea(
                    runStartX,
                    z,
                    requestedArea.endChunkX() - runStartX + 1,
                    1
                ));
            }
        }

        return areas;
    }

    private void runDungeonScanAreas(
        long seed,
        int javaVersion,
        String seedText,
        DungeonScanArea requestedArea,
        List<DungeonScanArea> areas,
        int index
    ) {
        if (!dungeonScanRunning) return;

        // A newer player/radius/seed request supersedes the remaining pieces of
        // this logical scan. Keep already-completed pieces in the cache and move
        // directly to the newest request.
        if (pendingDungeonScan) {
            dungeonScanRunning = false;
            startPendingDungeonScan();
            return;
        }

        if (index >= areas.size()) {
            dungeonScanRunning = false;
            applyCachedDungeonResults(requestedArea);

            MeteorClient.LOG.info(
                "[SpawnerHunt] Chunkbase cache scan completed: {} dungeons available within centerChunk=({}, {}), radius={}",
                predictedDungeons.size(), activeDungeonScanChunkX, activeDungeonScanChunkZ, activeDungeonScanRadius
            );
            return;
        }

        DungeonScanArea area = areas.get(index);

        dungeonFinder.findDungeonsArea(
            seed,
            javaVersion,
            area.startChunkX(),
            area.startChunkZ(),
            area.sizeX(),
            area.sizeZ()
        ).whenComplete((dungeons, throwable) -> mc.execute(() -> {
            if (throwable != null) {
                dungeonScanRunning = false;
                activeDungeonScanChunkX = Integer.MIN_VALUE;
                activeDungeonScanChunkZ = Integer.MIN_VALUE;
                activeDungeonScanSeed = null;
                activeDungeonScanRadius = -1;
                MeteorClient.LOG.error("[SpawnerHunt] Dungeon finder failed", throwable);

                if (pendingDungeonScan) {
                    startPendingDungeonScan();
                }
                return;
            }

            mergeDungeonAreaIntoCache(area, dungeons);
            trimDungeonCacheIfNeeded();

            MeteorClient.LOG.debug(
                "[SpawnerHunt] Cached dungeon area startChunk=({}, {}), size={}x{}, returned={}",
                area.startChunkX(), area.startChunkZ(), area.sizeX(), area.sizeZ(), dungeons.size()
            );

            if (pendingDungeonScan) {
                dungeonScanRunning = false;
                startPendingDungeonScan();
                return;
            }

            int currentChunkX = mc.player != null
                ? Math.floorDiv(mc.player.getBlockX(), 16)
                : requestedArea.startChunkX() + requestedArea.sizeX() / 2;
            int currentChunkZ = mc.player != null
                ? Math.floorDiv(mc.player.getBlockZ(), 16)
                : requestedArea.startChunkZ() + requestedArea.sizeZ() / 2;
            String currentSeed = worldSeed.get().trim();
            int currentRadius = predictionRadius.get();

            boolean requestIsObsolete = currentChunkX != activeDungeonScanChunkX
                || currentChunkZ != activeDungeonScanChunkZ
                || !currentSeed.equals(seedText)
                || currentRadius != activeDungeonScanRadius
                || (detectionMethod.get() != DetectionMethod.ChunkbasePrediction
                && detectionMethod.get() != DetectionMethod.DualVerification);

            if (requestIsObsolete) {
                dungeonScanRunning = false;
                requestDungeonScan(currentChunkX, currentChunkZ, currentSeed, currentRadius);
                return;
            }

            runDungeonScanAreas(seed, javaVersion, seedText, requestedArea, areas, index + 1);
        }));
    }

    private void mergeDungeonAreaIntoCache(DungeonScanArea area, List<PredictedDungeon> dungeons) {
        Map<ChunkKey, List<PredictedDungeon>> byChunk = new HashMap<>();

        for (PredictedDungeon dungeon : dungeons) {
            ChunkKey key = new ChunkKey(dungeon.chunkX(), dungeon.chunkZ());
            byChunk.computeIfAbsent(key, ignored -> new ArrayList<>()).add(dungeon);
        }

        for (int z = area.startChunkZ(); z <= area.endChunkZ(); z++) {
            for (int x = area.startChunkX(); x <= area.endChunkX(); x++) {
                ChunkKey key = new ChunkKey(x, z);
                List<PredictedDungeon> values = byChunk.get(key);

                if (values == null) {
                    dungeonChunkCache.put(key, List.of());
                } else {
                    dungeonChunkCache.put(key, List.copyOf(values));
                }

                scannedDungeonChunks.add(key);
            }
        }
    }

    private void applyCachedDungeonResults(DungeonScanArea requestedArea) {
        Map<BlockPos, PredictedDungeon> deduplicated = new HashMap<>();

        for (int z = requestedArea.startChunkZ(); z <= requestedArea.endChunkZ(); z++) {
            for (int x = requestedArea.startChunkX(); x <= requestedArea.endChunkX(); x++) {
                List<PredictedDungeon> dungeons = dungeonChunkCache.get(new ChunkKey(x, z));
                if (dungeons == null) continue;

                for (PredictedDungeon dungeon : dungeons) {
                    deduplicated.put(
                        new BlockPos(dungeon.x(), dungeon.y(), dungeon.z()),
                        dungeon
                    );
                }
            }
        }

        predictedDungeons.clear();
        predictedDungeons.addAll(deduplicated.values());

        invalidPredictedTargets.removeIf(pos -> predictedDungeons.stream().noneMatch(dungeon ->
            dungeon.x() == pos.getX()
                && dungeon.y() == pos.getY()
                && dungeon.z() == pos.getZ()
        ));

        MeteorClient.LOG.info(
            "[SpawnerHunt] Found {} cached/predicted dungeons within {} chunks of centerChunk {}, {}.",
            predictedDungeons.size(), activeDungeonScanRadius, activeDungeonScanChunkX, activeDungeonScanChunkZ
        );

        for (PredictedDungeon dungeon : predictedDungeons) {
            MeteorClient.LOG.debug(
                "[SpawnerHunt] {} dungeon at {}, {}, {} (chunk {}, {}).",
                dungeon.mob(), dungeon.x(), dungeon.y(), dungeon.z(), dungeon.chunkX(), dungeon.chunkZ()
            );
        }

        dualVerifiedSpawners.clear();
    }

    private void startPendingDungeonScan() {
        if (!pendingDungeonScan) return;

        int chunkX = pendingDungeonScanChunkX;
        int chunkZ = pendingDungeonScanChunkZ;
        String seed = pendingDungeonScanSeed;
        int radius = pendingDungeonScanRadius;

        pendingDungeonScan = false;
        pendingDungeonScanChunkX = Integer.MIN_VALUE;
        pendingDungeonScanChunkZ = Integer.MIN_VALUE;
        pendingDungeonScanSeed = null;
        pendingDungeonScanRadius = -1;

        if (seed == null) return;
        requestDungeonScan(chunkX, chunkZ, seed, radius);
    }

    private int resolveWorkerJavaVersion() {
        String version = SharedConstants.getCurrentVersion().id();
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("^(\\d+)\\.(\\d+)")
            .matcher(version);

        if (!matcher.find()) {
            throw new IllegalStateException("Unable to determine Minecraft version from: " + version);
        }

        int major = Integer.parseInt(matcher.group(1));
        int minor = Integer.parseInt(matcher.group(2));
        int workerVersion = major * 10000 + minor * 100;

        if (workerVersion != 260100 && workerVersion != 260200 && workerVersion != 260300) {
            throw new IllegalStateException(
                "Bundled dungeon worker supports Java 26.1, 26.2 and 26.3, but Minecraft is " + version
            );
        }

        return workerVersion;
    }

    private void SendDungeonPacket(double x, double y, double z) {
        if (mc.player == null) return;
        ServerboundMovePlayerPacket packet = new ServerboundMovePlayerPacket.Pos(x, y, z, mc.player.onGround(), true);
        mc.player.connection.send(packet);
    }



    private void handleRtpDigDown() {
        if (mc.player == null) return;

        if (mc.player.getBlockY() > maxYLevel.get()) {
            diggingDownForRtp = true;
            ticksBelowMaxY = 0;

            if (!PathManagers.get().isPathing() || !pathOwnedByModule) {
                BlockPos targetPos = new BlockPos(mc.player.getBlockX(), maxYLevel.get(), mc.player.getBlockZ());
                PathManagers.get().moveTo(targetPos, false);
                pathOwnedByModule = true;
            }
        } else {
            if (!diggingDownForRtp) {
                diggingDownForRtp = true;
                ticksBelowMaxY = 0;
            }

            stopOwnedPathing();
            ticksBelowMaxY++;

            if (ticksBelowMaxY >= 100) {
                if (rtpCooldown <= 0) {
                    diggingDownForRtp = false;
                    ticksBelowMaxY = 0;
                    rtpPlayer();
                }
            }
        }
    }

    private void handleTargetExploration() {
        if (mc.player == null || !BaritoneUtils.IS_AVAILABLE) return;

        int x = targetX.get();
        int z = targetZ.get();

        boolean alreadyTargeting = explorationTarget != null
            && explorationTarget.getX() == x
            && explorationTarget.getZ() == z;

        if (!alreadyTargeting || !PathManagers.get().isPathing()) {
            explorationTarget = new BlockPos(x, mc.player.getBlockY(), z);
            PathManagers.get().moveTo(explorationTarget, true);
            pathOwnedByModule = true;
        }
    }

    private static final int STUCK_CHECK_INTERVAL = 200;
    private static final int STUCK_CONFIRM_INTERVAL = 100;

    private BlockPos firstStuckCheckPos;
    private int stuckTimer;
    private boolean recoveryMineRangeActive;
    private boolean waitingForConfirmation;
    private boolean playerIsStuck;

    private void handleStuckDetection() {
        if (mc.player == null) return;

        BlockPos currentPos = mc.player.blockPosition();

        stuckTimer++;

        if (!waitingForConfirmation) {
            if (stuckTimer >= STUCK_CHECK_INTERVAL) {
                if (firstStuckCheckPos == null) {
                    firstStuckCheckPos = currentPos.immutable();
                    stuckTimer = 0;
                } else {
                    if (currentPos.equals(firstStuckCheckPos)) {
                        waitingForConfirmation = true;
                        stuckTimer = 0;
                    } else {
                        firstStuckCheckPos = currentPos.immutable();
                        stuckTimer = 0;
                        disableRecovery();
                    }
                }
            }
        } else {
            if (stuckTimer >= STUCK_CONFIRM_INTERVAL) {
                if (currentPos.equals(firstStuckCheckPos)) {
                    playerIsStuck = true;
                    MeteorClient.LOG.info("[SpawnerHunt] Player is stuck.");
                }

                waitingForConfirmation = false;
                stuckTimer = 0;
                firstStuckCheckPos = currentPos.immutable();
            }
        }
    }

    private final Set<BlockPos> unreachableSpawners = new HashSet<>();
    private int recoveryAttemptsForTarget;

    private void doRecovery() {
        if (recoveryMineRangeActive) return;
        if (currentTarget == null) {
            playerIsStuck = false;
            return;
        }

        recoveryAttemptsForTarget++;

        if (recoveryAttemptsForTarget >= 3 && currentTarget != null) {
            MeteorClient.LOG.warn("[SpawnerHunt] Giving up on spawner at {} after repeated stuck recovery.",
                currentTarget.toShortString());
            unreachableSpawners.add(currentTarget);
            currentTarget = null;
            playerIsStuck = false;
            stopOwnedPathing();
            recoveryAttemptsForTarget = 0;
            return;
        }

        recoveryMineRangeActive = true;
        playerIsStuck = false;
        MeteorClient.LOG.info("[SpawnerHunt] Recovery activated, forcing repath.");
        if (BaritoneUtils.IS_AVAILABLE) {
            PathManagers.get().stop();
            pathOwnedByModule = false;
        }
    }

    private void setCurrentTarget(BlockPos newTarget) {
        if (newTarget != null && !newTarget.equals(currentTarget)) {
            recoveryAttemptsForTarget = 0;
        }
        currentTarget = newTarget;
    }

    private void disableRecovery() {
        if (!recoveryMineRangeActive) return;

        recoveryMineRangeActive = false;
        playerIsStuck = false;

        MeteorClient.LOG.info("[SpawnerHunt] Recovery ended. Mine range restored.");
    }

    private void resetStuckDetection() {
        firstStuckCheckPos = null;
        stuckTimer = 0;
        waitingForConfirmation = false;
        playerIsStuck = false;

        disableRecovery();
    }

    private Vec3 rtpStartPos;
    private boolean waitingForTeleport;
    private boolean waitingForRtpGui;
    private int rtpGuiWaitTicks;
    private int rtpCooldown;

    private void handleRtpGui() {
        if (mc.player == null) return;
        if (mc.player.containerMenu == null) return;

        if (mc.player.containerMenu == mc.player.inventoryMenu) return;
        if (mc.player.containerMenu.slots.size() <= 27) return;

        rtpGuiWaitTicks++;
        int chestSlot = rtpChestSlot.get();

        if (rtpGuiWaitTicks < 10) return;

        InvUtils.click().slotId(chestSlot);

        waitingForRtpGui = false;
        waitingForTeleport = true;
        rtpGuiWaitTicks = 0;
    }

    private void rtpPlayer() {
        if (rtpCooldown > 0) return;
        if (waitingForRtpGui) return;
        if (waitingForTeleport) return;
        if (mc.player == null) return;

        rtpStartPos = mc.player.position();

        ChatUtils.sendPlayerMsg("/rtp");

        waitingForRtpGui = true;
        rtpCooldown = 250;
    }

    private void clearExploration() {
        explorationTarget = null;
    }

    private void beginPickupVerification(BlockPos target, int countBeforeMine) {
        pendingPickupTarget = target.immutable();
        expectedSpawnerItemCount = Math.max(0, countBeforeMine);
        pickupTicks = 0;
        pickupPathRefreshTicks = 0;
    }

    private void clearPickupVerification() {
        pendingPickupTarget = null;
        expectedSpawnerItemCount = 0;
        pickupTicks = 0;
        pickupPathRefreshTicks = 0;
    }

    private int countSpawnerItemsInInventory() {
        if (mc.player == null) return 0;

        int count = 0;

        for (int i = 0; i < mc.player.getInventory().getContainerSize(); i++) {
            ItemStack stack = mc.player.getInventory().getItem(i);
            if (isSpawnerItem(stack)) count += stack.getCount();
        }

        return count;
    }

    private ItemEntity findNearestSpawnerDrop() {
        if (mc.level == null || mc.player == null) return null;

        AABB searchBox = new AABB(mc.player.blockPosition()).inflate(PICKUP_SEARCH_RANGE);

        List<ItemEntity> drops = mc.level.getEntitiesOfClass(
            ItemEntity.class, searchBox, item -> isSpawnerItem(item.getItem())
        );

        ItemEntity nearest = null;
        double bestDistSq = Double.MAX_VALUE;

        for (ItemEntity drop : drops) {
            double distSq = mc.player.distanceToSqr(drop.getX(), drop.getY(), drop.getZ());
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                nearest = drop;
            }
        }

        return nearest;
    }

    private boolean isSpawnerItem(ItemStack stack) {
        if (stack == null || stack.isEmpty()) return false;
        return stack.getItem() == Blocks.SPAWNER.asItem();
    }

    private void updateMatchingSpawners() {
        List<String> filters = mobFilter.get();
        matchingSpawners.clear();

        if (filters.isEmpty()) return;

        Set<BlockPos> seenSpawners = new HashSet<>();

        for (BlockEntity blockEntity : Utils.blockEntities()) {
            if (!(blockEntity instanceof SpawnerBlockEntity spawner)) continue;

            BlockPos pos = spawner.getBlockPos().immutable();
            seenSpawners.add(pos);

            String entityId = resolveEntityId(spawner, pos);

            if (entityId != null && filters.contains(entityId)) {
                matchingSpawners.add(pos);
            }
        }

        fallbackEntityIdCache.keySet().removeIf(pos -> !seenSpawners.contains(pos));
    }

    private void updateDualVerifiedSpawners() {
        dualVerifiedSpawners.clear();

        if (predictedDungeons.isEmpty() || matchingSpawners.isEmpty() || mc.level == null) return;

        for (PredictedDungeon dungeon : predictedDungeons) {
            if (!matchesMobFilter(dungeon.mob())) continue;

            BlockPos pos = new BlockPos(dungeon.x(), dungeon.y(), dungeon.z());
            if (!matchingSpawners.contains(pos)) continue;
            if (!mc.level.getBlockState(pos).is(Blocks.SPAWNER)) continue;

            String actualEntityId = fallbackEntityIdCache.get(pos);
            String expectedEntityId = "minecraft:" + dungeon.mob().toLowerCase(java.util.Locale.ROOT);

            if (expectedEntityId.equals(actualEntityId)) {
                dualVerifiedSpawners.add(pos);
            }
        }
    }

    private BlockPos findNearestSpawner() {
        if (mc.player == null || mc.level == null) return null;

        BlockPos nearest = null;
        double nearestDistSq = Double.MAX_VALUE;

        if (detectionMethod.get() == DetectionMethod.ChunkbasePrediction) {
            for (PredictedDungeon dungeon : predictedDungeons) {
                BlockPos pos = new BlockPos(dungeon.x(), dungeon.y(), dungeon.z());
                if (invalidPredictedTargets.contains(pos)) continue;
                if (!matchesMobFilter(dungeon.mob())) continue;
                if (!mc.level.getWorldBorder().isWithinBounds(pos)) continue;

                double distSq = squaredDistanceTo(pos);
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearest = pos;
                }
            }
        } else {
            List<BlockPos> candidates = detectionMethod.get() == DetectionMethod.DualVerification
                ? dualVerifiedSpawners
                : matchingSpawners;

            for (BlockPos pos : candidates) {
                if (unreachableSpawners.contains(pos)) continue;
                if (!mc.level.getWorldBorder().isWithinBounds(pos)) continue;
                double distSq = squaredDistanceTo(pos);
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearest = pos;
                }
            }
        }

        return nearest;
    }

    private boolean isKnownTarget(BlockPos pos) {
        if (pos == null) return false;

        if (detectionMethod.get() == DetectionMethod.WorldScan) {
            return matchingSpawners.contains(pos);
        }

        if (detectionMethod.get() == DetectionMethod.DualVerification) {
            return dualVerifiedSpawners.contains(pos);
        }

        if (invalidPredictedTargets.contains(pos)) return false;

        for (PredictedDungeon dungeon : predictedDungeons) {
            if (dungeon.x() == pos.getX()
                && dungeon.y() == pos.getY()
                && dungeon.z() == pos.getZ()
                && matchesMobFilter(dungeon.mob())) {
                return true;
            }
        }

        return false;
    }

    private boolean matchesMobFilter(String mobName) {
        List<String> filters = mobFilter.get();
        if (filters.isEmpty()) return false;

        String entityId = "minecraft:" + mobName.toLowerCase(java.util.Locale.ROOT);
        return filters.contains(entityId);
    }

    private boolean shouldReroute(BlockPos candidate) {
        if (candidate == null || currentTarget == null || candidate.equals(currentTarget)) return false;

        double currentDistSq = squaredDistanceTo(currentTarget);
        double candidateDistSq = squaredDistanceTo(candidate);
        double advantageSq = rerouteAdvantage.get() * rerouteAdvantage.get();

        return candidateDistSq + advantageSq < currentDistSq;
    }

    private double squaredDistanceTo(BlockPos pos) {
        if (mc.player == null) return Double.MAX_VALUE;

        double x = pos.getX() + 0.5;
        double y = pos.getY() + 0.5;
        double z = pos.getZ() + 0.5;

        return mc.player.distanceToSqr(x, y, z);
    }

    private boolean isWithinMineRange(BlockPos pos) {
        double range = recoveryMineRangeActive ? 4.0 : mineRange.get();
        return squaredDistanceTo(pos) <= range * range;
    }

    private void pathToCurrentTarget() {
        if (currentTarget == null || !BaritoneUtils.IS_AVAILABLE) return;

        PathManagers.get().moveTo(currentTarget, ignoreY.get());
        pathOwnedByModule = true;
        ticksSincePathRefresh = 0;
    }

    private void stopOwnedPathing() {
        if (!pathOwnedByModule) return;
        if (BaritoneUtils.IS_AVAILABLE) PathManagers.get().stop();
        pathOwnedByModule = false;
    }

    private void mineTargetSpawner(BlockPos pos) {
        if (mc.level == null || !mc.level.getBlockState(pos).is(Blocks.SPAWNER)) return;

        FindItemResult tool = findMiningTool();

        if (requireSilkTouch.get() && !tool.found()) {
            if (silkWarningCooldown == 0) {
                MeteorClient.LOG.info("[SpawnerHunt] Reached spawner at {} but no Silk Touch pickaxe is in hotbar.", pos.toShortString());
                silkWarningCooldown = 40;
            }
            return;
        }

        if (tool.found() && !tool.isMainHand()) {
            InvUtils.swap(tool.slot(), false);
        }

        BlockUtils.breakBlock(pos, true);
    }

    private FindItemResult findMiningTool() {
        if (requireSilkTouch.get()) {
            return InvUtils.findInHotbar(this::isSilkTouchPickaxe);
        }

        return InvUtils.findInHotbar(stack -> stack.is(ItemTags.PICKAXES));
    }

    private boolean isSilkTouchPickaxe(ItemStack stack) {
        if (mc.level == null || !stack.is(ItemTags.PICKAXES)) return false;

        var enchantmentRegistry = mc.level.registryAccess().lookupOrThrow(Registries.ENCHANTMENT);
        return EnchantmentHelper.getItemEnchantmentLevel(enchantmentRegistry.getOrThrow(Enchantments.SILK_TOUCH), stack) > 0;
    }

    private String resolveEntityId(SpawnerBlockEntity spawner, BlockPos pos) {
        String fromSpawner = readEntityIdFromSpawner(spawner);
        if (fromSpawner != null) {
            fallbackEntityIdCache.put(pos, fromSpawner);
            return fromSpawner;
        }

        return fallbackEntityIdCache.get(pos);
    }

    private String readEntityIdFromSpawner(SpawnerBlockEntity spawner) {
        try {
            if (spawner.getSpawner().nextSpawnData == null) return null;
            CompoundTag entityTag = spawner.getSpawner().nextSpawnData.getEntityToSpawn();
            if (entityTag == null || !entityTag.contains("id")) return null;
            return entityTag.getString("id").orElse(null);
        } catch (Throwable ignored) {
            return null;
        }
    }

    @EventHandler
    private void onRender3d(Render3DEvent event) {
        if (mc.level == null || mc.player == null || RenderUtils.center == null) return;

        if (detectionMethod.get() == DetectionMethod.WorldScan) {
            for (BlockPos pos : matchingSpawners) {
                if (box.get()) {
                    event.renderer.box(pos, boxColor.get(), boxColor.get(), ShapeMode.Both, 0);
                }

                if (tracers.get()) {
                    double x = pos.getX() + 0.5;
                    double y = pos.getY() + 0.5;
                    double z = pos.getZ() + 0.5;

                    event.renderer.line(RenderUtils.center.x, RenderUtils.center.y, RenderUtils.center.z, x, y, z, tracerColor.get());
                }
            }
            return;
        }

        if (detectionMethod.get() == DetectionMethod.DualVerification) {
            for (BlockPos pos : dualVerifiedSpawners) {
                if (predictionBox.get()) {
                    event.renderer.box(pos, boxColor.get(), boxColor.get(), ShapeMode.Both, 0);
                }

                if (predictionTracers.get()) {
                    double x = pos.getX() + 0.5;
                    double y = pos.getY() + 0.5;
                    double z = pos.getZ() + 0.5;
                    event.renderer.line(RenderUtils.center.x, RenderUtils.center.y, RenderUtils.center.z, x, y, z, tracerColor.get());
                }
            }
            return;
        }

        // In Chunkbase mode these are predicted spawner coordinates, so render
        // them as the active targets rather than as the old method's results.
        for (PredictedDungeon dungeon : predictedDungeons) {
            if (!matchesMobFilter(dungeon.mob())) continue;

            BlockPos pos = new BlockPos(dungeon.x(), dungeon.y(), dungeon.z());

            if (predictionBox.get()) {
                event.renderer.box(pos, boxColor.get(), boxColor.get(), ShapeMode.Both, 0);
            }

            if (predictionTracers.get()) {
                double x = dungeon.x() + 0.5;
                double y = dungeon.y() + 0.5;
                double z = dungeon.z() + 0.5;
                event.renderer.line(RenderUtils.center.x, RenderUtils.center.y, RenderUtils.center.z, x, y, z, tracerColor.get());
            }
        }
    }
    private record PredictedDungeon(int x, int y, int z, String mob, int chunkX, int chunkZ) {
    }

    /**
     * JVM bridge for the supplied Chunkbase worker. This runs the original
     * JavaScript and WASM locally; it does not reimplement Minecraft terrain
     * or dungeon generation in Java.
     *
     * Required resources:
     *   /dungeon/BO7jce9YHoxA.js
     *   /dungeon/C4q1boG87vQ4.simd.wasm
     */
    private static final class ChunkbaseDungeonFinder implements AutoCloseable {
        private static final String WORKER_RESOURCE = "/dungeon/BO7jce9YHoxA.js";
        private static final String WASM_SIMD_RESOURCE = "/dungeon/C4q1boG87vQ4.simd.wasm";
        private static final String WASM_FALLBACK_RESOURCE = "/dungeon/BIhsZSp9IFGv.wasm";
        private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
            Thread thread = new Thread(r, "SpawnerHunt-DungeonFinder");
            thread.setDaemon(true);
            return thread;
        });

        // GraalJS does not provide the browser MessageChannel used by the
        // original worker. This scheduler is used to reproduce its
        // macrotask-style yield without re-entering JS concurrently.
        private final ScheduledExecutorService yieldExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "SpawnerHunt-JsYield");
            thread.setDaemon(true);
            return thread;
        });

        private final CompletableFuture<Void> initialization;
        private Context context;
        private Value findDungeonsFunction;

        ChunkbaseDungeonFinder() {
            initialization = CompletableFuture.runAsync(this::initialize, executor);
        }

        CompletableFuture<List<PredictedDungeon>> findDungeonsArea(
            long seed,
            int javaVersion,
            int startChunkX,
            int startChunkZ,
            int sizeX,
            int sizeZ
        ) {
            CompletableFuture<List<PredictedDungeon>> result = new CompletableFuture<>();

            initialization.whenComplete((ignored, initError) -> {
                if (initError != null) {
                    result.completeExceptionally(initError);
                    return;
                }

                executor.execute(() -> {
                    synchronized (ChunkbaseDungeonFinder.this) {
                        try {
                            Value promise = findDungeonsFunction.execute(
                                Long.toString(seed),
                                javaVersion,
                                startChunkX,
                                startChunkZ,
                                sizeX,
                                sizeZ
                            );

                            // getPois() is asynchronous in the original worker.
                            // Register a JS Promise callback and complete the Java
                            // future when the original worker resolves.
                            promise.invokeMember(
                                "then",
                                (ProxyExecutable) arguments -> {
                                    try {
                                        result.complete(decodeResults(arguments[0]));
                                    } catch (Throwable throwable) {
                                        result.completeExceptionally(throwable);
                                    }
                                    return null;
                                },
                                (ProxyExecutable) arguments -> {
                                    String message = "Unknown JavaScript error";
                                    String stack = "<no JavaScript stack available>";

                                    if (arguments.length > 0 && arguments[0] != null) {
                                        Value error = arguments[0];

                                        try {
                                            Value messageValue = error.getMember("message");
                                            if (messageValue != null && messageValue.isString()) {
                                                message = messageValue.asString();
                                            } else {
                                                message = error.toString();
                                            }
                                        } catch (Throwable messageReadError) {
                                            message = error.toString();
                                        }

                                        try {
                                            Value stackValue = error.getMember("stack");
                                            if (stackValue != null && stackValue.isString()) {
                                                stack = stackValue.asString();
                                            }
                                        } catch (Throwable stackReadError) {
                                            // Keep the fallback stack message.
                                        }
                                    }

                                    result.completeExceptionally(
                                        new RuntimeException(
                                            "Chunkbase worker rejected: " + message
                                                + "\nJavaScript stack:\n" + stack
                                        )
                                    );
                                    return null;
                                }
                            );
                        } catch (Throwable throwable) {
                            result.completeExceptionally(throwable);
                        }
                    }
                });
            });

            return result;
        }

        private void initialize() {
            try {
                byte[] wasmSimd = readResourceBytes(WASM_SIMD_RESOURCE);
                byte[] wasmFallback = readResourceBytes(WASM_FALLBACK_RESOURCE);
                String worker = readResourceText(WORKER_RESOURCE);

                // The original worker is browser-oriented. We keep its actual
                // generation logic but replace only the browser bootstrap pieces:
                //   - SIMD WASM URL -> in-memory ArrayBuffer
                //   - fallback WASM URL -> in-memory ArrayBuffer
                //   - self -> minimal object
                //   - Comlink endpoint export -> direct API export
                worker = patchWorker(worker, wasmSimd, wasmFallback);

                context = Context.newBuilder("js", "wasm")
                    .allowAllAccess(true)
                    .allowPolyglotAccess(PolyglotAccess.ALL)
                    .allowExperimentalOptions(true)
                    .option("js.webassembly", "true")
                    .build();

                // Expose a host-side scheduler before the worker is evaluated. The
                // patched hc() helper calls this with the Promise resolver.
                context.getBindings("js").putMember(
                    "__spawnHuntScheduleYield",
                    (ProxyExecutable) arguments -> {
                        if (arguments.length > 0 && arguments[0] != null) {
                            scheduleJsResume(arguments[0]);
                        }
                        return null;
                    }
                );

                String bootstrap = """
                    globalThis.self = globalThis.self || { addEventListener() {}, removeEventListener() {} };

                    %s

                    globalThis.__findDungeons = async function(seed, javaVersion, startChunkX, startChunkZ, sizeX, sizeZ) {
                        const startedAt = Date.now();
                        console.log("[SpawnerHunt] Chunkbase scan started");
                        const world = {
                            edition: "Java",
                            seed: String(seed),
                            javaVersion: javaVersion,
                            config: {
                                flat: false,
                                biomeSize: null,
                                largeBiomes: false
                            }
                        };

                        startChunkX = Math.trunc(Number(startChunkX));
                        startChunkZ = Math.trunc(Number(startChunkZ));
                        sizeX = Math.max(1, Math.trunc(Number(sizeX)));
                        sizeZ = Math.max(1, Math.trunc(Number(sizeZ)));

                        console.log(
                            "[SpawnerHunt] Chunkbase query: seed=" + String(seed) +
                            ", javaVersion=" + javaVersion +
                            ", startChunk=(" + startChunkX + ", " + startChunkZ + ")" +
                            ", size=" + sizeX + "x" + sizeZ
                        );

                        // The original Chunkbase worker initializes its WASM module
                        // through initWorker() before any API method is used.
                        // Our direct Java bridge bypasses the browser message handler,
                        // so perform that initialization explicitly here.
                        await globalThis.__chunkbaseApi.initWorker();

                        const raw = await globalThis.__chunkbaseApi.getPois(
                            world,
                            ["dungeon"],
                            startChunkX,
                            startChunkZ,
                            sizeX,
                            sizeZ
                        );

                        console.log("[SpawnerHunt] Chunkbase getPois completed in " + (Date.now() - startedAt) + " ms");
                        console.log("[SpawnerHunt] Chunkbase raw result: " + JSON.stringify(raw));

                        const dungeonChunks = raw?.dungeon ?? [];
                        if (!Array.isArray(dungeonChunks)) {
                            throw new TypeError(
                                "Chunkbase getPois returned an unexpected dungeon payload: " +
                                JSON.stringify(raw)
                            );
                        }

                        console.log(
                            "[SpawnerHunt] Chunkbase dungeon chunk groups returned: " + dungeonChunks.length
                        );

                        const names = { 0: "Zombie", 1: "Spider", 2: "Skeleton" };
                        const output = [];

                        for (const item of dungeonChunks) {
                            const chunkX = item[0];
                            const chunkZ = item[1];
                            for (const entry of (item[2] ?? [])) {
                                if (!Array.isArray(entry) || entry.length < 4) continue;
                                output.push({
                                    x: entry[0],
                                    y: entry[1],
                                    z: entry[2],
                                    mob: names[entry[3]] ?? ("Unknown (" + entry[3] + ")"),
                                    chunkX,
                                    chunkZ
                                });
                            }
                        }

                        return output;
                    };
                """.formatted(worker);

                context.eval(Source.newBuilder("js", bootstrap, "spawner-hunt-bootstrap.js").build());
                findDungeonsFunction = context.getBindings("js").getMember("__findDungeons");
            } catch (Throwable throwable) {
                throw new RuntimeException("Failed to initialise Chunkbase dungeon finder", throwable);
            }
        }

        private static String patchWorker(String worker, byte[] wasmSimd, byte[] wasmFallback) {
            String wasmSimdBase64 = Base64.getEncoder().encodeToString(wasmSimd);
            String wasmFallbackBase64 = Base64.getEncoder().encodeToString(wasmFallback);

            // Chunkbase deliberately ships two WASM builds:
            //   oc -> SIMD build
            //   Ss -> non-SIMD fallback build
            //
            // Keep these separate because the worker selects between them based
            // on WASM SIMD support.
            String replacement = "var oc = globalThis.__dungeonWasmSimd, Ss = globalThis.__dungeonWasmFallback;";

            worker = worker.replace(
                "var oc = \"/_astro/C4q1boG87vQ4.simd.wasm\",\n  Ss = \"/_astro/BIhsZSp9IFGv.wasm\";",
                replacement
            );

            // Minified/prettified variants may place these declarations on one line.
            worker = worker.replace(
                "var oc = \"/_astro/C4q1boG87vQ4.simd.wasm\", Ss = \"/_astro/BIhsZSp9IFGv.wasm\";",
                replacement
            );

            worker = worker.replace("li(wg);", "globalThis.__chunkbaseApi = wg;");

            // The original browser worker periodically yields through MessageChannel.
            // GraalJS has no browser MessageChannel, and Promise.resolve() is too weak
            // because it only creates a microtask continuation. Use a host-side scheduled
            // callback to emulate a real macrotask boundary.
            worker = worker.replace(
                "function hc() {\n  return new Promise((e) => {\n    const { port1: t, port2: n } = new MessageChannel();\n    ((t.onmessage = () => {\n      (t.close(), e());\n    }),\n      n.postMessage(null));\n  });\n}",
                "function hc() { return new Promise((resolve) => globalThis.__spawnHuntScheduleYield(resolve)); }"
            );

            String prefix = """
                globalThis.TextDecoder = class TextDecoder {
                    constructor(label = "utf-8", options = {}) {
                        this.encoding = String(label).toLowerCase();
                        this.fatal = Boolean(options.fatal);
                        this.ignoreBOM = Boolean(options.ignoreBOM);

                        if (this.encoding !== "utf-8" && this.encoding !== "utf8") {
                            throw new Error("SpawnerHunt TextDecoder only supports UTF-8");
                        }
                    }

                    decode(input = new Uint8Array(), options = {}) {
                        let bytes;

                        if (input instanceof ArrayBuffer) {
                            bytes = new Uint8Array(input);
                        } else if (ArrayBuffer.isView(input)) {
                            bytes = new Uint8Array(
                                input.buffer,
                                input.byteOffset,
                                input.byteLength
                            );
                        } else {
                            bytes = new Uint8Array(input);
                        }

                        const javaBytes = Java.to(Array.from(bytes), "byte[]");
                        const StringClass = Java.type("java.lang.String");
                        const StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

                        return new StringClass(
                            javaBytes,
                            StandardCharsets.UTF_8
                        );
                    }
                };

                globalThis.TextEncoder = class TextEncoder {
                    constructor() {
                        this.encoding = "utf-8";
                    }

                    encode(input = "") {
                        const StringClass = Java.type("java.lang.String");
                        const StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

                        const bytes = new StringClass(
                            String(input)
                        ).getBytes(StandardCharsets.UTF_8);

                        return new Uint8Array(Java.from(bytes));
                    }
                };

                globalThis.__dungeonWasmSimd = (() => {
                    const bytes = Java.type("java.util.Base64").getDecoder().decode("%s");
                    return new Uint8Array(Java.from(bytes)).buffer;
                })();

                globalThis.__dungeonWasmFallback = (() => {
                    const bytes = Java.type("java.util.Base64").getDecoder().decode("%s");
                    return new Uint8Array(Java.from(bytes)).buffer;
                })();

                globalThis.self = globalThis.self || {
                    addEventListener() {},
                    removeEventListener() {}
                };
                """.formatted(wasmSimdBase64, wasmFallbackBase64);

            return prefix + worker;
        }

        private void scheduleJsResume(Value resolver) {
            yieldExecutor.schedule(() -> {
                synchronized (ChunkbaseDungeonFinder.this) {
                    if (context == null) return;

                    context.enter();
                    try {
                        resolver.executeVoid();
                        // Entering/evaluating the context gives GraalJS a boundary at
                        // which queued Promise jobs can be processed.
                        context.eval("js", "0");
                    } catch (Throwable throwable) {
                        MeteorClient.LOG.error("[SpawnerHunt] JS yield callback failed", throwable);
                    } finally {
                        context.leave();
                    }
                }
            }, 1, TimeUnit.MILLISECONDS);
        }

        private static List<PredictedDungeon> decodeResults(Value array) {
            List<PredictedDungeon> result = new ArrayList<>();
            long size = array.getArraySize();

            for (long i = 0; i < size; i++) {
                Value value = array.getArrayElement(i);
                result.add(new PredictedDungeon(
                    value.getMember("x").asInt(),
                    value.getMember("y").asInt(),
                    value.getMember("z").asInt(),
                    value.getMember("mob").asString(),
                    value.getMember("chunkX").asInt(),
                    value.getMember("chunkZ").asInt()
                ));
            }

            return result;
        }

        private static byte[] readResourceBytes(String path) throws IOException {
            try (InputStream stream = ChunkbaseDungeonFinder.class.getResourceAsStream(path)) {
                if (stream == null) throw new IOException("Missing resource: " + path);
                return stream.readAllBytes();
            }
        }

        private static String readResourceText(String path) throws IOException {
            return new String(readResourceBytes(path), StandardCharsets.UTF_8);
        }

        @Override
        public void close() {
            yieldExecutor.shutdownNow();
            executor.shutdownNow();
            if (context != null) context.close();
        }
    }

}
