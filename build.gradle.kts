plugins {
    alias(libs.plugins.fabric.loom)
}

base {
    archivesName = properties["archives_base_name"] as String
    version = providers.gradleProperty("mod_version")
        .orElse(libs.versions.mod.version)
        .get()
    group = properties["maven_group"] as String
}

loom {
    accessWidenerPath.set(file("src/main/resources/hunters.accesswidener"))
}

repositories {
    mavenCentral()

    maven {
        name = "meteor-maven"
        url = uri("https://maven.meteordev.org/releases")
    }

    maven {
        name = "meteor-maven-snapshots"
        url = uri("https://maven.meteordev.org/snapshots")
    }
}

/*
 * Deliberately keep Graal off implementation/compileOnly.
 * Fabric Loom 1.16.3 attempts to process dependencies in those
 * configurations and currently trips over the Graal dependency tree.
 */
val graalCompile by configurations.creating

dependencies {
    minecraft(libs.minecraft)
    implementation(libs.fabric.loader)
    implementation(libs.meteor.client)

    graalCompile("org.graalvm.polyglot:polyglot:25.3.4.1")
    graalCompile("org.graalvm.polyglot:js:25.3.4.1")
    graalCompile("org.graalvm.polyglot:wasm:25.3.4.1")
}

graalCompile.resolvedConfiguration.resolvedArtifacts
    .filter { it.type == "jar" }
    .forEach {
        val id = it.moduleVersion.id

        dependencies.add(
            "include",
            "${id.group}:${id.name}:${id.version}"
        )
    }

java {
    toolchain {
        languageVersion.set(
            JavaLanguageVersion.of(libs.versions.jdk.get().toInt())
        )
    }
}

fun toMinecraftCompat(version: String): String {
    val match = Regex("""^(\d{2})\.([1-9]\d*)(?:\.([1-9]\d*))?$""")
        .matchEntire(version)
        ?: error("Invalid Minecraft version format: $version. Expected YY.D or YY.D.H")

    val (year, drop, _) = match.destructured
    return "~$year.$drop"
}

val graalJars = graalCompile.filter { it.extension == "jar" }


tasks {
    withType<JavaCompile>().configureEach {
        classpath = classpath.plus(graalJars)

        options.compilerArgs.addAll(
            listOf(
                "-Xlint:deprecation",
                "-Xlint:unchecked"
            )
        )
    }

    named<JavaExec>("runClient") {
        classpath(graalJars)
        jvmArgs("--add-modules=jdk.incubator.vector")
    }

    processResources {
        val propertyMap = mapOf(
            "version" to project.version,
            "minecraft_version" to toMinecraftCompat(libs.versions.minecraft.get()),
            "jdk_version" to libs.versions.jdk.get(),
        )

        inputs.properties(propertyMap)

        filesMatching("fabric.mod.json") {
            expand(propertyMap)
        }
    }

    jar {
        inputs.property("archivesName", project.base.archivesName.get())

        from("LICENSE") {
            rename { "${it}_${inputs.properties["archivesName"]}" }
        }
    }
}
