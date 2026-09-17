# Hunter

An addon for [Meteor Client](https://github.com/MeteorDevelopment/meteor-client) focused on hunting mob spawners in Minecraft.

## Overview

Hunter is a Meteor Client addon designed to automate the process of finding, traveling to, and mining mob spawners.

It integrates with Baritone for pathfinding and includes multiple methods of locating spawners, including seed-based dungeon prediction using the Chunkbase dungeon finder.

## Features

* **SpawnerHunt Module**: Core module for automating spawner hunting.
* **Mob Filtering**: Target specific spawner types such as `minecraft:skeleton` or `minecraft:blaze`.
* **Chunkbase Dungeon Finder**: Uses the world seed to predict dungeon locations and locate potential spawners.
* **Baritone Integration**: Automatically path towards detected spawners.
* **Auto-Mining**: Automatically breaks spawners when in range.
* **Silk Touch Requirement**: Optional requirement before mining a spawner.
* **RTP Exploration**: Automatically uses `/rtp` and interacts with supported GUIs to discover new areas.
* **Target Coordinates**: Travel towards specific X/Z coordinates while scanning for spawners.
* **Visuals**: Customizable boxes and tracers for detected spawners.
* **Pickup Verification**: Verifies that a mined spawner was actually collected and attempts to collect dropped items.
* **First-Launch Runtime Check**: Warns the player if Minecraft is not running on the required GraalVM JDK 25 runtime.

> **Attribution:** Hunter's dungeon prediction functionality is based on work by the Chunk Base team and contributors. See [Credits & Attribution](#credits--attribution).


## Requirements

* **Minecraft**: 26.1.2
* **Java**: JDK 25
* **GraalVM JDK 25**: **Required for the Chunkbase/seed-based dungeon finder**
* **Fabric Loader**: 0.19.2
* **Meteor Client**: 26.1.2-SNAPSHOT
* **Baritone**: Recommended for pathfinding and automation.

### GraalVM is required for the Chunkbase finder

The Chunkbase dungeon finder uses the GraalVM Polyglot API to execute the JavaScript/WebAssembly components required for seed-based dungeon prediction.

A standard JDK 25 does **not** provide the required `org.graalvm.polyglot.Context` class.

Without GraalVM JDK 25:

* The Chunkbase dungeon finder will not initialise.
* Seed-based dungeon prediction will not work.
* Spawner scans that depend on the Chunkbase finder will fail.

Hunter detects this condition and displays a warning when Minecraft is first launched.

> **You can still launch Minecraft and use the rest of Hunter, but the Chunkbase/seed-based dungeon finder requires GraalVM JDK 25.**

## Installing GraalVM JDK 25

Download **GraalVM JDK 25** from Oracle's official documentation:

* [Oracle GraalVM JDK 25](https://docs.oracle.com/en/graalvm/jdk/25/)
* [Windows installation](https://docs.oracle.com/en/graalvm/jdk/25/docs/getting-started/windows/)
* [Linux installation](https://docs.oracle.com/en/graalvm/jdk/25/docs/getting-started/linux/)
* [macOS installation](https://docs.oracle.com/en/graalvm/jdk/25/docs/getting-started/macos/)

Install or extract GraalVM JDK 25 normally for your operating system.

## Configuring Minecraft to Use GraalVM

Installing GraalVM is not enough by itself. Minecraft must actually be configured to use the GraalVM Java executable.

### Official Minecraft Launcher

1. Open the Minecraft Launcher.
2. Open **Installations**.
3. Select the installation used for Hunter.
4. Click **Edit**.
5. Open **More Options**.
6. Find **Java Executable**.
7. Select the GraalVM JDK 25 Java executable.

For example, on Windows:

```text
C:\Program Files\Java\graalvm-jdk-25\bin\javaw.exe
```

Save the installation and launch Minecraft.

### Prism Launcher

If you use [Prism Launcher](https://prismlauncher.org/):

1. Open the Hunter instance.
2. Open **Edit Instance**.
3. Go to **Settings**.
4. Open the **Java** section.
5. Select the GraalVM JDK 25 Java executable.
6. Apply the changes.
7. Launch the instance.

## Verifying the Java Runtime

You can check your Java installation from a terminal.

### Windows

```bat
java -version
```

### Linux / macOS

```bash
java -version
```

You should see Java 25 and GraalVM information.

> **Important:** The `java` executable used in your terminal does not necessarily control Minecraft. The Java executable selected in your Minecraft launcher or instance settings is the one that matters.

## First Launch Warning

Hunter checks the runtime used by Minecraft when the addon starts.

If GraalVM JDK 25 is not available, Hunter displays a warning explaining that the Chunkbase dungeon finder will not work correctly.

The warning is displayed once and is stored in the Hunter configuration directory so that it does not appear on every launch.

The warning can be reset by deleting the generated warning file from:

```text
config/hunter/
```

## Setup & Run

### Building from Source

Clone the repository:

```bash
git clone https://github.com/cee3ee/Hunting.git
cd Hunting
```

Build the addon:

```bash
./gradlew build
```

The compiled JAR will be placed in:

```text
build/libs/
```

### Development

To launch a development Minecraft instance:

```bash
./gradlew runClient
```

Make sure your development environment is using **JDK 25**. GraalVM JDK 25 is recommended for testing the full Chunkbase functionality.

## Scripts

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `./gradlew build`     | Compile and package the addon    |
| `./gradlew runClient` | Launch Minecraft with the addon  |
| `./gradlew clean`     | Clean the Gradle build directory |

## Project Structure

```text
.
├── gradle/
│   └── libs.versions.toml
├── src/
│   └── main/
│       ├── java/
│       │   └── com/spawner/hunt/
│       │       ├── Hunters.java
│       │       ├── GraalVMWarning.java
│       │       └── modules/
│       │           └── SpawnerHunt.java
│       └── resources/
│           ├── assets/
│           ├── fabric.mod.json
│           └── Hunters.accesswidener
├── build.gradle.kts
├── gradle.properties
└── LICENSE
```

## Troubleshooting

### `NoClassDefFoundError: org/graalvm/polyglot/Context`

Example:

```text
java.lang.NoClassDefFoundError: org/graalvm/polyglot/Context
```

This means the Minecraft instance is not running with the GraalVM Polyglot runtime required by the Chunkbase dungeon finder.

Install GraalVM JDK 25 and make sure the Minecraft installation is configured to use its Java executable.

### The warning still appears after installing GraalVM

Make sure Minecraft is actually using GraalVM rather than another Java 25 installation.

For example, having both:

```text
C:\Program Files\Java\jdk-25
C:\Program Files\Java\graalvm-jdk-25
```

installed is fine, but Minecraft must be configured to use the second one.

### Dungeon finder keeps failing

Check the log for:

```text
Failed to initialise Chunkbase dungeon finder
```

and:

```text
org.graalvm.polyglot.Context
```

If those errors are present, verify the Minecraft Java executable first.

## TODO

* [ ] Add unit tests for spawner detection logic.
* [ ] Test the new dungeon calculation method with different anti-cheat configurations.
* [ ] Test on Aternos servers for anti-cheat detections.
* [ ] Improve first-launch GraalVM setup screen.
* [ ] Add a direct "Install GraalVM" button to the runtime warning.

## Credits & Attribution

Hunter's seed-based dungeon detection is based on and inspired by the work of **Chunk Base** and its **Dungeon Finder**:

* **Chunk Base** — https://www.chunkbase.com/
* **Chunk Base Dungeon Finder** — https://www.chunkbase.com/apps/dungeon-finder

The developers and contributors behind Chunk Base deserve credit for the original dungeon-finding research, implementation, and supporting work that makes this functionality possible.

Additional contributors credited by Chunk Base for work used across its apps include:

* **amidst contributors** — biome colours
* **Earthcomputer** — `bedrockified`
* **protolambda** — slime chunk algorithm research
* **jocopa3** — slime chunk algorithm research
* **depressed-pho** — JavaScript porting work

Hunter is an independent project and is **not affiliated with, endorsed by, or officially associated with Chunk Base**.

For the original credits and attribution, see the [Chunk Base Dungeon Finder](https://www.chunkbase.com/apps/dungeon-finder).

## License

## License

This project is licensed under the [CC0 1.0 Universal](LICENSE) license.

Feel free to use, modify, and distribute the project for your own purposes.
