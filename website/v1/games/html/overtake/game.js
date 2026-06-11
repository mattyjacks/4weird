"use strict";
(() => {
    const ROAD_WIDTH = 2000;
    const SEGMENT_LENGTH = 200;
    const RUMBLE_LENGTH = 3;
    const LANES = 3;
    const DRAW_DISTANCE = 240;
    const FINISH_LINE_SEGMENT = 0;
    const FINISH_LINE_LENGTH_SEGMENTS = 4;
    const FINISH_LINE_ROWS = 4;
    const FINISH_LINE_COLUMNS = 14;
    const MINI_MAP_ROUTE_FILL = 0.78;
    const FIRST_LEVEL_ID = "desert";
    const SECOND_LEVEL_ID = "urban";
    const THIRD_LEVEL_ID = "night";
    const TEST_LEVEL_ID = "test";
    const SHOW_TITLE_IMAGE_IN_MENUS = false;
    const LEVEL_ORDER = [FIRST_LEVEL_ID, SECOND_LEVEL_ID, THIRD_LEVEL_ID];
    const COUNTDOWN_LABELS = ["3", "2", "1", "GO!"];
    const COUNTDOWN_STEP_SECONDS = 0.5;
    const COUNTDOWN_TOTAL_SECONDS = COUNTDOWN_LABELS.length * COUNTDOWN_STEP_SECONDS;
    const CAMERA_HEIGHT = 1000;
    const FIELD_OF_VIEW = 100;
    const CAMERA_DEPTH = 1 / Math.tan((FIELD_OF_VIEW / 2) * (Math.PI / 180));
    const NITRO_ZOOM_CAMERA_SCALE = 0.82;
    const NITRO_ZOOM_PLAYER_SCALE = 0.9;
    const NITRO_ZOOM_PLAYER_LIFT_RATIO = 0.1;
    const NITRO_ZOOM_IN_RATE = 8;
    const NITRO_ZOOM_OUT_RATE = 5;
    const PLAYER_VISUAL_LATERAL_SMOOTHING = 18;
    const BASE_MAX_SPEED = 7200;
    const ACCEL = 5600;
    const BRAKE = 9000;
    const DECEL = 3200;
    const OFFROAD_DECEL = 5200;
    const OFFROAD_MAX_SPEED_RATIO = 0.5;
    const TURN_DECEL = 2200;
    const TURN_THROTTLE_FACTOR = 0.12;
    const STEERING = 2.45;
    const CAR_ASSET_WIDTH = 352;
    const CAR_ASSET_HEIGHT = 184;
    const CAR_SIZE_SCALE = 1.1;
    const PLAYER_MAX_SCREEN_WIDTH_RATIO = 0.31 * CAR_SIZE_SCALE;
    const PLAYER_MAX_SCREEN_WIDTH = 404 * CAR_SIZE_SCALE;
    const PLAYER_ROAD_WIDTH = 0.46 * CAR_SIZE_SCALE;
    const ROADSIDE_PROP_MOTION_STREAK_MAX = 8;
    const CAR_MOTION_STREAK_MAX = 11;
    const CAR_MOTION_STREAK_COPIES = 4;
    const OPPONENT_ROAD_WIDTH = 0.44 * CAR_SIZE_SCALE;
    const COLLISION_DEPTH = 154 * CAR_SIZE_SCALE;
    const COLLISION_SEPARATION = COLLISION_DEPTH + 2;
    const PLAYER_REAR_END_SPEED_LOSS = 0.3;
    const OPPONENT_REAR_END_SPEED_LOSS = 0.68;
    const OPPONENT_REAR_END_STUN = 0.45;
    const PLAYER_COLLISION_COOLDOWN = 0.34;
    const OPPONENT_LOOKAHEAD_DISTANCE = 760;
    const OPPONENT_PASS_COMMIT_DISTANCE = 420;
    const OPPONENT_SAFE_REAR_GAP = 230 * CAR_SIZE_SCALE;
    const OPPONENT_SAFE_FRONT_GAP = 360 * CAR_SIZE_SCALE;
    const OPPONENT_LANE_CLEARANCE = 0.5 * CAR_SIZE_SCALE;
    const OPPONENT_FOLLOW_SPEED_RATIO = 0.88;
    const OPPONENT_OVERTAKE_LOCK_TIME = 1.15;
    const OPPONENT_NEAR_CLIP = COLLISION_DEPTH;
    const OPPONENT_SPRITE_SCALE = 0.92 * CAR_SIZE_SCALE;
    const OPPONENT_MAX_SCREEN_WIDTH_RATIO = 0.3 * CAR_SIZE_SCALE;
    const OPPONENT_MAX_SCREEN_WIDTH = 390 * CAR_SIZE_SCALE;
    const OPPONENT_MAX_PLAYER_WIDTH_RATIO = 0.92;
    const ROAD_CURVE_TURN_FACTOR = 0.42;
    const MAX_TURN_SPEED_REDUCTION = 0.08;
    const PLAYER_REAR_HIT_SPEED_RETENTION = 0.96;
    const FIRST_LEVEL_OPPONENT_MAX_SPEED_RATIO = 0.8;
    const FIRST_LEVEL_AHEAD_OPPONENT_SPEED_RATIO = 0.75;
    const SECOND_LEVEL_OPPONENT_MAX_SPEED_RATIO = 0.9;
    const SECOND_LEVEL_AHEAD_OPPONENT_SPEED_RATIO = 0.85;
    const THIRD_LEVEL_OPPONENT_MAX_SPEED_RATIO = 0.95;
    const THIRD_LEVEL_AHEAD_OPPONENT_SPEED_RATIO = 0.9;
    const NITRO_MAX = 100;
    const NITRO_TOP_SPEED = 1.24;
    const NITRO_ACCEL = 1.82;
    const NITRO_DRAIN = 34;
    const NITRO_REGEN = 8;
    const NITRO_START_THRESHOLD = 25;
    const SHIELD_DURATION = 6;
    const POWERUP_RESPAWN = 12;
    const AIRSTRIKE_WINDUP = 0.95;
    const AIRSTRIKE_DURATION = 1.85;
    const AIRSTRIKE_STUN = 1.25;
    const POWERUP_FLAGS = {
        nitro: true,
        shield: false,
        airstrike: false,
    };
    const POWERUP_SLOT_SPACING = 26;
    const POWERUP_SLOT_CHANCE = 0.55;
    const POWERUP_KIND_POOL = ["nitro", "nitro", "shield", "airstrike", "shield", "airstrike", "shield"];
    const DEBUG_COIN_GRANT = 5000;
    const ASSET_BASE_URL = "https://overtake-assets.vercel.app/";
    const MENU_TITLE_ASSET = "menu/title.png";
    const NIGHT_BACKGROUND_BUILDINGS_ASSET = "night_map/sky_neon_background_buildings.png";
    const NITRO_POWERUP_ASSET = "items/no2-transparent.png";
    const ASSETS = [
        { file: "cars/car_comet_90_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Comet 90 car back view" },
        { file: "cars/car_veloce_s_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Veloce S car back view" },
        { file: "cars/car_strada_gt_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Strada GT car back view" },
        { file: "cars/car_nx_prototype_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "NX Prototype car back view" },
        { file: "desert_map/sky_desert_sunset.png", width: 1024, height: 512, role: "desert sunset sky" },
        { file: "desert_map/cactus_column.png", width: 270, height: 506, role: "desert roadside cactus" },
        { file: "desert_map/tree_palm.png", width: 470, height: 769, role: "desert roadside palm" },
        { file: "desert_map/desert_rock.png", width: 445, height: 278, role: "desert roadside rock" },
        { file: "desert_map/billboard_checkpoint.png", width: 445, height: 227, role: "desert roadside billboard" },
        { file: "urban_map/sky_urban_day.png", width: 1024, height: 512, role: "urban daytime sky" },
        { file: "urban_map/building_glass_tower.png", width: 324, height: 607, role: "urban roadside building" },
        { file: "urban_map/building_brick_block.png", width: 496, height: 607, role: "urban roadside building" },
        { file: "urban_map/tree_urban.png", width: 364, height: 607, role: "urban roadside tree" },
        { file: "urban_map/roadside_lamp.png", width: 99, height: 342, role: "urban roadside lamp" },
        { file: "urban_map/billboard_checkpoint.png", width: 445, height: 227, role: "urban roadside billboard" },
        { file: "night_map/sky_neon_night.png", width: 1024, height: 512, role: "night city sky" },
        { file: "night_map/building_neon_tower.png", width: 323, height: 607, role: "night roadside building" },
        { file: "night_map/building_neon_sign.png", width: 432, height: 251, role: "night roadside sign" },
        { file: "night_map/roadside_lamp.png", width: 99, height: 342, role: "night roadside lamp" },
        { file: "night_map/building_glass_tower.png", width: 324, height: 607, role: "night roadside building" },
        { file: "night_map/billboard_checkpoint.png", width: 445, height: 227, role: "night roadside billboard" },
        { file: NIGHT_BACKGROUND_BUILDINGS_ASSET, width: 1774, height: 887, role: "night distant skyline" },
        { file: "training_map/sky_urban_day.png", width: 1024, height: 512, role: "training daytime sky" },
        { file: "training_map/building_glass_tower.png", width: 324, height: 607, role: "training roadside building" },
        { file: "training_map/building_brick_block.png", width: 496, height: 607, role: "training roadside building" },
        { file: "training_map/tree_urban.png", width: 364, height: 607, role: "training roadside tree" },
        { file: "training_map/roadside_lamp.png", width: 99, height: 342, role: "training roadside lamp" },
        { file: "training_map/billboard_checkpoint.png", width: 445, height: 227, role: "training roadside billboard" },
        { file: NITRO_POWERUP_ASSET, width: 1536, height: 1024, role: "nitro powerup bottle" },
    ];
    const ASSET_BY_FILE = Object.fromEntries(ASSETS.map((asset) => [asset.file, asset]));
    function getAssetUrl(path) {
        const normalizedPath = path
            .replace(/^(?:\.\/)?assets\//, "")
            .replace(/^\/+/, "");
        return `${ASSET_BASE_URL}${normalizedPath}`;
    }
    const CAR_ORDER = ["starter", "street", "gt", "prototype"];
    const CARS = {
        starter: {
            id: "starter",
            label: "Comet 90",
            price: 0,
            maxSpeed: 0.84,
            displayTopSpeed: 165,
            accel: 0.92,
            grip: 1.04,
            nitro: 0.9,
            asset: "cars/car_comet_90_back_view.png",
            color: "#d82e3f",
        },
        street: {
            id: "street",
            label: "Veloce S",
            price: 700,
            maxSpeed: 1,
            displayTopSpeed: 230,
            accel: 1.02,
            grip: 1.02,
            nitro: 1,
            asset: "cars/car_veloce_s_back_view.png",
            color: "#1f62d0",
        },
        gt: {
            id: "gt",
            label: "Strada GT",
            price: 1700,
            maxSpeed: 1.13,
            displayTopSpeed: 300,
            accel: 1.08,
            grip: 0.99,
            nitro: 1.08,
            asset: "cars/car_strada_gt_back_view.png",
            color: "#ffd337",
        },
        prototype: {
            id: "prototype",
            label: "NX Prototype",
            price: 3400,
            maxSpeed: 1.24,
            displayTopSpeed: 380,
            accel: 1.14,
            grip: 0.96,
            nitro: 1.14,
            asset: "cars/car_nx_prototype_back_view.png",
            color: "#d8dde5",
        },
    };
    const MAPS = [
        {
            id: "desert",
            name: "Desert Run",
            label: "Starter cup",
            sky: "desert_map/sky_desert_sunset.png",
            seed: 101,
            curvePull: 0.52,
            skyline: "desert",
            laps: 3,
            reward: 450,
            recommendedCar: "starter",
            opponentCars: ["starter", "starter", "starter", "starter", "street"],
            palette: {
                grass1: "#d6a75d",
                grass2: "#c9944c",
                rumble1: "#f7e0a3",
                rumble2: "#cf6046",
                road1: "#4f4d4b",
                road2: "#454442",
                lane1: "#fbecc4",
                lane2: "#cab88b",
                horizon: "#f2b16d",
            },
            miniMapRoute: [
                { x: 0.42, y: 0.86 },
                { x: 0.2, y: 0.72 },
                { x: 0.14, y: 0.5 },
                { x: 0.28, y: 0.34 },
                { x: 0.24, y: 0.16 },
                { x: 0.62, y: 0.14 },
                { x: 0.82, y: 0.28 },
                { x: 0.7, y: 0.46 },
                { x: 0.86, y: 0.64 },
                { x: 0.62, y: 0.82 },
            ],
            decorations: {
                primary: ["desert_map/cactus_column.png", "desert_map/tree_palm.png"],
                secondary: ["desert_map/desert_rock.png", "desert_map/billboard_checkpoint.png"],
                every: 8,
                secondaryEvery: 41,
                baseScale: 1.9,
                farOffset: 2.35,
            },
            sections: [
                { enter: 20, hold: 34, leave: 20, curve: 0, hill: 0 },
                { enter: 18, hold: 40, leave: 18, curve: -0.68, hill: 460 },
                { enter: 18, hold: 38, leave: 18, curve: 0.74, hill: -360 },
                { enter: 20, hold: 42, leave: 20, curve: -0.82, hill: 260 },
                { enter: 24, hold: 36, leave: 24, curve: 0, hill: -280 },
                { enter: 18, hold: 38, leave: 18, curve: 0.76, hill: 220 },
                { enter: 18, hold: 36, leave: 18, curve: -0.58, hill: -200 },
                { enter: 20, hold: 42, leave: 20, curve: 0.44, hill: 0 },
            ],
        },
        {
            id: "urban",
            name: "Urban Sprint",
            label: "Street cup",
            sky: "urban_map/sky_urban_day.png",
            seed: 202,
            curvePull: 0.66,
            skyline: "urban",
            laps: 5,
            reward: 950,
            recommendedCar: "street",
            opponentCars: ["starter", "street", "starter", "street", "gt"],
            palette: {
                grass1: "#4d7867",
                grass2: "#416b62",
                rumble1: "#f8f8f0",
                rumble2: "#da4141",
                road1: "#343c45",
                road2: "#2f3741",
                lane1: "#f5d86b",
                lane2: "#d8c054",
                horizon: "#9dcfd7",
            },
            miniMapRoute: [
                { x: 0.18, y: 0.8 },
                { x: 0.18, y: 0.25 },
                { x: 0.35, y: 0.25 },
                { x: 0.35, y: 0.12 },
                { x: 0.72, y: 0.12 },
                { x: 0.72, y: 0.32 },
                { x: 0.88, y: 0.32 },
                { x: 0.88, y: 0.72 },
                { x: 0.66, y: 0.72 },
                { x: 0.66, y: 0.88 },
                { x: 0.42, y: 0.88 },
                { x: 0.42, y: 0.68 },
            ],
            decorations: {
                primary: ["urban_map/building_glass_tower.png", "urban_map/building_brick_block.png", "urban_map/tree_urban.png"],
                secondary: ["urban_map/roadside_lamp.png", "urban_map/billboard_checkpoint.png"],
                every: 6,
                secondaryEvery: 29,
                baseScale: 1.9,
                farOffset: 2.65,
            },
            sections: [
                { enter: 18, hold: 30, leave: 18, curve: 0, hill: 0 },
                { enter: 18, hold: 34, leave: 18, curve: 0.88, hill: 420 },
                { enter: 16, hold: 34, leave: 16, curve: -0.96, hill: -320 },
                { enter: 20, hold: 36, leave: 20, curve: 0.72, hill: 220 },
                { enter: 18, hold: 36, leave: 18, curve: -1.08, hill: -320 },
                { enter: 18, hold: 34, leave: 18, curve: 0.92, hill: 180 },
                { enter: 20, hold: 42, leave: 20, curve: 0, hill: 0 },
                { enter: 16, hold: 32, leave: 16, curve: -0.76, hill: 160 },
                { enter: 18, hold: 30, leave: 18, curve: 0.42, hill: 0 },
            ],
        },
        {
            id: "night",
            name: "Neon Night",
            label: "GT cup",
            sky: "night_map/sky_neon_night.png",
            seed: 303,
            curvePull: 0.82,
            skyline: "night",
            laps: 7,
            reward: 1700,
            recommendedCar: "gt",
            opponentCars: ["starter", "street", "gt", "prototype", "street", "gt", "prototype", "prototype"],
            palette: {
                grass1: "#151a2a",
                grass2: "#0f1423",
                rumble1: "#6ff2ff",
                rumble2: "#ff4fd8",
                road1: "#242332",
                road2: "#1c1d2a",
                lane1: "#f8f25a",
                lane2: "#7ceeff",
                horizon: "#171b35",
            },
            miniMapRoute: [
                { x: 0.5, y: 0.88 },
                { x: 0.24, y: 0.8 },
                { x: 0.12, y: 0.62 },
                { x: 0.34, y: 0.58 },
                { x: 0.18, y: 0.4 },
                { x: 0.32, y: 0.2 },
                { x: 0.58, y: 0.14 },
                { x: 0.5, y: 0.34 },
                { x: 0.82, y: 0.28 },
                { x: 0.9, y: 0.5 },
                { x: 0.68, y: 0.56 },
                { x: 0.84, y: 0.72 },
                { x: 0.66, y: 0.88 },
            ],
            decorations: {
                primary: ["night_map/building_neon_tower.png", "night_map/building_neon_sign.png", "night_map/roadside_lamp.png"],
                secondary: ["night_map/building_glass_tower.png", "night_map/billboard_checkpoint.png"],
                every: 5,
                secondaryEvery: 23,
                baseScale: 2.1,
                farOffset: 2.82,
            },
            sections: [
                { enter: 16, hold: 28, leave: 16, curve: -0.92, hill: 0 },
                { enter: 16, hold: 30, leave: 16, curve: 1.18, hill: 620 },
                { enter: 16, hold: 28, leave: 16, curve: -1.28, hill: -520 },
                { enter: 18, hold: 30, leave: 18, curve: 1.34, hill: 360 },
                { enter: 16, hold: 30, leave: 16, curve: -1.12, hill: -460 },
                { enter: 18, hold: 32, leave: 18, curve: 0.88, hill: 220 },
                { enter: 20, hold: 34, leave: 20, curve: 0, hill: -220 },
                { enter: 16, hold: 28, leave: 16, curve: -0.62, hill: 0 },
                { enter: 18, hold: 30, leave: 18, curve: 0.56, hill: 0 },
            ],
        },
        {
            id: "test",
            name: "Training Map",
            label: "Training",
            sky: "training_map/sky_urban_day.png",
            seed: 404,
            curvePull: 0.7,
            skyline: "urban",
            laps: 3,
            reward: 200,
            recommendedCar: "starter",
            opponentCars: ["starter", "street", "gt", "prototype"],
            palette: {
                grass1: "#285b48",
                grass2: "#234f42",
                rumble1: "#ffffff",
                rumble2: "#d82e3f",
                road1: "#3b4047",
                road2: "#333941",
                lane1: "#ffcf42",
                lane2: "#e5b83b",
                horizon: "#9dcfd7",
            },
            miniMapRoute: [
                { x: 0.5, y: 0.08 },
                { x: 0.68, y: 0.12 },
                { x: 0.82, y: 0.24 },
                { x: 0.92, y: 0.5 },
                { x: 0.82, y: 0.76 },
                { x: 0.68, y: 0.88 },
                { x: 0.5, y: 0.92 },
                { x: 0.32, y: 0.88 },
                { x: 0.18, y: 0.76 },
                { x: 0.08, y: 0.5 },
                { x: 0.18, y: 0.24 },
                { x: 0.32, y: 0.12 },
            ],
            decorations: {
                primary: ["training_map/building_glass_tower.png", "training_map/building_brick_block.png", "training_map/tree_urban.png"],
                secondary: ["training_map/roadside_lamp.png", "training_map/billboard_checkpoint.png"],
                every: 6,
                secondaryEvery: 29,
                baseScale: 1.9,
                farOffset: 2.65,
            },
            sections: [
                { enter: 0, hold: 360, leave: 0, curve: 0.72, hill: 0 },
            ],
        },
    ];
    const LANE_OFFSETS = [-0.56, 0, 0.56];
    const canvas = requireElement("#gameCanvas");
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context is unavailable.");
    }
    const ctx = context;
    const miniMapCanvas = requireElement("#miniMapCanvas");
    const miniMapContext = miniMapCanvas.getContext("2d");
    if (!miniMapContext) {
        throw new Error("Minimap canvas 2D context is unavailable.");
    }
    const mapCtx = miniMapContext;
    const app = requireElement("#app");
    app.style.setProperty("--menu-title-image", `url("${getAssetUrl(MENU_TITLE_ASSET)}")`);
    const loadingScreen = requireElement("#loadingScreen");
    const loadingPercent = requireElement("#loadingPercent");
    const loadingFill = requireElement("#loadingFill");
    const menuPanel = requireElement("#menuPanel");
    const menuContent = requireElement("#menuContent");
    const backButton = requireElement("#backButton");
    const resumeButton = requireElement("#resumeButton");
    const panelStatus = requireElement("#panelStatus");
    const raceMessage = requireElement("#raceMessage");
    const raceMessageTitle = requireElement("#raceMessageTitle");
    const raceMessageBody = requireElement("#raceMessageBody");
    const countdownOverlay = requireElement("#countdownOverlay");
    const hudSpeed = requireElement("#hudSpeed");
    const hudNitro = requireElement("#hudNitro");
    const hudNitroFill = requireElement("#hudNitroFill");
    const nitroMeter = requireElement("#nitroMeter");
    const hudLap = requireElement("#hudLap");
    const hudPlace = requireElement("#hudPlace");
    const hudTimer = requireElement("#hudTimer");
    const hudRouteItem = requireElement("#hudRouteItem");
    const hudRoute = requireElement("#hudRoute");
    const raceTimer = requireElement("#raceTimer");
    const mapStats = requireElement("#mapStats");
    const driveHud = requireElement("#driveHud");
    const pauseButton = requireElement("#pauseButton");
    const touchControls = requireElement("#touchControls");
    const touchLeft = requireElement("#touchLeft");
    const touchRight = requireElement("#touchRight");
    const touchBrake = requireElement("#touchBrake");
    const touchNitro = requireElement("#touchNitro");
    const keys = new Set();
    const TOUCH_CONTROL_KEYS = ["arrowleft", "arrowright", "arrowdown", "n"];
    const UI_BUTTON_CLICK_SELECTOR = "button, .option-button";
    const GAME_BUTTON_SELECTOR = "#touchControls button, .touch-button";
    const UI_BUTTON_CLICK_ASSET = getAssetUrl("sounds/ui-click.wav");
    const UI_BUTTON_CLICK_VOLUME = 0.5;
    const UI_BUTTON_CLICK_POOL_SIZE = 5;
    const MAP_BGM_ASSETS = {
        [FIRST_LEVEL_ID]: getAssetUrl("sounds/bgm/first_map_bgm.mp3"),
        [SECOND_LEVEL_ID]: getAssetUrl("sounds/bgm/second_map_bgm.mp3"),
        [THIRD_LEVEL_ID]: getAssetUrl("sounds/bgm/third_map_bgm.mp3"),
        [TEST_LEVEL_ID]: getAssetUrl("sounds/bgm/test_map_bgm.mp3"),
    };
    const CALM_BGM_ASSET = getAssetUrl("sounds/bgm/calm_bgm.mp3");
    const CALM_BGM_START = 2.5;
    const DEFAULT_BGM_VOLUME = 0.42;
    const DEFAULT_CAR_SOUND_VOLUME = 1;
    const ENGINE_SOUND_ASSET = getAssetUrl("sounds/engine-revving-long.mp3");
    const ENGINE_LOOP_START = 4;
    const ENGINE_LOOP_END = 38;
    const ENGINE_IDLE_VOLUME = 0.045;
    const ENGINE_MAX_VOLUME = 0.36;
    const ENGINE_IDLE_RATE = 0.65;
    const ENGINE_MAX_RATE = 1.45;
    const ENGINE_NITRO_RATE = 1.85;
    const ENGINE_VOLUME_SMOOTHING = 8;
    const ENGINE_RATE_SMOOTHING = 6;
    const uiButtonClickSounds = createUiButtonClickSoundPool();
    const mapBgmTracks = createMapBgmTracks();
    const calmBgmTrack = createCalmBgmTrack();
    const engineSound = createEngineSound();
    const assetImages = {};
    let renderWidth = 1280;
    let renderHeight = 720;
    let selectedMapId = SECOND_LEVEL_ID;
    let selectedRaceDirection = "forward";
    let mode = "menu";
    let menuView = "main";
    let segments = [];
    let miniMapPoints = [];
    let trackLength = 1;
    let maxSpeed = BASE_MAX_SPEED;
    let lastFrame = performance.now();
    let nitroZoomVisual = 0;
    let visualPlayerX = 0;
    let raceTime = 0;
    let countdownRemaining = 0;
    let countdownLabel = "";
    let raceRewardPaid = false;
    let uiButtonClickSoundIndex = 0;
    let engineVolume = 0;
    let engineRate = ENGINE_IDLE_RATE;
    let save = loadSave();
    const player = {
        carId: "starter",
        x: 0,
        speed: 0,
        position: 0,
        totalDistance: 0,
        lap: 1,
        nitro: NITRO_MAX,
        nitroActive: false,
        nitroLocked: false,
        shieldTime: 0,
        stunTime: 0,
        collisionCooldown: 0,
    };
    let opponents = [];
    let powerups = [];
    let airstrikes = [];
    let impactEffects = [];
    function requireElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`Missing required element: ${selector}`);
        }
        return element;
    }
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    function interpolate(a, b, percent) {
        return a + (b - a) * percent;
    }
    function easeIn(a, b, percent) {
        return a + (b - a) * percent * percent;
    }
    function easeOut(a, b, percent) {
        return a + (b - a) * (1 - (1 - percent) * (1 - percent));
    }
    function easeInOut(a, b, percent) {
        return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
    }
    function percentRemaining(value, total) {
        return (value % total) / total;
    }
    function positiveModulo(value, total) {
        return ((value % total) + total) % total;
    }
    function shortestTrackDistance(a, b) {
        const raw = Math.abs(a - b);
        return Math.min(raw, trackLength - raw);
    }
    function getPlayerMaxSpeed() {
        const car = getPlayerCar();
        const nitroTopSpeed = 1 + (NITRO_TOP_SPEED - 1) * car.nitro;
        return maxSpeed * (player.nitroActive ? nitroTopSpeed : 1);
    }
    function getPlayerDisplayTopSpeed() {
        const car = getPlayerCar();
        const nitroTopSpeed = 1 + (NITRO_TOP_SPEED - 1) * car.nitro;
        return car.displayTopSpeed * (player.nitroActive ? nitroTopSpeed : 1);
    }
    function isBuildingAsset(asset) {
        return asset.substring(asset.lastIndexOf("/") + 1).startsWith("building_");
    }
    function getCarConfig(id) {
        return CARS[id] ?? CARS.starter;
    }
    function getEquippedCar() {
        return getCarConfig(save.equippedCar);
    }
    function getPlayerCar() {
        return getCarConfig(player.carId);
    }
    function getCarRank(id) {
        return CAR_ORDER.indexOf(id);
    }
    function isLocalhost() {
        return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    }
    function shouldShowDebugMode() {
        return isLocalhost() && save.debugMode;
    }
    function shouldUseUnlimitedNitro() {
        return shouldShowDebugMode() && save.unlimitedNitro;
    }
    function createUiButtonClickSoundPool() {
        return Array.from({ length: UI_BUTTON_CLICK_POOL_SIZE }, () => {
            const sound = new Audio(UI_BUTTON_CLICK_ASSET);
            sound.preload = "auto";
            sound.volume = UI_BUTTON_CLICK_VOLUME;
            return sound;
        });
    }
    function createMapBgmTracks() {
        return Object.fromEntries(Object.entries(MAP_BGM_ASSETS).map(([mapId, source]) => {
            const music = new Audio(source);
            music.loop = true;
            music.preload = "auto";
            music.volume = DEFAULT_BGM_VOLUME;
            return [mapId, music];
        }));
    }
    function createCalmBgmTrack() {
        const music = new Audio(CALM_BGM_ASSET);
        music.loop = false;
        music.preload = "auto";
        music.volume = DEFAULT_BGM_VOLUME;
        music.addEventListener("ended", () => {
            try {
                music.currentTime = CALM_BGM_START;
            }
            catch {
                // Some browsers reject seeking until enough metadata has loaded.
            }
            if (save.sound && getBgmVolume() > 0 && mode !== "race" && mode !== "countdown") {
                void music.play().catch(() => undefined);
            }
        });
        return music;
    }
    function createEngineSound() {
        const sound = new Audio(ENGINE_SOUND_ASSET);
        sound.loop = false;
        sound.preload = "auto";
        sound.volume = 0;
        const pitchControls = sound;
        pitchControls.preservesPitch = false;
        pitchControls.mozPreservesPitch = false;
        pitchControls.webkitPreservesPitch = false;
        return sound;
    }
    function getBgmVolume() {
        return clamp(save.bgmVolume, 0, 1);
    }
    function getCarSoundVolume() {
        return clamp(save.carSoundVolume, 0, 1);
    }
    function applyMapBgmVolume() {
        const volume = save.sound ? getBgmVolume() : 0;
        for (const track of Object.values(mapBgmTracks)) {
            if (track) {
                track.volume = volume;
            }
        }
        calmBgmTrack.volume = volume;
    }
    function preloadUiButtonClickSounds() {
        for (const sound of uiButtonClickSounds) {
            sound.load();
        }
    }
    function playUiButtonClick() {
        if (!save.sound) {
            return;
        }
        const sound = uiButtonClickSounds[uiButtonClickSoundIndex];
        uiButtonClickSoundIndex = (uiButtonClickSoundIndex + 1) % uiButtonClickSounds.length;
        sound.pause();
        try {
            sound.currentTime = 0;
        }
        catch {
            // Some browsers reject seeking until enough metadata has loaded.
        }
        void sound.play().catch(() => undefined);
    }
    function syncEngineLoopPosition() {
        if (engineSound.currentTime >= ENGINE_LOOP_START && engineSound.currentTime < ENGINE_LOOP_END) {
            return;
        }
        try {
            engineSound.currentTime = ENGINE_LOOP_START;
        }
        catch {
            // Some browsers reject seeking until enough metadata has loaded.
        }
    }
    function playEngineLoop() {
        syncEngineLoopPosition();
        if (engineSound.paused) {
            void engineSound.play().catch(() => undefined);
        }
    }
    function warmRaceAudio() {
        if (!save.sound || getCarSoundVolume() <= 0) {
            return;
        }
        engineVolume = 0;
        engineRate = ENGINE_IDLE_RATE;
        engineSound.volume = 0;
        engineSound.playbackRate = engineRate;
        playEngineLoop();
    }
    function updateEngineSound(dt) {
        if (mode === "countdown") {
            engineVolume = 0;
            engineRate = ENGINE_IDLE_RATE;
            engineSound.volume = 0;
            engineSound.playbackRate = engineRate;
            if (save.sound && getCarSoundVolume() > 0) {
                playEngineLoop();
            }
            return;
        }
        if (!save.sound || mode !== "race") {
            engineVolume += (0 - engineVolume) * Math.min(1, dt * ENGINE_VOLUME_SMOOTHING);
            engineSound.volume = engineVolume;
            if (engineVolume <= 0.002) {
                engineSound.pause();
                engineVolume = 0;
                engineRate = ENGINE_IDLE_RATE;
                engineSound.playbackRate = engineRate;
            }
            return;
        }
        const engineVolumeScale = getCarSoundVolume();
        if (engineVolumeScale <= 0) {
            engineVolume = 0;
            engineSound.volume = 0;
            engineSound.pause();
            return;
        }
        playEngineLoop();
        const speedRatio = clamp(player.speed / Math.max(1, getPlayerMaxSpeed()), 0, 1);
        const targetVolume = speedRatio < 0.03
            ? ENGINE_IDLE_VOLUME
            : interpolate(ENGINE_IDLE_VOLUME, ENGINE_MAX_VOLUME, speedRatio);
        const targetRate = interpolate(ENGINE_IDLE_RATE, player.nitroActive ? ENGINE_NITRO_RATE : ENGINE_MAX_RATE, speedRatio);
        engineVolume += ((targetVolume * engineVolumeScale) - engineVolume) * Math.min(1, dt * ENGINE_VOLUME_SMOOTHING);
        engineRate += (targetRate - engineRate) * Math.min(1, dt * ENGINE_RATE_SMOOTHING);
        engineSound.volume = engineVolume;
        engineSound.playbackRate = engineRate;
    }
    function syncMapBgm(restart = false) {
        const activeTrack = mode === "race" || mode === "countdown" ? mapBgmTracks[selectedMapId] : calmBgmTrack;
        applyMapBgmVolume();
        for (const track of Object.values(mapBgmTracks)) {
            if (track !== activeTrack) {
                track?.pause();
            }
        }
        if (activeTrack !== calmBgmTrack) {
            calmBgmTrack.pause();
        }
        const shouldPlay = save.sound && getBgmVolume() > 0 && activeTrack;
        if (!shouldPlay || !activeTrack) {
            activeTrack?.pause();
            return;
        }
        if (restart) {
            try {
                activeTrack.currentTime = activeTrack === calmBgmTrack ? CALM_BGM_START : 0;
            }
            catch {
                // Some browsers reject seeking until enough metadata has loaded.
            }
        }
        else if (activeTrack === calmBgmTrack && activeTrack.currentTime < CALM_BGM_START) {
            try {
                activeTrack.currentTime = CALM_BGM_START;
            }
            catch {
                // Some browsers reject seeking until enough metadata has loaded.
            }
        }
        void activeTrack.play().catch(() => undefined);
    }
    function shouldPlayUiButtonClick(event) {
        if (!(event.target instanceof Element)) {
            return false;
        }
        const target = event.target.closest(UI_BUTTON_CLICK_SELECTOR);
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        if (target.closest(GAME_BUTTON_SELECTOR)) {
            return false;
        }
        if (target instanceof HTMLButtonElement && target.disabled) {
            return false;
        }
        return target.getAttribute("aria-disabled") !== "true";
    }
    function bindUiButtonSounds() {
        preloadUiButtonClickSounds();
        document.addEventListener("click", (event) => {
            if (shouldPlayUiButtonClick(event)) {
                playUiButtonClick();
            }
        }, { capture: true });
    }
    function loadSave() {
        const fallback = {
            coins: 0,
            ownedCars: ["starter"],
            equippedCar: "starter",
            fullScreen: false,
            hideUiButtons: false,
            sound: true,
            bgmVolume: DEFAULT_BGM_VOLUME,
            carSoundVolume: DEFAULT_CAR_SOUND_VOLUME,
            debugMode: false,
            unlimitedNitro: false,
            bestPlaces: {},
        };
        try {
            const raw = window.localStorage.getItem("pseudo3d-racer-save");
            if (!raw) {
                return fallback;
            }
            const parsed = JSON.parse(raw);
            const ownedCars = Array.isArray(parsed.ownedCars)
                ? parsed.ownedCars.filter((id) => CAR_ORDER.includes(id))
                : fallback.ownedCars;
            if (!ownedCars.includes("starter")) {
                ownedCars.unshift("starter");
            }
            const equippedCar = parsed.equippedCar && ownedCars.includes(parsed.equippedCar)
                ? parsed.equippedCar
                : "starter";
            return {
                coins: Math.max(0, Math.floor(Number(parsed.coins) || 0)),
                ownedCars,
                equippedCar,
                fullScreen: parsed.fullScreen === true,
                hideUiButtons: parsed.hideUiButtons === true,
                sound: parsed.sound !== false,
                bgmVolume: typeof parsed.bgmVolume === "number" ? clamp(parsed.bgmVolume, 0, 1) : DEFAULT_BGM_VOLUME,
                carSoundVolume: typeof parsed.carSoundVolume === "number" ? clamp(parsed.carSoundVolume, 0, 1) : DEFAULT_CAR_SOUND_VOLUME,
                debugMode: parsed.debugMode === true,
                unlimitedNitro: parsed.unlimitedNitro === true,
                bestPlaces: parsed.bestPlaces ?? {},
            };
        }
        catch {
            return fallback;
        }
    }
    function saveProgress() {
        window.localStorage.setItem("pseudo3d-racer-save", JSON.stringify(save));
    }
    function createRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }
    function getMapConfig(id) {
        const map = MAPS.find((candidate) => candidate.id === id);
        if (!map) {
            throw new Error(`Unknown map: ${id}`);
        }
        return map;
    }
    function getRaceLaps() {
        return getMapConfig(selectedMapId).laps;
    }
    function hasCompletedLevel(id) {
        const place = save.bestPlaces[id];
        return typeof place === "number" && place > 0;
    }
    function isLevelUnlocked(id) {
        if (shouldShowDebugMode()) {
            return true;
        }
        if (id === TEST_LEVEL_ID) {
            return true;
        }
        const index = LEVEL_ORDER.indexOf(id);
        if (index === 0) {
            return true;
        }
        if (index < 0) {
            return false;
        }
        return hasCompletedLevel(LEVEL_ORDER[index - 1]);
    }
    function getPreviousLevelName(id) {
        const index = LEVEL_ORDER.indexOf(id);
        if (index <= 0) {
            return "";
        }
        return getMapConfig(LEVEL_ORDER[index - 1]).name;
    }
    function getSegmentColor(index, palette) {
        const alternate = Math.floor(index / RUMBLE_LENGTH) % 2 === 0;
        return {
            grass: alternate ? palette.grass1 : palette.grass2,
            rumble: alternate ? palette.rumble1 : palette.rumble2,
            road: alternate ? palette.road1 : palette.road2,
            lane: alternate ? palette.lane1 : palette.lane2,
        };
    }
    function blankPoint(x, y, z) {
        return {
            world: { x, y, z },
            camera: { x: 0, y: 0, z: 0 },
            screen: { x: 0, y: 0, w: 0, scale: 0 },
        };
    }
    function buildTrack(map, direction) {
        const output = [];
        let lastY = 0;
        function addSegment(curve, y) {
            const index = output.length;
            output.push({
                index,
                p1: blankPoint(0, lastY, index * SEGMENT_LENGTH),
                p2: blankPoint(0, y, (index + 1) * SEGMENT_LENGTH),
                curve,
                sprites: [],
                color: getSegmentColor(index, map.palette),
                clip: renderHeight,
            });
            lastY = y;
        }
        function addRoad(section) {
            const total = section.enter + section.hold + section.leave;
            const startY = lastY;
            const endY = startY + section.hill;
            for (let n = 0; n < total; n += 1) {
                const yPercent = total <= 1 ? 1 : n / (total - 1);
                let curve = section.curve;
                if (n < section.enter) {
                    curve = easeIn(0, section.curve, n / Math.max(1, section.enter));
                }
                else if (n >= section.enter + section.hold) {
                    const leaveIndex = n - section.enter - section.hold;
                    curve = easeOut(section.curve, 0, leaveIndex / Math.max(1, section.leave));
                }
                addSegment(curve, easeInOut(startY, endY, yPercent));
            }
        }
        map.sections.forEach(addRoad);
        decorateTrack(output, map);
        return direction === "reverse" ? reverseTrack(output, map) : output;
    }
    function reverseTrack(track, map) {
        return track.map((_, index) => {
            const source = track[track.length - 1 - index];
            return {
                index,
                p1: blankPoint(0, source.p2.world.y, index * SEGMENT_LENGTH),
                p2: blankPoint(0, source.p1.world.y, (index + 1) * SEGMENT_LENGTH),
                curve: -source.curve,
                sprites: source.sprites.map((sprite) => ({
                    ...sprite,
                    offset: -sprite.offset,
                })),
                color: getSegmentColor(index, map.palette),
                clip: renderHeight,
            };
        });
    }
    function decorateTrack(track, map) {
        const random = createRandom(map.seed);
        for (let index = 8; index < track.length - 8; index += 1) {
            const segment = track[index];
            if (index % map.decorations.every === 0) {
                const primary = pick(map.decorations.primary, random);
                const side = random() > 0.5 ? 1 : -1;
                const scale = map.decorations.baseScale * interpolate(0.85, 1.45, random());
                const offset = side * interpolate(map.decorations.farOffset, map.decorations.farOffset + 1.3, random());
                segment.sprites.push({ asset: primary, offset, scale });
                if (random() > 0.5) {
                    const mirror = pick(map.decorations.primary, random);
                    const mirrorScale = map.decorations.baseScale * interpolate(0.72, 1.15, random());
                    const mirrorOffset = -side * interpolate(map.decorations.farOffset + 0.25, map.decorations.farOffset + 1.8, random());
                    segment.sprites.push({ asset: mirror, offset: mirrorOffset, scale: mirrorScale });
                }
            }
            if (index % map.decorations.secondaryEvery === 0) {
                const secondary = pick(map.decorations.secondary, random);
                const side = random() > 0.5 ? 1 : -1;
                segment.sprites.push({
                    asset: secondary,
                    offset: side * interpolate(map.decorations.farOffset + 0.2, map.decorations.farOffset + 1.2, random()),
                    scale: map.decorations.baseScale * interpolate(0.75, 1.25, random()),
                });
            }
        }
    }
    function pick(items, random) {
        return items[Math.floor(random() * items.length) % items.length];
    }
    function findSegment(position) {
        return segments[Math.floor(position / SEGMENT_LENGTH) % segments.length];
    }
    function buildMiniMapPoints(track, map, direction) {
        if (track.length === 0) {
            return [];
        }
        const points = normalizeMiniMapRoute(sampleMiniMapRoute(map.miniMapRoute, track.length));
        return direction === "reverse" ? [...points].reverse() : points;
    }
    function sampleMiniMapRoute(route, segmentCount) {
        if (route.length < 2) {
            return [{ x: 0.5, y: 0.5 }];
        }
        const smoothRoute = buildSmoothMiniMapRoute(route);
        const edgeLengths = smoothRoute.slice(0, -1).map((point, index) => {
            const next = smoothRoute[index + 1];
            return Math.hypot(next.x - point.x, next.y - point.y);
        });
        const routeLength = edgeLengths.reduce((total, length) => total + length, 0);
        if (routeLength <= 0) {
            return Array.from({ length: segmentCount + 1 }, () => ({ ...route[0] }));
        }
        const points = [];
        for (let sample = 0; sample <= segmentCount; sample += 1) {
            const targetDistance = (sample / Math.max(1, segmentCount)) * routeLength;
            points.push(getRoutePointAtDistance(smoothRoute, edgeLengths, routeLength, targetDistance));
        }
        return points;
    }
    function buildSmoothMiniMapRoute(route) {
        const points = [];
        const subdivisions = 16;
        for (let index = 0; index < route.length; index += 1) {
            const p0 = route[(index - 1 + route.length) % route.length];
            const p1 = route[index];
            const p2 = route[(index + 1) % route.length];
            const p3 = route[(index + 2) % route.length];
            for (let step = 0; step < subdivisions; step += 1) {
                points.push(interpolateCatmullRom(p0, p1, p2, p3, step / subdivisions));
            }
        }
        points.push(points[0]);
        return points;
    }
    function interpolateCatmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        };
    }
    function getRoutePointAtDistance(route, edgeLengths, routeLength, distance) {
        let remaining = positiveModulo(distance, routeLength);
        for (let index = 0; index < edgeLengths.length; index += 1) {
            const edgeLength = edgeLengths[index];
            if (remaining <= edgeLength || index === edgeLengths.length - 1) {
                const point = route[index];
                const next = route[index + 1] ?? route[0];
                const percent = edgeLength <= 0 ? 0 : remaining / edgeLength;
                return {
                    x: interpolate(point.x, next.x, percent),
                    y: interpolate(point.y, next.y, percent),
                };
            }
            remaining -= edgeLength;
        }
        return route[0];
    }
    function normalizeMiniMapRoute(raw) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const point of raw) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const span = Math.max(maxX - minX, maxY - minY, 1);
        return raw.map((point) => ({
            x: 0.5 + ((point.x - centerX) / span) * MINI_MAP_ROUTE_FILL,
            y: 0.5 + ((point.y - centerY) / span) * MINI_MAP_ROUTE_FILL,
        }));
    }
    function getMiniMapMarker(position, offset) {
        if (miniMapPoints.length < 2) {
            return { x: 0.5, y: 0.5, angle: 0 };
        }
        const segmentProgress = positiveModulo(position, trackLength) / SEGMENT_LENGTH;
        const index = Math.floor(segmentProgress) % segments.length;
        const percent = segmentProgress - Math.floor(segmentProgress);
        const p1 = miniMapPoints[index];
        const p2 = miniMapPoints[index + 1] ?? miniMapPoints[0];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.hypot(dx, dy) || 1;
        const laneShift = offset * 0.026;
        return {
            x: interpolate(p1.x, p2.x, percent) + (-dy / length) * laneShift,
            y: interpolate(p1.y, p2.y, percent) + (dx / length) * laneShift,
            angle: Math.atan2(dy, dx),
        };
    }
    function project(point, cameraX, cameraY, cameraZ) {
        point.camera.x = point.world.x - cameraX;
        point.camera.y = point.world.y - cameraY;
        point.camera.z = point.world.z - cameraZ;
        point.screen.scale = getVisualCameraDepth() / point.camera.z;
        point.screen.x = renderWidth / 2 + point.screen.scale * point.camera.x * renderWidth / 2;
        point.screen.y = renderHeight / 2 - point.screen.scale * point.camera.y * renderHeight / 2;
        point.screen.w = point.screen.scale * ROAD_WIDTH * renderWidth / 2;
    }
    function getVisualCameraDepth() {
        return CAMERA_DEPTH * interpolate(1, NITRO_ZOOM_CAMERA_SCALE, nitroZoomVisual);
    }
    function loadAssets() {
        const assetFiles = [...ASSETS.map((asset) => asset.file), MENU_TITLE_ASSET];
        let completed = 0;
        const markComplete = () => {
            completed += 1;
            setLoadingProgress(completed / assetFiles.length);
        };
        setLoadingProgress(0);
        const jobs = assetFiles.map((file) => new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                image
                    .decode()
                    .catch(() => undefined)
                    .then(() => {
                    if (file !== MENU_TITLE_ASSET) {
                        assetImages[file] = image;
                    }
                    markComplete();
                    resolve();
                });
            };
            image.onerror = () => {
                markComplete();
                resolve();
            };
            image.src = getAssetUrl(file);
        }));
        return Promise.all(jobs).then(() => undefined);
    }
    function setLoadingProgress(progress) {
        const percent = Math.round(clamp(progress, 0, 1) * 100);
        loadingPercent.textContent = `${percent}%`;
        loadingFill.style.width = `${percent}%`;
    }
    function hideLoadingScreen() {
        setLoadingProgress(1);
        loadingScreen.classList.add("ready");
        window.setTimeout(() => {
            loadingScreen.hidden = true;
        }, 260);
    }
    function resize() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const gameRoot = document.getElementById("overtake-game-root") ?? canvas.parentElement;
        const bounds = gameRoot?.getBoundingClientRect();
        const cssWidth = Math.max(320, Math.floor(bounds?.width || window.innerWidth));
        const cssHeight = Math.max(240, Math.floor(bounds?.height || window.innerHeight));
        renderWidth = Math.max(640, Math.floor(cssWidth * pixelRatio));
        renderHeight = Math.max(420, Math.floor(cssHeight * pixelRatio));
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        const miniWidth = miniMapCanvas.clientWidth || 168;
        const miniHeight = miniMapCanvas.clientHeight || 168;
        miniMapCanvas.width = Math.max(120, Math.floor(miniWidth * pixelRatio));
        miniMapCanvas.height = Math.max(120, Math.floor(miniHeight * pixelRatio));
    }
    function resetRace() {
        const map = getMapConfig(selectedMapId);
        const car = getEquippedCar();
        segments = buildTrack(map, selectedRaceDirection);
        miniMapPoints = buildMiniMapPoints(segments, map, selectedRaceDirection);
        trackLength = segments.length * SEGMENT_LENGTH;
        maxSpeed = BASE_MAX_SPEED * car.maxSpeed;
        player.carId = car.id;
        player.x = 0;
        visualPlayerX = player.x;
        player.speed = 0;
        player.position = 0;
        player.totalDistance = 0;
        player.lap = 1;
        player.nitro = NITRO_MAX;
        player.nitroActive = false;
        player.nitroLocked = false;
        player.shieldTime = 0;
        player.stunTime = 0;
        player.collisionCooldown = 0;
        opponents = createOpponents(map, player.carId);
        powerups = createPowerups(map);
        airstrikes = [];
        impactEffects = [];
        raceTime = 0;
        raceRewardPaid = false;
        updateHud();
    }
    function createOpponents(map, playerCarId) {
        const random = createRandom(map.seed * 31 + 11);
        const count = map.opponentCars.length;
        const cars = [];
        for (let index = 0; index < count; index += 1) {
            const gap = trackLength * interpolate(0.12, 0.88, (index + 1) / (count + 1));
            const laneBias = LANE_OFFSETS[index % LANE_OFFSETS.length];
            const carId = map.opponentCars[index];
            const carConfig = getCarConfig(carId);
            const opponentSpeed = getOpponentBaseSpeed(map, carConfig, playerCarId);
            cars.push({
                id: index,
                carId,
                asset: carConfig.asset,
                offset: laneBias,
                targetLaneOffset: laneBias,
                avoidanceLockUntil: 0,
                blockedBy: undefined,
                speed: opponentSpeed,
                baseSpeed: opponentSpeed,
                position: gap % trackLength,
                totalDistance: gap,
                seed: random() * 1000,
                laneBias,
                nitro: NITRO_MAX,
                nitroActive: false,
                shieldTime: 0,
                stunTime: 0,
            });
        }
        return cars;
    }
    function getOpponentBaseSpeed(map, carConfig, playerCarId) {
        const configuredSpeed = BASE_MAX_SPEED * carConfig.maxSpeed;
        const balance = getOpponentSpeedBalance(map.id, carConfig.id, playerCarId);
        if (balance) {
            return configuredSpeed * balance.maxSpeedRatio;
        }
        return configuredSpeed;
    }
    function getOpponentSpeedBalance(mapId, opponentCarId, playerCarId) {
        if (getCarRank(playerCarId) < getCarRank(opponentCarId)) {
            return undefined;
        }
        if (mapId === FIRST_LEVEL_ID) {
            return {
                maxSpeedRatio: FIRST_LEVEL_OPPONENT_MAX_SPEED_RATIO,
                aheadSpeedRatio: FIRST_LEVEL_AHEAD_OPPONENT_SPEED_RATIO,
            };
        }
        if (mapId === SECOND_LEVEL_ID) {
            return {
                maxSpeedRatio: SECOND_LEVEL_OPPONENT_MAX_SPEED_RATIO,
                aheadSpeedRatio: SECOND_LEVEL_AHEAD_OPPONENT_SPEED_RATIO,
            };
        }
        if (mapId === THIRD_LEVEL_ID) {
            return {
                maxSpeedRatio: THIRD_LEVEL_OPPONENT_MAX_SPEED_RATIO,
                aheadSpeedRatio: THIRD_LEVEL_AHEAD_OPPONENT_SPEED_RATIO,
            };
        }
        return undefined;
    }
    function createPowerups(map) {
        const random = createRandom(map.seed * 97 + 17);
        const items = [];
        for (let index = 18; index < segments.length - 18; index += POWERUP_SLOT_SPACING) {
            if (random() > POWERUP_SLOT_CHANCE) {
                continue;
            }
            const kind = pick(POWERUP_KIND_POOL, random);
            if (!isPowerupEnabled(kind)) {
                continue;
            }
            const lane = LANE_OFFSETS[Math.floor(random() * LANE_OFFSETS.length) % LANE_OFFSETS.length] * 0.82;
            items.push({
                kind,
                position: (index + interpolate(0.25, 0.72, random())) * SEGMENT_LENGTH,
                offset: lane,
                respawnAt: 0,
                seed: random() * 1000,
            });
        }
        return items;
    }
    function isPowerupEnabled(kind) {
        return POWERUP_FLAGS[kind];
    }
    function startRace(mapId = selectedMapId, direction = selectedRaceDirection) {
        if (!isLevelUnlocked(mapId)) {
            menuView = "levels";
            menuPanel.hidden = false;
            panelStatus.textContent = "Locked";
            renderMenu();
            return;
        }
        selectedMapId = mapId;
        selectedRaceDirection = direction;
        resetRace();
        mode = "countdown";
        countdownRemaining = COUNTDOWN_TOTAL_SECONDS;
        countdownLabel = "";
        menuPanel.hidden = true;
        raceMessage.hidden = true;
        countdownOverlay.hidden = false;
        resumeButton.hidden = true;
        panelStatus.textContent = "Get Ready";
        releaseTouchControls();
        syncMapBgm(true);
        warmRaceAudio();
        updateCountdownOverlay();
        updateHud();
    }
    function updateCountdown(dt) {
        countdownRemaining = Math.max(0, countdownRemaining - dt);
        updateCountdownOverlay();
        if (countdownRemaining <= 0) {
            beginRaceAfterCountdown();
        }
    }
    function updateCountdownOverlay() {
        const elapsed = COUNTDOWN_TOTAL_SECONDS - countdownRemaining;
        const index = clamp(Math.floor(elapsed / COUNTDOWN_STEP_SECONDS), 0, COUNTDOWN_LABELS.length - 1);
        const label = COUNTDOWN_LABELS[index];
        if (label === countdownLabel) {
            return;
        }
        countdownLabel = label;
        countdownOverlay.textContent = label;
        countdownOverlay.classList.remove("pulse");
        void countdownOverlay.offsetWidth;
        countdownOverlay.classList.add("pulse");
    }
    function beginRaceAfterCountdown() {
        if (mode !== "countdown") {
            return;
        }
        mode = "race";
        countdownOverlay.hidden = true;
        panelStatus.textContent = "Racing";
        syncMapBgm();
        updateHud();
    }
    function pauseRace() {
        if (mode !== "race") {
            return;
        }
        mode = "paused";
        menuView = "main";
        menuPanel.hidden = false;
        panelStatus.textContent = "Paused";
        syncMapBgm();
        renderMenu();
        updateHud();
    }
    function resumeRace() {
        if (mode !== "paused") {
            return;
        }
        mode = "race";
        menuPanel.hidden = true;
        panelStatus.textContent = "Racing";
        syncMapBgm();
        updateHud();
    }
    function finishRace() {
        if (mode === "finished") {
            return;
        }
        mode = "finished";
        player.speed = 0;
        countdownOverlay.hidden = true;
        syncMapBgm();
        menuPanel.hidden = false;
        menuView = "main";
        const place = calculatePlace();
        const award = awardRaceCoins(place);
        panelStatus.textContent = award > 0 ? `Coins +${award}` : "Finished";
        raceMessageTitle.textContent = "Race Complete";
        raceMessageBody.textContent = `Position ${place} of ${opponents.length + 1} · Coins +${award}`;
        raceMessage.hidden = false;
        renderMenu();
        updateHud();
    }
    function awardRaceCoins(place) {
        if (raceRewardPaid) {
            return 0;
        }
        const map = getMapConfig(selectedMapId);
        const multipliers = [1, 0.58, 0.32, 0.18];
        const award = map.id === TEST_LEVEL_ID
            ? map.reward
            : Math.round(map.reward * (multipliers[Math.min(place - 1, multipliers.length - 1)] ?? 0.12));
        save.coins += award;
        const best = save.bestPlaces[map.id];
        if (!best || place < best) {
            save.bestPlaces[map.id] = place;
        }
        raceRewardPaid = true;
        saveProgress();
        return award;
    }
    function renderMenu() {
        syncFullScreenPreference();
        menuContent.replaceChildren();
        resumeButton.hidden = true;
        backButton.hidden = menuView === "main";
        panelStatus.textContent = `Coins ${save.coins}`;
        syncUiState();
        if (mode === "paused") {
            panelStatus.textContent = "Paused";
            backButton.hidden = true;
            renderPauseMenu();
        }
        else if (menuView === "main") {
            renderMainMenu();
        }
        else if (menuView === "levels") {
            renderLevelMenu();
        }
        else if (menuView === "garage") {
            renderGarageMenu();
        }
        else {
            renderOptionsMenu();
        }
    }
    function renderPauseMenu() {
        const grid = document.createElement("div");
        grid.className = "pause-menu-grid";
        const resume = createMenuButton("Resume", "Continue race", resumeRace);
        const exit = createMenuButton("Exit", "Back to start menu", exitRaceToMenu);
        grid.append(resume, exit);
        menuContent.append(grid);
    }
    function exitRaceToMenu() {
        mode = "menu";
        menuView = "main";
        menuPanel.hidden = false;
        raceMessage.hidden = true;
        countdownOverlay.hidden = true;
        player.speed = 0;
        player.nitroActive = false;
        nitroZoomVisual = 0;
        releaseTouchControls();
        syncMapBgm();
        resetRace();
        renderMenu();
    }
    function renderMainMenu() {
        const grid = document.createElement("div");
        grid.className = "main-menu-grid";
        const start = createMenuButton("Start", "Choose a race level", () => {
            menuView = "levels";
            renderMenu();
        });
        const cars = createMenuButton("Cars", `${getEquippedCar().label} equipped`, () => {
            menuView = "garage";
            renderMenu();
        });
        const options = createMenuButton("Options", `Fullscreen ${save.fullScreen ? "Yes" : "No"}`, () => {
            menuView = "options";
            renderMenu();
        });
        grid.append(start, cars, options);
        menuContent.append(grid);
    }
    function renderLevelMenu() {
        const grid = document.createElement("div");
        grid.className = "option-grid";
        for (const map of MAPS) {
            const unlocked = isLevelUnlocked(map.id);
            const best = save.bestPlaces[map.id];
            const opponents = map.opponentCars.map((id) => getCarConfig(id).label).join(", ");
            const detail = unlocked
                ? `${map.label} · Reward ${map.reward} coins`
                : `Locked · Finish ${getPreviousLevelName(map.id)} to unlock`;
            const card = document.createElement("div");
            card.className = `option-button level-card${unlocked ? "" : " locked"}`;
            card.innerHTML = `<strong>${map.name}</strong><span>${detail}</span><div class="meta-line"><span class="pill">Best ${best ? `P${best}` : "-"}</span><span class="pill">${map.laps} laps</span></div><span>Opponents: ${opponents}</span>`;
            card.addEventListener("click", () => {
                if (selectedMapId !== map.id) {
                    selectedMapId = map.id;
                    resetRace();
                }
                panelStatus.textContent = unlocked ? "Select Forward or Reverse to start" : "Locked";
            });
            const actions = document.createElement("div");
            actions.className = "level-actions";
            const forwardButton = createLevelActionButton("Forward", () => startRace(map.id, "forward"), unlocked);
            const reverseButton = createLevelActionButton("Reverse", () => startRace(map.id, "reverse"), unlocked);
            actions.append(forwardButton, reverseButton);
            card.append(actions);
            grid.append(card);
        }
        menuContent.append(grid);
    }
    function createLevelActionButton(label, onClick, enabled) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary level-action";
        button.textContent = label;
        button.disabled = !enabled;
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            raceMessage.hidden = true;
            onClick();
        });
        return button;
    }
    function renderGarageMenu() {
        const grid = document.createElement("div");
        grid.className = "garage-grid";
        for (const id of CAR_ORDER) {
            const car = getCarConfig(id);
            const owned = save.ownedCars.includes(id);
            const equipped = save.equippedCar === id;
            const canBuy = save.coins >= car.price;
            const action = owned ? (equipped ? "Equipped" : "Equip") : `Buy ${car.price}`;
            const button = createMenuButton(car.label, action, () => {
                if (owned) {
                    save.equippedCar = id;
                    player.carId = id;
                    saveProgress();
                    resetRace();
                    renderMenu();
                    return;
                }
                if (canBuy) {
                    save.coins -= car.price;
                    save.ownedCars.push(id);
                    save.equippedCar = id;
                    player.carId = id;
                    saveProgress();
                    resetRace();
                    renderMenu();
                }
            }, equipped ? "active" : "");
            button.classList.add("car-card");
            button.disabled = !owned && !canBuy;
            button.innerHTML = `<img class="car-preview" src="${getAssetUrl(car.asset)}" alt="" /><strong>${car.label}</strong><div class="meta-line"><span class="pill">Top ${car.displayTopSpeed}</span><span class="pill">Accel ${Math.round(car.accel * 100)}</span><span class="pill">Nitro ${Math.round(car.nitro * 100)}</span></div><span class="car-action">${owned ? (equipped ? "Equipped" : "Owned") : `Price ${car.price} coins`}</span>`;
            grid.append(button);
        }
        menuContent.append(grid);
    }
    function renderOptionsMenu() {
        const fullscreenRow = createToggleRow("Fullscreen", isFullScreenActive(), () => {
            void toggleFullScreen();
        });
        const hideButtonsRow = createToggleRow("Hide Touch Controls", save.hideUiButtons, () => {
            save.hideUiButtons = !save.hideUiButtons;
            saveProgress();
            syncUiState();
            renderMenu();
        });
        const soundRow = createToggleRow("Sound", save.sound, () => {
            save.sound = !save.sound;
            saveProgress();
            syncMapBgm();
            renderMenu();
        });
        const bgmVolumeRow = createRangeRow("BGM Level", Math.round(getBgmVolume() * 100), (value) => {
            save.bgmVolume = clamp(value / 100, 0, 1);
            saveProgress();
            applyMapBgmVolume();
            syncMapBgm();
        });
        const carSoundVolumeRow = createRangeRow("Car Sound Level", Math.round(getCarSoundVolume() * 100), (value) => {
            save.carSoundVolume = clamp(value / 100, 0, 1);
            saveProgress();
        });
        const resetDefaultsRow = createActionRow("Reset Defaults", "Reset", () => {
            void resetOptionsToDefaults();
        });
        menuContent.append(fullscreenRow, hideButtonsRow, soundRow);
        if (save.sound) {
            menuContent.append(bgmVolumeRow, carSoundVolumeRow);
        }
        menuContent.append(resetDefaultsRow);
        if (isLocalhost()) {
            const debugModeRow = createToggleRow("Debug Mode", save.debugMode, () => {
                save.debugMode = !save.debugMode;
                if (!save.debugMode) {
                    save.unlimitedNitro = false;
                }
                saveProgress();
                renderMenu();
            });
            menuContent.append(debugModeRow);
            if (save.debugMode) {
                const debugCoinsRow = createActionRow("Debug Coins", `Add ${DEBUG_COIN_GRANT} coins`, () => {
                    save.coins += DEBUG_COIN_GRANT;
                    saveProgress();
                    updateHud();
                    renderMenu();
                });
                const unlimitedNitroRow = createToggleRow("Unlimited Nitro", save.unlimitedNitro, () => {
                    save.unlimitedNitro = !save.unlimitedNitro;
                    if (save.unlimitedNitro) {
                        player.nitro = NITRO_MAX;
                        player.nitroLocked = false;
                    }
                    saveProgress();
                    updateHud();
                    renderMenu();
                });
                menuContent.append(debugCoinsRow, unlimitedNitroRow);
            }
        }
    }
    function createToggleRow(label, enabled, onClick) {
        const row = document.createElement("div");
        row.className = "option-row";
        row.innerHTML = `<div><strong>${label}</strong></div>`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = enabled ? "primary" : "secondary";
        button.textContent = enabled ? "Yes" : "No";
        button.addEventListener("click", onClick);
        row.append(button);
        return row;
    }
    function createActionRow(label, action, onClick) {
        const row = document.createElement("div");
        row.className = "option-row";
        row.innerHTML = `<div><strong>${label}</strong></div>`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary";
        button.textContent = action;
        button.addEventListener("click", onClick);
        row.append(button);
        return row;
    }
    function createRangeRow(label, value, onInput) {
        const row = document.createElement("div");
        row.className = "option-row";
        const content = document.createElement("div");
        content.innerHTML = `<strong>${label}</strong><span>${value}%</span>`;
        const input = document.createElement("input");
        input.type = "range";
        input.className = "option-range";
        input.min = "0";
        input.max = "100";
        input.step = "1";
        input.value = `${value}`;
        input.setAttribute("aria-label", label);
        input.addEventListener("input", () => {
            const nextValue = clamp(Math.round(Number(input.value) || 0), 0, 100);
            input.value = `${nextValue}`;
            const output = content.querySelector("span");
            if (output) {
                output.textContent = `${nextValue}%`;
            }
            onInput(nextValue);
        });
        row.append(content, input);
        return row;
    }
    function createMenuButton(title, detail, onClick, extraClass = "") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `option-button${extraClass ? ` ${extraClass}` : ""}`;
        button.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
        button.addEventListener("click", () => {
            raceMessage.hidden = true;
            onClick();
        });
        return button;
    }
    async function resetOptionsToDefaults() {
        save.hideUiButtons = false;
        save.sound = true;
        save.bgmVolume = DEFAULT_BGM_VOLUME;
        save.carSoundVolume = DEFAULT_CAR_SOUND_VOLUME;
        save.debugMode = false;
        save.unlimitedNitro = false;
        if (isFullScreenActive()) {
            try {
                await document.exitFullscreen();
            }
            catch {
                // Keep the saved preference in sync even if the browser rejects the fullscreen request.
            }
        }
        save.fullScreen = false;
        saveProgress();
        applyMapBgmVolume();
        syncMapBgm();
        syncUiState();
        renderMenu();
    }
    async function toggleFullScreen() {
        const wantsFullScreen = !isFullScreenActive();
        try {
            if (wantsFullScreen) {
                await document.documentElement.requestFullscreen();
            }
            else {
                await document.exitFullscreen();
            }
        }
        catch {
            syncFullScreenPreference();
        }
        syncFullScreenPreference();
        renderMenu();
    }
    function isFullScreenActive() {
        return Boolean(document.fullscreenElement);
    }
    function syncFullScreenPreference() {
        const isFullScreen = isFullScreenActive();
        if (save.fullScreen !== isFullScreen) {
            save.fullScreen = isFullScreen;
            saveProgress();
            return true;
        }
        return false;
    }
    function update(dt) {
        raceTime += dt;
        const previousPlayerDistance = player.totalDistance;
        const previousPlayerOffset = player.x;
        const previousOpponentDistances = opponents.map((car) => car.totalDistance);
        const previousOpponentOffsets = opponents.map((car) => car.offset);
        updatePlayer(dt);
        updateOpponents(dt);
        updatePowerups();
        updateAirstrikes();
        resolveCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets);
        impactEffects = impactEffects.filter((effect) => raceTime - effect.start <= effect.duration);
        updateHud();
        if (player.totalDistance >= trackLength * getRaceLaps()) {
            finishRace();
        }
    }
    function updatePlayer(dt) {
        const map = getMapConfig(selectedMapId);
        const car = getPlayerCar();
        const segment = findSegment(player.position);
        const speedRatio = clamp(player.speed / Math.max(1, maxSpeed), 0, 1);
        const braking = keys.has("arrowdown") || keys.has("s");
        const accelerating = !braking;
        const steerLeft = keys.has("arrowleft") || keys.has("a");
        const steerRight = keys.has("arrowright") || keys.has("d");
        const steering = steerLeft !== steerRight;
        const unlimitedNitro = shouldUseUnlimitedNitro();
        if (unlimitedNitro) {
            player.nitro = NITRO_MAX;
            player.nitroLocked = false;
        }
        else if (player.nitro >= NITRO_START_THRESHOLD) {
            player.nitroLocked = false;
        }
        const nitroPressed = keys.has(" ") || keys.has("shift") || keys.has("n");
        const canUseNitro = unlimitedNitro || (!player.nitroLocked && (player.nitroActive ? player.nitro > 0 : player.nitro >= NITRO_START_THRESHOLD));
        const wantsNitro = nitroPressed && canUseNitro && !braking && player.stunTime <= 0;
        const turnAmount = Math.max(steering ? 1 : 0, clamp(Math.abs(segment.curve) * ROAD_CURVE_TURN_FACTOR, 0, 1));
        const turnThrottle = interpolate(1, TURN_THROTTLE_FACTOR, turnAmount);
        player.nitroActive = wantsNitro;
        player.shieldTime = POWERUP_FLAGS.shield ? Math.max(0, player.shieldTime - dt) : 0;
        player.stunTime = Math.max(0, player.stunTime - dt);
        player.collisionCooldown = Math.max(0, player.collisionCooldown - dt);
        if (player.nitroActive && !unlimitedNitro) {
            player.nitro = Math.max(0, player.nitro - NITRO_DRAIN * dt);
            if (player.nitro <= 0) {
                player.nitro = 0;
                player.nitroActive = false;
                player.nitroLocked = true;
            }
        }
        else {
            player.nitro = Math.min(NITRO_MAX, player.nitro + NITRO_REGEN * dt);
        }
        if (player.stunTime > 0) {
            player.speed -= DECEL * 2.4 * dt;
        }
        else if (accelerating) {
            player.speed += ACCEL * car.accel * (player.nitroActive ? NITRO_ACCEL * car.nitro : 1) * turnThrottle * dt;
        }
        else {
            player.speed -= DECEL * dt;
        }
        if (braking) {
            player.speed -= BRAKE * dt;
        }
        if (steerLeft && player.stunTime <= 0) {
            player.x -= STEERING * car.grip * dt * (0.25 + speedRatio * 0.85);
        }
        if (steerRight && player.stunTime <= 0) {
            player.x += STEERING * car.grip * dt * (0.25 + speedRatio * 0.85);
        }
        player.x -= segment.curve * map.curvePull * dt * speedRatio;
        if (turnAmount > 0) {
            player.speed -= TURN_DECEL * (0.45 + speedRatio * 0.55) * turnAmount * dt;
        }
        const currentMaxSpeed = getPlayerMaxSpeed();
        let speedLimit = currentMaxSpeed;
        if (turnAmount > 0) {
            speedLimit = Math.min(speedLimit, getTurnLimitedSpeed(currentMaxSpeed, turnAmount));
        }
        if (Math.abs(player.x) > 1) {
            const shieldAssist = POWERUP_FLAGS.shield && player.shieldTime > 0 ? 0.35 : 1;
            player.speed -= OFFROAD_DECEL * (2 - car.grip) * shieldAssist * dt;
            speedLimit = Math.min(speedLimit, currentMaxSpeed * OFFROAD_MAX_SPEED_RATIO);
        }
        player.x = clamp(player.x, -1.45, 1.45);
        player.speed = clamp(player.speed, 0, speedLimit);
        player.totalDistance += player.speed * dt;
        player.position = positiveModulo(player.totalDistance, trackLength);
        player.lap = clamp(Math.floor(player.totalDistance / trackLength) + 1, 1, getRaceLaps());
    }
    function updateOpponents(dt) {
        for (const car of opponents) {
            car.shieldTime = POWERUP_FLAGS.shield ? Math.max(0, car.shieldTime - dt) : 0;
            car.stunTime = Math.max(0, car.stunTime - dt);
            car.nitroActive = false;
            const previousOffset = car.offset;
            const trafficIntent = getOpponentTrafficIntent(car);
            car.targetLaneOffset = trafficIntent.targetOffset;
            car.blockedBy = trafficIntent.blockedBy;
            const targetOffset = trafficIntent.targetOffset;
            car.offset += (targetOffset - car.offset) * Math.min(1, dt * 0.85);
            const segment = findSegment(car.position);
            const laneTurn = clamp(Math.abs(car.offset - previousOffset) / Math.max(dt, 0.001) / STEERING, 0, 1);
            const curveTurn = clamp(Math.abs(segment.curve) * ROAD_CURVE_TURN_FACTOR, 0, 1);
            const turnAmount = Math.max(laneTurn, curveTurn);
            const offRoadAmount = Math.max(0, Math.abs(car.offset) - 1);
            const targetSpeed = getOpponentTargetSpeed(car, turnAmount, trafficIntent.followSpeed);
            if (car.stunTime > 0) {
                car.speed = Math.max(0, car.speed - DECEL * 2.2 * dt);
            }
            else {
                car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.4);
                if (turnAmount > 0) {
                    const carSpeedRatio = clamp(car.speed / Math.max(1, car.baseSpeed), 0, 1);
                    car.speed -= TURN_DECEL * (0.45 + carSpeedRatio * 0.55) * turnAmount * dt;
                }
                if (offRoadAmount > 0) {
                    car.speed -= OFFROAD_DECEL * (1 + offRoadAmount) * dt;
                    car.speed = Math.min(car.speed, car.baseSpeed * OFFROAD_MAX_SPEED_RATIO);
                }
            }
            car.speed = Math.max(0, car.speed);
            car.totalDistance += car.speed * dt;
            car.position = positiveModulo(car.totalDistance, trackLength);
        }
    }
    function getOpponentTrafficIntent(car) {
        if (raceTime < car.avoidanceLockUntil && isLaneSafeForOpponent(car, car.targetLaneOffset)) {
            return { targetOffset: car.targetLaneOffset, blockedBy: car.blockedBy };
        }
        const blocker = findBlockingTarget(car);
        if (!blocker) {
            const targetOffset = getDefaultOpponentTargetOffset(car);
            car.avoidanceLockUntil = 0;
            return { targetOffset };
        }
        const passLane = chooseOpponentPassLane(car);
        if (passLane !== undefined) {
            car.avoidanceLockUntil = raceTime + OPPONENT_OVERTAKE_LOCK_TIME;
            return {
                targetOffset: passLane,
                blockedBy: blocker.id,
            };
        }
        car.avoidanceLockUntil = 0;
        return {
            targetOffset: getNearestLaneOffset(car.offset),
            followSpeed: blocker.speed * OPPONENT_FOLLOW_SPEED_RATIO,
            blockedBy: blocker.id,
        };
    }
    function getDefaultOpponentTargetOffset(car) {
        const laneIndex = Math.abs(Math.floor(car.totalDistance / 2600 + car.seed)) % LANE_OFFSETS.length;
        const wave = Math.sin(car.totalDistance * 0.0012 + car.seed) * 0.035;
        return clamp(LANE_OFFSETS[laneIndex] * 0.78 + car.laneBias * 0.22 + wave, -0.72, 0.72);
    }
    function findBlockingTarget(car) {
        const blockers = getRaceTargetsForAvoidance(car)
            .map((target) => ({
            ...target,
            distance: target.totalDistance - car.totalDistance,
        }))
            .filter((target) => {
            if (target.distance <= 0 || target.distance > OPPONENT_LOOKAHEAD_DISTANCE) {
                return false;
            }
            if (Math.abs(target.offset - car.offset) >= OPPONENT_LANE_CLEARANCE) {
                return false;
            }
            const closing = car.speed > target.speed * 1.02;
            const close = target.distance <= OPPONENT_PASS_COMMIT_DISTANCE;
            return closing || close;
        })
            .sort((a, b) => a.distance - b.distance);
        return blockers[0];
    }
    function chooseOpponentPassLane(car) {
        for (const laneOffset of getOpponentPassLaneCandidates(car)) {
            if (isLaneSafeForOpponent(car, laneOffset)) {
                return laneOffset;
            }
        }
        return undefined;
    }
    function getOpponentPassLaneCandidates(car) {
        const currentIndex = getNearestLaneIndex(car.offset);
        const currentLane = LANE_OFFSETS[currentIndex];
        const preferredDirection = car.laneBias >= 0 ? 1 : -1;
        return LANE_OFFSETS
            .filter((_, index) => index !== currentIndex)
            .slice()
            .sort((a, b) => {
            const aIndex = LANE_OFFSETS.indexOf(a);
            const bIndex = LANE_OFFSETS.indexOf(b);
            const aDistance = Math.abs(aIndex - currentIndex);
            const bDistance = Math.abs(bIndex - currentIndex);
            if (aDistance !== bDistance) {
                return aDistance - bDistance;
            }
            const aDirection = Math.sign(a - currentLane) || preferredDirection;
            const bDirection = Math.sign(b - currentLane) || preferredDirection;
            if (aDirection === preferredDirection && bDirection !== preferredDirection) {
                return -1;
            }
            if (bDirection === preferredDirection && aDirection !== preferredDirection) {
                return 1;
            }
            return 0;
        });
    }
    function isLaneSafeForOpponent(car, laneOffset) {
        for (const target of getRaceTargetsForAvoidance(car)) {
            if (Math.abs(target.offset - laneOffset) >= OPPONENT_LANE_CLEARANCE) {
                continue;
            }
            const distance = target.totalDistance - car.totalDistance;
            if (distance >= 0 && distance < OPPONENT_SAFE_FRONT_GAP) {
                return false;
            }
            if (distance < 0 && -distance < OPPONENT_SAFE_REAR_GAP) {
                return false;
            }
        }
        return true;
    }
    function getRaceTargetsForAvoidance(car) {
        const targets = [
            {
                id: "player",
                totalDistance: player.totalDistance,
                offset: player.x,
                speed: player.speed,
            },
        ];
        for (const opponent of opponents) {
            if (opponent.id === car.id) {
                continue;
            }
            targets.push({
                id: opponent.id,
                totalDistance: opponent.totalDistance,
                offset: opponent.offset,
                speed: opponent.speed,
            });
        }
        return targets;
    }
    function getNearestLaneOffset(offset) {
        return LANE_OFFSETS[getNearestLaneIndex(offset)];
    }
    function getNearestLaneIndex(offset) {
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < LANE_OFFSETS.length; index += 1) {
            const distance = Math.abs(LANE_OFFSETS[index] - offset);
            if (distance < bestDistance) {
                bestIndex = index;
                bestDistance = distance;
            }
        }
        return bestIndex;
    }
    function getTurnLimitedSpeed(speed, turnAmount) {
        return speed * (1 - clamp(turnAmount, 0, 1) * MAX_TURN_SPEED_REDUCTION);
    }
    function getOpponentTargetSpeed(car, turnAmount, followSpeed) {
        const turnLimitedSpeed = getTurnLimitedSpeed(car.baseSpeed, turnAmount);
        const balance = getOpponentSpeedBalance(selectedMapId, car.carId, player.carId);
        let targetSpeed = turnLimitedSpeed;
        if (car.totalDistance <= player.totalDistance || !balance) {
            targetSpeed = turnLimitedSpeed;
        }
        else {
            const config = getCarConfig(car.carId);
            const configuredSpeed = BASE_MAX_SPEED * config.maxSpeed;
            targetSpeed = Math.min(turnLimitedSpeed, configuredSpeed * balance.aheadSpeedRatio);
        }
        if (followSpeed !== undefined) {
            targetSpeed = Math.min(targetSpeed, followSpeed);
        }
        return targetSpeed;
    }
    function updatePowerups() {
        for (const item of powerups) {
            if (!isPowerupEnabled(item.kind)) {
                continue;
            }
            if (raceTime < item.respawnAt) {
                continue;
            }
            if (shortestTrackDistance(item.position, player.position) > 135) {
                continue;
            }
            if (Math.abs(item.offset - player.x) <= PLAYER_ROAD_WIDTH) {
                collectPowerup(item);
            }
        }
    }
    function collectPowerup(item) {
        if (!isPowerupEnabled(item.kind)) {
            return;
        }
        item.respawnAt = raceTime + POWERUP_RESPAWN;
        if (item.kind === "nitro") {
            player.nitro = Math.min(NITRO_MAX, player.nitro + 48);
            impactEffects.push({
                position: player.position,
                offset: player.x,
                start: raceTime,
                duration: 0.45,
                shielded: true,
            });
            return;
        }
        if (item.kind === "shield") {
            player.shieldTime = Math.max(player.shieldTime, SHIELD_DURATION);
            impactEffects.push({
                position: player.position,
                offset: player.x,
                start: raceTime,
                duration: 0.75,
                shielded: true,
            });
            return;
        }
        triggerAirstrike();
    }
    function updateAirstrikes() {
        if (!POWERUP_FLAGS.airstrike) {
            airstrikes = [];
            return;
        }
        for (const strike of airstrikes) {
            if (!strike.hitApplied && raceTime >= strike.impact) {
                applyAirstrikeHit(strike);
                strike.hitApplied = true;
            }
        }
        airstrikes = airstrikes.filter((strike) => raceTime <= strike.end);
    }
    function triggerAirstrike() {
        if (!POWERUP_FLAGS.airstrike) {
            return;
        }
        const standings = getStandings();
        const leader = standings[0];
        const target = leader?.id === "player" ? standings[1] : leader;
        if (!target) {
            return;
        }
        airstrikes.push({
            target: target.id,
            start: raceTime,
            impact: raceTime + AIRSTRIKE_WINDUP,
            end: raceTime + AIRSTRIKE_DURATION,
            hitApplied: false,
        });
    }
    function applyAirstrikeHit(strike) {
        const state = getTargetState(strike.target);
        if (!state) {
            return;
        }
        const position = state.position();
        const offset = state.offset();
        const shielded = POWERUP_FLAGS.shield && state.shieldTime() > 0;
        if (shielded) {
            state.setShieldTime(Math.max(0.7, state.shieldTime() - 1.2));
        }
        else {
            state.setSpeed(state.speed() * 0.28);
            state.setStunTime(Math.max(state.stunTime(), AIRSTRIKE_STUN));
        }
        impactEffects.push({
            position,
            offset,
            start: raceTime,
            duration: shielded ? 0.7 : 1.05,
            shielded,
        });
    }
    function getStandings() {
        const standings = [
            { id: "player", distance: player.totalDistance },
        ];
        for (const car of opponents) {
            standings.push({ id: car.id, distance: car.totalDistance });
        }
        return standings.sort((a, b) => b.distance - a.distance);
    }
    function getTargetState(id) {
        if (id === "player") {
            return {
                position: () => player.position,
                offset: () => player.x,
                speed: () => player.speed,
                shieldTime: () => player.shieldTime,
                stunTime: () => player.stunTime,
                setSpeed: (speed) => {
                    player.speed = speed;
                },
                setShieldTime: (time) => {
                    player.shieldTime = time;
                },
                setStunTime: (time) => {
                    player.stunTime = time;
                },
            };
        }
        const car = opponents.find((candidate) => candidate.id === id);
        if (!car) {
            return undefined;
        }
        return {
            position: () => car.position,
            offset: () => car.offset,
            speed: () => car.speed,
            shieldTime: () => car.shieldTime,
            stunTime: () => car.stunTime,
            setSpeed: (speed) => {
                car.speed = speed;
            },
            setShieldTime: (time) => {
                car.shieldTime = time;
            },
            setStunTime: (time) => {
                car.stunTime = time;
            },
        };
    }
    function resolveCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets) {
        resolvePlayerOpponentCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets);
        resolveOpponentCollisions(previousOpponentDistances, previousOpponentOffsets);
    }
    function resolvePlayerOpponentCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets) {
        for (const car of opponents) {
            const gap = car.totalDistance - player.totalDistance;
            const previousCarDistance = previousOpponentDistances[car.id] ?? car.totalDistance;
            const previousCarOffset = previousOpponentOffsets[car.id] ?? car.offset;
            const previousGap = previousCarDistance - previousPlayerDistance;
            const closeCollision = Math.abs(gap) <= COLLISION_DEPTH;
            const playerPassedOpponent = previousGap > 0 && gap <= 0;
            const opponentPassedPlayer = previousGap < 0 && gap >= 0;
            const lateralCollision = lateralPathsOverlap(previousPlayerOffset, player.x, previousCarOffset, car.offset, (PLAYER_ROAD_WIDTH + OPPONENT_ROAD_WIDTH) * 0.5);
            if (lateralCollision) {
                if (!closeCollision && !playerPassedOpponent && !opponentPassedPlayer) {
                    continue;
                }
                const playerSpeedBeforeCollision = player.speed;
                const opponentHitPlayerFromBack = opponentPassedPlayer || (previousGap < 0 && !playerPassedOpponent) || (previousGap === 0 && car.speed > player.speed);
                if (!opponentHitPlayerFromBack) {
                    const push = player.x >= car.offset ? 0.12 : -0.12;
                    player.x = clamp(player.x + push, -1.45, 1.45);
                }
                if (POWERUP_FLAGS.shield && player.shieldTime > 0) {
                    car.stunTime = Math.max(car.stunTime, 0.22);
                    if (opponentHitPlayerFromBack) {
                        placeOpponentBehindPlayer(car);
                        applyOpponentRearEndPenalty(car, playerSpeedBeforeCollision);
                        player.speed = Math.max(player.speed, playerSpeedBeforeCollision * PLAYER_REAR_HIT_SPEED_RETENTION);
                    }
                    else {
                        placePlayerBehindOpponent(car);
                        car.speed *= 0.7;
                    }
                    impactEffects.push({
                        position: player.position,
                        offset: player.x,
                        start: raceTime,
                        duration: 0.34,
                        shielded: true,
                    });
                }
                else if (opponentHitPlayerFromBack) {
                    placeOpponentBehindPlayer(car);
                    applyOpponentRearEndPenalty(car, playerSpeedBeforeCollision);
                    player.speed = Math.max(player.speed, playerSpeedBeforeCollision * PLAYER_REAR_HIT_SPEED_RETENTION);
                }
                else {
                    placePlayerBehindOpponent(car);
                    if (player.collisionCooldown <= 0) {
                        player.speed *= 1 - PLAYER_REAR_END_SPEED_LOSS;
                        player.collisionCooldown = PLAYER_COLLISION_COOLDOWN;
                    }
                    player.speed = Math.min(player.speed, car.speed * 0.72);
                    car.speed *= 0.94;
                }
            }
        }
    }
    function resolveOpponentCollisions(previousOpponentDistances, previousOpponentOffsets) {
        for (let a = 0; a < opponents.length; a += 1) {
            for (let b = a + 1; b < opponents.length; b += 1) {
                const first = opponents[a];
                const second = opponents[b];
                const gap = second.totalDistance - first.totalDistance;
                const previousFirstDistance = previousOpponentDistances[first.id] ?? first.totalDistance;
                const previousSecondDistance = previousOpponentDistances[second.id] ?? second.totalDistance;
                const previousFirstOffset = previousOpponentOffsets[first.id] ?? first.offset;
                const previousSecondOffset = previousOpponentOffsets[second.id] ?? second.offset;
                const previousGap = previousSecondDistance - previousFirstDistance;
                const closeCollision = Math.abs(gap) <= COLLISION_DEPTH;
                const firstPassedSecond = previousGap > 0 && gap <= 0;
                const secondPassedFirst = previousGap < 0 && gap >= 0;
                if (!lateralPathsOverlap(previousFirstOffset, first.offset, previousSecondOffset, second.offset, OPPONENT_ROAD_WIDTH)) {
                    continue;
                }
                if (!closeCollision && !firstPassedSecond && !secondPassedFirst) {
                    continue;
                }
                if (secondPassedFirst || (previousGap < 0 && !firstPassedSecond) || (previousGap === 0 && second.speed > first.speed)) {
                    placeOpponentBehindOpponent(second, first);
                    applyOpponentRearEndPenalty(second, first.speed);
                }
                else {
                    placeOpponentBehindOpponent(first, second);
                    applyOpponentRearEndPenalty(first, second.speed);
                }
            }
        }
    }
    function lateralPathsOverlap(previousA, currentA, previousB, currentB, clearance) {
        const minA = Math.min(previousA, currentA);
        const maxA = Math.max(previousA, currentA);
        const minB = Math.min(previousB, currentB);
        const maxB = Math.max(previousB, currentB);
        return minA <= maxB + clearance && minB <= maxA + clearance;
    }
    function placeOpponentBehindPlayer(car) {
        car.totalDistance = Math.max(0, player.totalDistance - COLLISION_SEPARATION);
        car.position = positiveModulo(car.totalDistance, trackLength);
    }
    function placePlayerBehindOpponent(car) {
        player.totalDistance = Math.max(0, car.totalDistance - COLLISION_SEPARATION);
        player.position = positiveModulo(player.totalDistance, trackLength);
        player.lap = clamp(Math.floor(player.totalDistance / trackLength) + 1, 1, getRaceLaps());
    }
    function placeOpponentBehindOpponent(rear, front) {
        rear.totalDistance = Math.max(0, front.totalDistance - COLLISION_SEPARATION);
        rear.position = positiveModulo(rear.totalDistance, trackLength);
    }
    function applyOpponentRearEndPenalty(car, frontSpeed) {
        car.speed *= 1 - OPPONENT_REAR_END_SPEED_LOSS;
        car.speed = Math.min(car.speed, frontSpeed * 0.72);
        car.stunTime = Math.max(car.stunTime, OPPONENT_REAR_END_STUN);
    }
    function calculatePlace() {
        let place = 1;
        for (const car of opponents) {
            if (car.totalDistance > player.totalDistance) {
                place += 1;
            }
        }
        return place;
    }
    function updateHud() {
        const map = getMapConfig(selectedMapId);
        const currentMaxSpeed = getPlayerMaxSpeed();
        const displayTopSpeed = getPlayerDisplayTopSpeed();
        syncUiState();
        hudSpeed.textContent = `${Math.round((player.speed / Math.max(1, currentMaxSpeed)) * displayTopSpeed)}`;
        hudNitro.textContent = `${Math.round(player.nitro)}%`;
        hudNitroFill.style.width = `${clamp(player.nitro, 0, NITRO_MAX)}%`;
        nitroMeter.classList.toggle("low", player.nitro < NITRO_START_THRESHOLD);
        hudTimer.textContent = formatRaceTime(raceTime);
        hudLap.textContent = `${player.lap} / ${getRaceLaps()}`;
        hudPlace.textContent = `${calculatePlace()} / ${opponents.length + 1}`;
        hudRouteItem.hidden = true;
        hudRoute.textContent = selectedRaceDirection === "reverse" ? `${map.name} Reverse` : map.name;
    }
    function syncUiState() {
        const racing = mode === "race";
        const showingRace = racing || mode === "countdown";
        app.dataset.mode = mode;
        app.dataset.menu = menuView;
        app.dataset.titleImage = SHOW_TITLE_IMAGE_IN_MENUS ? "true" : "false";
        miniMapCanvas.hidden = !showingRace;
        raceTimer.hidden = !showingRace;
        mapStats.hidden = !showingRace;
        driveHud.hidden = !showingRace;
        pauseButton.hidden = !racing;
        touchControls.hidden = !racing || save.hideUiButtons;
        countdownOverlay.hidden = mode !== "countdown";
        if (!racing || save.hideUiButtons) {
            releaseTouchControls();
        }
    }
    function formatRaceTime(time) {
        const safeTime = Math.max(0, time);
        const minutes = Math.floor(safeTime / 60);
        const seconds = Math.floor(safeTime % 60);
        const tenths = Math.floor((safeTime % 1) * 10);
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
    }
    function render(time) {
        const map = getMapConfig(selectedMapId);
        drawBackground(map, time);
        if (segments.length === 0) {
            return;
        }
        renderRoad(map);
        drawPlayerCar(raceTime);
        drawPlayerAirstrikeAndImpactEffects(raceTime);
        drawMiniMap(map);
    }
    function drawMiniMap(map) {
        const width = miniMapCanvas.width;
        const height = miniMapCanvas.height;
        const scale = Math.min(width, height);
        mapCtx.clearRect(0, 0, width, height);
        mapCtx.save();
        mapCtx.fillStyle = "rgba(7, 11, 16, 0.66)";
        mapCtx.fillRect(0, 0, width, height);
        if (miniMapPoints.length < 2) {
            mapCtx.restore();
            return;
        }
        const toX = (value) => value * width;
        const toY = (value) => value * height;
        mapCtx.lineCap = "round";
        mapCtx.lineJoin = "round";
        mapCtx.beginPath();
        mapCtx.moveTo(toX(miniMapPoints[0].x), toY(miniMapPoints[0].y));
        for (let index = 1; index < miniMapPoints.length; index += 1) {
            mapCtx.lineTo(toX(miniMapPoints[index].x), toY(miniMapPoints[index].y));
        }
        mapCtx.closePath();
        mapCtx.strokeStyle = "rgba(0, 0, 0, 0.78)";
        mapCtx.lineWidth = scale * 0.07;
        mapCtx.stroke();
        mapCtx.strokeStyle = map.palette.road1;
        mapCtx.lineWidth = scale * 0.045;
        mapCtx.stroke();
        mapCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        mapCtx.lineWidth = Math.max(1, scale * 0.008);
        mapCtx.setLineDash([scale * 0.018, scale * 0.018]);
        mapCtx.stroke();
        mapCtx.setLineDash([]);
        drawMiniMapFinishLine(scale);
        for (const car of opponents) {
            const marker = getMiniMapMarker(car.position, car.offset);
            drawMiniMapDot(marker.x, marker.y, scale * 0.026, getCarConfig(car.carId).color);
        }
        const playerMarker = getMiniMapMarker(player.position, player.x);
        drawMiniMapPlayer(playerMarker.x, playerMarker.y, playerMarker.angle, scale * 0.042);
        mapCtx.restore();
    }
    function drawMiniMapFinishLine(scale) {
        const point = miniMapPoints[FINISH_LINE_SEGMENT];
        const nextPoint = miniMapPoints[FINISH_LINE_SEGMENT + 1] ?? miniMapPoints[0];
        if (!point || !nextPoint) {
            return;
        }
        const px = point.x * miniMapCanvas.width;
        const py = point.y * miniMapCanvas.height;
        const dx = (nextPoint.x - point.x) * miniMapCanvas.width;
        const dy = (nextPoint.y - point.y) * miniMapCanvas.height;
        const angle = Math.atan2(dy, dx);
        const thickness = Math.max(5, scale * 0.034);
        const span = Math.max(16, scale * 0.13);
        const rows = 6;
        const columns = 2;
        const cellWidth = thickness / columns;
        const cellHeight = span / rows;
        mapCtx.save();
        mapCtx.translate(px, py);
        mapCtx.rotate(angle);
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                mapCtx.fillStyle = (row + column) % 2 === 0 ? "#f7fbff" : "#05070a";
                mapCtx.fillRect(-thickness / 2 + column * cellWidth, -span / 2 + row * cellHeight, cellWidth, cellHeight);
            }
        }
        mapCtx.strokeStyle = "rgba(255, 255, 255, 0.84)";
        mapCtx.lineWidth = Math.max(1, scale * 0.006);
        mapCtx.strokeRect(-thickness / 2, -span / 2, thickness, span);
        mapCtx.restore();
    }
    function drawMiniMapDot(x, y, radius, color) {
        const px = x * miniMapCanvas.width;
        const py = y * miniMapCanvas.height;
        mapCtx.save();
        mapCtx.fillStyle = color;
        mapCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        mapCtx.lineWidth = Math.max(1, radius * 0.34);
        mapCtx.beginPath();
        mapCtx.arc(px, py, radius, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.stroke();
        mapCtx.restore();
    }
    function drawMiniMapPlayer(x, y, angle, size) {
        const px = x * miniMapCanvas.width;
        const py = y * miniMapCanvas.height;
        mapCtx.save();
        mapCtx.translate(px, py);
        mapCtx.rotate(angle + Math.PI / 2);
        mapCtx.fillStyle = getPlayerCar().color;
        mapCtx.strokeStyle = "#ffffff";
        mapCtx.lineWidth = Math.max(1, size * 0.22);
        mapCtx.beginPath();
        mapCtx.moveTo(0, -size);
        mapCtx.lineTo(size * 0.72, size * 0.78);
        mapCtx.lineTo(0, size * 0.42);
        mapCtx.lineTo(-size * 0.72, size * 0.78);
        mapCtx.closePath();
        mapCtx.fill();
        mapCtx.stroke();
        mapCtx.restore();
    }
    function drawBackground(map, time) {
        const horizon = Math.round(renderHeight * 0.58);
        ctx.fillStyle = map.palette.horizon;
        ctx.fillRect(0, 0, renderWidth, renderHeight);
        const sky = assetImages[map.sky];
        if (sky?.complete && sky.naturalWidth > 0) {
            ctx.drawImage(sky, 0, 0, renderWidth, horizon);
        }
        else {
            const gradient = ctx.createLinearGradient(0, 0, 0, horizon);
            gradient.addColorStop(0, map.palette.horizon);
            gradient.addColorStop(1, map.palette.grass1);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, renderWidth, horizon);
        }
        if (map.skyline !== "night") {
            drawSkyline(map, horizon, time);
        }
        ctx.fillStyle = map.palette.grass1;
        ctx.fillRect(0, horizon, renderWidth, renderHeight - horizon);
        const nightBuildings = map.skyline === "night" ? assetImages[NIGHT_BACKGROUND_BUILDINGS_ASSET] : undefined;
        if (nightBuildings?.complete && nightBuildings.naturalWidth > 0) {
            const layerWidth = renderWidth * 1.08;
            const layerHeight = horizon * 1.78;
            const layerY = horizon - layerHeight - 18;
            const offset = positiveModulo(player.position * 0.006 + player.x * 8, layerWidth);
            for (let x = -offset; x < renderWidth; x += layerWidth) {
                ctx.drawImage(nightBuildings, x, layerY, layerWidth, layerHeight);
            }
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, horizon, renderWidth, renderHeight - horizon);
            ctx.clip();
            ctx.globalAlpha = 0.24;
            ctx.translate(0, horizon * 2);
            ctx.scale(1, -1);
            for (let x = -offset; x < renderWidth; x += layerWidth) {
                ctx.drawImage(nightBuildings, x, layerY, layerWidth, layerHeight);
            }
            ctx.restore();
        }
    }
    function drawSkyline(map, horizon, time) {
        if (map.skyline === "desert") {
            ctx.fillStyle = "rgba(135, 80, 53, 0.62)";
            drawPolygon(0, horizon + 36, renderWidth * 0.2, horizon - 26, renderWidth * 0.42, horizon + 30, renderWidth * 0.62, horizon - 18, renderWidth, horizon + 44);
            ctx.fillStyle = "rgba(97, 64, 50, 0.36)";
            drawPolygon(renderWidth * 0.08, horizon + 50, renderWidth * 0.32, horizon + 8, renderWidth * 0.55, horizon + 48, renderWidth * 0.78, horizon + 4, renderWidth, horizon + 52);
            return;
        }
        const dark = map.skyline === "night" ? "rgba(4, 8, 18, 0.78)" : "rgba(45, 73, 82, 0.54)";
        const light = map.skyline === "night" ? "rgba(112, 242, 255, 0.68)" : "rgba(216, 238, 244, 0.56)";
        ctx.fillStyle = dark;
        for (let x = -40; x < renderWidth + 80; x += 58) {
            const height = 42 + ((x * 13) % 92 + 92) % 92;
            ctx.fillRect(x, horizon - height, 42, height + 60);
            if (map.skyline === "night") {
                ctx.fillStyle = light;
                for (let y = horizon - height + 12; y < horizon - 8; y += 22) {
                    if ((x + y + Math.floor(time * 3)) % 3 !== 0) {
                        ctx.fillRect(x + 10, y, 6, 9);
                        ctx.fillRect(x + 25, y, 6, 9);
                    }
                }
                ctx.fillStyle = dark;
            }
        }
    }
    function renderRoad(map) {
        const baseSegment = findSegment(player.position);
        const baseIndex = baseSegment.index;
        const basePercent = percentRemaining(player.position, SEGMENT_LENGTH);
        const playerY = interpolate(baseSegment.p1.world.y, baseSegment.p2.world.y, basePercent);
        const cameraY = playerY + CAMERA_HEIGHT;
        const cameraX = visualPlayerX * ROAD_WIDTH;
        // Blend adjacent segment-anchor projections so curve rendering stays continuous as the camera crosses segment boundaries.
        let currentCurveX = 0;
        let currentCurveDx = 0;
        let nextCurveX = 0;
        let nextCurveDx = 0;
        let maxY = renderHeight;
        let finalLapFinishSegment;
        for (let n = 0; n < DRAW_DISTANCE; n += 1) {
            const segment = segments[(baseIndex + n) % segments.length];
            const looped = segment.index < baseIndex;
            segment.clip = maxY;
            const currentP1CurveX = currentCurveX;
            const currentP2CurveX = currentCurveX + currentCurveDx;
            const nextP1CurveX = nextCurveX;
            const nextP2CurveX = nextCurveX + nextCurveDx;
            const p1CurveX = n === 0 ? currentP1CurveX : interpolate(currentP1CurveX, nextP1CurveX, basePercent);
            const p2CurveX = n === 0 ? currentP2CurveX : interpolate(currentP2CurveX, nextP2CurveX, basePercent);
            project(segment.p1, cameraX - p1CurveX, cameraY, player.position - (looped ? trackLength : 0));
            project(segment.p2, cameraX - p2CurveX, cameraY, player.position - (looped ? trackLength : 0));
            currentCurveX += currentCurveDx;
            currentCurveDx += segment.curve;
            if (n > 0) {
                nextCurveX += nextCurveDx;
                nextCurveDx += segment.curve;
            }
            if (segment.p1.camera.z <= getVisualCameraDepth() ||
                segment.p2.screen.y >= segment.p1.screen.y ||
                segment.p2.screen.y >= maxY) {
                continue;
            }
            drawSegment(segment);
            if (player.lap >= getRaceLaps() && getFinishLineSegmentOffset(segment.index) === 0) {
                finalLapFinishSegment = segment;
            }
            maxY = segment.p2.screen.y;
        }
        if (finalLapFinishSegment) {
            drawFloatingFinishText(finalLapFinishSegment);
        }
        drawSpritesAndCars(baseIndex);
    }
    function drawSegment(segment) {
        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;
        const color = segment.color;
        ctx.fillStyle = color.grass;
        ctx.fillRect(0, p2.y, renderWidth, p1.y - p2.y);
        drawQuad(p1.x - p1.w * 1.22, p1.y, p1.x + p1.w * 1.22, p1.y, p2.x + p2.w * 1.22, p2.y, p2.x - p2.w * 1.22, p2.y, color.rumble);
        drawQuad(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, color.road);
        if (Math.floor(segment.index / RUMBLE_LENGTH) % 2 === 0) {
            const laneWidth1 = (p1.w * 2) / LANES;
            const laneWidth2 = (p2.w * 2) / LANES;
            const marker1 = Math.max(2, p1.w / 32);
            const marker2 = Math.max(1, p2.w / 32);
            for (let lane = 1; lane < LANES; lane += 1) {
                const lanex1 = p1.x - p1.w + laneWidth1 * lane;
                const lanex2 = p2.x - p2.w + laneWidth2 * lane;
                drawQuad(lanex1 - marker1, p1.y, lanex1 + marker1, p1.y, lanex2 + marker2, p2.y, lanex2 - marker2, p2.y, color.lane);
            }
        }
        const finishLineOffset = getFinishLineSegmentOffset(segment.index);
        if (finishLineOffset >= 0) {
            drawFinishLine(segment, finishLineOffset);
        }
    }
    function getFinishLineSegmentOffset(segmentIndex) {
        const offset = positiveModulo(segmentIndex - FINISH_LINE_SEGMENT, segments.length);
        return offset < FINISH_LINE_LENGTH_SEGMENTS ? offset : -1;
    }
    function drawFinishLine(segment, segmentOffset) {
        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;
        const topLeft = { x: p2.x - p2.w, y: p2.y };
        const topRight = { x: p2.x + p2.w, y: p2.y };
        const bottomLeft = { x: p1.x - p1.w, y: p1.y };
        const bottomRight = { x: p1.x + p1.w, y: p1.y };
        for (let row = 0; row < FINISH_LINE_ROWS; row += 1) {
            const rowStart = row / FINISH_LINE_ROWS;
            const rowEnd = (row + 1) / FINISH_LINE_ROWS;
            for (let column = 0; column < FINISH_LINE_COLUMNS; column += 1) {
                const columnStart = column / FINISH_LINE_COLUMNS;
                const columnEnd = (column + 1) / FINISH_LINE_COLUMNS;
                const a = interpolateRoadPoint(topLeft, topRight, bottomLeft, bottomRight, columnStart, rowStart);
                const b = interpolateRoadPoint(topLeft, topRight, bottomLeft, bottomRight, columnEnd, rowStart);
                const c = interpolateRoadPoint(topLeft, topRight, bottomLeft, bottomRight, columnEnd, rowEnd);
                const d = interpolateRoadPoint(topLeft, topRight, bottomLeft, bottomRight, columnStart, rowEnd);
                const checkerIndex = segmentOffset * FINISH_LINE_ROWS + row + column;
                drawQuad(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y, checkerIndex % 2 === 0 ? "#f7fbff" : "#05070a");
            }
        }
    }
    function drawFloatingFinishText(segment) {
        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;
        const centerX = interpolate(p2.x, p1.x, 0.38);
        const lineY = interpolate(p2.y, p1.y, 0.18);
        const roadHalfWidth = interpolate(p2.w, p1.w, 0.38);
        const fontSize = clamp(roadHalfWidth * 0.48, Math.max(44, renderWidth * 0.044), Math.min(210, renderWidth * 0.18));
        const y = Math.max(fontSize + 18, lineY - fontSize * 2.35);
        ctx.save();
        ctx.font = `900 ${fontSize}px Rajdhani, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
        ctx.shadowBlur = fontSize * 0.18;
        ctx.strokeStyle = "rgba(5, 7, 10, 0.86)";
        ctx.lineWidth = Math.max(3, fontSize * 0.12);
        ctx.strokeText("FINISH", centerX, y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("FINISH", centerX, y);
        ctx.restore();
    }
    function interpolateRoadPoint(topLeft, topRight, bottomLeft, bottomRight, xPercent, yPercent) {
        const leftX = interpolate(topLeft.x, bottomLeft.x, yPercent);
        const leftY = interpolate(topLeft.y, bottomLeft.y, yPercent);
        const rightX = interpolate(topRight.x, bottomRight.x, yPercent);
        const rightY = interpolate(topRight.y, bottomRight.y, yPercent);
        return {
            x: interpolate(leftX, rightX, xPercent),
            y: interpolate(leftY, rightY, xPercent),
        };
    }
    function drawSpritesAndCars(baseIndex) {
        const visibleCars = getVisibleCars();
        const visiblePowerups = getVisiblePowerups();
        for (let n = DRAW_DISTANCE - 1; n > 0; n -= 1) {
            const segment = segments[(baseIndex + n) % segments.length];
            for (const sprite of segment.sprites) {
                drawRoadSprite(sprite, segment);
            }
            for (const visible of visiblePowerups) {
                if (visible.segment.index === segment.index) {
                    drawPowerup(visible);
                }
            }
            for (const visible of visibleCars) {
                if (visible.segment.index === segment.index) {
                    drawOpponentCar(visible);
                }
            }
        }
        drawTrackImpactEffects();
        drawTrackAirstrikes();
    }
    function getVisibleCars() {
        const visible = [];
        const drawLimit = DRAW_DISTANCE * SEGMENT_LENGTH;
        for (const car of opponents) {
            const distance = positiveModulo(car.position - player.position, trackLength);
            if (distance > 0 && distance < drawLimit) {
                visible.push({ car, segment: findSegment(car.position), distance });
            }
        }
        return visible.sort((a, b) => b.distance - a.distance);
    }
    function getVisiblePowerups() {
        const visible = [];
        const drawLimit = DRAW_DISTANCE * SEGMENT_LENGTH;
        for (const item of powerups) {
            if (!isPowerupEnabled(item.kind)) {
                continue;
            }
            if (raceTime < item.respawnAt) {
                continue;
            }
            const distance = positiveModulo(item.position - player.position, trackLength);
            if (distance > 0 && distance < drawLimit) {
                visible.push({ item, segment: findSegment(item.position), distance });
            }
        }
        return visible.sort((a, b) => b.distance - a.distance);
    }
    function getProjectedPoint(position, offset, nearClip = getVisualCameraDepth()) {
        const distance = positiveModulo(position - player.position, trackLength);
        if (distance <= 0 || distance > DRAW_DISTANCE * SEGMENT_LENGTH) {
            return undefined;
        }
        const segment = findSegment(position);
        const percent = percentRemaining(position, SEGMENT_LENGTH);
        const x = interpolate(segment.p1.screen.x, segment.p2.screen.x, percent);
        const y = interpolate(segment.p1.screen.y, segment.p2.screen.y, percent);
        const w = interpolate(segment.p1.screen.w, segment.p2.screen.w, percent);
        const scale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, percent);
        const cameraZ = interpolate(segment.p1.camera.z, segment.p2.camera.z, percent);
        if (cameraZ <= nearClip || !Number.isFinite(scale) || scale <= 0) {
            return undefined;
        }
        return {
            x: x + w * offset,
            y,
            w,
            scale,
            cameraZ,
            segment,
        };
    }
    function drawRoadSprite(sprite, segment) {
        const screen = segment.p1.screen;
        const meta = ASSET_BY_FILE[sprite.asset];
        if (!meta) {
            return;
        }
        const distanceFactor = clamp(1 - segment.p1.camera.z / (DRAW_DISTANCE * SEGMENT_LENGTH), 0, 1);
        const buildingBoost = isBuildingAsset(sprite.asset) ? interpolate(0.88, 1.28, distanceFactor) : 1;
        const scale = screen.scale * renderWidth * sprite.scale * buildingBoost;
        const width = meta.width * scale;
        const height = meta.height * scale;
        let x = screen.x + screen.w * sprite.offset;
        if (sprite.offset < 0) {
            x -= width;
        }
        const y = screen.y - height;
        const motionStreak = player.speed > 400 ? clamp(player.speed / Math.max(1, maxSpeed), 0, 1) * ROADSIDE_PROP_MOTION_STREAK_MAX : 0;
        if (motionStreak > 0) {
            const direction = sprite.offset < 0 ? -1 : 1;
            ctx.save();
            ctx.globalAlpha = 0.24;
            for (let index = 3; index > 0; index -= 1) {
                drawAsset(sprite.asset, x - direction * motionStreak * index, y, width, height, segment.clip);
            }
            ctx.restore();
        }
        drawAsset(sprite.asset, x, y, width, height, segment.clip);
    }
    function drawPowerup(visible) {
        const item = visible.item;
        const point = getProjectedPoint(item.position, item.offset);
        if (!point) {
            return;
        }
        const size = getPowerupSize(item.kind, point);
        const bob = Math.sin(raceTime * 6 + item.seed) * size * 0.12;
        const y = point.y - size * 1.45 + bob;
        const color = getPowerupColor(item.kind);
        ctx.save();
        ctx.globalAlpha = clamp(1 - visible.distance / (DRAW_DISTANCE * SEGMENT_LENGTH), 0.42, 1);
        if (item.kind === "nitro") {
            drawNitroPowerup(point.x, y, size, color);
            ctx.restore();
            return;
        }
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 0.35;
        ctx.fillStyle = "rgba(6, 10, 18, 0.72)";
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, size * 0.08);
        ctx.beginPath();
        ctx.moveTo(point.x, y - size * 0.62);
        ctx.lineTo(point.x + size * 0.62, y);
        ctx.lineTo(point.x, y + size * 0.62);
        ctx.lineTo(point.x - size * 0.62, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        drawPowerupSymbol(item.kind, point.x, y, size, color);
        ctx.restore();
    }
    function getPowerupSize(kind, point) {
        const projectedSize = point.scale * renderWidth * 132;
        if (kind === "nitro") {
            return clamp(projectedSize, 4, 60);
        }
        return clamp(projectedSize, 16, 56);
    }
    function getPowerupColor(kind) {
        if (kind === "nitro") {
            return "#ffcf42";
        }
        if (kind === "shield") {
            return "#6ff2ff";
        }
        return "#ff5f5a";
    }
    function drawNitroPowerup(x, y, size, color) {
        const image = assetImages[NITRO_POWERUP_ASSET];
        if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
            drawPowerupSymbol("nitro", x, y, size, color);
            return;
        }
        const verticalHeight = size * 3.24;
        const verticalWidth = verticalHeight * (image.naturalHeight / image.naturalWidth);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2 + Math.PI / 10);
        ctx.drawImage(image, -verticalHeight / 2, -verticalWidth / 2, verticalHeight, verticalWidth);
        ctx.restore();
    }
    function drawPowerupSymbol(kind, x, y, size, color) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = Math.max(2, size * 0.08);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (kind === "nitro") {
            ctx.beginPath();
            ctx.moveTo(x + size * 0.08, y - size * 0.38);
            ctx.lineTo(x - size * 0.16, y + size * 0.02);
            ctx.lineTo(x + size * 0.08, y + size * 0.02);
            ctx.lineTo(x - size * 0.08, y + size * 0.38);
            ctx.stroke();
            return;
        }
        if (kind === "shield") {
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.36);
            ctx.quadraticCurveTo(x + size * 0.32, y - size * 0.22, x + size * 0.26, y + size * 0.1);
            ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.32, x, y + size * 0.42);
            ctx.quadraticCurveTo(x - size * 0.18, y + size * 0.32, x - size * 0.26, y + size * 0.1);
            ctx.quadraticCurveTo(x - size * 0.32, y - size * 0.22, x, y - size * 0.36);
            ctx.stroke();
            return;
        }
        ctx.beginPath();
        ctx.arc(x, y, size * 0.26, 0, Math.PI * 2);
        ctx.moveTo(x - size * 0.44, y);
        ctx.lineTo(x + size * 0.44, y);
        ctx.moveTo(x, y - size * 0.44);
        ctx.lineTo(x, y + size * 0.44);
        ctx.stroke();
    }
    function drawTrackImpactEffects() {
        for (const effect of impactEffects) {
            if (shortestTrackDistance(effect.position, player.position) < 80) {
                continue;
            }
            const point = getProjectedPoint(effect.position, effect.offset);
            if (!point) {
                continue;
            }
            drawImpact(point.x, point.y - point.scale * renderWidth * 70, point.scale * renderWidth * 120, effect);
        }
    }
    function drawTrackAirstrikes() {
        if (!POWERUP_FLAGS.airstrike) {
            return;
        }
        for (const strike of airstrikes) {
            if (strike.target === "player" || strike.hitApplied) {
                continue;
            }
            const state = getTargetState(strike.target);
            if (!state) {
                continue;
            }
            const point = getProjectedPoint(state.position(), state.offset());
            if (!point) {
                continue;
            }
            drawAirstrikeWarning(point.x, point.y - point.scale * renderWidth * 78, point.scale * renderWidth * 120, strike);
        }
    }
    function drawOpponentCar(visible) {
        const car = visible.car;
        const point = getProjectedPoint(car.position, car.offset, OPPONENT_NEAR_CLIP);
        const meta = ASSET_BY_FILE[car.asset];
        if (!point || !meta) {
            return;
        }
        const maxWidth = Math.min(renderWidth * OPPONENT_MAX_SCREEN_WIDTH_RATIO, OPPONENT_MAX_SCREEN_WIDTH, getPlayerCarDisplayWidth() * OPPONENT_MAX_PLAYER_WIDTH_RATIO);
        const width = Math.min(meta.width * point.scale * renderWidth * OPPONENT_SPRITE_SCALE, maxWidth);
        const height = width * (meta.height / meta.width);
        const roadX = point.x;
        const drawX = roadX - width / 2;
        const drawY = point.y - height;
        if (car.nitroActive) {
            drawCarAfterImages(car.asset, drawX, drawY, width, height, point.segment.clip, 0.54);
        }
        if (POWERUP_FLAGS.shield && car.shieldTime > 0) {
            drawShieldBubble(roadX, drawY + height * 0.52, width * 0.66, height * 0.72, car.shieldTime / SHIELD_DURATION);
        }
        drawCarMotionStreak(car.asset, drawX, drawY, width, height, car.speed, car.baseSpeed, point.segment.clip);
        drawAsset(car.asset, drawX, drawY, width, height, point.segment.clip);
        if (shouldShowDebugMode()) {
            drawDebugSpeedLabel(getOpponentDisplaySpeed(car), roadX, drawY - Math.max(8, height * 0.1), width);
        }
    }
    function drawPlayerCar(time) {
        const asset = getPlayerCar().asset;
        const rect = getPlayerCarRect(time);
        ctx.save();
        ctx.globalAlpha = 0.36;
        ctx.fillStyle = "#05070a";
        ctx.beginPath();
        ctx.ellipse(rect.x + rect.width / 2, rect.y + rect.height * 0.96, rect.width * 0.58, rect.height * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (player.nitroActive) {
            drawCarAfterImages(asset, rect.x, rect.y, rect.width, rect.height, renderHeight, 1);
        }
        if (POWERUP_FLAGS.shield && player.shieldTime > 0) {
            drawShieldBubble(rect.x + rect.width / 2, rect.y + rect.height * 0.52, rect.width * 0.64, rect.height * 0.82, player.shieldTime / SHIELD_DURATION);
        }
        drawCarMotionStreak(asset, rect.x, rect.y, rect.width, rect.height, player.speed, maxSpeed);
        drawAsset(asset, rect.x, rect.y, rect.width, rect.height);
        if (shouldShowDebugMode()) {
            drawDebugSpeedLabel(getPlayerDisplaySpeed(), rect.x + rect.width / 2, rect.y - 14, rect.width);
        }
    }
    function getPlayerDisplaySpeed() {
        const currentMaxSpeed = getPlayerMaxSpeed();
        const displayTopSpeed = getPlayerDisplayTopSpeed();
        return (player.speed / Math.max(1, currentMaxSpeed)) * displayTopSpeed;
    }
    function getOpponentDisplaySpeed(car) {
        const config = getCarConfig(car.carId);
        const baseMaxSpeed = BASE_MAX_SPEED * config.maxSpeed;
        return (car.speed / Math.max(1, baseMaxSpeed)) * config.displayTopSpeed;
    }
    function drawDebugSpeedLabel(speed, centerX, baselineY, carWidth) {
        const text = `${Math.round(speed)}`;
        const fontSize = clamp(carWidth * 0.065, 11, 20);
        const paddingX = Math.max(5, fontSize * 0.45);
        const paddingY = Math.max(3, fontSize * 0.22);
        ctx.save();
        ctx.font = `700 ${fontSize}px Rajdhani, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const width = ctx.measureText(text).width + paddingX * 2;
        const height = fontSize + paddingY * 2;
        const x = centerX - width / 2;
        const y = Math.max(4, baselineY - height);
        ctx.fillStyle = "rgba(5, 7, 10, 0.72)";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "rgba(255, 207, 66, 0.72)";
        ctx.lineWidth = Math.max(1, fontSize * 0.08);
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "#ffcf42";
        ctx.fillText(text, centerX, y + height / 2);
        ctx.restore();
    }
    function getPlayerCarRect(time) {
        const meta = ASSET_BY_FILE[getPlayerCar().asset];
        const width = getPlayerCarDisplayWidth();
        const height = width * (meta.height / meta.width);
        const speedRatio = clamp(player.speed / Math.max(1, maxSpeed), 0, 1);
        const wobble = Math.sin(time * 18) * speedRatio * 2.2;
        const bottomGap = Math.max(18, renderHeight * 0.04) + renderHeight * NITRO_ZOOM_PLAYER_LIFT_RATIO * nitroZoomVisual;
        return {
            x: renderWidth / 2 - width / 2 + visualPlayerX * renderWidth * 0.07 + wobble,
            y: renderHeight - height - bottomGap,
            width,
            height,
        };
    }
    function getPlayerCarDisplayWidth() {
        return Math.min(renderWidth * PLAYER_MAX_SCREEN_WIDTH_RATIO, PLAYER_MAX_SCREEN_WIDTH) * interpolate(1, NITRO_ZOOM_PLAYER_SCALE, nitroZoomVisual);
    }
    function drawCarMotionStreak(asset, x, y, width, height, speed, speedReference, clipY = renderHeight) {
        const motionStreak = speed > 0 ? clamp(speed / Math.max(1, speedReference), 0, 1) * CAR_MOTION_STREAK_MAX : 0;
        if (motionStreak <= 0) {
            return;
        }
        ctx.save();
        ctx.globalAlpha = 0.24;
        for (let index = CAR_MOTION_STREAK_COPIES; index > 0; index -= 1) {
            drawAsset(asset, x, y + motionStreak * index, width, height, clipY);
        }
        ctx.restore();
    }
    function drawCarAfterImages(asset, x, y, width, height, clipY = renderHeight, strength = 1) {
        const image = assetImages[asset];
        if (!image?.complete || image.naturalWidth <= 0 || width <= 0 || height <= 0 || y >= clipY) {
            return;
        }
        const copies = 10;
        const visibleHeight = Math.min(height, clipY - y);
        const sourceHeight = image.naturalHeight * (visibleHeight / height);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.filter = `blur(${Math.max(3, width * 0.026)}px) saturate(1.75) brightness(1.12)`;
        for (let index = copies; index >= 1; index -= 1) {
            const percent = index / copies;
            const trailY = y + height * (0.06 + percent * 0.68);
            const trailScale = 1 + percent * 0.18;
            const trailWidth = width * trailScale;
            const trailHeight = visibleHeight * trailScale;
            const trailX = x - (trailWidth - width) / 2;
            ctx.globalAlpha = (0.48 * (1 - percent * 0.54)) * strength;
            ctx.drawImage(image, 0, 0, image.naturalWidth, sourceHeight, trailX, trailY, trailWidth, Math.min(trailHeight, clipY - trailY));
        }
        ctx.restore();
    }
    function drawShieldBubble(cx, cy, rx, ry, strength) {
        const pulse = 0.86 + Math.sin(raceTime * 8) * 0.06;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(111, 242, 255, 0.82)";
        ctx.fillStyle = "rgba(111, 242, 255, 0.12)";
        ctx.lineWidth = Math.max(2, rx * 0.035);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = clamp(strength, 0.25, 1);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 0.78, ry * 0.78, 0, -0.3, Math.PI * 1.28);
        ctx.stroke();
        ctx.restore();
    }
    function drawImpact(x, y, size, effect) {
        const progress = clamp((raceTime - effect.start) / effect.duration, 0, 1);
        const radius = size * interpolate(0.18, 1.12, progress);
        const alpha = 1 - progress;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = effect.shielded ? "#6ff2ff" : "#ffcf42";
        ctx.fillStyle = effect.shielded ? "rgba(111, 242, 255, 0.16)" : "rgba(255, 95, 90, 0.26)";
        ctx.lineWidth = Math.max(2, size * 0.045);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (!effect.shielded) {
            ctx.strokeStyle = "#ff5f5a";
            for (let i = 0; i < 8; i += 1) {
                const angle = (i / 8) * Math.PI * 2 + progress;
                ctx.beginPath();
                ctx.moveTo(x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35);
                ctx.lineTo(x + Math.cos(angle) * radius * 1.25, y + Math.sin(angle) * radius * 1.25);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    function drawAirstrikeWarning(x, y, size, strike) {
        const progress = clamp((raceTime - strike.start) / Math.max(0.001, strike.impact - strike.start), 0, 1);
        const radius = size * interpolate(0.64, 0.24, progress);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "#ff5f5a";
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.globalAlpha = 0.45 + Math.sin(raceTime * 18) * 0.22;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.moveTo(x - radius * 1.35, y);
        ctx.lineTo(x + radius * 1.35, y);
        ctx.moveTo(x, y - radius * 1.35);
        ctx.lineTo(x, y + radius * 1.35);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#ffcf42";
        ctx.beginPath();
        ctx.arc(x, y - size * interpolate(1.6, 0.25, progress), Math.max(3, size * 0.08), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    function drawPlayerAirstrikeAndImpactEffects(time) {
        const rect = getPlayerCarRect(time);
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height * 0.48;
        if (POWERUP_FLAGS.airstrike) {
            for (const strike of airstrikes) {
                if (strike.target === "player" && !strike.hitApplied) {
                    drawAirstrikeWarning(cx, cy, rect.width * 0.74, strike);
                }
            }
        }
        for (const effect of impactEffects) {
            if (shortestTrackDistance(effect.position, player.position) < 80) {
                drawImpact(cx, cy, rect.width * 0.65, effect);
            }
        }
    }
    function drawAsset(asset, x, y, width, height, clipY = renderHeight) {
        if (height <= 0 || width <= 0 || y >= clipY) {
            return;
        }
        const visibleHeight = Math.min(height, clipY - y);
        if (visibleHeight <= 0) {
            return;
        }
        const image = assetImages[asset];
        if (image?.complete && image.naturalWidth > 0) {
            const sourceHeight = image.naturalHeight * (visibleHeight / height);
            ctx.drawImage(image, 0, 0, image.naturalWidth, sourceHeight, x, y, width, visibleHeight);
            return;
        }
        ctx.fillStyle = "#d82e3f";
        ctx.fillRect(x, y, width, visibleHeight);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, Math.min(4, width * 0.04));
        ctx.strokeRect(x, y, width, visibleHeight);
    }
    function drawQuad(x1, y1, x2, y2, x3, y3, x4, y4, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }
    function drawPolygon(...points) {
        if (points.length < 4) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        for (let index = 2; index < points.length; index += 2) {
            ctx.lineTo(points[index], points[index + 1]);
        }
        ctx.lineTo(renderWidth, renderHeight);
        ctx.lineTo(0, renderHeight);
        ctx.closePath();
        ctx.fill();
    }
    function frame(now) {
        const dt = Math.min(0.033, (now - lastFrame) / 1000);
        lastFrame = now;
        if (mode === "countdown") {
            updateCountdown(dt);
        }
        else if (mode === "race") {
            update(dt);
        }
        updateNitroZoomVisual(dt);
        updateVisualPlayerX(dt);
        updateEngineSound(dt);
        render(now / 1000);
        requestAnimationFrame(frame);
    }
    function updateVisualPlayerX(dt) {
        if (mode !== "race") {
            visualPlayerX = player.x;
            return;
        }
        visualPlayerX += (player.x - visualPlayerX) * Math.min(1, dt * PLAYER_VISUAL_LATERAL_SMOOTHING);
        if (Math.abs(player.x - visualPlayerX) < 0.0005) {
            visualPlayerX = player.x;
        }
    }
    function updateNitroZoomVisual(dt) {
        if (mode === "paused") {
            return;
        }
        const target = mode === "race" && player.nitroActive ? 1 : 0;
        const rate = target > nitroZoomVisual ? NITRO_ZOOM_IN_RATE : NITRO_ZOOM_OUT_RATE;
        nitroZoomVisual += (target - nitroZoomVisual) * Math.min(1, dt * rate);
    }
    function bindEvents() {
        bindUiButtonSounds();
        document.addEventListener("pointerdown", () => syncMapBgm(), { once: true, capture: true });
        window.addEventListener("resize", () => {
            resize();
            resetRace();
        });
        window.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift", "n", "p"].includes(key)) {
                event.preventDefault();
            }
            if (key === "escape" || key === "p") {
                if (mode === "race") {
                    pauseRace();
                }
                else if (mode === "paused") {
                    resumeRace();
                }
                else if (key === "escape" && menuView !== "main") {
                    menuView = "main";
                    renderMenu();
                }
                return;
            }
            if (key === "r") {
                startRace();
                return;
            }
            keys.add(key);
        });
        window.addEventListener("keyup", (event) => {
            keys.delete(event.key.toLowerCase());
        });
        document.addEventListener("fullscreenchange", () => {
            syncFullScreenPreference();
            if (!menuPanel.hidden) {
                renderMenu();
            }
        });
        backButton.addEventListener("click", () => {
            menuView = "main";
            renderMenu();
        });
        resumeButton.addEventListener("click", resumeRace);
        pauseButton.addEventListener("click", pauseRace);
        pauseButton.addEventListener("contextmenu", (event) => event.preventDefault());
        bindTouchButton(touchLeft, "arrowleft");
        bindTouchButton(touchRight, "arrowright");
        bindTouchButton(touchBrake, "arrowdown");
        bindTouchButton(touchNitro, "n");
    }
    function bindTouchButton(button, key) {
        function press(event) {
            event.preventDefault();
            if (!touchControls.hidden) {
                keys.add(key);
                button.classList.add("pressed");
                button.setPointerCapture(event.pointerId);
            }
        }
        function release(event) {
            event.preventDefault();
            keys.delete(key);
            button.classList.remove("pressed");
            if (button.hasPointerCapture(event.pointerId)) {
                button.releasePointerCapture(event.pointerId);
            }
        }
        button.addEventListener("pointerdown", press);
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", () => {
            keys.delete(key);
            button.classList.remove("pressed");
        });
        button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
    function releaseTouchControls() {
        for (const key of TOUCH_CONTROL_KEYS) {
            keys.delete(key);
        }
        touchLeft.classList.remove("pressed");
        touchRight.classList.remove("pressed");
        touchBrake.classList.remove("pressed");
        touchNitro.classList.remove("pressed");
    }
    function init() {
        resize();
        resetRace();
        renderMenu();
        bindEvents();
        syncMapBgm();
        render(performance.now() / 1000);
        hideLoadingScreen();
        requestAnimationFrame(frame);
    }
    void loadAssets().finally(init);
})();
