/*
Game manager
Rhythm game idea:
- Four buttons, a,s,d,f: one for each girl:
    - a: Molly: Normal
    - s: Touka: Slow
    - d: Rin: Intermitent
    - f: Niki: Fast
- Special fifth button: spacebar: Hima?
- Four lanes, independent for each girl, from right to left
- Every 5 points, increase difficulty to a maximum of 20
- Combo scale:
    - 1x: Unhappy
    - 2x: Better than Despacito
    - 3x: Niki approves
    - 4x: Maya approves
    - 5x: Best Homie Singer
*/


let ENEMIES = [];
let LIVES = 3;
const key_to_lane_mapping = {
    "a": 1,
    "s": 2,
    "d": 3,
    "f": 4
};
const MS_INTERVAL = 100; // milliseconds
let game_loop = null; // Store the game loop interval ID
let loop_count = 0; // Count how many loops have passed since the game started
const LANE_END_THRESHOLD = 80;  // Higher value allows for more leniency up to a maximum?

const SECS_EASY = 20;
const SECS_MEDIUM = SECS_EASY + 20;
const SECS_HARD = SECS_MEDIUM + 20;
const SECS_INSANE = SECS_HARD + 40;

const SECS = [SECS_EASY, SECS_MEDIUM, SECS_HARD, SECS_INSANE];
const N_LOOPS = [
    // Number of loops to change difficulty, calculated as seconds divided by the interval in seconds
    SECS_EASY / (MS_INTERVAL / 1000),
    SECS_MEDIUM / (MS_INTERVAL / 1000),
    SECS_HARD / (MS_INTERVAL / 1000),
    SECS_INSANE / (MS_INTERVAL / 1000)
];

const ENEMY_FREQ_PER_DIFFICULTY = [
    // Increasing each loop till one to create a new enemy
    0.05, 0.1, 0.2, 0.2
];

const ENEMY_N_CREATION_PER_DIFFICULTY = [
    // Number of enemy factories to increase per difficulty level
    1, 1, 2, 2
];


const BASE_LIVES = 3;

let MAX_SCORE = 0;
let SCORE = 0;
let DEFAULT_ENEMY_FACTORY = [0.75, 0.75, 0.75, 0.75]; // Whenerver one value is 1, create a new random enemy
let ENEMY_FACTORY = [0.75, 0.75, 0.75, 0.75]; // Whenerver one value is 1, create a new random enemy

let BG_MUSIC = new Audio("static/audio/not_yasusings_to_avoid_copyright_maybe.mp3");
const MAIN_MENU_MUSIC_VOLUME = 0.1;
const GAME_MUSIC_VOLUME = 0.35;
const HIT_SOUND_VOLUME = 0.8;
const LIFE_LOST_SOUND_VOLUME = 1.0;

BG_MUSIC.loop = true;
BG_MUSIC.volume = MAIN_MENU_MUSIC_VOLUME;
BG_MUSIC.play();


function _soft_audio_volume_change(audio, target_volume, increments = 10, interval = 100) {
    return new Promise((resolve) => {
        const current_volume = audio.volume;
        const volume_diff = target_volume - current_volume;
        const volume_step = volume_diff / increments;
        let current_increments = 0;

        const volume_interval = setInterval(() => {
            if (current_increments < increments) {
                audio.volume += volume_step;
                current_increments++;
            } else {
                clearInterval(volume_interval);
                resolve();
            }
        }, interval);
    });
}


async function _soft_to_display_none(id, timeout = 500) {
    /**
     * Helper function to hide an element by id with a fade-out effect.
     * @param {string} id - The id of the element to hide.
     */
    const element = document.getElementById(id);
    if (element) {
        let timeout_text = "" + timeout + "ms";
        element.style.transition = `opacity ${timeout_text} ease`;
        element.style.opacity = 0;
        await new Promise(resolve => setTimeout(resolve, timeout));
        element.style.display = "none";
        element.style.opacity = 1; // Reset opacity for future use
    }
}

async function _soft_to_no_display(id, timeout = 500) {
    const element = document.getElementById(id);
    if (element) {
        let timeout_text = "" + timeout + "ms";
        element.style.transition = `opacity ${timeout_text} ease`;
        element.style.opacity = 1;
        await new Promise(resolve => setTimeout(resolve, timeout));
        element.style.removeProperty("display");
    }
}




/******
 * Handlers
 */

function start_button_handler() {
    /**
     * When pressing start, we hide the start menu and show the game screen. We also start the game loop.
     */
    _soft_to_display_none("main_menu", 500).then(() => {
        document.getElementById("game_screen").removeAttribute("style");
        loop_count = 0;
        SCORE = 0;
        ENEMY_FACTORY = [...DEFAULT_ENEMY_FACTORY]; // Reset the enemy factory
        set_life_handler(BASE_LIVES);
        set_score_handler(SCORE);
        game_loop = start_game_loop(MS_INTERVAL);
        _soft_audio_volume_change(BG_MUSIC, GAME_MUSIC_VOLUME, 10, 100);
    });
}

function check_collision(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    if (rect1.right < rect2.left ||
        rect1.bottom < rect2.top ||
        rect1.left > rect2.right ||
        rect1.top > rect2.bottom) {
        return false;
    }
    return true;
}

// Reset handler
function set_life_handler(lives, error_type = 1) {
    const life_elements = document.querySelectorAll(".life");
    life_elements.forEach((life, index) => {
        if (index < lives) {
            life.classList.remove("lost_life");
            life.classList.add("shaky");
        } else {
            life.classList.add("lost_life");
            life.classList.remove("shaky");
        }
    });
    if (lives < LIVES) {
        let audio_files = {
            1: "static/audio/error_PWM_distortion.mp3",
            2: "static/audio/error_shamisen.mp3",
        }
        let audio_file = audio_files[error_type] || audio_files[1];

        //Lost life
        let audio = new Audio(audio_file);
        audio.volume = LIFE_LOST_SOUND_VOLUME;
        audio.play();
    }
    LIVES = lives;


    // If lives reach 0, end the game
    if (lives <= 0) {
        clearInterval(game_loop);   //STOP
        // Clear enemies from the screen
        ENEMIES.forEach(enemy => {
            enemy.enemy_element.remove();
        });
        ENEMIES = [];
        _soft_audio_volume_change(BG_MUSIC, MAIN_MENU_MUSIC_VOLUME, 10, 100);
        _soft_to_display_none("game_screen", 500).then(() => {
            _soft_to_no_display("main_menu", 500);
        });
    }
}

function set_score_handler(score) {
    const score_element = document.getElementById("score");
    if (score > SCORE) {
        // Play score increase sound
        let audio = new Audio("static/audio/ok_beep.mp3");
        audio.volume = HIT_SOUND_VOLUME;
        audio.play();
    }
    SCORE = score;
    if (score_element) {
        score_element.textContent = score;
    }
    if (score > MAX_SCORE) {
        MAX_SCORE = score;
        const max_score_element = document.getElementById("max_score");
        if (max_score_element) {
            max_score_element.textContent = MAX_SCORE;
        }
    }
}

function press_key_listener(e) {
    /**
     * Handle key presses for the game.
     * @param {KeyboardEvent} e - The keyboard event.
     *
     */
    let key_id = `key_${e.key}`;
    let key_element = document.getElementById(key_id);
    if (key_element) {
        key_element.classList.add("pressed_key");
    }
    // Check if enemies are in the lane:
    const lane = key_to_lane_mapping[e.key];
    if (lane) {
        let collision_detected = null;  // Only lose lives when pressing lanes with enemies
        // loop in reverse order to avoid issues when removing enemies from the array
        for (let i = ENEMIES.length - 1; i >= 0; i--) {
            let enemy = ENEMIES[i];
            if (enemy.lane !== lane) {
                continue;
            }
            let collision = enemy.check_elimination(i);  // This already eliminates enemy if appropriate
            if (collision) {
                collision_detected = true;
            } else if (collision_detected === null) {
                collision_detected = false;
            }
        }
        if (collision_detected === false) {
            // false means a line with enemies but none on the line, so we lose a life
            set_life_handler(LIVES - 1);
        }
    }
}

function release_key_listener(e) {
    /**
     * Handle key releases for the game.
     * @param {KeyboardEvent} e - The keyboard event.
     */
    let key_id = `key_${e.key}`;
    let key_element = document.getElementById(key_id);
    if (key_element) {
        key_element.classList.remove("pressed_key");
    }
}

document.addEventListener("keydown", press_key_listener);
document.addEventListener("keyup", release_key_listener);


/**
 * Main game loop
 */



function start_game_loop(ms_interval = 1200) {
    // Game loop logic here

    const game_loop = setInterval(() => {
        // Move enemies
        for (let i = ENEMIES.length - 1; i >= 0; i--) {
            let enemy = ENEMIES[i];
            if (enemy === undefined) {
                continue;
            }
            enemy.move();
            enemy.check_passed(i);  // Check if the enemy has passed the lane end
        }
        // Create new enemies
        enemy_creation(loop_count);
        loop_count++;
    }, ms_interval);
    return game_loop;
}

function enemy_creation(loop_count) {
    let dfficulty = N_LOOPS.length - 1; // Default to the hardest difficulty
    for (let i = 0; i < N_LOOPS.length; i++) {
        if (loop_count < N_LOOPS[i]) {
            dfficulty = i;
            break;
        }
    }
    // LOGIC
    const n_to_increase = ENEMY_N_CREATION_PER_DIFFICULTY[dfficulty];
    const freq = ENEMY_FREQ_PER_DIFFICULTY[dfficulty];
    // Choose n_to_increase random factory slots to increase
    let indices = [];
    while (indices.length < n_to_increase) {
        let random_index = Math.floor(Math.random() * ENEMY_FACTORY.length);
        indices.push(random_index);
        // Allow duplicates whatever man I dont care
    }
    // Increase the selected factory slots
    indices.forEach(index => {
        ENEMY_FACTORY[index] += freq * (MS_INTERVAL / 100); // Independent of framerate kinda
    });

    ENEMY_FACTORY.forEach((value, index) => {
        if (value >= 1) {
            // Create a new enemy in this lane
            let lane = index + 1; // Lane numbers are 1-indexed
            Enemy.create_random_enemy(lane);
            ENEMY_FACTORY[index] -= 1; // Reset the factory slot
        }
    });
}




class Enemy {
    /*
    * Enemies move through a lane in terms of "percentage of the lane" for easier generalization
    * They move a percentage following a function of the previous x-position (in percentage)
    * For example, the most basic movement is x -> x+1 This enemy takes 100 loops to cross the lane
    * The x-positon is the left-most point of the sprite
    */

    names_all = [
        "molly",
        "touka",
        "rin",
        "niki",
        "hidden"
    ]

    name_to_sprite_mapping = {
        "molly": "static/imgs/molly.gif",
        "touka": "static/imgs/touka.gif",
        "rin": "static/imgs/rin.gif",
        "niki": "static/imgs/niki.gif",
        "hidden": "static/imgs/hidden.gif"
    }

    defeated_sprite = "static/imgs/defeated_tmp.png"

    constructor(lane, movement_function, name, transition_time = 0.1, transition_type = "linear") {
        if (lane < 1 || lane > 4) {
            throw new Error("Lane must be between 1 and 4");
        }
        this.lane = lane;
        this.lane_end_element = document.getElementById(`lane${lane}_end`);
        this.lane_element = document.getElementById(`lane${lane}`);
        this.movement_function = movement_function;
        this.x = 0; // Start at the beginning of the lane
        this.times_moved = 0; // Count how many times the enemy has moved
        this.name = name;
        this.enemy_element = this.create_element(transition_time, transition_type);
        ENEMIES.push(this);
    }

    create_element(transition_time = 0.1, transition_type = "linear") {
        // Create the sprite for this enemy
        const enemy_element = document.createElement("div");
        enemy_element.classList.add("enemy");
        enemy_element.classList.add("enemy_moving");    // Does not do anything, the transition is customized here
        const sprite_element = document.createElement("img");
        sprite_element.src = this.name_to_sprite_mapping[this.name];
        sprite_element.alt = this.name;
        enemy_element.appendChild(sprite_element);
        this.sprite_element = sprite_element;

        enemy_element.style.transition = `right ${transition_time}s ${transition_type}`;

        // Select lane:
        this.lane_element.insertBefore(enemy_element, this.lane_element.firstChild);
        return enemy_element;
    }

    check_elimination(index = null) {
        // Check elimination by directy collision with lane end
        let collision = check_collision(this.enemy_element, this.lane_end_element);
        if (collision) {
            this.eliminate(index);
        }
        return collision;
    }

    check_passed(index = null) {
        if (this.x > LANE_END_THRESHOLD) {
            // Check collision with lane end
            let collision = check_collision(this.enemy_element, this.lane_end_element);
            if (!collision) {
                // Enemy has passed the lane end without being eliminated
                this.eliminate(index, true);
                set_life_handler(LIVES - 1, 2);
            }
        }
    }

    eliminate(index = null, passed = false) {
        // Remove the enemy from the DOM and from the ENEMIES array
        const enemy_index = index !== null ? index : ENEMIES.indexOf(this);
        if (enemy_index > -1) {
            // Show elimination effect
            this.enemy_element.classList.add("enemy_eliminated");
            this.enemy_element.classList.remove("enemy_moving");
            this.enemy_element.style.removeProperty("transition"); // Remove the previous transition
            this.enemy_element.style.right = `${this.x}%`; // Stop the movement transition
            this.enemy_element.addEventListener("transitionend", () => {
                this.enemy_element.remove();
            });
            this.enemy_element.style.opacity = "0";
            if (!passed) {
                // Enemy eliminated successfully, increase score
                set_score_handler(SCORE + 1);
                //this.sprite_element.src = this.defeated_sprite;
                this.enemy_element.style.bottom = "200%"; // Move it upwards when dealt with
            }
            ENEMIES.splice(enemy_index, 1);
        }
    }

    move() {
        // Move the enemy according to its movement function
        let new_x = this.movement_function(this.x, this.times_moved);
        this.x = new_x;
        this.enemy_element.style.right = `${this.x}%`;
        this.times_moved++;
    }

    static _get_constant_movement(speed) {
        // Speed is a percentage (between 0 and 100) of the lane per loop
        return (x, times_moved) => x + speed * (MS_INTERVAL / 100); // independent of framerate kinda
    }

    static _get_intermitent_movement(speed1, speed2, modulo = 5) {
        // Speed1 is the speed for even moves, speed2 for odd moves
        return (x, times_moved) => {
            if (times_moved % modulo === 0) {
                return x + speed1 * (MS_INTERVAL / 100);
            } else {
                return x + speed2 * (MS_INTERVAL / 100);
            }
        };
    }

    static create_molly_enemy(lane) {
        return new Enemy(lane, Enemy._get_constant_movement(2), "molly");
    }
    static create_touka_enemy(lane) {
        return new Enemy(lane, Enemy._get_constant_movement(0.5), "touka");
    }
    static create_rin_enemy(lane) {
        return new Enemy(lane, Enemy._get_constant_movement(4), "rin");
    }
    static create_niki_enemy(lane) {
        return new Enemy(lane, Enemy._get_intermitent_movement(10, 0), "niki", 0.5, "ease");
    }

    static create_random_enemy(lane) {
        const enemy_types = ["molly", "touka", "rin", "niki"];
        const random_type = enemy_types[Math.floor(Math.random() * enemy_types.length)];
        switch (random_type) {
            case "molly":
                return Enemy.create_molly_enemy(lane);
            case "touka":
                return Enemy.create_touka_enemy(lane);
            case "rin":
                return Enemy.create_rin_enemy(lane);
            case "niki":
                return Enemy.create_niki_enemy(lane);
        }
    }
}