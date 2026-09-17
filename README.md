# Hunter

READ: (https://github.com/cee3ee/Hunting/issues/1)

An addon for [Meteor Client](https://github.com/MeteorDevelopment/meteor-client) focused on hunting spawners in Minecraft.

## Overview

Hunter is a Meteor Client addon that automates the process of finding, traveling to, and mining mob spawners. It integrates with Baritone for pathfinding and provides various exploration modes to help you locate spawners across the world.

## Features

* **SpawnerHunt Module**: The core module to automate spawner collection.
* **Mob Filtering**: Target specific spawner types (e.g., `minecraft:skeleton`, `minecraft:blaze`).
* **Baritone Integration**: Automatic pathing to detected spawners using Meteor's path manager.
* **Auto-Mining**: Automatically breaks spawners when in range with optional Silk Touch requirement.
* **Exploration Modes**:

  * **RTP**: Automatically uses `/rtp` and interacts with GUIs to find new areas when no spawners are nearby.
  * **Target Coordinates**: Paths towards specific X/Z coordinates to find spawners along the way.
* **Visuals**: Customizable tracers and boxes to highlight matching spawners.
* **Verification**: Confirms if the spawner was actually picked up after mining and attempts to collect dropped items.

## Requirements

* **Java**: JDK 25
* **GraalVM**: **GraalVM JDK 25 is very strongly recommended**, especially when using the Chunkbase/seed-based spawner detection. The mod uses GraalJS and WebAssembly for this feature, and GraalVM provides the intended runtime and significantly better performance than running it on a standard JDK.
* **Minecraft**: 26.1.2
* **Fabric Loader**: 0.19.2
* **Meteor Client**: 26.1.2-SNAPSHOT
* **Baritone**: Recommended for full automation features.

## GraalVM JDK 25 Setup

> **Very strongly recommended:** Use **GraalVM JDK 25** instead of a standard JDK 25 when running Hunter. The Chunkbase prediction system executes JavaScript and WebAssembly and benefits significantly from GraalVM's compiler/runtime.

### Download GraalVM

Download **GraalVM JDK 25** from the official Oracle GraalVM documentation:

* [Oracle GraalVM 25](https://docs.oracle.com/en/graalvm/jdk/25/)
* [GraalVM Windows installation guide](https://docs.oracle.com/en/graalvm/jdk/25/docs/getting-started/windows/)
* [GraalVM Linux installation guide](https://docs.oracle.com/en/graalvm/jdk/25/docs/getting-started/linux/)
* [GraalVM macOS installation guide](https://docs.oracle.com/en/graalvm/jdk/25/docs/getting-started/macos/)

Choose **GraalVM JDK 25** for your operating system and CPU architecture, then install or extract it normally.

### Windows

1. Download the Windows x64 GraalVM JDK 25 archive.
2. Extract it somewhere convenient, for example:

   ```text
   C:\Program Files\Java\graalvm-jdk-25
   ```
3. Open the Minecraft Launcher.
4. Go to **Installations** and edit the installation you use for Hunter.
5. Open **More Options**.
6. Set **Java Executable** to the GraalVM Java executable, for example:

   ```text
   C:\Program Files\Java\graalvm-jdk-25\bin\javaw.exe
   ```
7. Save the installation and launch Minecraft.

You can verify the installation from Command Prompt with:

```bat
java -version
```

Make sure the Java executable being used is the GraalVM JDK 25 installation.

### Prism Launcher

If you use [Prism Launcher](https://prismlauncher.org/):

1. Open your Minecraft instance settings.
2. Go to **Settings → Java**.
3. Select the GraalVM JDK 25 `javaw.exe` / `java` executable.
4. Apply the settings and launch the instance.

### Linux

Install or extract GraalVM JDK 25 and point your Minecraft instance or launcher to its `bin/java` executable.

For a terminal session, you can also set:

```bash
export JAVA_HOME=/path/to/graalvm-jdk-25
export PATH="$JAVA_HOME/bin:$PATH"
```

Then verify with:

```bash
java -version
```

### macOS

Install GraalVM JDK 25 and select its Java executable in your Minecraft launcher or instance manager.

The installed JDK is normally located under:

```text
/Library/Java/JavaVirtualMachines/<graalvm>/Contents/Home/
```

### Important

Hunter can run with a standard JDK 25, but **GraalVM JDK 25 is strongly recommended for the best performance**, particularly for the Chunkbase prediction/dungeon calculation system.

You do **not** need to bundle GraalVM inside the mod itself. Install it separately and configure Minecraft to use it.

## Setup & Run

### Building from Source

1. Clone the repository:

   ```bash
   git clone https://github.com/Meteor-Hunting/Hunting.git
   cd Hunting
   ```
2. Build the JAR:

   ```bash
   ./gradlew build
   ```

   The built JAR will be located in `build/libs/`.

### Development

To run the Minecraft client with the mod loaded for testing:

```bash
./gradlew runClient
```

## Scripts

* `gradlew build`: Compiles and packages the addon into a JAR file.
* `gradlew runClient`: Launches Minecraft with the addon and Meteor Client.
* `gradlew clean`: Cleans the build directory.

## Project Structure

```text
.
├── gradle/                  # Gradle wrapper and version catalog
│   └── libs.versions.toml   # Dependency versions
├── src/
│   └── main/
│       ├── java/
│       │   └── com/spawner/hunt/
│       │       ├── Hunters.java      # Main Addon Entry point
│       │       └── modules/
│       │           └── SpawnerHunt.java # Core logic
│       └── resources/
│           ├── assets/               # Mod assets (icons, etc.)
│           ├── fabric.mod.json       # Mod metadata
│           └── Hunters.accesswidener # Access Widener for Meteor internals
├── build.gradle.kts        # Build script
├── gradle.properties       # Build properties
└── LICENSE                 # CC0 License
```

## TODOs

* [ ] Add unit tests for spawner detection logic.
* [ ] Test new seed method of dungeon calculation wirh different anti esps
* [ ] Test on aternos server for anti cheat detections

## License

This project is licensed under the [CC0 1.0 Universal](LICENSE) license. Feel free to use it for your own projects.
