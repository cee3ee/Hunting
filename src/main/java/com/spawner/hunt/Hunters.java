package com.spawner.hunt;

import com.spawner.hunt.modules.SpawnerHunt;
import meteordevelopment.meteorclient.addons.MeteorAddon;
import meteordevelopment.meteorclient.systems.modules.Modules;

public class Hunters extends MeteorAddon {

    @Override
    public void onInitialize() {
        new GraalVMWarning();

        Modules.get().add(new SpawnerHunt());
    }

    @Override
    public String getPackage() {
        return "com.spawner.hunt";
    }
}
